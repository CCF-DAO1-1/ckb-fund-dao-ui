// 时间线事件类型
export enum TimelineEventType {
  // 1. 审议阶段
  REVIEW_START = 'review_start',           // 审议开始
  REVIEW_END = 'review_end',               // 审议结束
  COMMUNITY_INQUIRY_1 = 'community_inquiry_1', // 第一次社区质询会
  COMMUNITY_INQUIRY_2 = 'community_inquiry_2', // 第二次社区质询会
  COMMUNITY_DISCUSSION = 'community_discussion', // 社区讨论
  PROPOSAL_PUBLISHED = 'proposal_published', // 提案发布
  
  // 2. 投票阶段
  VOTE_START = 'vote_start',               // 提案投票开始
  VOTE_END = 'vote_end',                   // 提案投票结束
  VOTE_REMINDER = 'vote_reminder',         // 投票提醒
  PROPOSAL_APPROVED = 'proposal_approved', // 提案通过
  PROPOSAL_REJECTED = 'proposal_rejected', // 提案拒绝
  
  // 3. 执行阶段
  MILESTONE_TRACKING = 'milestone_tracking', // 里程碑追踪
  PROJECT_REVIEW = 'project_review',       // 项目复核
  PROJECT_COMPLETED = 'project_completed', // 项目完成
  PROJECT_CANCELLED = 'project_cancelled'  // 项目取消
}

// 时间线事件状态
export enum TimelineEventStatus {
  PENDING = 'pending',     // 待处理
  IN_PROGRESS = 'in_progress', // 进行中
  COMPLETED = 'completed', // 已完成
  CANCELLED = 'cancelled'  // 已取消
}

// 时间线事件接口
export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  status: TimelineEventStatus;
  title: string;
  description?: string;
  date: string;
  icon?: string;
  isImportant?: boolean; // 是否为重要事件
}

// 时间线组件 Props
export interface ProposalTimelineProps {
  proposalUri: string | null;
  className?: string;
}
