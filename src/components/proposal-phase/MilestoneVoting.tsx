'use client';

import { useState, useEffect } from 'react';
import { MilestoneVotingProps, MilestoneVoteOption, MilestoneVotingStatus } from '../../types/milestoneVoting';
import { useI18n } from '@/contexts/I18nContext';
import './milestoneVoting.css';

export default function MilestoneVoting({
  votingInfo,
  onVote,
  className = ''
}: MilestoneVotingProps) {
  const { messages, locale } = useI18n();
  const [timeLeft, setTimeLeft] = useState('');
  const [userVote, setUserVote] = useState<MilestoneVoteOption | undefined>(votingInfo.userVote);

  // 计算倒计时
  useEffect(() => {
    if (!votingInfo) return;

    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const endTime = new Date(votingInfo.endTime).getTime();
      const timeDiff = endTime - now;

      if (timeDiff <= 0) {
        setTimeLeft(messages.proposalPhase.milestoneVoting.timeLeft.ended);
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${days}${messages.proposalPhase.milestoneVoting.timeLeft.days}${hours}${messages.proposalPhase.milestoneVoting.timeLeft.hours}${minutes}${messages.proposalPhase.milestoneVoting.timeLeft.minutes}`);
    };

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 60000); // 每分钟更新一次

    return () => clearInterval(timer);
  }, [votingInfo, messages.proposalPhase.milestoneVoting.timeLeft]);

  // 处理投票
  const handleVote = (option: MilestoneVoteOption) => {
    if (votingInfo.status === MilestoneVotingStatus.ENDED ||
      votingInfo.status === MilestoneVotingStatus.APPROVED ||
      votingInfo.status === MilestoneVotingStatus.REJECTED) return;

    setUserVote(option);
    onVote(votingInfo.milestoneId, option);
  };

  // 格式化数字
  const formatNumber = (num: number) => {
    // 将 locale 映射到数字格式化语言代码
    const numberLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    return num.toLocaleString(numberLocale);
  };

  // 格式化百分比
  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  if (!votingInfo) {
    return null;
  }

  return (
    <div className={`milestone-voting-card ${className}`}>
      <div className="milestone-voting-header">
        <h3 className="milestone-voting-title">{votingInfo.milestoneTitle}{messages.proposalPhase.milestoneVoting.confirmVoting}</h3>
        <div className="milestone-voting-time">
          {messages.proposalPhase.milestoneVoting.deadline} {timeLeft}
        </div>
      </div>

      <div className="milestone-voting-stats">
        <div className="voting-stat">
          <span>{messages.proposalPhase.milestoneVoting.totalVotes} {formatNumber(votingInfo.totalVotes / 100000000)} CKB</span>
        </div>

        <div className="milestone-voting-progress">
          <div className="progress-bar">
            <div
              className="progress-approve"
              style={{ width: `${votingInfo.approveRate}%` }}
            ></div>
            <div
              className="progress-reject"
              style={{ width: `${votingInfo.rejectRate}%` }}
            ></div>
          </div>
        </div>

        <div className="progress-labels">
          <div className="progress-label approve">
            <span className="label-text">{messages.proposalPhase.milestoneVoting.approve} {formatPercentage(votingInfo.approveRate)}</span>
            <span className="vote-count">({formatNumber(votingInfo.approveVotes / 100000000)} CKB)</span>
          </div>
          <div className="progress-label reject">
            <span className="label-text">{messages.proposalPhase.milestoneVoting.reject} {formatPercentage(votingInfo.rejectRate)}</span>
            <span className="vote-count">({formatNumber(votingInfo.rejectVotes / 100000000)} CKB)</span>
          </div>
        </div>
      </div>

      {(votingInfo.status === MilestoneVotingStatus.PENDING || votingInfo.status === MilestoneVotingStatus.IN_PROGRESS) && (
        <div className="milestone-voting-actions">
          <button
            className={`vote-button approve ${userVote === MilestoneVoteOption.APPROVE ? 'selected' : ''}`}
            onClick={() => handleVote(MilestoneVoteOption.APPROVE)}
            disabled={false}
          >
            👍 {messages.proposalPhase.milestoneVoting.approveFunding}
          </button>
          <button
            className={`vote-button reject ${userVote === MilestoneVoteOption.REJECT ? 'selected' : ''}`}
            onClick={() => handleVote(MilestoneVoteOption.REJECT)}
            disabled={false}
          >
            👎 {messages.proposalPhase.milestoneVoting.rejectFunding}
          </button>
        </div>
      )}

      <div className="milestone-voting-power">
        <span>{messages.proposalPhase.milestoneVoting.myVotingPower} </span>
        <span className="power-value">{formatNumber(votingInfo.userVotingPower / 100000000)} CKB</span>
      </div>

      <div className="milestone-voting-requirements">
        <h4 className="requirements-title">{messages.proposalPhase.milestoneVoting.requirements.title}</h4>
        <div className="requirement-item">
          <div className="requirement-info">
            <span className="requirement-label">{messages.proposalPhase.milestoneVoting.requirements.minTotalVotes}</span>
            <span className="requirement-value">
              {formatNumber(votingInfo.totalVotes / 100000000)} / {formatNumber(votingInfo.requirements.minTotalVotes)} CKB
            </span>
          </div>
          <div className={`requirement-status ${votingInfo.isRequirementMet.totalVotes ? 'met' : 'not-met'}`}>
            {votingInfo.isRequirementMet.totalVotes ? '✓' : '✗'}
          </div>
        </div>
        <div className="requirement-item">
          <div className="requirement-info">
            <span className="requirement-label">{messages.proposalPhase.milestoneVoting.requirements.approveRate}</span>
            <span className="requirement-value">
              {formatPercentage(votingInfo.approveRate)} / {formatPercentage(votingInfo.requirements.minApproveRate)}
            </span>
          </div>
          <div className={`requirement-status ${votingInfo.isRequirementMet.approveRate ? 'met' : 'not-met'}`}>
            {votingInfo.isRequirementMet.approveRate ? '✓' : '✗'}
          </div>
        </div>
      </div>
    </div>
  );
}
