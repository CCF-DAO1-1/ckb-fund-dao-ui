import { PDS_API_URL, DID_PREFIX } from "@/constant/Network";
import sessionWrapApi from "@/lib/wrapApiAutoSession";
import server from "@/server";
import getPDSClient from "@/lib/pdsClient";
import storage from "@/lib/storage";
import * as crypto from '@atproto/crypto'
import { signCommit, UnsignedCommit } from '@atproto/repo'
import { uint8ArrayToHex } from "@/lib/dag-cbor";
import { CID } from 'multiformats/cid'
import * as cbor from '@ipld/dag-cbor'
import { TID } from '@atproto/common-web'
import dayjs from "dayjs";

export async function uploadImage(file: File, did: string) {
  const pdsClient = getPDSClient();
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  if (!file) throw new Error("No file provided");
  if (file.size > MAX_FILE_SIZE) throw new Error("File size exceeds 5MB");

  const result = await sessionWrapApi(() => pdsClient.fans.web5.ckb.uploadBlob(file, { encoding: file.type }));
  const blobRefStr = result.data.blob.ref.toString()
  let server = result.data.blobServer
  const didSlice = did.replace(DID_PREFIX, '')

  if (!server?.endsWith('/')) {
    server += '/'
  }

  // https://<pds>/blocks/<did>/<cid>
  return `${server}blocks/${didSlice}/${blobRefStr}`;
}

type PostRecordType = {
  $type: 'app.dao.reply'
  proposal: string    // 提案的uri
  to?: string   // 对方did（可选，有就是回复某人）
  text: string  // 评论内容
  parent?: string  // 父评论的uri（可选，用于回复评论）
} | {
  $type: 'app.actor.profile'
  displayName: string;
  handle: string;
  [key: string]: unknown;
} | {
  $type: 'app.dao.proposal'
  [key: string]: unknown;
} | {
  $type: 'app.dao.like'
  to: string; // 点赞的帖子uri或者评论\回复的uri
  viewer: string;//点赞的人的did
}

type CreatePostResponse = {
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

/* 发帖、跟帖回复 */
export async function writesPDSOperation(params: {
  record: PostRecordType
  did: string
  rkey?: string
}) {
  const pdsClient = getPDSClient()

  const rkey = params.rkey || TID.next().toString()

  const newRecord = {
    ...params.record,
    created: dayjs().format()
  }

  const writeRes = await pdsClient.fans.web5.ckb.preDirectWrites({
    repo: params.did,
    writes: [{
      $type: "fans.web5.ckb.preDirectWrites#create",
      collection: newRecord.$type,
      rkey,
      value: newRecord
    }],
    validate: false,
  })

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

  const res = await server<CreatePostResponse>('/record/create', 'POST', {
    repo: params.did,
    rkey,
    value: newRecord,
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

  return {
    uri: res.results[0].uri,
    cid: res.results[0].cid
  }
}

export async function updatesPDSOperation(params: {
  record: PostRecordType;
  did: string;
  rkey: string;
}) {
  const pdsClient = getPDSClient();

  const rkey = params.rkey; // rkey is required for update

  const newRecord = {
    ...params.record,
    created: dayjs().format(),
  };

  const writeRes = await pdsClient.fans.web5.ckb.preDirectWrites({
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
  });

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

  const res = await server<CreatePostResponse>("/record/update", "POST", {
    repo: params.did,
    rkey,
    value: newRecord,
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
  });

  return {
    uri: res.results[0].uri,
    cid: res.results[0].cid,
  };
}