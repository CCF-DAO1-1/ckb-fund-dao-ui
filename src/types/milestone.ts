import { MilestoneVotingInfo } from './milestoneVoting';
import { Proposal } from '@/utils/proposalUtils';
import { ProposalDetailResponse } from '@/server/proposal';

// 里程碑状态枚举
export enum MilestoneStatus {
  PENDING = 'pending',       // 待开始
  IN_PROGRESS = 'in_progress', // 进行中
  COMPLETED = 'completed',   // 已完成
  CANCELLED = 'cancelled'    // 已取消
}

// 里程碑接口
export interface Milestone {
  id: string;
  index: number; // 里程碑索引，从0开始
  title: string;
  description: string;
  status: MilestoneStatus;
  startDate: string;
  endDate: string;
  progress: number; // 0-100 百分比
  deliverables?: string[]; // 交付物列表
  /** @deprecated Use voteMetaId instead */
  votingInfo?: MilestoneVotingInfo;
  voteMetaId?: number;
}

// 里程碑追踪组件 Props
export interface MilestoneTrackingProps {
  milestones: Milestone[];
  currentMilestone: number;
  totalMilestones: number;
  className?: string;
  voteWeight: number;
  proposal: Proposal | ProposalDetailResponse;
}
