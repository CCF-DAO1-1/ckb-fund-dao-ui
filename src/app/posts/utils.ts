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

export type PostFeedItemType = {
  uri: string,
  cid: string,
  author: { displayName: string, [key: string]: string },
  title: string,
  text: string,
  visited_count: number,
  reply_count: number,
  visited: string, // 时间
  updated: string, // 时间
  created: string, // 时间
  section: string,       // 版区名称
}

export type SectionItem = {
  post_count: string
  reply_count: string
  id: string;
  name: string
  owner?: { did: string; displayName?: string } // 版主
  description?: string // 描述
  administrators?: unknown[]  // 管理员列表
}

/* 获取版区列表 */
export async function getSectionList(did?: string) {
  return await server<SectionItem[]>('/section/list', 'GET', {
    repo: did
  })
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