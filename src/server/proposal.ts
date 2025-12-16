/**
 * 提案相关API接口定义
 */
import { ProposalStatus } from "@/utils/proposalUtils";
import defineAPI from "./defineAPI";

// 提案详情接口的参数类型
export interface ProposalDetailParams {
  uri: string; // 提案的URI
  viewer:string | null; // 查看者的did
}

// 提案里程碑类型
export interface ProposalMilestone {
  id: string;
  title: string;
  description: string;
  date: string;
  index:number
}

// 投票元数据项类型（从提案详情接口返回）
export interface VoteMetaItem {
  id: number; // 投票ID
  proposal_uri: string; // 提案URI
  candidates: string[]; // 候选人列表（如 ["Abstain", "Agree", "Against"]）
  start_time: string; // 投票开始时间（ISO 8601格式）
  end_time: string; // 投票结束时间（ISO 8601格式）
  created: string; // 创建时间（ISO 8601格式）
  creater: string; // 创建者DID
  state: number; // 投票状态
  tx_hash: string | null; // 交易哈希
  whitelist_id?: string; // 白名单ID
}

// 提案详情接口的响应类型
export interface ProposalDetailResponse {
  state:number;
  author: {
    $type: string;
    created: string;
    did: string;
    displayName: string;
    handle: string;
  };

  cid: string;
  like_count: string;
  liked: boolean;
  record: {
    $type: string;
    created: string;
    data: {
      state: ProposalStatus;
      background: string;
      budget: string;
      goals: string;
      milestones: ProposalMilestone[];
      proposalType: string;
      releaseDate: string;
      team: string;
      title: string;
    };
  };
  updated: string;
  uri: string;
  vote_meta?: VoteMetaItem; // 投票元数据（如果进入投票阶段）
}

/**
 * 获取提案详情
 * GET /api/proposal/detail
 */
export const getProposalDetail = defineAPI<
  ProposalDetailParams,
  ProposalDetailResponse
>(
  "/proposal/detail",
  "GET",
  {
    divider: {
      query: ["uri","viewer"], // uri作为查询参数
    },
  }
);

// 提案列表查询参数类型（cursor/limit 模式）
export interface ProposalListParams {
  cursor?: string | null; // 分页游标
  limit?: number; // 返回数量，默认20
  q?: string | null; // 关键词搜索
  repo?: string | null; // 过滤作者DID（用户 DID）
  viewer?: string | null; // 查看者的did
}

// 提案列表项类型 - 与提案详情结构相同
export interface ProposalListItem {
  state: number; // 提案状态
  author: {
    $type: string;
    created: string;
    did: string;
    displayName: string;
    handle: string;
  };
  cid: string;
  like_count: string;
  liked: boolean;
  record: {
    $type: string;
    created: string;
    data: {
      background: string;
      budget: string;
      goals: string;
      milestones: ProposalMilestone[];
      proposalType: string;
      releaseDate: string;
      team: string;
      title: string;
    };
  };
  updated: string;
  uri: string;
}

// 提案列表响应类型（扁平结构）
export interface ProposalListResponse {
  proposals: ProposalListItem[];
  cursor: string | null;
}

/**
 * 获取提案列表
 * POST /api/proposal/list
 */
export const getProposalList = defineAPI<
  ProposalListParams,
  ProposalListResponse
>(
  "/proposal/list",
  "POST",
  {
    divider: {
      body: ["cursor", "limit", "q", "repo", "viewer"],
    },
  }
);

// 投票权重查询参数类型
export interface VoteWeightParams {
  ckb_addr: string; // 用户CKB地址
}

// 投票权重响应类型
export interface VoteWeightResponse {
  weight: number; // 投票权重
  ckb_addr: string; // 用户CKB地址
}

/**
 * 获取用户投票权重
 * GET /api/vote/weight
 */
export const getVoteWeight = defineAPI<
  VoteWeightParams,
  VoteWeightResponse
>(
  "/vote/weight",
  "GET",
  {
    divider: {
      query: ["ckb_addr"], // ckb_addr作为查询参数
    },
  }
);

// 投票元数据参数类型
export interface CreateVoteMetaParams {
  did: string; // 用户DID
  params: {
    candidates: unknown[]; // 候选人列表
    end_time: number; // 投票结束时间
    proposal_uri: string; // 提案URI
    start_time: number; // 投票开始时间
    timestamp: number; // UTC 时间戳（秒），防止签名被重复使用
  };
  signed_bytes: string; // 签名字节
  signing_key_did: string; // 签名密钥DID
}

