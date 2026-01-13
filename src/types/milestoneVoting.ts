// 里程碑投票状态枚举
export enum MilestoneVotingStatus {
  PENDING = 'pending',       // 待投票
  IN_PROGRESS = 'in_progress', // 投票中
  APPROVED = 'approved',     // 已通过
  REJECTED = 'rejected',     // 已拒绝
  ENDED = 'ended'           // 已结束
}

// 里程碑投票选项
export enum MilestoneVoteOption {
  APPROVE = 'approve',       // 赞成拨款
  REJECT = 'reject'          // 反对拨款
}

// 里程碑投票信息接口
export interface MilestoneVotingInfo {
  milestoneId: string;
  milestoneTitle: string;
  status: MilestoneVotingStatus;
  endTime: string;           // 投票截止时间
  totalVotes: number;        // 总票数
  approveVotes: number;      // 赞成票数
  rejectVotes: number;       // 反对票数
  approveRate: number;       // 赞成票占比
  rejectRate: number;        // 反对票占比
  userVote?: MilestoneVoteOption; // 用户投票
  userVotingPower: number;   // 用户投票权
  requirements: {
    minTotalVotes: number;   // 最低投票总数
    minApproveRate: number;  // 最低赞成票占比
  };
  isRequirementMet: {
    totalVotes: boolean;     // 是否满足最低投票数
    approveRate: boolean;    // 是否满足最低赞成率
  };
}

import { ProposalDetailResponse } from '@/server/proposal';
import { Proposal } from '@/utils/proposalUtils';
import { VotingDetailsData } from '@/types/voting';

// 里程碑投票组件 Props
export interface MilestoneVotingProps {
  voteMetaId?: number;
  voteWeight: number;
  proposal: Proposal | ProposalDetailResponse;
  milestoneTitle: string;
  className?: string;
  finishedResult?: VotingDetailsData; // 结束的投票结果（来自时间线）
}
