"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ProposalVotingProps,
  VoteOption,
  VotingStatus,
  VotingInfo,
  UserVoteInfo,
} from "../../types/voting";
import { formatNumber, parseEpoch } from "../../utils/proposalUtils";
import { useI18n } from "@/contexts/I18nContext";
import { useWallet } from "@/provider/WalletProvider";
import useUserInfoStore from "@/store/userInfo";
import { getVoteDetail, getVoteStatus, updateVoteTxHash, VoteRecord, VoteDetailResponse } from "@/server/proposal";
import { generateVotingInfo, handleVote as handleVoteUtil, buildAndSendVoteTransaction } from "@/utils/votingUtils";

import { SuccessModal, Modal } from "@/components/ui/modal";
import { MdErrorOutline } from "react-icons/md";
import { generateSignature } from "@/lib/signature";
import "./voting.css";
import ProposalVotingConditions from "./ProposalVotingConditions";

import { logger } from '@/lib/logger';


export default function ProposalVoting({
  proposal,
  voteMetaId,
  voteWeight,
  className = "",
  title,
  finishedResult
}: ProposalVotingProps) {
  console.log('🔍 ProposalVoting render. voteWeight:', voteWeight, 'voteMetaId:', voteMetaId);
  const { messages } = useI18n();
  const { userInfo } = useUserInfoStore();
  const { signer, walletClient, openSigner, isConnected } = useWallet();

  const [votingInfo, setVotingInfo] = useState<VotingInfo | null>(null);
  const [userVoteInfo, setUserVoteInfo] = useState<UserVoteInfo | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [showRevoteOptions, setShowRevoteOptions] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [showVoteSuccessModal, setShowVoteSuccessModal] = useState(false);
  const [showVoteErrorModal, setShowVoteErrorModal] = useState(false);
  const [voteErrorMessage, setVoteErrorMessage] = useState<string>('');

  const userDid = useMemo(() => {
    return userInfo?.did || null;
  }, [userInfo?.did]);

  // 用于防止短时间内重复请求的 ref
  const lastFetchParamsRef = useRef<{ voteMetaId: number | null; userDid: string | null } | null>(null);

  // 初始化 finishedResult 逻辑
  useEffect(() => {
    if (finishedResult && proposal) {
      // 如果有 finishedResult，优先使用它展示结果
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
        proposalId: 'id' in proposal ? (proposal as { id: string }).id : proposal.cid,
        title: title || '',
        // 尝试从 proposal.vote_meta 获取 end_time (如果是同一个投票)，否则置空
        endTime: (voteMetaId && 'vote_meta' in proposal && proposal.vote_meta?.id === voteMetaId)
          ? String(proposal.vote_meta.end_time)
          : '',
        totalVotes,
        approveVotes,
        rejectVotes,
        userVotingPower: voteWeight,
        status: VotingStatus.ENDED,
        conditions: {
          minTotalVotes: 0,
          minApprovalRate: 0,
          currentTotalVotes: totalVotes,
          currentApprovalRate: approvalRate
        }
      };

      // 复用下方的 budget 计算逻辑来设置 minTotalVotes，以保持 UI 一致性
      let minTotalVotes = 5000000;
      if (proposal) {
        let budget = 0;
        if ('record' in proposal && proposal.record?.data?.budget) {
          budget = Number(proposal.record.data.budget);
        } else if ('budget' in proposal && typeof proposal.budget === 'number') {
          budget = proposal.budget;
        }
        if (budget > 0) {
          minTotalVotes = budget * 3 * 100000000;
        }
      }
      info.conditions.minTotalVotes = minTotalVotes;
      info.conditions.minApprovalRate = 51; // 保持一致

      setVotingInfo(info);
    }
  }, [finishedResult, proposal, title, voteWeight]);

  // 获取投票详情的函数（用于投票后刷新）
  const refreshVoteDetail = useCallback(async () => {
    // 如果有 finishedResult，不请求 API
    if (finishedResult) return;

    if (!voteMetaId) {
      return;
    }

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
        // 如果 prev 不存在，但 API 返回了数据，我们需要强制创建状态
        // 使用最小必要信息创建一个基本框架
        if (!prev) {
          // 如果没有初始状态，创建一个最小可用的状态对象
          return {
            proposalId: '',
            title: title || '', // Use prop title if available
            endTime: voteDetail.vote_meta?.end_time ? String(voteDetail.vote_meta.end_time) : '',
            totalVotes,
            approveVotes,
            rejectVotes,
            userVotingPower: voteWeight * 100000000,
            status: VotingStatus.PENDING,
            conditions: {
              minTotalVotes: (() => {
                let min = 0;
                // 尝试计算 3倍预算
                if (proposal) {
                  let budget = 0;
                  if ('record' in proposal && proposal.record?.data?.budget) {
                    budget = Number(proposal.record.data.budget);
                  } else if ('budget' in proposal && typeof proposal.budget === 'number') {
                    budget = proposal.budget;
                  }

                  if (budget > 0) {
                    min = budget * 3 * 100000000;
                  }
                }
                return min;
              })(),
              minApprovalRate: 51,
              currentTotalVotes: totalVotes,
              currentApprovalRate: approvalRate,
            },
          };
        }

        return {
          ...prev,
          totalVotes: totalVotes,
          approveVotes: approveVotes,
          rejectVotes: rejectVotes,
          conditions: {
            ...prev.conditions,
            currentTotalVotes: totalVotes,
            currentApprovalRate: !isNaN(approvalRate) ? approvalRate : prev.conditions.currentApprovalRate,
          },
        };
      });
    } catch (error) {
      logger.error("获取投票详情失败:");
    }
  }, [voteMetaId, voteWeight]);

  useEffect(() => {
    setVotingInfo((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        userVotingPower: voteWeight,
      };
    });
  }, [voteWeight]);

  // 进入页面时，如果存在 voteMetaId，先调用 getVoteDetail，然后调用 getVoteStatus
  useEffect(() => {
    if (!voteMetaId) return;

    // 检查参数是否真的变化了，避免重复请求
    const currentParams = { voteMetaId, userDid };
    const lastParams = lastFetchParamsRef.current;

    if (lastParams &&
      lastParams.voteMetaId === currentParams.voteMetaId &&
      lastParams.userDid === currentParams.userDid) {
      return; // 参数未变化，跳过请求
    }

    lastFetchParamsRef.current = currentParams;

    // 先调用 getVoteDetail
    (async () => {
      try {
        const voteDetail = await (getVoteDetail({
          id: voteMetaId,
        }) as unknown as Promise<VoteDetailResponse>);

        let approveVotes = 0;
        let rejectVotes = 0;

        console.log('🔍 Vote Detail API Response:', voteDetail);
        console.log('🔍 candidate_votes:', voteDetail.candidate_votes);

        if (voteDetail.candidate_votes && Array.isArray(voteDetail.candidate_votes)) {
          if (voteDetail.candidate_votes[1] && Array.isArray(voteDetail.candidate_votes[1])) {
            approveVotes = voteDetail.candidate_votes[1][1] ?? 0;
          }
          if (voteDetail.candidate_votes[2] && Array.isArray(voteDetail.candidate_votes[2])) {
            rejectVotes = voteDetail.candidate_votes[2][1] ?? 0;
          }
        }

        console.log('✅ Extracted votes - Approve:', approveVotes, 'Reject:', rejectVotes, 'Total:', voteDetail.valid_weight_sum ?? voteDetail.weight_sum ?? 0);

        const totalVotes = voteDetail.valid_weight_sum ?? voteDetail.weight_sum ?? 0;
        const approvalRate = totalVotes > 0
          ? (approveVotes / totalVotes) * 100
          : 0;

        setVotingInfo(prev => {
          console.log('🔄 Updating votingInfo. Previous state:', prev);

          // 如果 prev 不存在，但 API 返回了数据，我们需要强制创建状态
          if (!prev) {
            const newState = {
              proposalId: '',
              title: '',
              endTime: voteDetail.vote_meta?.end_time ? String(voteDetail.vote_meta.end_time) : '',
              totalVotes,
              approveVotes,
              rejectVotes,
              userVotingPower: voteWeight * 100000000,
              status: VotingStatus.PENDING,
              conditions: {
                minTotalVotes: (() => {
                  let min = 0;
                  // 尝试计算 3倍预算
                  if (proposal) {
                    let budget = 0;
                    if ('record' in proposal && proposal.record?.data?.budget) {
                      budget = Number(proposal.record.data.budget);
                    } else if ('budget' in proposal && typeof proposal.budget === 'number') {
                      budget = proposal.budget;
                    }

                    if (budget > 0) {
                      min = budget * 3;
                    }
                  }
                  return min;
                })(),
                minApprovalRate: 51,
                currentTotalVotes: totalVotes,
                currentApprovalRate: approvalRate,
              },
            };
            console.log('✨ Created new votingInfo state:', newState);
            return newState;
          }

          const updatedState = {
            ...prev,
            totalVotes: totalVotes,
            approveVotes: approveVotes,
            rejectVotes: rejectVotes,
            conditions: {
              ...prev.conditions,
              currentTotalVotes: totalVotes,
              currentApprovalRate: !isNaN(approvalRate) ? approvalRate : prev.conditions.currentApprovalRate,
            },
          };
          console.log('✨ Updated votingInfo state:', updatedState);
          return updatedState;
        });

        // getVoteDetail 完成后，调用 getVoteStatus
        if (userDid) {
          try {
            const voteStatusList = await (getVoteStatus({
              did: userDid,
              vote_meta_id: voteMetaId,
            }) as unknown as Promise<VoteRecord[]>);

            const latestVoteRecord = voteStatusList && voteStatusList.length > 0 ? voteStatusList[0] : null;

            if (!latestVoteRecord) {
              setUserVoteInfo({});
              return;
            }

            let userVote: VoteOption | undefined;
            if (latestVoteRecord.candidates_index === 1) {
              userVote = VoteOption.APPROVE;
            } else if (latestVoteRecord.candidates_index === 2) {
              userVote = VoteOption.REJECT;
            }

            setUserVoteInfo({
              userVote: userVote,
              userVoteIndex: latestVoteRecord.candidates_index,
            });
          } catch (statusError) {
            logger.error("获取投票状态失败:", statusError);
          }
        } else {
          // 用户未登录，设置为空对象
          setUserVoteInfo({});
        }
      } catch (error) {
        logger.error("获取投票详情失败:");
      }
    })();
  }, [voteMetaId, userDid]);

  // 处理投票
  const handleVoteSubmit = async (option: VoteOption) => {
    if (!votingInfo || !userInfo?.did) {
      const errorMsg = messages.modal.voteModal.missingInfo || '缺少投票信息或用户未登录';
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
      const currentVoteMetaId = voteMetaId || Number(proposal?.vote_meta?.id) || 2;

      const t = (key: string) => {
        const keys = key.split('.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let value: any = messages;
        for (const k of keys) {
          value = value?.[k];
        }
        return typeof value === 'string' ? value : key;
      };

      const result = await handleVoteUtil(userInfo.did, currentVoteMetaId, option, t);
      if (!result.success || !result.data) {
        const errorMsg = result.error || messages.modal.voteModal.voteFailedMessage;
        setVoteErrorMessage(errorMsg);
        setShowVoteErrorModal(true);
        setIsVoting(false);
        return;
      }

      const txResult = await buildAndSendVoteTransaction(
        result.data,
        option,
        signer,
        walletClient,
        t
      );

      if (txResult.success && txResult.txHash) {
        try {
          const candidates = result.data.vote_meta.candidates || ["Abstain", "Agree", "Against"];
          let candidatesIndex: number = 0;
          if (option === VoteOption.APPROVE) {
            candidatesIndex = candidates.indexOf("Agree");
            if (candidatesIndex === -1) candidatesIndex = 1;
          } else if (option === VoteOption.REJECT) {
            candidatesIndex = candidates.indexOf("Against");
            if (candidatesIndex === -1) candidatesIndex = 2;
          }

          const updateParams = {
            id: currentVoteMetaId,
            tx_hash: txResult.txHash,
            candidates_index: candidatesIndex,
            timestamp: Math.floor(Date.now() / 1000),
          };

          const { signed_bytes: signedBytes, signing_key_did: signingKeyDid } = await generateSignature(updateParams);

          await updateVoteTxHash({
            did: userInfo.did,
            params: updateParams,
            signed_bytes: signedBytes,
            signing_key_did: signingKeyDid,
          });
        } catch (updateError) {
          const errorMsg = messages.voting?.errors?.updateTxHashFailed || "更新投票交易哈希失败";
          logger.error(errorMsg + ":", updateError);
        }

        const candidatesIndex = option === VoteOption.APPROVE ? 1 : 2;

        setUserVoteInfo({
          userVote: option,
          userVoteIndex: candidatesIndex,
          voteState: 0,
        });

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

        setTimeout(() => {
          refreshVoteDetail();
        }, 2000);

        setShowVoteSuccessModal(true);
        setIsVoting(false);
      } else {
        const errorMsg = txResult.error || messages.modal.voteModal.voteFailedMessage;
        setVoteErrorMessage(errorMsg);
        setShowVoteErrorModal(true);
        setIsVoting(false);
      }
    } catch (error) {
      const errorLogMsg = messages.voting?.errors?.voteFailed || '投票失败';
      logger.error(errorLogMsg + ':', error);
      let errorMsg = messages.modal.voteModal.voteFailedMessage;
      if (error instanceof Error) {
        errorMsg = error.message || errorMsg;
      } else if (typeof error === 'string') {
        errorMsg = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMsg = String(error.message);
      }
      setVoteErrorMessage(errorMsg);
      setShowVoteErrorModal(true);
      setIsVoting(false);
    }
  };

  // 根据 userVote 或 userVoteIndex 确定用户投票选项
  const userVote = useMemo(() => {
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

  // 检查投票是否正在上链中
  const isChainPending = useMemo(() => {
    return userVoteInfo?.voteState === 0;
  }, [userVoteInfo?.voteState]);

  // 计算倒计时
  useEffect(() => {
    if (!votingInfo) return;

    const calculateTimeLeft = () => {
      // 检查是否为 Epoch
      const epoch = parseEpoch(votingInfo.endTime);
      // 简单的启发式检查：如果解析出的 epoch number 大于 0 且 endTime 看起来像一个非常大的整数 (远大于现在的毫秒时间戳)
      // 当前毫秒时间戳约为 1.7e12
      // Epoch u64 (1979123480145992) 约为 1.9e15
      if (epoch && Number(votingInfo.endTime) > 100000000000000) {
        setTimeLeft(`Epoch: ${formatNumber(epoch.number)} (${epoch.index}/${epoch.length})`);
        return;
      }

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
    const timer = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(timer);
  }, [votingInfo, messages.proposalPhase.proposalVoting.timeLeft]);

  // 处理投票
  const handleVote = (option: VoteOption) => {
    if (votingInfo?.status === VotingStatus.ENDED) return;
    if (finishedResult) return; // 禁止对已结束的结果投票
    if (isChainPending) return;
    if (isVoting) return;

    if (showRevoteOptions) {
      setShowRevoteOptions(false);
    }

    handleVoteSubmit(option);
  };

  // 如果 votingInfo 不存在，不渲染组件
  if (!votingInfo || !proposal) {
    return null;
  }

  // 计算百分比
  console.log('📊 Computing percentages. votingInfo:', votingInfo);
  const approveRate =
    votingInfo.totalVotes > 0
      ? (votingInfo.approveVotes / votingInfo.totalVotes) * 100
      : 0;
  const rejectRate =
    votingInfo.totalVotes > 0
      ? (votingInfo.rejectVotes / votingInfo.totalVotes) * 100
      : 0;
  console.log('📊 Calculated rates - Approve:', approveRate.toFixed(1) + '%', 'Reject:', rejectRate.toFixed(1) + '%');

  // 检查用户是否已投票（且不在上链中）
  const hasVoted = userVote !== undefined;

  // 如果用户点击了重新投票，则显示投票选项
  const shouldShowVoteButtons = !hasVoted || showRevoteOptions;

  const proposalType = proposal.record.data.proposalType;
  const budget = proposal.record.data.budget;

  return (
    <>
      <div className={`proposal-voting-card ${className}`} style={{ position: 'relative' }}>
        {/* 投票进行中遮罩层 */}
        {isVoting && (
          <div className="voting-overlay">
            <div className="voting-overlay-text">
              {(messages.proposalPhase.proposalVoting as { voting?: string })?.voting || '投票处理中...'}
            </div>
          </div>
        )}
        {/* 标题和倒计时 */}
        <div className="voting-header">
          <h3 className="voting-title">
            {votingInfo.title || messages.proposalPhase.proposalVoting.title}
          </h3>

        </div>
        <div className="voting-countdown">
          <span>
            {messages.proposalPhase.proposalVoting.deadline}
          </span>
          <span> {timeLeft}</span>
        </div>
        {/* 投票统计 */}
        <div className="voting-stats">
          <div className="voting-total">
            <span>
              {messages.proposalPhase.proposalVoting.totalVotes}{" "}

            </span>
            <span>{formatNumber(votingInfo.totalVotes / 100000000)} CKB</span>
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
                  } : ${formatNumber(votingInfo.userVotingPower)}`
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
          {formatNumber(votingInfo.userVotingPower)} CKB
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

      {/* 投票成功弹窗 */}
      <SuccessModal
        isOpen={showVoteSuccessModal}
        onClose={() => setShowVoteSuccessModal(false)}
        message={messages.modal.voteModal.voteSuccess}
      />

      {/* 投票失败弹窗 */}
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
            {(voteErrorMessage && voteErrorMessage.includes('vote_meta not already: 4'))
              ? messages.modal.voteModal.votingEnded
              : (voteErrorMessage || messages.modal.voteModal.voteFailedMessage)}
          </p>
        </div>
      </Modal>
    </>
  );
}
