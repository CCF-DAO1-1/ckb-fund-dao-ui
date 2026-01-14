import { Milestone, MilestoneStatus } from '../types/milestone';
import { Proposal, ProposalStatus } from './proposalUtils';

// 根据提案生成里程碑数据
export const generateMilestones = (proposal: Proposal): Milestone[] => {
  const milestones: Milestone[] = [];
  const createdAt = new Date(proposal.createdAt);

  // 从 API 获取当前里程碑索引（0-based）
  // progress 字段表示当前里程碑在数组中的下标
  const currentMilestoneIndex = ('progress' in proposal) ? proposal.progress : undefined;

  // 根据提案数据确定里程碑总数
  const totalMilestones = proposal.milestones?.total || 3;

  // 生成各个里程碑
  for (let i = 0; i < totalMilestones; i++) {
    const startDate = new Date(createdAt.getTime() + (i * 30) * 24 * 60 * 60 * 1000);
    const endDate = new Date(createdAt.getTime() + ((i + 1) * 30) * 24 * 60 * 60 * 1000);

    let status: MilestoneStatus;
    let progress = 0;

    // 根据提案状态和里程碑位置确定里程碑状态
    // 使用数值比较，因为枚举别名可能无法正确识别
    const stateValue = typeof proposal.state === 'number' ? proposal.state : Number(proposal.state);
    if (stateValue === ProposalStatus.DRAFT ||
      stateValue === ProposalStatus.INITIATION_VOTE) {
      // 提案还未通过，所有里程碑都是待开始状态
      status = MilestoneStatus.PENDING;
      progress = 0;
    } else if (proposal.state === ProposalStatus.REJECTED) {
      // 提案被拒绝，里程碑取消
      status = MilestoneStatus.CANCELLED;
      progress = 0;
    } else if (currentMilestoneIndex !== undefined) {
      // 使用 API 返回的 progress 字段（里程碑索引）来确定状态
      // progress 字段是里程碑数组的下标（0-based）
      // i 现在也是从 0 开始的数组索引

      if (i < currentMilestoneIndex) {
        // 当前里程碑索引之前的里程碑已完成
        status = MilestoneStatus.COMPLETED;
        progress = 100;
      } else if (i === currentMilestoneIndex) {
        // 当前里程碑索引对应的里程碑正在进行
        status = MilestoneStatus.IN_PROGRESS;
        // 对于进行中的里程碑，显示 50% 进度（或者可以根据其他信息计算）
        progress = 50;
      } else {
        // 当前里程碑索引之后的里程碑待开始
        status = MilestoneStatus.PENDING;
        progress = 0;
      }
    } else {
      // 如果没有 progress 信息，回退到使用 milestones.current
      const currentMilestone = proposal.milestones?.current || 1;
      // currentMilestone 是 1-based，需要转换为 0-based
      if (i < currentMilestone - 1) {
        status = MilestoneStatus.COMPLETED;
        progress = 100;
      } else if (i === currentMilestone - 1) {
        status = MilestoneStatus.IN_PROGRESS;
        progress = proposal.milestones?.progress || 50;
      } else {
        status = MilestoneStatus.PENDING;
        progress = 0;
      }
    }

    const milestoneId = `${proposal.id}-milestone-${i}`;

    // 只为进行中且提案状态为执行阶段的里程碑生成投票信息
    let voteMetaId: number | undefined;
    if (status === MilestoneStatus.IN_PROGRESS &&
      stateValue === ProposalStatus.MILESTONE_VOTE &&
      proposal.vote_meta) {
      voteMetaId = proposal.vote_meta.id;
    }

    milestones.push({
      id: milestoneId,
      index: i,
      title: `里程碑 ${i + 1}`,
      description: `项目第 ${i + 1} 个重要阶段`,
      status,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      progress,
      deliverables: [
        `功能模块 ${i + 1} 开发`,
        `测试与调试`,
        `文档编写`
      ],
      voteMetaId
    });
  }

  return milestones;
};
