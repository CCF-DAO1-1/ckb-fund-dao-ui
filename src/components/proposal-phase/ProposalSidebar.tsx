"use client";

import { useState, useEffect, useMemo } from "react";
import { ProposalTimeline, ProposalVoting, MilestoneTracking } from "@/components/proposal-phase";
import { Milestone } from "@/types/milestone";
import { ProposalDetailResponse } from "@/server/proposal";
import { generateMilestones } from "@/utils/milestoneUtils";
import { Proposal, ProposalStatus } from "@/utils/proposalUtils";
import { useVoteWeight } from "@/hooks/useVoteWeight";
import { getUserDisplayNameFromInfo } from "@/utils/userDisplayUtils";
import { getAvatarByDid } from "@/utils/avatarUtils";

interface ProposalSidebarProps {
  proposal: ProposalDetailResponse | null;
}

// 适配器函数：将API返回的ProposalDetailResponse转换为工具函数期望的Proposal类型
const adaptProposalDetail = (detail: ProposalDetailResponse): Proposal => {
  const proposalData = detail.record.data;

  const milestonesInfo = proposalData.milestones && proposalData.milestones.length > 0 ? {
    current: 1,
    total: proposalData.milestones.length,
    progress: 0,
  } : undefined;
  
  return {
    id: detail.cid,
    title: proposalData.title,
    state: (detail.state ?? proposalData.state) as ProposalStatus,
    type: proposalData.proposalType as Proposal["type"],
    proposer: {
      name: getUserDisplayNameFromInfo({
        displayName: detail.author.displayName,
        handle: detail.author.handle,
        did: detail.author.did,
      }),
      avatar: getAvatarByDid(detail.author.did),
      did: detail.author.did,
    },
    budget: parseFloat(proposalData.budget) || 0,
    createdAt: detail.record.created,
    description: proposalData.background || '',
    milestones: milestonesInfo,
    category: proposalData.proposalType,
    tags: [],
  };
};

export default function ProposalSidebar({ proposal }: ProposalSidebarProps) {
  const { voteWeight } = useVoteWeight();
  
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  // 使用 useMemo 稳定 voteMetaId 的值，避免因 proposal 对象引用变化导致的重复调用
  const voteMetaId = useMemo(() => {
    if (!proposal?.vote_meta?.id) return null;
    const id = Number(proposal.vote_meta.id);
    return isNaN(id) ? null : id;
  }, [proposal?.vote_meta?.id]);

  // 使用 useMemo 稳定 proposalUri 的值，避免因 proposal 对象引用变化导致的重复调用
  const proposalUri = useMemo(() => {
    return proposal?.uri || null;
  }, [proposal?.uri]);

  // 生成里程碑信息
  useEffect(() => {
    if (!proposal) return;
    
    const adaptedProposal = adaptProposalDetail(proposal);
    
    // 如果是执行阶段，生成里程碑信息
    if (adaptedProposal.state === ProposalStatus.MILESTONE || 
        adaptedProposal.state === ProposalStatus.APPROVED || 
        adaptedProposal.state === ProposalStatus.ENDED) {
      const milestoneData = generateMilestones(adaptedProposal);
      setMilestones(milestoneData);
    } else {
      setMilestones([]);
    }
  }, [proposal]);

  if (!proposal) {
    return null;
  }

  // 判断是否显示投票组件
  const adaptedProposal = adaptProposalDetail(proposal);
  const showVoting = adaptedProposal.state === ProposalStatus.VOTE && proposal.vote_meta;

  return (
    <div className="proposal-sidebar">
      {/* 投票组件 - 仅在投票阶段显示 */}
      {showVoting && (
        <ProposalVoting 
          proposal={proposal}
          voteMetaId={voteMetaId}
          voteWeight={voteWeight}
        />
      )}
      
      {/* 里程碑追踪组件 - 仅在执行阶段显示 */}
      {milestones.length > 0 && (
        <MilestoneTracking 
          milestones={milestones}
          currentMilestone={proposal.state - 1000 || 1}
          totalMilestones={proposal.record.data.milestones?.length || 3}
        />
      )}
      
      <ProposalTimeline 
        proposalUri={proposalUri} 
      />
    </div>
  );
}
