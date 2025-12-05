"use client";

import { useMemo } from "react";
import { VotingInfo } from "../../types/voting";
import { formatNumber } from "../../utils/proposalUtils";
import { useI18n } from "@/contexts/I18nContext";
import "./voting.css";
import { IoCheckmarkCircleOutline } from "react-icons/io5";

interface ProposalVotingConditionsProps {
  votingInfo: VotingInfo;
  proposalType?: string; // 提案类型，如 "funding" 或 "governance"
  budget?: string | number; // 预算金额（CKB），资金申请类提案需要
  className?: string;
}

/**
 * 提案投票通过条件组件
 * 
 * 显示投票通过的两个条件：
 * 1. 最低投票权重总数
 * 2. 赞成票数占比
 * 3. 根据提案类型显示的投票通过条件说明
 */
export default function ProposalVotingConditions({
  votingInfo,
  proposalType,
  budget,
  className = "",
}: ProposalVotingConditionsProps) {
  const { messages } = useI18n();

  // 计算百分比
  const approveRate = useMemo(() => {
    return votingInfo.totalVotes > 0
      ? (votingInfo.approveVotes / votingInfo.totalVotes) * 100
      : 0;
  }, [votingInfo.totalVotes, votingInfo.approveVotes]);

  // 检查通过条件
  const totalVotesMet = useMemo(() => {
    return votingInfo.totalVotes >= votingInfo.conditions.minTotalVotes;
  }, [votingInfo.totalVotes, votingInfo.conditions.minTotalVotes]);

  const approvalRateMet = useMemo(() => {
    return approveRate >= votingInfo.conditions.minApprovalRate;
  }, [approveRate, votingInfo.conditions.minApprovalRate]);

  return (
    <div className={`voting-conditions ${className}`}>
      <h4 className="conditions-title">
        {messages.proposalPhase.proposalVoting.conditions.title}
      </h4>

      <div className="condition-item">
        <span>
          {messages.proposalPhase.proposalVoting.conditions.minTotalVotes}
        </span>
        <span className="condition-values">
          {formatNumber(votingInfo.totalVotes / 100000000)} /{" "}
          {formatNumber(votingInfo.conditions.minTotalVotes)} CKB
        </span>

        <div
          className={`condition-status ${totalVotesMet ? "met" : "not-met"}`}
        >
          {totalVotesMet ? (
            <IoCheckmarkCircleOutline size={16} />
          ) : (
            <span>×</span>
          )}
        </div>
      </div>

      <div className="condition-item">
        <span>
          {messages.proposalPhase.proposalVoting.conditions.approveRate}
        </span>
        <span className="condition-values">
          {approveRate.toFixed(1)}% / {votingInfo.conditions.minApprovalRate}%
        </span>

        <div
          className={`condition-status ${approvalRateMet ? "met" : "not-met"
            }`}
        >
          {approvalRateMet ? (
            <IoCheckmarkCircleOutline size={16} />
          ) : (
            <span>×</span>
          )}
        </div>
      </div>


    </div>
  );
}

