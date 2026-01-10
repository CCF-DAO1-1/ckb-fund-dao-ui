import { TimelineEvent, TimelineEventType, TimelineEventStatus } from '../types/timeline';
import { Proposal, ProposalStatus } from './proposalUtils';

interface TimelineMessages {
  proposalPublished: string;
  proposalPublishedDesc: string;
  communityReview: string;
  communityReviewDesc: string;
  proposalVoting: string;
  proposalVotingDesc: string;
  proposalApproved: string;
  proposalApprovedDesc: string;
  proposalRejected: string;
  proposalRejectedDesc: string;
  milestoneInProgress: string;
  milestoneInProgressDesc: string;
  projectCompleted: string;
  projectCompletedDesc: string;
}

// 根据提案状态生成当前阶段的时间线事件
export const generateTimelineEvents = (
  proposal: Proposal,
  messages: TimelineMessages
): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  const createdAt = new Date(proposal.createdAt);

  // 基础事件：默认事件（提案创建）
  events.push({
    id: `${proposal.id}-published`,
    type: TimelineEventType.DEFAULT,
    status: TimelineEventStatus.COMPLETED,
    title: messages.proposalPublished,
    description: messages.proposalPublishedDesc.replace('{title}', proposal.title),
    date: proposal.createdAt,
    isImportant: true
  });

  // 根据提案状态添加相应事件
  switch (proposal.state) {
    case ProposalStatus.REVIEW:
      // 审议阶段 - 创建 AMA 会议
      events.push({
        id: `${proposal.id}-review-start`,
        type: TimelineEventType.CREATE_AMA,
        status: TimelineEventStatus.IN_PROGRESS,
        title: messages.communityReview,
        description: messages.communityReviewDesc,
        date: new Date(createdAt.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isImportant: true
      });
      break;

    case ProposalStatus.VOTE:
      // 投票阶段 - 立项投票
      events.push({
        id: `${proposal.id}-vote-start`,
        type: TimelineEventType.INITIATION_VOTE,
        status: TimelineEventStatus.IN_PROGRESS,
        title: messages.proposalVoting,
        description: messages.proposalVotingDesc,
        date: new Date(createdAt.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isImportant: true
      });
      break;

    case ProposalStatus.APPROVED:
      // 执行阶段 - 发送启动资金
      events.push({
        id: `${proposal.id}-approved`,
        type: TimelineEventType.SEND_INITIAL_FUND,
        status: TimelineEventStatus.COMPLETED,
        title: messages.proposalApproved,
        description: messages.proposalApprovedDesc,
        date: new Date(createdAt.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isImportant: true
      });
      break;

    case ProposalStatus.REJECTED:
      // 已拒绝 - 使用默认事件类型
      events.push({
        id: `${proposal.id}-rejected`,
        type: TimelineEventType.DEFAULT,
        status: TimelineEventStatus.COMPLETED,
        title: messages.proposalRejected,
        description: messages.proposalRejectedDesc,
        date: new Date(createdAt.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isImportant: true
      });
      break;

    case ProposalStatus.MILESTONE:
      // 执行阶段 - 提交里程碑报告
      if (proposal.milestones) {
        const currentMilestone = proposal.milestones.current;
        events.push({
          id: `${proposal.id}-milestone-${currentMilestone}`,
          type: TimelineEventType.SUBMIT_MILESTONE_REPORT,
          status: TimelineEventStatus.IN_PROGRESS,
          title: messages.milestoneInProgress.replace('{number}', currentMilestone.toString()),
          description: messages.milestoneInProgressDesc.replace('{number}', currentMilestone.toString()),
          date: new Date(createdAt.getTime() + (20 + (currentMilestone - 1) * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          isImportant: true
        });
      }
      break;

    case ProposalStatus.ENDED:
      // 项目完成 - 提交验收报告
      events.push({
        id: `${proposal.id}-completed`,
        type: TimelineEventType.SUBMIT_ACCEPTANCE_REPORT,
        status: TimelineEventStatus.COMPLETED,
        title: messages.projectCompleted,
        description: messages.projectCompletedDesc,
        date: new Date(createdAt.getTime() + 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isImportant: true
      });
      break;
  }

  return events;
};

