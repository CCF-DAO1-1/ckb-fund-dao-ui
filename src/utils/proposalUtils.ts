
// 格式化数字显示
export const formatNumber = (num: number, locale: string = 'en-US') => {
  return num.toLocaleString(locale);
};
// 提案状态枚举
export enum ProposalStatus {
  DRAFT = 0,           // 草稿
  REVIEW = 1,         // 社区审议中
  VOTE = 2,            // 投票中
  MILESTONE = 1001,   // 里程碑交付中 todo: 需要修改
  APPROVED = 3,     // 已通过
  REJECTED = 4,     // 已拒绝
  ENDED = 5           // 结束
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
    case ProposalStatus.VOTE:
      return 'status-tag vote';
    case ProposalStatus.REVIEW:
      return 'status-tag review';
    case ProposalStatus.MILESTONE:
      return 'status-tag milestone';
    case ProposalStatus.ENDED:
      return 'status-tag ended';
    case ProposalStatus.APPROVED:
      return 'status-tag approved';
    case ProposalStatus.REJECTED:
      return 'status-tag rejected';
    default:
      return 'status-tag';
  }
};

// 基于设计稿的 Tag 颜色类名（与 Tag.css 中的 -- 修饰类一致）
export const getStatusTagClass = (status: ProposalStatus) => {
  switch (status) {
    case ProposalStatus.REVIEW:
      return 'tag-status--review';
    case ProposalStatus.VOTE:
      return 'tag-status--vote';
    case ProposalStatus.MILESTONE:
      return 'tag-status--milestone';
    case ProposalStatus.APPROVED:
      return 'tag-status--approved';
    case ProposalStatus.REJECTED:
      return 'tag-status--rejected';
    case ProposalStatus.ENDED:
      return 'tag-status--ended';
    case ProposalStatus.DRAFT:
      return 'tag-status--draft';
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