// VoteMetaItem 已在上面定义，这里保留用于向后兼容

// 投票元数据响应类型
// 注意：由于 requestAPI 会自动提取响应中的 data 字段，
// 所以实际返回的是以下结构，而不是包裹在 {code, data, message} 中
export interface CreateVoteMetaResponse {
  outputsData: string[]; // 输出数据数组
  vote_meta: VoteMetaItem; // 投票元数据
}

/**
 * 创建投票元数据
 * POST /api/vote/create_vote_meta
 */
export const createVoteMeta = defineAPI<
  CreateVoteMetaParams,
  CreateVoteMetaResponse
>(
  "/vote/create_vote_meta",
  "POST",
  {
    divider: {
      body: ["did", "params", "signed_bytes", "signing_key_did"],
    },
  }
);

// 绑定列表查询参数类型
export interface BindListParams {
  did: string; // 用户DID
}

// 绑定项类型
export interface BindItem {
  from?: string; // 源地址（钱包地址）
  to?: string; // 目标地址（钱包地址）
  address?: string; // 钱包地址（备用字段名）
  timestamp?: number | string; // 时间戳
}

// 绑定列表响应类型
// 注意：由于 requestAPI 会自动提取响应中的 data 字段，
// 所以实际返回的是 BindItem[] 数组，而不是包裹在对象中
export type BindListResponse = BindItem[];

/**
 * 获取绑定列表
 * GET /api/vote/bind_list
 */
export const getBindList = defineAPI<
  BindListParams,
  BindListResponse
>(
  "/vote/bind_list",
  "GET",
  {
    divider: {
      query: ["did"], // did作为查询参数
    },
  }
);

// 创建投票参数类型
export interface CreateVoteParams {
  did: string; // 用户DID
  params: {
    candidates_index: number; // 候选人索引
    vote_meta_id: number; // 投票元数据ID
  };
  signed_bytes: string; // 签名字节
  signing_key_did: string; // 签名密钥DID
}

// 创建投票响应类型
// 注意：由于 requestAPI 会自动提取响应中的 data 字段，
// 所以实际返回的是以下结构，而不是包裹在 {code, data, message} 中
export interface CreateVoteResponse {
  // 根据实际API响应调整
  [key: string]: unknown;
}

/**
 * 创建投票
 * POST /api/vote/create_vote
 */
export const createVote = defineAPI<
  CreateVoteParams,
  CreateVoteResponse
>(
  "/vote/create_vote",
  "POST",
  {
    divider: {
      body: ["did", "params", "signed_bytes", "signing_key_did"],
    },
  }
);

// 发起立项投票参数类型
export interface InitiationVoteParams {
  uri: string; // 提案URI (路径参数)
  state: number; // 提案状态 (路径参数)
  did: string; // 用户DID
  params: {
    proposal_uri: string; // 提案URI
    timestamp: number; // UTC 时间戳（秒），防止签名被重复使用
  };
  signed_bytes: string; // 签名字节
  signing_key_did: string; // 签名密钥DID
}

// 发起立项投票响应类型
// 注意：由于 requestAPI 会自动提取响应中的 data 字段，
// 所以实际返回的是以下结构，而不是包裹在 {code, data, message} 中
export interface InitiationVoteResponse {
  outputsData?: string[]; // 输出数据数组（如果接口返回）
  vote_meta?: VoteMetaItem; // 投票元数据（如果接口返回）
  [key: string]: unknown;
}

/**
 * 发起立项投票
 * POST /api/proposal/initiation_vote
 */
export const initiationVote = defineAPI<
  InitiationVoteParams,
  InitiationVoteResponse
>(
  "/proposal/initiation_vote",
  "POST",
  {
    
    divider: {
      path: ["uri", "state"], // uri 和 state 作为路径参数
      body: ["did", "params", "signed_bytes", "signing_key_did"],
    },
  }
);

// 更新投票元数据交易哈希参数类型
export interface UpdateMetaTxHashParams {
  did: string; // 用户DID
  params: {
    id: number; // 投票元数据ID
    tx_hash: string; // 交易哈希
    timestamp: number; // UTC 时间戳（秒），防止签名被重复使用
  };
  signed_bytes: string; // 签名字节
  signing_key_did: string; // 签名密钥DID
}

