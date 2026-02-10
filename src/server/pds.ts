/**
 * PDS (Personal Data Server) 相关操作接口
 * 包括图片上传、记录创建和更新等操作
 */
import { DID_PREFIX } from "@/constant/Network";
import sessionWrapApi from "@/lib/wrapApiAutoSession";
import getPDSClient from "@/lib/pdsClient";
import storage from "@/lib/storage";
import * as crypto from '@atproto/crypto'
import { UnsignedCommit } from '@atproto/repo'
import { uint8ArrayToHex } from "@/lib/dag-cbor";
import { CID } from 'multiformats/cid'
import * as cbor from '@ipld/dag-cbor'
import { TID } from '@atproto/common-web'
import dayjs from "dayjs";

import { logger } from '@/lib/logger';
// PDS 记录类型
export type PDSRecordType = 
  | {
      $type: 'app.dao.reply'
      proposal: string    // 提案的uri
      to?: string   // 对方did（可选，有就是回复某人）
      text: string  // 评论内容
      parent?: string  // 父评论的uri（可选，用于回复评论）
    }
  | {
      $type: 'app.actor.profile'
      displayName: string;
      handle: string;
      [key: string]: unknown;
    }
  | {
      $type: 'app.dao.proposal'
      [key: string]: unknown;
    }
  | {
      $type: 'app.dao.like'
      to: string; // 点赞的帖子uri或者评论\回复的uri
      viewer: string;//点赞的人的did
    };

// 创建记录响应类型
export interface CreatePDSRecordResponse {
  commit: {
    cid: string
    rev: string
  },
  results: {
    $type: "fans.web5.ckb.directWrites#createResult"
    cid: string
    uri: string
  }[]
}

/**
 * 上传图片到 PDS
 * @param file 图片文件
 * @param did 用户 DID
 * @returns 图片 URL
 * @throws {Error} 当文件验证失败或上传失败时抛出错误
 */
export async function uploadImage(file: File, did: string): Promise<string> {
  const pdsClient = getPDSClient();
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // 文件验证
  if (!file) {
    throw new Error("No file provided");
  }

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    throw new Error("Only image files are supported");
  }

  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 5MB");
  }

  // 检查 DID
  if (!did) {
    throw new Error("User DID is required");
  }

  try {
    const result = await sessionWrapApi(() => 
      pdsClient.fans.web5.ckb.uploadBlob(file, { encoding: file.type })
    );
    
    // 检查返回结果
    if (!result || !result.data) {
      throw new Error("Invalid response from upload service");
    }

    // 检查 blob 数据
    if (!result.data.blob || !result.data.blob.ref) {
      throw new Error("Invalid blob data in response");
    }

    const blobRefStr = result.data.blob.ref.toString();
    let server = result.data.blobServer;

    // 检查 blobServer
    if (!server) {
      throw new Error("Blob server URL not found in response");
    }

    const didSlice = did.replace(DID_PREFIX, '');

    // 确保 server URL 以 / 结尾
    if (!server.endsWith('/')) {
      server += '/';
    }

    // 构建图片 URL: https://<pds>/blocks/<did>/<cid>
    const imageUrl = `${server}blocks/${didSlice}/${blobRefStr}`;
    
    return imageUrl;
  } catch (error) {
    logger.error('图片上传错误:');
    
    // 提供更详细的错误信息
    if (error instanceof Error) {
      // 如果是已知的错误类型，直接抛出
      if (error.message.includes("No file provided") ||
          error.message.includes("Only image files") ||
          error.message.includes("File size exceeds") ||
          error.message.includes("User DID is required") ||
          error.message.includes("Invalid response") ||
          error.message.includes("Invalid blob data") ||
          error.message.includes("Blob server URL")) {
        throw error;
      }
      // 其他错误，包装成更友好的错误信息
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    throw new Error("Upload failed: Unknown error");
  }
}

/**
 * 创建 PDS 记录（提案、评论、点赞等）
 * @param params 创建参数
 * @returns 创建的记录 URI 和 CID
 */
