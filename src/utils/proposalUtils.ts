
// 格式化数字显示
export const formatNumber = (num: number, locale: string = 'en-US') => {
  return num.toLocaleString(locale);
};
// 提案状态枚举（值对应后端 state）
// 0: END (结束)
// 1: DRAFT (草稿)
// 2: INITIATION_VOTE (立项投票)
// 3: WAITING_FOR_START_FUND (等待启动金)
// 4: IN_PROGRESS (项目执行中)
// 5: MILESTONE_VOTE (里程碑验收投票)
// 6: DELAY_VOTE (延期投票)
// 7: WAITING_FOR_MILESTONE_FUND (等待里程碑资金)
// 8: WAITING_FOR_ACCEPTANCE_REPORT (等待验收报告)
// 9: COMPLETED (项目完成)
// 10: REVIEW_VOTE (进度复核投票)
// 11: REEXAMINE_VOTE (复核投票)
// 12: RECTIFICATION_VOTE (整改投票)
export enum ProposalStatus {
  END = 0,                          // 结束
  DRAFT = 1,                        // 草稿
  INITIATION_VOTE = 2,              // 立项投票
  WAITING_FOR_START_FUND = 3,       // 等待启动金
  IN_PROGRESS = 4,                  // 项目执行中
  MILESTONE_VOTE = 5,               // 里程碑验收投票
  DELAY_VOTE = 6,                   // 延期投票
  WAITING_FOR_MILESTONE_FUND = 7,   // 等待里程碑资金
  WAITING_FOR_ACCEPTANCE_REPORT = 8, // 等待验收报告
  COMPLETED = 9,                    // 项目完成
  REVIEW_VOTE = 10,                 // 进度复核投票
  REEXAMINE_VOTE = 11,              // 复核投票
  RECTIFICATION_VOTE = 12,          // 整改投票

  // 向后兼容的别名（映射到新状态）
  REVIEW = INITIATION_VOTE,          // 社区审议中 -> 立项投票
  VOTE = INITIATION_VOTE,            // 投票中 -> 立项投票
  MILESTONE = IN_PROGRESS,           // 里程碑交付中 -> 项目执行中
  APPROVED = COMPLETED,              // 已通过 -> 项目完成
  REJECTED = END,                    // 已拒绝 -> 结束
  ENDED = END,                       // 结束 -> 结束
}
// 投票元数据项类型
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

// 提案接口
export interface Proposal {
  id: string;
  title: string;
  type: ProposalType;
  state: ProposalStatus;
  proposer: {
    name: string;
    avatar: string;
    did: string;
  };
  budget: number; // CKB 数量
  createdAt: string;
  description: string;
  milestones?: {
    current: number;
    total: number;
    progress: number; // 百分比
  };
  progress?: number; // 当前里程碑索引（0-based）
  voting?: {
    approve: number; // 赞成票百分比
    oppose: number;  // 反对票百分比
    totalVotes: number; // 总投票数
  };
  vote_meta?: VoteMetaItem; // 投票元数据

  category: string;
  tags: string[];
}

// 提案类型枚举
export enum ProposalType {
  DEVELOPMENT = 'development',  // 开发项目
  GOVERNANCE = 'governance',    // 治理规则
  ECOSYSTEM = 'ecosystem',      // 生态建设
  RESEARCH = 'research',        // 研究项目
  INFRASTRUCTURE = 'infrastructure' // 基础设施
}
// 获取状态标签样式
export const getStatusClass = (status: ProposalStatus) => {
  switch (status) {
    case ProposalStatus.DRAFT:
      return 'status-tag draft';
    case ProposalStatus.INITIATION_VOTE:
    case ProposalStatus.REVIEW:
    case ProposalStatus.VOTE:
      return 'status-tag vote';
    case ProposalStatus.WAITING_FOR_START_FUND:
    case ProposalStatus.WAITING_FOR_MILESTONE_FUND:
    case ProposalStatus.WAITING_FOR_ACCEPTANCE_REPORT:
      return 'status-tag waiting';
    case ProposalStatus.IN_PROGRESS:
    case ProposalStatus.MILESTONE:
      return 'status-tag milestone';
    case ProposalStatus.MILESTONE_VOTE:
    case ProposalStatus.DELAY_VOTE:
    case ProposalStatus.REVIEW_VOTE:
    case ProposalStatus.REEXAMINE_VOTE:
    case ProposalStatus.RECTIFICATION_VOTE:
      return 'status-tag vote';
    case ProposalStatus.COMPLETED:
    case ProposalStatus.APPROVED:
      return 'status-tag approved';
    case ProposalStatus.REJECTED:
      return 'status-tag rejected';
    case ProposalStatus.ENDED:
      return 'status-tag ended';
    default:
      return 'status-tag';
  }
};