// 更新投票元数据交易哈希响应类型
export interface UpdateMetaTxHashResponse {
  success: boolean;
  [key: string]: unknown;
}

/**
 * 更新投票元数据交易哈希
 * POST /api/vote/update_meta_tx_hash
 */
export const updateMetaTxHash = defineAPI<
  UpdateMetaTxHashParams,
  UpdateMetaTxHashResponse
>(
  "/vote/update_meta_tx_hash",
  "POST",
  {
    divider: {
      body: ["did", "params", "signed_bytes", "signing_key_did"],
    },
  }
);

// 更新投票交易哈希参数类型
export interface UpdateVoteTxHashParams {
  did: string; // 用户DID
  params: {
    id: number; // 投票元数据ID
    tx_hash: string; // 交易哈希
    candidates_index: number; // 候选人索引（0: Abstain, 1: Agree, 2: Against）
    timestamp: number; // UTC 时间戳（秒），防止签名被重复使用
  };
  signed_bytes: string; // 签名字节
  signing_key_did: string; // 签名密钥DID
}

// 更新投票交易哈希响应类型
export interface UpdateVoteTxHashResponse {
  success: boolean;
  [key: string]: unknown;
}

/**
 * 更新投票交易哈希
 * POST /api/vote/update_vote_tx_hash
 */
export const updateVoteTxHash = defineAPI<
  UpdateVoteTxHashParams,
  UpdateVoteTxHashResponse
>(
  "/vote/update_vote_tx_hash",
  "POST",
  {
    divider: {
      body: ["did", "params", "signed_bytes", "signing_key_did"],
    },
  }
);

// 注意：vote_meta 现在从 /api/proposal/detail 接口返回，不再需要单独的接口

// 准备投票参数类型
export interface PrepareVoteParams {
  did: string; // 用户DID
  vote_meta_id: number; // 投票元数据ID
}

// 准备投票响应类型
export interface PrepareVoteResponse {
  did: string;
  proof: number[]; // proof 现在是一个一维数字数组
  vote_addr: string;
  vote_meta: VoteMetaItem;
}

/**
 * 准备投票
 * POST /api/vote/prepare
 */
export const prepareVote = defineAPI<
  PrepareVoteParams,
  PrepareVoteResponse
>(
  "/vote/prepare",
  "POST",
  {
    divider: {
      body: ["did", "vote_meta_id"],
    },
  }
);

// 查询投票状态参数类型
export interface VoteStatusParams {
  did: string; // 用户DID
  vote_meta_id: number; // 投票元数据ID
}

// 单个投票记录类型
export interface VoteRecord {
  id: number; // 投票记录ID
  vote_meta_id: number; // 投票元数据ID
  voter: string; // 投票者DID
  candidates_index: number; // 候选人索引（1: Agree, 2: Against）
  state: number; // 投票状态（0: 上链中, 其他: 已确认）
  tx_hash: string; // 交易哈希
  created: string; // 创建时间（ISO 8601格式）
}

// 查询投票状态响应类型（返回投票记录数组）
export type VoteStatusResponse = VoteRecord[];

/**
 * 查询投票状态
 * POST /api/vote/status
 */
export const getVoteStatus = defineAPI<
  VoteStatusParams,
  VoteStatusResponse
>(
  "/vote/status",
  "POST",
  {
    divider: {
      body: ["did", "vote_meta_id"],
    },
  }
);

// 查询投票详情参数类型
export interface VoteDetailParams {
  id: number; // 投票元数据ID
}

// 查询投票详情响应类型
export interface VoteDetailResponse {
  candidate_votes: Array<[number, number]>; // [[票数, 权重], ...] 顺序: [0: Abstain, 1: Agree, 2: Against]
  valid_vote_sum: number; // 有效投票数
  valid_weight_sum: number; // 有效投票权重总和
  vote_meta: VoteMetaItem; // 投票元数据
  vote_sum: number; // 总投票数
  weight_sum: number; // 总权重
  [key: string]: unknown;
}

/**
 * 查询投票详情（当前结果）
 * GET /api/vote/detail
 */
export const getVoteDetail = defineAPI<
  VoteDetailParams,
  VoteDetailResponse
>(
  "/vote/detail",
  "GET",
  {
    divider: {
      query: ["id"], // vote_meta_id作为查询参数
    },
  }
);
