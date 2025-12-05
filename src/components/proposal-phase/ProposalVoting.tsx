"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ProposalVotingProps,
  VoteOption,
  VotingStatus,
} from "../../types/voting";
import { formatNumber } from "../../utils/proposalUtils";
import { useI18n } from "@/contexts/I18nContext";
import "./voting.css";
import ProposalVotingConditions from "./ProposalVotingConditions";

export default function ProposalVoting({
  votingInfo,
  userVoteInfo,
  onVote,
  className = "",
  isVoting = false,
  proposalType,
  budget,
}: ProposalVotingProps) {
  const { messages } = useI18n();
  const [timeLeft, setTimeLeft] = useState("");
  const [showRevoteOptions, setShowRevoteOptions] = useState(false);

  // 根据 userVote 或 userVoteIndex 确定用户投票选项
  // userVoteIndex: 1 = Agree (赞成), 2 = Against (反对)
  // 优先使用 userVote，如果不存在则根据 userVoteIndex 计算
  // 使用 useMemo 优化，避免重复计算
  const userVote = useMemo(() => {
    console.log("ProposalVoting userVoteInfo:", userVoteInfo);
    if (!userVoteInfo) return undefined;

    if (userVoteInfo.userVote) {
      return userVoteInfo.userVote;
    }

    if (userVoteInfo.userVoteIndex !== undefined) {
      return userVoteInfo.userVoteIndex === 1
        ? VoteOption.APPROVE
        : VoteOption.REJECT;
    }

    return undefined;
  }, [userVoteInfo]);

  // 检查投票是否正在上链中（state === 0）
  const isChainPending = useMemo(() => {
    return userVoteInfo?.voteState === 0;
  }, [userVoteInfo?.voteState]);

  // 计算倒计时
  useEffect(() => {
    if (!votingInfo) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const endTime = new Date(votingInfo.endTime).getTime();
      const difference = endTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60)
        );

        setTimeLeft(`${days}D ${hours}H ${minutes} M`);
      } else {
        setTimeLeft(messages.proposalPhase.proposalVoting.timeLeft.ended);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // 每分钟更新一次

    return () => clearInterval(timer);
  }, [votingInfo, messages.proposalPhase.proposalVoting.timeLeft]);

  // 处理投票
  const handleVote = (option: VoteOption) => {
    if (votingInfo.status === VotingStatus.ENDED) return;
    // 如果投票正在上链中，不允许再次投票
    if (isChainPending) return;
    // 如果正在投票中，不允许操作
    if (isVoting) return;

    // 如果是重新投票，隐藏投票选项
    if (showRevoteOptions) {
      setShowRevoteOptions(false);
    }

    onVote(option);
  };

  // 如果 votingInfo 不存在，不渲染组件
  if (!votingInfo) {
    return null;
  }

  // 计算百分比
  const approveRate =
    votingInfo.totalVotes > 0
      ? (votingInfo.approveVotes / votingInfo.totalVotes) * 100
      : 0;
  const rejectRate =
    votingInfo.totalVotes > 0
      ? (votingInfo.rejectVotes / votingInfo.totalVotes) * 100
      : 0;

  // 检查用户是否已投票（且不在上链中）
  const hasVoted = userVote !== undefined;

  // 如果用户点击了重新投票，则显示投票选项
  const shouldShowVoteButtons = !hasVoted || showRevoteOptions;

  return (
    <div className={`proposal-voting-card ${className}`} style={{ position: 'relative' }}>
      {/* 投票进行中遮罩层 */}
      {isVoting && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            pointerEvents: 'all',
            cursor: 'not-allowed',
          }}
        >
          <div style={{ color: '#fff', fontSize: '16px', fontWeight: '500' }}>
            {(messages.proposalPhase.proposalVoting as { voting?: string })?.voting || '投票处理中...'}
          </div>
        </div>
      )}
      {/* 标题和倒计时 */}
      <div className="voting-header">
        <h3 className="voting-title">
          {messages.proposalPhase.proposalVoting.title}
        </h3>
        <div className="voting-countdown">
          <span>
            {messages.proposalPhase.proposalVoting.deadline} {timeLeft}
          </span>
        </div>
      </div>

      {/* 投票统计 */}
      <div className="voting-stats">
        <div className="voting-total">
          <span>
            {messages.proposalPhase.proposalVoting.totalVotes}{" "}
            {formatNumber(votingInfo.totalVotes / 100000000)} CKB
          </span>
        </div>

        {/* 进度条 */}
        <div className="voting-progress">
          <div className="progress-bar">
            <div
              className="progress-approve"
              style={{ width: `${approveRate}%` }}
            ></div>
            <div
              className="progress-reject"
              style={{ width: `${rejectRate}%` }}
            ></div>
          </div>
        </div>

        {/* 投票结果 */}
        <div className="voting-results">
          <div className="vote-result approve">
            <span className="vote-label">
              {messages.proposalPhase.proposalVoting.approve}{" "}
              {approveRate.toFixed(1)}%
            </span>
            <span className="vote-count">
              ({formatNumber(votingInfo.approveVotes / 100000000)} CKB)
            </span>
          </div>
          <div className="vote-result reject">
            <span className="vote-label">
              {messages.proposalPhase.proposalVoting.reject}{" "}
              {rejectRate.toFixed(1)}%
            </span>
            <span className="vote-count">
              ({formatNumber(votingInfo.rejectVotes / 100000000)} CKB)
            </span>
          </div>
        </div>
      </div>

      {/* 已投票状态：投票成功信息和已投票计数 */}
      {hasVoted && userVote !== undefined && !showRevoteOptions && (
        <div className="voting-success-section">
          <div className="vote-success-message">
            <span className="success-text">
              {(
                messages.proposalPhase.proposalVoting as {
                  voteSuccess?: string;
                }
              ).voteSuccess || "投票成功！"}
            </span>
            <span className="voted-count">
              {userVote === VoteOption.APPROVE
                ? `${(
                  messages.proposalPhase.proposalVoting as {
                    votedApprove?: string;
                  }
                ).votedApprove || "已投赞成"
                } : ${formatNumber(votingInfo.userVotingPower / 100000000)}`
                : `${(
                  messages.proposalPhase.proposalVoting as {
                    votedReject?: string;
                  }
                ).votedReject || "已投反对"
                } : ${formatNumber(votingInfo.userVotingPower / 100000000)}`}
            </span>
          </div>
          <div className="refresh-delay-message">
            {(
              messages.proposalPhase.proposalVoting as { refreshDelay?: string }
            ).refreshDelay || "投票结果的刷新存在一定延迟,请耐心等待。"}
          </div>
        </div>
      )}
      {/* 已投票状态：重新投票按钮 */}
      {hasVoted &&
        userVote !== undefined &&
        votingInfo.status !== VotingStatus.ENDED &&
        !showRevoteOptions && (
          <div className="voting-revote-section">
            <button
              className="revote-button"
              onClick={() => {
                // 显示投票选项，允许用户重新投票
                setShowRevoteOptions(true);
              }}
              disabled={isVoting}
            >
              {(messages.proposalPhase.proposalVoting as { revote?: string })
                .revote || "重新投票"}
            </button>
          </div>
        )}

      {/* 投票按钮 */}
      {votingInfo.status !== VotingStatus.ENDED && shouldShowVoteButtons && (
        <div className="voting-buttons">
          <div className="voting-buttons-row">
            <button
              className={`vote-button approve ${userVote !== undefined && userVote === VoteOption.APPROVE ? "selected" : ""
                }`}
              onClick={() => handleVote(VoteOption.APPROVE)}
              disabled={isChainPending || isVoting}
            >
              <img src="/icon/agree.svg" alt="agree" className="vote-icon" />
              {messages.proposalPhase.proposalVoting.approve}
            </button>
            <button
              className={`vote-button reject ${userVote !== undefined && userVote === VoteOption.REJECT ? "selected" : ""
                }`}
              onClick={() => handleVote(VoteOption.REJECT)}
              disabled={isChainPending || isVoting}
            >
              <img
                src="/icon/against.svg"
                alt="against"
                className="vote-icon"
              />
              {messages.proposalPhase.proposalVoting.reject}
            </button>
          </div>
          {(isChainPending || isVoting) && (
            <div className="chain-pending-message">
              {isVoting
                ? (messages.proposalPhase.proposalVoting as { voting?: string })?.voting || "投票处理中..."
                : (
                  messages.proposalPhase.proposalVoting as {
                    chainPending?: string;
                  }
                ).chainPending || "投票结果上链中"}
            </div>
          )}
        </div>
      )}

      {/* 我的投票权 */}

      <span>{messages.proposalPhase.proposalVoting.myVotingPower} </span>
      <span className="power-amount">
        {formatNumber(votingInfo.userVotingPower / 100000000)} CKB
      </span>

      {/* 分隔线 */}
      <div className="voting-divider"></div>

      {/* 通过条件 */}
      <ProposalVotingConditions
        votingInfo={votingInfo}
        proposalType={proposalType}
        budget={budget}
      />
    </div>
  );
}
