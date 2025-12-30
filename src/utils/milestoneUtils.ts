import { Milestone, MilestoneStatus } from '../types/milestone';
import { Proposal, ProposalStatus } from './proposalUtils';
import { MilestoneVotingInfo, MilestoneVoteOption, MilestoneVotingStatus } from '../types/milestoneVoting';

// 根据提案生成里程碑数据
export const generateMilestones = (proposal: Proposal): Milestone[] => {
  const milestones: Milestone[] = [];
  const createdAt = new Date(proposal.createdAt);
  
  // 所有提案都可以显示里程碑计划

  // 确定项目启动里程碑的状态
  let startMilestoneStatus: MilestoneStatus;
  let startMilestoneProgress: number;
  
  // 使用数值比较，因为枚举别名可能无法正确识别
  const stateValue = typeof proposal.state === 'number' ? proposal.state : Number(proposal.state);
  if (stateValue === ProposalStatus.DRAFT || 
      stateValue === ProposalStatus.INITIATION_VOTE) {
    // 提案还未通过，启动里程碑处于待开始状态
    startMilestoneStatus = MilestoneStatus.PENDING;
    startMilestoneProgress = 0;
  } else if (stateValue === ProposalStatus.COMPLETED) {
    // 提案已完成或被拒绝，里程碑取消
    startMilestoneStatus = MilestoneStatus.CANCELLED;
    startMilestoneProgress = 0;
  } else {
    // 提案已通过，启动里程碑完成
    startMilestoneStatus = MilestoneStatus.COMPLETED;
    startMilestoneProgress = 100;
  }

  // 项目启动里程碑
  milestones.push({
    id: `${proposal.id}-start`,
    index: 0,
    title: '项目启动',
    description: '项目正式启动，团队组建完成',
    status: startMilestoneStatus,
    startDate: new Date(createdAt.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(createdAt.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    progress: startMilestoneProgress,
    deliverables: ['团队组建', '项目规划', '技术架构设计']
  });

  // 根据提案状态确定当前里程碑
  const currentMilestone = proposal.milestones?.current || 1;
  const totalMilestones = proposal.milestones?.total || 3;

  // 生成各个里程碑
  for (let i = 1; i <= totalMilestones; i++) {
    const startDate = new Date(createdAt.getTime() + (25 + (i - 1) * 30) * 24 * 60 * 60 * 1000);
    const endDate = new Date(createdAt.getTime() + (25 + i * 30) * 24 * 60 * 60 * 1000);
    
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
    } else if (i < currentMilestone) {
      status = MilestoneStatus.COMPLETED;
      progress = 100;
    } else if (i === currentMilestone) {
      status = MilestoneStatus.IN_PROGRESS;
      progress = proposal.milestones?.progress || 0;
    } else {
      status = MilestoneStatus.PENDING;
      progress = 0;
    }

    const milestoneId = `${proposal.id}-milestone-${i}`;
    
    // 只为进行中且提案状态为执行阶段的里程碑生成投票信息
    let votingInfo: MilestoneVotingInfo | undefined;
    if (status === MilestoneStatus.IN_PROGRESS && 
        proposal.state === ProposalStatus.MILESTONE) {
      votingInfo = generateMilestoneVotingInfo(proposal, milestoneId);
    }

    milestones.push({
      id: milestoneId,
      index: i,
      title: `里程碑 ${i}`,
      description: `项目第 ${i} 个重要阶段`,
      status,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      progress,
      deliverables: [
        `功能模块 ${i} 开发`,
        `测试与调试`,
        `文档编写`
      ],
      votingInfo
    });
  }

  return milestones;
};

// 生成里程碑投票信息
const generateMilestoneVotingInfo = (proposal: Proposal, milestoneId: string): MilestoneVotingInfo => {
  const createdAt = new Date(proposal.createdAt);
  const endTime = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000); // 3天后结束
  
  // 模拟投票数据
  const totalVotes = 8000000;
  const approveVotes = 6000000;
  const rejectVotes = 2000000;
  const approveRate = (approveVotes / totalVotes) * 100;
  const rejectRate = (rejectVotes / totalVotes) * 100;
  
  // 模拟用户投票权
  const userVotingPower = 1000000;
  
  // 模拟用户投票（30%概率已投票）
  const userVote = Math.random() < 0.3 ? 
    (Math.random() < 0.7 ? MilestoneVoteOption.APPROVE : MilestoneVoteOption.REJECT) : 
    undefined;
  
  // 投票要求
  const minTotalVotes = 5000000;
  const minApproveRate = 49;
  
  // 检查是否满足要求
  const isRequirementMet = {
    totalVotes: totalVotes >= minTotalVotes,
    approveRate: approveRate >= minApproveRate
  };
  
  // 确定投票状态
  let status: MilestoneVotingStatus;
  if (isRequirementMet.totalVotes && isRequirementMet.approveRate) {
    status = MilestoneVotingStatus.APPROVED;
  } else if (isRequirementMet.totalVotes && !isRequirementMet.approveRate) {
    status = MilestoneVotingStatus.REJECTED;
  } else {
    status = MilestoneVotingStatus.IN_PROGRESS;
  }
  
  return {
    milestoneId,
    milestoneTitle: `里程碑 ${milestoneId.split('-').pop()}`,
    status,
    endTime: endTime.toISOString(),
    totalVotes,
    approveVotes,
    rejectVotes,
    approveRate,
    rejectRate,
    userVote,
    userVotingPower,
    requirements: {
      minTotalVotes,
      minApproveRate
    },
    isRequirementMet
  };
};
