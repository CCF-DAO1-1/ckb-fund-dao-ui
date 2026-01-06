
// 格式化数字显示
export const formatNumber = (num: number, locale: string = 'en-US') => {
  return num.toLocaleString(locale);
};
// 提案状态枚举（数组下标对应 task_type）
// 0: Draft (草稿)
// 1: InitiationVote (立项投票)
// 2: WaitingForStartFund (等待启动金)
// 3: InProgress (项目执行中:里程碑过程)
// 4: MilestoneVote (里程碑验收投票)
// 5: DelayVote (延期投票)
// 6: WaitingForMilestoneFund (等待启动金)
// 7: ReviewVote (进度复核投票)
// 8: WaitingForAcceptanceReport (等待验收报告)
// 9: Completed (项目完成)
// 10: ReexamineVote (复核投票)
// 11: RectificationVote (整改投票)
export enum ProposalStatus {
  DRAFT = 0,                        // 草稿
  INITIATION_VOTE = 1,              // 立项投票
  WAITING_FOR_START_FUND = 2,       // 等待启动金
  IN_PROGRESS = 3,                  // 项目执行中:里程碑过程
  MILESTONE_VOTE = 4,               // 里程碑验收投票
  DELAY_VOTE = 5,                   // 延期投票
  WAITING_FOR_MILESTONE_FUND = 6,   // 等待启动金
  REVIEW_VOTE = 7,                  // 进度复核投票
  WAITING_FOR_ACCEPTANCE_REPORT = 8, // 等待验收报告
  COMPLETED = 9,                    // 项目完成
  REEXAMINE_VOTE = 10,              // 复核投票
  RECTIFICATION_VOTE = 11,          // 整改投票
  
  // 向后兼容的别名（保留旧的状态值，映射到新状态）
  REVIEW = INITIATION_VOTE,          // 社区审议中 -> 立项投票
  VOTE = INITIATION_VOTE,            // 投票中 -> 立项投票
  MILESTONE = IN_PROGRESS,           // 里程碑交付中 -> 项目执行中
  APPROVED = COMPLETED,              // 已通过 -> 项目完成
  REJECTED = COMPLETED,              // 已拒绝 -> 项目完成（可能需要单独处理）
  ENDED = COMPLETED,                 // 结束 -> 项目完成
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
  voting?: {
    approve: number; // 赞成票百分比
    oppose: number;  // 反对票百分比
    totalVotes: number; // 总投票数
  };
  
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