export async function createPDSRecord(params: {
  record: PDSRecordType
  did: string
  rkey?: string
}) {
  const pdsClient = getPDSClient()

  const rkey = params.rkey || TID.next().toString()

  const newRecord = {
    ...params.record,
    created: dayjs().format()
  }

  const writeRes = await sessionWrapApi(() =>
    pdsClient.fans.web5.ckb.preDirectWrites({
      repo: params.did,
      writes: [{
        $type: "fans.web5.ckb.preDirectWrites#create",
        collection: newRecord.$type,
        rkey,
        value: newRecord
      }],
      validate: false,
    })
  )

  const writerData = writeRes.data

  const storageInfo = storage.getToken()

  if (!storageInfo?.signKey) {
    throw '没缓存'
  }

  const keyPair = await crypto.Secp256k1Keypair.import(storageInfo?.signKey?.slice(2))

  const uncommit: UnsignedCommit = {
    did: writerData.did,
    version: 3,
    rev: writerData.rev,
    prev: writerData.prev ? CID.parse(writerData.prev) : null,
    data: CID.parse(writerData.data),
  }
  const preEncoded = cbor.encode(uncommit)

  if (uint8ArrayToHex(preEncoded) !== writerData.unSignBytes) {
    throw 'sign bytes not consistent'
  }

  // const commit = await signCommit(uncommit, keyPair)  会报错，所以就把源码拿出来了
  const encoded = cbor.encode(uncommit)
  const sig = await keyPair.sign(encoded)
  const commit = {
    ...uncommit,
    sig,
  }
  const signingKey = keyPair.did()

  const localStorage = storage.getToken()

  // 🔧 改用 PDS 的 directWrites 接口，不再调用后端 API
  const res = await sessionWrapApi(() =>
    pdsClient.fans.web5.ckb.directWrites({
      repo: params.did,
      signing_key: signingKey,
      ckb_addr: localStorage?.walletAddress,
      root: {
        did: writerData.did,
        version: 3,
        rev: writerData.rev,
        prev: writerData.prev,
        data: writerData.data,
        signedBytes: uint8ArrayToHex(commit.sig),
      },
    })
  )

  return {
    uri: res.data.results[0].uri,
    cid: res.data.results[0].cid
  }
}

/**
 * 更新 PDS 记录（提案编辑等）
 * @param params 更新参数
 * @returns 更新的记录 URI 和 CID
 */
export async function updatePDSRecord(params: {
  record: PDSRecordType;
  did: string;
  rkey: string;
}) {
  const pdsClient = getPDSClient();

  const rkey = params.rkey; // rkey is required for update

  const newRecord = {
    ...params.record,
    created: dayjs().format(),
  };

  const writeRes = await sessionWrapApi(() =>
    pdsClient.fans.web5.ckb.preDirectWrites({
      repo: params.did,
      writes: [
        {
          $type: "fans.web5.ckb.preDirectWrites#update",
          collection: newRecord.$type,
          rkey,
          value: newRecord,
        },
      ],
      validate: false,
    })
  );

  const writerData = writeRes.data;

  const storageInfo = storage.getToken();

  if (!storageInfo?.signKey) {
    throw "没缓存";
  }

  const keyPair = await crypto.Secp256k1Keypair.import(
    storageInfo?.signKey?.slice(2)
  );

  const uncommit: UnsignedCommit = {
    did: writerData.did,
    version: 3,
    rev: writerData.rev,
    prev: writerData.prev ? CID.parse(writerData.prev) : null,
    data: CID.parse(writerData.data),
  };
  const preEncoded = cbor.encode(uncommit);

  if (uint8ArrayToHex(preEncoded) !== writerData.unSignBytes) {
    throw "sign bytes not consistent";
  }

  // const commit = await signCommit(uncommit, keyPair)  会报错，所以就把源码拿出来了
  const encoded = cbor.encode(uncommit);
  const sig = await keyPair.sign(encoded);
  const commit = {
    ...uncommit,
    sig,
  };
  const signingKey = keyPair.did();

  const localStorage = storage.getToken();

  // 🔧 改用 PDS 的 directWrites 接口，不再调用后端 API
  const res = await sessionWrapApi(() =>
    pdsClient.fans.web5.ckb.directWrites({
      repo: params.did,
      signing_key: signingKey,
      ckb_addr: localStorage?.walletAddress,
      root: {
        did: writerData.did,
        version: 3,
        rev: writerData.rev,
        prev: writerData.prev,
        data: writerData.data,
        signedBytes: uint8ArrayToHex(commit.sig),
      },
    })
  );

  return {
    uri: res.data.results[0].uri,
    cid: res.data.results[0].cid,
  };
}

// 为了向后兼容，保留旧的函数名作为别名
export const writesPDSOperation = createPDSRecord;
export const updatesPDSOperation = updatePDSRecord;

