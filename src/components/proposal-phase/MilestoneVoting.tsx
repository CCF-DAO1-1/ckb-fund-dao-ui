"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MilestoneVotingProps, MilestoneVoteOption } from '../../types/milestoneVoting';
import { VotingInfo, VoteOption, VotingStatus, UserVoteInfo } from '../../types/voting';
import { useI18n } from '@/contexts/I18nContext';
import { useWallet } from "@/provider/WalletProvider";
import useUserInfoStore from "@/store/userInfo";
import { getVoteDetail, getVoteStatus, updateVoteTxHash, VoteRecord, VoteDetailResponse } from "@/server/proposal";
import { generateVotingInfo, handleVote as handleVoteUtil, buildAndSendVoteTransaction } from "@/utils/votingUtils";
import { generateSignature } from "@/lib/signature";
import { logger } from '@/lib/logger';
import { SuccessModal, Modal } from "@/components/ui/modal";
import { MdErrorOutline } from "react-icons/md";
import './milestoneVoting.css';

export default function MilestoneVoting({
  voteMetaId,
  voteWeight,
  proposal,
  milestoneTitle,
  className = '',
  finishedResult
}: MilestoneVotingProps) {
  const { messages, locale } = useI18n();
  const { userInfo } = useUserInfoStore();
  const { signer, walletClient, openSigner, isConnected } = useWallet();

  const [votingInfo, setVotingInfo] = useState<VotingInfo | null>(null);
  const [userVoteInfo, setUserVoteInfo] = useState<UserVoteInfo | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const [showVoteSuccessModal, setShowVoteSuccessModal] = useState(false);
  const [showVoteErrorModal, setShowVoteErrorModal] = useState(false);
  const [voteErrorMessage, setVoteErrorMessage] = useState<string>('');

  // Format helpers
  const formatNumber = (num: number) => {
    const numberLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    return num.toLocaleString(numberLocale);
  };

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  const userDid = useMemo(() => {
    return userInfo?.did || null;
  }, [userInfo?.did]);

  // Ref to prevent duplicate requests
  const lastFetchParamsRef = useRef<{ voteMetaId: number; userDid: string | null } | null>(null);

  // Initialize voting info from proposal data (synchronous initial render) or finishedResult
  useEffect(() => {
    // 如果有 finishedResult，优先使用它展示结果
    if (finishedResult && proposal) {
      let approveVotes = 0;
      let rejectVotes = 0;

      if (finishedResult.candidate_votes && Array.isArray(finishedResult.candidate_votes)) {
        if (finishedResult.candidate_votes[1] && Array.isArray(finishedResult.candidate_votes[1])) {
          approveVotes = (finishedResult.candidate_votes[1] as unknown as [number, number])[1] ?? 0;
        }
        if (finishedResult.candidate_votes[2] && Array.isArray(finishedResult.candidate_votes[2])) {
          rejectVotes = (finishedResult.candidate_votes[2] as unknown as [number, number])[1] ?? 0;
        }
      }

      const totalVotes = finishedResult.valid_weight_sum ?? finishedResult.weight_sum ?? 0;
      const approvalRate = totalVotes > 0
        ? (approveVotes / totalVotes) * 100
        : 0;

      // 构造 VotingInfo
      const info: VotingInfo = {
        proposalId: 'id' in proposal ? proposal.id : proposal.cid,
        title: milestoneTitle,
        endTime: new Date().toISOString(), // 已结束，时间不重要，或使用 proposal.vote_meta.end_time
        totalVotes,
        approveVotes,
        rejectVotes,
        userVotingPower: voteWeight * 100000000,
        status: VotingStatus.ENDED,
        conditions: {
          minTotalVotes: 0, // 无法从 result 获取，暂时设为0或需要额外传入
          minApprovalRate: 0,
          currentTotalVotes: totalVotes,
          currentApprovalRate: approvalRate
        }
      };

      // 尝试从 proposal.vote_meta 获取更多信息来完善 info
      if (proposal.vote_meta) {
        info.conditions.minTotalVotes = 0; // TODO: 这里可能需要硬编码或从其他地方获取默认要求
        info.conditions.minApprovalRate = 51; // 假设默认51%
        info.endTime = proposal.vote_meta.end_time;
      }

      // 默认里程碑投票要求 (硬编码参考 generateMilestoneVotingInfo 中的值)
      info.conditions.minTotalVotes = 5000000;
      info.conditions.minApprovalRate = 49; // milestoneUtils 里是 49

      setVotingInfo(info);
      return;
    }

    if (!proposal) return;

    // We create a temporary VotingInfo based on local data if available
    // This reduces layout shift while fetching real data
    if (proposal.vote_meta && proposal.vote_meta.id === voteMetaId) {
      const userVotingPower = voteWeight * 100000000;
      const info = generateVotingInfo(proposal, proposal.vote_meta, userVotingPower);
      setVotingInfo(info);
    }
  }, [proposal, voteMetaId, voteWeight, finishedResult, milestoneTitle]);

  // Fetch real data
  const refreshVoteDetail = useCallback(async () => {
    // 如果有 finishedResult 或没有 ID，不请求
    if (finishedResult || !voteMetaId) return;

    try {
      const voteDetail = await (getVoteDetail({
        id: voteMetaId,
      }) as unknown as Promise<VoteDetailResponse>);

      let approveVotes = 0;
      let rejectVotes = 0;

      if (voteDetail.candidate_votes && Array.isArray(voteDetail.candidate_votes)) {
        if (voteDetail.candidate_votes[1] && Array.isArray(voteDetail.candidate_votes[1])) {
          approveVotes = voteDetail.candidate_votes[1][1] ?? 0;
        }
        if (voteDetail.candidate_votes[2] && Array.isArray(voteDetail.candidate_votes[2])) {
          rejectVotes = voteDetail.candidate_votes[2][1] ?? 0;
        }
      }

      const totalVotes = voteDetail.valid_weight_sum ?? voteDetail.weight_sum ?? 0;
      const approvalRate = totalVotes > 0
        ? (approveVotes / totalVotes) * 100
        : 0;

      setVotingInfo(prev => {
        // 如果 prev 不存在，创建一个新的 VotingInfo 对象
        if (!prev) {
          return {
            proposalId: proposal ? ('id' in proposal ? proposal.id : proposal.cid) : '',
            title: milestoneTitle || '',
            endTime: new Date().toISOString(),
            totalVotes,
            approveVotes,
            rejectVotes,
            userVotingPower: voteWeight * 100000000,
            status: VotingStatus.PENDING,
            conditions: {
              minTotalVotes: 5000000,
              minApprovalRate: 49,
              currentTotalVotes: totalVotes,
              currentApprovalRate: approvalRate,
            },
          };
        }

        return {
          ...prev,
          totalVotes: typeof totalVotes === 'number' ? totalVotes : prev.totalVotes,
          approveVotes: typeof approveVotes === 'number' ? approveVotes : prev.approveVotes,
          rejectVotes: typeof rejectVotes === 'number' ? rejectVotes : prev.rejectVotes,
          conditions: {
            ...prev.conditions,
            currentTotalVotes: typeof totalVotes === 'number' ? totalVotes : prev.conditions.currentTotalVotes,
            currentApprovalRate: typeof approvalRate === 'number' && !isNaN(approvalRate)
              ? approvalRate
              : prev.conditions.currentApprovalRate,
          },
        };
      });
    } catch (error) {
      logger.error("Failed to fetch vote detail:", error);
    }
  }, [voteMetaId, finishedResult]);

  // Initial Data Fetch Effect
  useEffect(() => {
    // 如果有 finishedResult，不进行数据请求
    if (finishedResult) return;

    if (!voteMetaId) return;

    const currentParams = { voteMetaId, userDid };
    const lastParams = lastFetchParamsRef.current;

    if (lastParams &&
      lastParams.voteMetaId === currentParams.voteMetaId &&
      lastParams.userDid === currentParams.userDid) {
      return;
    }

    lastFetchParamsRef.current = currentParams;

    (async () => {
      await refreshVoteDetail();

      if (userDid) {
        try {
          const voteStatusList = await (getVoteStatus({
            did: userDid,
            vote_meta_id: voteMetaId,
          }) as unknown as Promise<VoteRecord[]>);

          const latestVoteRecord = voteStatusList && voteStatusList.length > 0 ? voteStatusList[0] : null;

          if (latestVoteRecord) {
            let userVote: VoteOption | undefined;
            if (latestVoteRecord.candidates_index === 1) {
              userVote = VoteOption.APPROVE;
            } else if (latestVoteRecord.candidates_index === 2) {
              userVote = VoteOption.REJECT;
            }

            setUserVoteInfo({
              userVote: userVote,
              userVoteIndex: latestVoteRecord.candidates_index,
              voteState: latestVoteRecord.state // 0 is pending
            });
          } else {
            setUserVoteInfo({});
          }
        } catch (error) {
          logger.error("Failed to fetch vote status:", error);
        }
      } else {
        setUserVoteInfo({});
      }
    })();
  }, [voteMetaId, userDid, refreshVoteDetail, finishedResult]);

  // Calculate Time Left
  useEffect(() => {
    if (!votingInfo) return;

    // 如果是 finishedResult，直接显示已结束
    if (finishedResult || votingInfo.status === VotingStatus.ENDED) {
      setTimeLeft(messages.proposalPhase.milestoneVoting.timeLeft.ended);
      return;
    }

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
    const timer = setInterval(updateTimeLeft, 60000);

    return () => clearInterval(timer);
  }, [votingInfo, messages.proposalPhase.milestoneVoting.timeLeft, finishedResult]);

  // Handle Vote Logic
  const handleVote = async (option: MilestoneVoteOption) => {
    // 如果是 finishedResult，禁止投票
    if (finishedResult) return;

    if (!votingInfo || votingInfo.status === VotingStatus.ENDED) return;
    if (userVoteInfo?.voteState === 0) return; // Pending chain
    if (isVoting) return;

    if (!userInfo?.did) {
      const errorMsg = messages.modal.voteModal.missingInfo || 'User not logged in';
      setVoteErrorMessage(errorMsg);
      setShowVoteErrorModal(true);
      return;
    }

    if (!isConnected || !signer || !walletClient) {
      openSigner();
      return;
    }

    setIsVoting(true);

    try {
      const t = (key: string) => {
        // Simple implementation of t function for utils
        const keys = key.split('.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let value: any = messages;
        for (const k of keys) {
          value = value?.[k];
        }
        return typeof value === 'string' ? value : key;
      };

      // Map MilestoneVoteOption to VoteOption
      const voteOption = option === MilestoneVoteOption.APPROVE ? VoteOption.APPROVE : VoteOption.REJECT;

      // voteMetaId 必须存在才能投票
      if (!voteMetaId) {
        throw new Error("Missing vote meta ID");
      }

      const result = await handleVoteUtil(userInfo.did, voteMetaId, voteOption, t);

      if (!result.success || !result.data) {
        const errorMsg = result.error || messages.modal.voteModal.voteFailedMessage;
        setVoteErrorMessage(errorMsg);
        setShowVoteErrorModal(true);
        setIsVoting(false);
        return;
      }

      const txResult = await buildAndSendVoteTransaction(
        result.data,
        voteOption,
        signer,
        walletClient,
        t
      );

      if (txResult.success && txResult.txHash) {
        try {
          const candidates = result.data.vote_meta.candidates || ["Abstain", "Agree", "Against"];
          let candidatesIndex = 0;
          if (voteOption === VoteOption.APPROVE) {
            candidatesIndex = candidates.indexOf("Agree");
            if (candidatesIndex === -1) candidatesIndex = 1;
          } else {
            candidatesIndex = candidates.indexOf("Against");
            if (candidatesIndex === -1) candidatesIndex = 2;
          }

          const updateParams = {
            id: voteMetaId,
            tx_hash: txResult.txHash,
            candidates_index: candidatesIndex,
            timestamp: Math.floor(Date.now() / 1000),
          };

          const { signed_bytes, signing_key_did } = await generateSignature(updateParams);

          await updateVoteTxHash({
            did: userInfo.did,
            params: updateParams,
            signed_bytes,
            signing_key_did
          });
        } catch (e) {
          logger.error("Failed to update tx hash", e);
        }

        const candidatesIndex = voteOption === VoteOption.APPROVE ? 1 : 2;
        setUserVoteInfo({
          userVote: voteOption,
          userVoteIndex: candidatesIndex,
          voteState: 0
        });

        // Poll for status update
        setTimeout(() => {
          setUserVoteInfo(prev => {
            if (prev && prev.voteState === 0) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { voteState, ...rest } = prev;
              return rest;
            }
            return prev;
          });
        }, 30000);

        setTimeout(() => refreshVoteDetail(), 2000);

        setShowVoteSuccessModal(true);
      } else {
        const errorMsg = txResult.error || messages.modal.voteModal.voteFailedMessage;
        setVoteErrorMessage(errorMsg);
        setShowVoteErrorModal(true);
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMsg = (error as any)?.message || messages.modal.voteModal.voteFailedMessage;
      setVoteErrorMessage(errorMsg);
      setShowVoteErrorModal(true);
    } finally {
      setIsVoting(false);
    }
  };

  if (!votingInfo) {
    return null;
  }

  // Calculate percentages for UI
  const approveRate = votingInfo.totalVotes > 0
    ? (votingInfo.approveVotes / votingInfo.totalVotes) * 100
    : 0;
  const rejectRate = votingInfo.totalVotes > 0
    ? (votingInfo.rejectVotes / votingInfo.totalVotes) * 100
    : 0;

  // Check conditions
  const totalVotesMet = votingInfo.totalVotes >= votingInfo.conditions.minTotalVotes;
  const approvalRateMet = approveRate >= votingInfo.conditions.minApprovalRate;

  // Determine user vote for UI state
  const userVote = userVoteInfo?.userVoteIndex === 1
    ? MilestoneVoteOption.APPROVE
    : userVoteInfo?.userVoteIndex === 2
      ? MilestoneVoteOption.REJECT
      : undefined;

  return (
    <div className={`milestone-voting-card ${className}`}>
      {/* Loading overlay for voting */}
      {isVoting && (
        <div className="voting-overlay">
          <div className="voting-text">
            {(messages.proposalPhase.proposalVoting as { voting?: string })?.voting || 'Voting...'}
          </div>
        </div>
      )}

      <div className="milestone-voting-header">
        <h3 className="milestone-voting-title">{milestoneTitle}{messages.proposalPhase.milestoneVoting.confirmVoting}</h3>
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
              style={{ width: `${approveRate}%` }}
            ></div>
            <div
              className="progress-reject"
              style={{ width: `${rejectRate}%` }}
            ></div>
          </div>
        </div>

        <div className="progress-labels">
          <div className="progress-label approve">
            <span className="label-text">{messages.proposalPhase.milestoneVoting.approve} {formatPercentage(approveRate)}</span>
            <span className="vote-count">({formatNumber(votingInfo.approveVotes / 100000000)} CKB)</span>
          </div>
          <div className="progress-label reject">
            <span className="label-text">{messages.proposalPhase.milestoneVoting.reject} {formatPercentage(rejectRate)}</span>
            <span className="vote-count">({formatNumber(votingInfo.rejectVotes / 100000000)} CKB)</span>
          </div>
        </div>
      </div>

      {(!finishedResult && votingInfo.status === VotingStatus.PENDING) && (
        <div className="milestone-voting-actions">
          <button
            className={`vote-button approve ${userVote === MilestoneVoteOption.APPROVE ? 'selected' : ''}`}
            onClick={() => handleVote(MilestoneVoteOption.APPROVE)}
            disabled={isVoting || userVoteInfo?.voteState === 0}
          >
            👍 {messages.proposalPhase.milestoneVoting.approveFunding}
          </button>
          <button
            className={`vote-button reject ${userVote === MilestoneVoteOption.REJECT ? 'selected' : ''}`}
            onClick={() => handleVote(MilestoneVoteOption.REJECT)}
            disabled={isVoting || userVoteInfo?.voteState === 0}
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
              {formatNumber(votingInfo.totalVotes / 100000000)} / {formatNumber(votingInfo.conditions.minTotalVotes / 100000000)} CKB
            </span>
          </div>
          <div className={`requirement-status ${totalVotesMet ? 'met' : 'not-met'}`}>
            {totalVotesMet ? '✓' : '✗'}
          </div>
        </div>
        <div className="requirement-item">
          <div className="requirement-info">
            <span className="requirement-label">{messages.proposalPhase.milestoneVoting.requirements.approveRate}</span>
            <span className="requirement-value">
              {formatPercentage(approveRate)} / {formatPercentage(votingInfo.conditions.minApprovalRate)}
            </span>
          </div>
          <div className={`requirement-status ${approvalRateMet ? 'met' : 'not-met'}`}>
            {approvalRateMet ? '✓' : '✗'}
          </div>
        </div>
      </div>

      {/* Modals */}
      <SuccessModal
        isOpen={showVoteSuccessModal}
        onClose={() => setShowVoteSuccessModal(false)}
        message={messages.modal.voteModal.voteSuccess}
      />

      <Modal
        isOpen={showVoteErrorModal}
        onClose={() => {
          setShowVoteErrorModal(false);
          setVoteErrorMessage('');
        }}
        title={messages.modal.voteModal.voteFailed}
        size="small"
        showCloseButton={false}
        buttons={[
          {
            text: messages.modal.voteModal.close,
            onClick: () => {
              setShowVoteErrorModal(false);
              setVoteErrorMessage('');
            },
            variant: 'secondary'
          }
        ]}
      >
        <div className="error-content" style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '48px', color: '#ff4d6d', marginBottom: '16px' }}>
            <MdErrorOutline />
          </div>
          <p style={{ color: '#FFFFFF', margin: 0, wordBreak: 'break-word' }}>
            {voteErrorMessage || messages.modal.voteModal.voteFailedMessage}
          </p>
        </div>
      </Modal>
    </div>
  );
}