// 基于设计稿的 Tag 颜色类名（与 Tag.css 中的 -- 修饰类一致）
export const getStatusTagClass = (status: ProposalStatus) => {
  switch (status) {
    case ProposalStatus.DRAFT:
      return 'tag-status--draft';
    case ProposalStatus.INITIATION_VOTE:
    case ProposalStatus.REVIEW:
    case ProposalStatus.VOTE:
      return 'tag-status--vote';
    case ProposalStatus.WAITING_FOR_START_FUND:
    case ProposalStatus.WAITING_FOR_MILESTONE_FUND:
    case ProposalStatus.WAITING_FOR_ACCEPTANCE_REPORT:
      return 'tag-status--review';
    case ProposalStatus.IN_PROGRESS:
    case ProposalStatus.MILESTONE:
      return 'tag-status--milestone';
    case ProposalStatus.MILESTONE_VOTE:
    case ProposalStatus.DELAY_VOTE:
    case ProposalStatus.REVIEW_VOTE:
    case ProposalStatus.REEXAMINE_VOTE:
    case ProposalStatus.RECTIFICATION_VOTE:
      return 'tag-status--vote';
    case ProposalStatus.COMPLETED:
    case ProposalStatus.APPROVED:
      return 'tag-status--approved';
    case ProposalStatus.REJECTED:
      return 'tag-status--rejected';
    case ProposalStatus.ENDED:
      return 'tag-status--ended';
    default:
      return '';
  }
};

// 格式化日期显示
export const formatDate = (dateString: string, locale: 'en' | 'zh' = 'en') => {
  // 将 locale 映射到日期格式化语言代码
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
  return new Date(dateString).toLocaleDateString(dateLocale);
};

// 格式化日期和时间显示（精确到分钟）
export const formatDateTime = (dateString: string, locale: 'en' | 'zh' = 'en') => {
  const date = new Date(dateString);
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';

  // 使用 toLocaleString 来同时显示日期和时间
  return date.toLocaleString(dateLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false // 使用24小时制
  });
};

// 解析 EpochNumberWithFraction
export const parseEpoch = (epoch: string | number | undefined): { number: number, index: number, length: number } | null => {
  if (epoch === undefined || epoch === null) return null;

  try {
    const epochBigInt = typeof epoch === 'string' ? BigInt(epoch) : BigInt(epoch);

    // bit 0-23: number
    const number = Number(epochBigInt & BigInt(0xffffff));
    // bit 24-39: index
    const index = Number((epochBigInt >> BigInt(24)) & BigInt(0xffff));
    // bit 40-55: length
    const length = Number((epochBigInt >> BigInt(40)) & BigInt(0xffff));

    // 简单验证：length 应该大于 0，且 index 应该小于 length
    // 但对于 epoch number 0，可能 index 和 length 都是 0
    // 如果 epoch 看起来像是一个非常大的数字（大于常规时间戳），则认为它是 epoch
    // 常规时间戳（毫秒） 2025年大约是 1735689600000 (13位)
    // EpochNumberWithFraction 通常是 u64，如 1979123480145992 (16位)

    // 我们主要关心它是否被解析为合理的 epoch 格式
    // 这里的 heuristic 是：如果它是一个非常大的数字，并且我们能够解析出结构

    // 修正：调用者应该决定是否把它当作 epoch 处理，或者我们由于这是 format 工具，
    // 我们可以依赖输入如果是类似 epoch 的大整数格式。

    return { number, index, length };
  } catch {
    return null;
  }
};
