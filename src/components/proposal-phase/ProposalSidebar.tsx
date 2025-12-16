"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ProposalTimeline, ProposalVoting, MilestoneTracking } from "@/components/proposal-phase";
import { TimelineEvent } from "@/types/timeline";
import { VotingInfo, VoteOption, UserVoteInfo } from "@/types/voting";
import { Milestone } from "@/types/milestone";
import { ProposalDetailResponse, updateVoteTxHash, getVoteStatus, VoteRecord, getVoteDetail, VoteDetailResponse } from "@/server/proposal";
import { generateTimelineEvents } from "@/utils/timelineUtils";
import { generateVotingInfo, handleVote, buildAndSendVoteTransaction } from "@/utils/votingUtils";
import { generateMilestones } from "@/utils/milestoneUtils";
import { Proposal, ProposalStatus } from "@/utils/proposalUtils";
import { useWallet } from "@/provider/WalletProvider";
import { useVoteWeight } from "@/hooks/useVoteWeight";
import useUserInfoStore from "@/store/userInfo";
import { getAvatarByDid } from "@/utils/avatarUtils";
import { SuccessModal, Modal } from "@/components/ui/modal";
import { MdErrorOutline } from "react-icons/md";
import { useI18n } from "@/contexts/I18nContext";
import * as cbor from '@ipld/dag-cbor';
import { uint8ArrayToHex } from "@/lib/dag-cbor";
import storage from "@/lib/storage";
import { Secp256k1Keypair } from "@atproto/crypto";
import { getUserDisplayNameFromInfo } from "@/utils/userDisplayUtils";

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
  const { messages } = useI18n();
  const { userInfo } = useUserInfoStore();
  const { signer, walletClient, openSigner, isConnected } = useWallet();
  const { voteWeight } = useVoteWeight();
  
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [votingInfo, setVotingInfo] = useState<VotingInfo | null>(null);
  const [userVoteInfo, setUserVoteInfo] = useState<UserVoteInfo | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  
  // 投票弹窗状态
  const [showVoteSuccessModal, setShowVoteSuccessModal] = useState(false);
  const [showVoteErrorModal, setShowVoteErrorModal] = useState(false);
  const [voteErrorMessage, setVoteErrorMessage] = useState<string>('');
  
  // 投票进行中状态，用于锁定操作区域
  const [isVoting, setIsVoting] = useState(false);

  // 使用 useMemo 稳定 voteMetaId 的值，避免因 proposal 对象引用变化导致的重复调用
  const voteMetaId = useMemo(() => {
    if (!proposal?.vote_meta?.id) return null;
    const id = Number(proposal.vote_meta.id);
    return isNaN(id) ? null : id;
  }, [proposal?.vote_meta?.id]);

  // 使用 useMemo 稳定时间线消息对象
  const timelineMessages = useMemo(() => ({
    proposalPublished: messages.proposalPhase.proposalTimeline.events.proposalPublished,
    proposalPublishedDesc: messages.proposalPhase.proposalTimeline.events.proposalPublishedDesc,
    communityReview: messages.proposalPhase.proposalTimeline.events.communityReview,
    communityReviewDesc: messages.proposalPhase.proposalTimeline.events.communityReviewDesc,
    proposalVoting: messages.proposalPhase.proposalTimeline.events.proposalVoting,
    proposalVotingDesc: messages.proposalPhase.proposalTimeline.events.proposalVotingDesc,
    proposalApproved: messages.proposalPhase.proposalTimeline.events.proposalApproved,
    proposalApprovedDesc: messages.proposalPhase.proposalTimeline.events.proposalApprovedDesc,
    proposalRejected: messages.proposalPhase.proposalTimeline.events.proposalRejected,
    proposalRejectedDesc: messages.proposalPhase.proposalTimeline.events.proposalRejectedDesc,
    milestoneInProgress: messages.proposalPhase.proposalTimeline.events.milestoneInProgress,
    milestoneInProgressDesc: messages.proposalPhase.proposalTimeline.events.milestoneInProgressDesc,
    projectCompleted: messages.proposalPhase.proposalTimeline.events.projectCompleted,
    projectCompletedDesc: messages.proposalPhase.proposalTimeline.events.projectCompletedDesc,
  }), [messages.proposalPhase.proposalTimeline.events]);

  // 当提案数据加载完成后，生成相关数据（不包含API请求）
  useEffect(() => {
    if (!proposal) return;
    
    const adaptedProposal = adaptProposalDetail(proposal);

    // 生成时间线事件
    const events = generateTimelineEvents(adaptedProposal, timelineMessages);
    setTimelineEvents(events);
    
    // 如果是投票阶段，生成投票信息
    if (adaptedProposal.state === ProposalStatus.VOTE && proposal.vote_meta) {
      // voteWeight 是 CKB 单位，需要转换为 shannon（最小单位）传递给 generateVotingInfo
      // generateVotingInfo 期望的是 shannon 单位，显示时会除以 100000000
      const userVotingPower = voteWeight * 100000000;
      const voting = generateVotingInfo(adaptedProposal, proposal.vote_meta, userVotingPower);
      setVotingInfo(voting);
      // 重置 voteMetaId ref，确保 getVoteDetail 会在 votingInfo 初始化后执行
      if (voteMetaId) {
        lastVoteMetaIdRef.current = null;
      }
    }
    
    // 如果是执行阶段，生成里程碑信息
    if (adaptedProposal.state === ProposalStatus.MILESTONE || 
        adaptedProposal.state === ProposalStatus.APPROVED || 
        adaptedProposal.state === ProposalStatus.ENDED) {
      const milestoneData = generateMilestones(adaptedProposal);
      setMilestones(milestoneData);
    }
  }, [proposal, voteWeight, voteMetaId, timelineMessages]);


  // 使用 ref 跟踪上一次的 voteMetaId 和请求 ID，避免重复调用
  const lastVoteMetaIdRef = useRef<number | null>(null);
  const voteDetailRequestIdRef = useRef<number>(0);
  
  // 单独处理投票详情API请求（仅在 voteMetaId 变化时请求）
  useEffect(() => {
    if (!voteMetaId) return;
    
    // 如果 voteMetaId 没有变化，跳过请求
    if (lastVoteMetaIdRef.current === voteMetaId) return;
    
    // 确保 votingInfo 已经初始化，如果没有则等待
    if (!votingInfo) return;
    
    // 更新 ref 和请求 ID
    lastVoteMetaIdRef.current = voteMetaId;
    const currentRequestId = ++voteDetailRequestIdRef.current;
    
    (getVoteDetail({
      id: voteMetaId,
    }) as unknown as Promise<VoteDetailResponse>)
    .then((voteDetail) => {
      // 如果这不是最新的请求，忽略结果（防止竞态条件）
      if (currentRequestId !== voteDetailRequestIdRef.current) return;
      
      let approveVotes = 0;
      let rejectVotes = 0;
      
      // candidate_votes 格式: [[票数, 权重], [票数, 权重], [票数, 权重]]
      // 使用权重（第二个元素）而不是票数（第一个元素）
      if (voteDetail.candidate_votes && Array.isArray(voteDetail.candidate_votes)) {
        if (voteDetail.candidate_votes[1] && Array.isArray(voteDetail.candidate_votes[1])) {
          approveVotes = voteDetail.candidate_votes[1][1] ?? 0; // 使用权重
        }
        if (voteDetail.candidate_votes[2] && Array.isArray(voteDetail.candidate_votes[2])) {
          rejectVotes = voteDetail.candidate_votes[2][1] ?? 0; // 使用权重
        }
      }
      
      // 使用权重总和而不是投票数总和
      const totalVotes = voteDetail.valid_weight_sum ?? voteDetail.weight_sum ?? 0;
      const approvalRate = totalVotes > 0 
        ? (approveVotes / totalVotes) * 100 
        : 0;
      
      setVotingInfo(prev => {
        if (!prev) return prev;
        
        // 使用明确的更新逻辑，直接使用新值（包括 0），避免使用 || 导致 0 值无法更新
        return {
          ...prev,
          totalVotes: typeof totalVotes === 'number' ? totalVotes : prev.totalVotes,
          approveVotes: typeof approveVotes === 'number' ? approveVotes : prev.approveVotes,
          rejectVotes: typeof rejectVotes === 'number' ? rejectVotes : prev.rejectVotes,
          conditions: {
            ...prev.conditions,
            currentTotalVotes: typeof totalVotes === 'number' ? totalVotes : prev.conditions.currentTotalVotes,
            currentApprovalRate: typeof approvalRate === 'number' ? approvalRate : prev.conditions.currentApprovalRate,
          },
        };
      });
    })
    .catch((error: unknown) => {
      // 如果这不是最新的请求，忽略错误
      if (currentRequestId !== voteDetailRequestIdRef.current) return;
      const errorMsg = messages.voting?.errors?.getVoteDetailFailed || "获取投票详情失败";
      console.error(errorMsg + ":", error);
    });
  }, [voteMetaId, votingInfo, messages.voting?.errors?.getVoteDetailFailed]);

  // 使用 ref 跟踪上一次的 voteMetaId 和 did，避免重复调用 getVoteStatus
  const lastVoteStatusVoteMetaIdRef = useRef<number | null>(null);
  const lastVoteStatusDidRef = useRef<string | null>(null);
  const voteStatusRequestIdRef = useRef<number>(0);
  const isFetchingVoteStatusRef = useRef<boolean>(false);

  // 单独处理投票状态API请求（仅在 did 或 voteMetaId 变化时请求）
  useEffect(() => {
    if (!voteMetaId) {
      return;
    }
    
    if (!userInfo?.did) {
      // 用户未登录时，设置为空对象（可以投票，但需要先登录）
      setUserVoteInfo({});
      return;
    }
    
    // 如果 voteMetaId 和 did 都没有变化，跳过请求
    if (lastVoteStatusVoteMetaIdRef.current === voteMetaId && 
        lastVoteStatusDidRef.current === userInfo.did) {
      return;
    }
    
    // 防止并发请求
    if (isFetchingVoteStatusRef.current) {
      return;
    }
    
    // 更新 ref 和请求 ID
    lastVoteStatusVoteMetaIdRef.current = voteMetaId;
    lastVoteStatusDidRef.current = userInfo.did;
    const currentRequestId = ++voteStatusRequestIdRef.current;
    isFetchingVoteStatusRef.current = true;
    
    (getVoteStatus({
      did: userInfo.did,
      vote_meta_id: voteMetaId,
    }) as unknown as Promise<VoteRecord[]>).then((voteStatusList: VoteRecord[]) => {
      // 如果这不是最新的请求，忽略结果（防止竞态条件）
      if (currentRequestId !== voteStatusRequestIdRef.current) return;
      
      // 先根据 vote_meta_id 筛选出匹配的记录，然后取最新的投票记录（按 created 时间排序，最新的在前）
      const latestVoteRecord = voteStatusList && voteStatusList.length > 0 ? voteStatusList[0] : null;
      
      // 如果没有投票记录，设置为空对象（可以投票）
      if (!latestVoteRecord) {
        setUserVoteInfo({});
        isFetchingVoteStatusRef.current = false;
        return;
      }
      
      let userVote: VoteOption | undefined;
      if (latestVoteRecord.candidates_index === 1) {
        userVote = VoteOption.APPROVE;
      } else if (latestVoteRecord.candidates_index === 2) {
        userVote = VoteOption.REJECT;
      }
      // 注意：统计信息（total_votes、approve_votes、reject_votes）应该从 VoteDetailResponse 获取
      // 这里只更新用户的投票状态
      // voteState 只在用户自己投票后设置，不从 API 获取的状态中设置
      const newUserVoteInfo: UserVoteInfo = {
        userVote: userVote,
        userVoteIndex: latestVoteRecord.candidates_index,
        // 不从 API 获取的状态中设置 voteState，isChainPending 只在用户投票后才会出现
      };
      setUserVoteInfo(newUserVoteInfo);
      isFetchingVoteStatusRef.current = false;
    })
    .catch((error: unknown) => {
      // 如果这不是最新的请求，忽略错误
      if (currentRequestId !== voteStatusRequestIdRef.current) return;
      isFetchingVoteStatusRef.current = false;
      const errorMsg = messages.voting?.errors?.getVoteStatusFailed || "获取投票状态失败";
      console.error(errorMsg + ":", error);
    });
  }, [voteMetaId, userInfo?.did, messages.voting?.errors?.getVoteStatusFailed]);

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
    
    // 设置投票进行中状态，锁定操作区域
    setIsVoting(true);
    
    try {
      const voteMetaId = proposal?.vote_meta?.id || 2;
      
      // 创建翻译函数
      const t = (key: string) => {
        const keys = key.split('.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let value: any = messages;
        for (const k of keys) {
          value = value?.[k];
        }
        return typeof value === 'string' ? value : key;
      };
      
      const result = await handleVote(userInfo.did, voteMetaId, option, t);
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
            id: voteMetaId,
            tx_hash: txResult.txHash,
            candidates_index: candidatesIndex,
            timestamp: Math.floor(Date.now() / 1000), // UTC 时间戳（秒），防止签名被重复使用
          };
          
          const unsignedCommit = cbor.encode(updateParams);
          const storageInfo = storage.getToken();
          if (storageInfo?.signKey) {
            const keyPair = await Secp256k1Keypair.import(storageInfo.signKey.slice(2));
            const signature = await keyPair.sign(unsignedCommit);
            const signedBytes = uint8ArrayToHex(signature);
            const signingKeyDid = keyPair.did();
            
            await updateVoteTxHash({
              did: userInfo.did,
              params: updateParams,
              signed_bytes: signedBytes,
              signing_key_did: signingKeyDid,
            });
            
            try {
              const voteStatusList: VoteRecord[] = await (getVoteStatus({
                did: userInfo.did,
                vote_meta_id: voteMetaId,
              }) as unknown as Promise<VoteRecord[]>);
              
              // 先根据 vote_meta_id 筛选出匹配的记录，然后取最新的投票记录（按 created 时间排序，最新的在前）
              const matchedRecords = voteStatusList && voteStatusList.length > 0
                ? voteStatusList.filter((record: VoteRecord) => record.vote_meta_id === voteMetaId)
                : [];
              
              const latestVoteRecord = matchedRecords.length > 0
                ? matchedRecords.sort((a: VoteRecord, b: VoteRecord) => {
                    // 按 created 时间降序排序，最新的在前
                    return new Date(b.created).getTime() - new Date(a.created).getTime();
                  })[0]
                : null;
              
              let userVoteFromStatus: VoteOption | undefined;
              if (latestVoteRecord?.candidates_index === 1) {
                userVoteFromStatus = VoteOption.APPROVE;
              } else if (latestVoteRecord?.candidates_index === 2) {
                userVoteFromStatus = VoteOption.REJECT;
              }
              
              // 注意：统计信息（total_votes、approve_votes、reject_votes）应该从 VoteDetailResponse 获取
              // 这里只更新用户的投票状态
              // 查询成功后清除 voteState，表示交易已上链
              setUserVoteInfo({
                userVote: userVoteFromStatus,
                userVoteIndex: latestVoteRecord?.candidates_index,
                // 不设置 voteState，清除上链中状态
              });
            } catch (statusError) {
              const errorMsg = messages.voting?.errors?.queryVoteStatusFailed || "查询投票状态失败";
              console.error(errorMsg + ":", statusError);
            }
          }
        } catch (updateError) {
          const errorMsg = messages.voting?.errors?.updateTxHashFailed || "更新投票交易哈希失败";
          console.error(errorMsg + ":", updateError);
        }
        
        const candidatesIndex = option === VoteOption.APPROVE ? 1 : 2;
        
        // 更新用户投票信息，设置 voteState: 0 表示正在上链中
        setUserVoteInfo({
          userVote: option,
          userVoteIndex: candidatesIndex,
          voteState: 0,
        });
        
        // 设置超时清除 voteState，防止永久锁定（30秒后自动清除）
        // 如果在这之前查询成功，voteState 会被清除
        setTimeout(() => {
          setUserVoteInfo(prev => {
            if (prev && prev.voteState === 0) {
              // 清除 voteState，保留其他信息
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { voteState, ...rest } = prev;
              return rest;
            }
            return prev;
          });
        }, 30000);
        
        // 更新投票统计信息
        setVotingInfo(prev => prev ? {
          ...prev,
          totalVotes: prev.totalVotes + prev.userVotingPower,
          approveVotes: option === VoteOption.APPROVE 
            ? prev.approveVotes + prev.userVotingPower 
            : prev.approveVotes,
          rejectVotes: option === VoteOption.REJECT 
            ? prev.rejectVotes + prev.userVotingPower 
            : prev.rejectVotes,
          conditions: {
            ...prev.conditions,
            currentTotalVotes: prev.totalVotes + prev.userVotingPower,
            currentApprovalRate: option === VoteOption.APPROVE 
              ? ((prev.approveVotes + prev.userVotingPower) / (prev.totalVotes + prev.userVotingPower)) * 100
              : (prev.approveVotes / (prev.totalVotes + prev.userVotingPower)) * 100
          }
        } : null);
        
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
      console.error(errorLogMsg + ':', error);
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

  if (!proposal) {
    return null;
  }

  return (
    <>
      <div className="proposal-sidebar">
        {/* 投票组件 - 仅在投票阶段显示 */}
        {votingInfo &&userVoteInfo&& (
          <ProposalVoting 
            votingInfo={votingInfo}
            userVoteInfo={userVoteInfo ?? undefined}
            onVote={handleVoteSubmit}
            isVoting={isVoting}
            proposalType={proposal.record.data.proposalType}
            budget={proposal.record.data.budget}
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
          events={timelineEvents} 
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
            {voteErrorMessage || messages.modal.voteModal.voteFailedMessage}
          </p>
        </div>
      </Modal>
    </>
  );
}
