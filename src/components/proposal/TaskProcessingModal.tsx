"use client";

import { useState, useEffect } from "react";
import { ProposalStatus } from "@/utils/proposalUtils";
import { formatNumber } from "@/utils/proposalUtils";
import { useCreateVoteMeta } from "@/hooks/useCreateVoteMeta";
import { useWallet } from "@/provider/WalletProvider";
import { useTranslation } from "@/utils/i18n";
import { InitiationVoteResponse } from "@/server/proposal";
import { ccc } from "@ckb-ccc/core";
import Tag from "@/components/ui/tag/Tag";

interface ProposalItem {
  id: string;
  name: string;
  type: string;
  status: ProposalStatus;
  taskType: TaskType;
  task_type?: number; // 添加原始的 task_type 数字值
  deadline: string;
  isNew?: boolean;
  progress?: string;
  uri: string;
  budget?: number; // 添加预算字段
}

interface TaskProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: TaskFormData) => void;
  taskType?: TaskType;
  proposal?: ProposalItem; // 添加提案数据
}

interface TaskFormData {
  proposal_uri: string;
  startTime: number; // 开始时间（Unix 时间戳，秒）
  endTime: number; // 结束时间（Unix 时间戳，秒）
  candidates: unknown[]; // 候选人列表，默认为空数组
}

export type TaskType = string;

// 获取任务类型翻译文本
const getTaskTypeText = (taskType: TaskType): string => {
  // 直接返回翻译后的文本，因为 taskType 现在已经是翻译后的文本
  return taskType;
};

// 检查任务类型是否匹配
const isTaskType = (currentTaskType: TaskType, targetTaskType: string, t: (key: string) => string): boolean => {
  return currentTaskType === t(targetTaskType);
};

// 提案状态映射函数
const getStatusText = (status: ProposalStatus, t: (key: string) => string): string => {
  switch (status) {
    case ProposalStatus.DRAFT:
      return t("proposalStatus.draft");
    case ProposalStatus.INITIATION_VOTE:
      return t("proposalStatus.initiationVote");
    case ProposalStatus.WAITING_FOR_START_FUND:
      return t("proposalStatus.waitingForStartFund");
    case ProposalStatus.IN_PROGRESS:
      return t("proposalStatus.inProgress");
    case ProposalStatus.MILESTONE_VOTE:
      return t("proposalStatus.milestoneVote");
    case ProposalStatus.DELAY_VOTE:
      return t("proposalStatus.delayVote");
    case ProposalStatus.WAITING_FOR_MILESTONE_FUND:
      return t("proposalStatus.waitingForMilestoneFund");
    case ProposalStatus.REVIEW_VOTE:
      return t("proposalStatus.reviewVote");
    case ProposalStatus.WAITING_FOR_ACCEPTANCE_REPORT:
      return t("proposalStatus.waitingForAcceptanceReport");
    case ProposalStatus.COMPLETED:
      return t("proposalStatus.completed");
    case ProposalStatus.REEXAMINE_VOTE:
      return t("proposalStatus.reexamineVote");
    case ProposalStatus.RECTIFICATION_VOTE:
      return t("proposalStatus.rectificationVote");
    // 向后兼容的旧状态值
    case ProposalStatus.REVIEW:
      return t("proposalStatus.communityReview");
    case ProposalStatus.VOTE:
      return t("proposalStatus.voting");
    case ProposalStatus.MILESTONE:
      return t("proposalStatus.milestoneDelivery");
    case ProposalStatus.APPROVED:
      return t("proposalStatus.approved");
    case ProposalStatus.REJECTED:
      return t("proposalStatus.rejected");
    case ProposalStatus.ENDED:
      return t("proposalStatus.ended");
    default:
      return t("proposalStatus.unknown");
  }
};

export default function TaskProcessingModal({
  isOpen,
  onClose,
  onComplete,
  taskType = "",
  proposal
}: TaskProcessingModalProps) {
  const [isClient, setIsClient] = useState(false);
  const { createVoteMetaData, createRectificationVote, buildAndSendTransaction, error: voteError } = useCreateVoteMeta();
  const { signer, openSigner } = useWallet();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<TaskFormData>({
    proposal_uri: proposal?.uri || "",
    startTime: Math.floor(Date.now() / 1000), // 默认当前时间
    endTime: Math.floor(Date.now() / 1000) + (3 * 24 * 60 * 60), // 默认3天后
    candidates: ["yes", "no"]
  });


  useEffect(() => {
    setIsClient(true);
  }, []);

  // 当 proposal 变化时，更新 proposal_uri
  useEffect(() => {
    if (proposal?.uri) {
      setFormData(prev => ({
        ...prev,
        proposal_uri: proposal.uri
      }));
    }
  }, [proposal?.uri]);



  const handleComplete = async () => {
    if (isTaskType(taskType, "taskTypes.createVote", t) && proposal) {
      // 处理投票创建
      let result;

      // 根据 task_type 调用不同的API
      if (proposal.task_type === 12) {
        // task_type=12: 调用整改投票API
        result = await createRectificationVote({
          proposalUri: formData.proposal_uri,
        });
      } else {
        // 其他投票类型：调用initiation_vote API
        result = await createVoteMetaData({
          proposalUri: formData.proposal_uri,
          proposalState: proposal.status,
        });
      }

      if (result.success && result.data) {
        // 检查响应中是否有 outputsData，如果有则发送交易
        const voteResponse = result.data as InitiationVoteResponse;
        if (voteResponse && typeof voteResponse === 'object' && 'outputsData' in voteResponse && Array.isArray(voteResponse.outputsData) && voteResponse.outputsData.length > 0) {
          if (!signer) {
            // 如果没有 signer，触发连接钱包
            openSigner();
            return;
          }
          try {
            // 类型转换以匹配 buildAndSendTransaction 期望的类型
            // 注意：由于可能存在不同版本的 @ckb-ccc/core，需要进行类型断言
            const txResult = await buildAndSendTransaction(voteResponse, signer as unknown as ccc.Signer);
            if (txResult.success) {
              onComplete(formData);
              onClose();
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`${t("alerts.sendTransactionFailed")}: ${errorMessage}`);
          }
        } else {
          // 如果没有 outputsData，直接完成
          onComplete(formData);
          onClose();
        }
      } else {
        alert(`${t("alerts.createVoteFailed")}: ${result.error}`);
      }
    } else {
      // 处理其他任务类型
      onComplete(formData);
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({
      proposal_uri: proposal?.uri || "",
      startTime: Math.floor(Date.now() / 1000),
      endTime: Math.floor(Date.now() / 1000) + (3 * 24 * 60 * 60),
      candidates: []
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="task-processing-modal">
        {/* Modal标题 */}
        <div className="modal-header">
          <h2 className="modal-title">{t("taskModal.title")}</h2>
        </div>

        {/* Modal内容 */}
        <div className="modal-content" style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
          {/* 提案信息 */}
          <div className="proposal-info-section">
            <h3 className="section-title">{t("taskModal.proposalInfo")}</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">{t("proposalInfo.proposalName")}:</span>
                <span className="info-value">{proposal?.name || t("proposalInfo.unknownProposal")}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{t("proposalInfo.proposalId")}:</span>
                <span className="info-value">{proposal?.id || t("proposalInfo.unknownId")}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{t("proposalInfo.proposalType")}:</span>
                <span className="info-value">{proposal?.type || t("proposalInfo.unknownType")}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{t("proposalInfo.proposalPhase")}:</span>
                <span className="info-value">
                  {proposal ? <Tag status={proposal.status} size="sm" /> : t("proposalInfo.unknownStatus")}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">{t("proposalInfo.budget")}:</span>
                <span className="info-value">{proposal?.budget ? `${formatNumber(proposal.budget)} CKB` : t("proposalInfo.unknownBudget")}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{t("proposalInfo.proposalUri")}:</span>
                <span className="info-value uri-value">{proposal?.uri || t("proposalInfo.unknownUri")}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{t("taskModal.taskType")}:</span>
                <span className="info-value">{getTaskTypeText(taskType)}</span>
              </div>
            </div>
          </div>

          {/* 任务信息 */}
          <div className="task-info-section" style={{ display: 'none' }}>
            {/* <h3 className="section-title">{t("taskModal.taskInfo")}</h3> */}

            <div className="form-grid">
              {/* 任务类型和截止时间 - 两列布局 */}
              {/* <div className="form-row">
                <div className="form-item">
                  <label className="form-label">{t("taskModal.taskType")}</label>
                  <div className="readonly-field">{getTaskTypeText(taskType)}</div>
                </div>
               <div className="form-item">
                  <label className="form-label">{t("taskModal.deadline")}</label>
                  <div className="readonly-field">{proposal?.deadline || t("proposalInfo.pending")}</div>
                </div>
              </div> */}

              {/* 根据任务类型显示不同的表单字段 */}
              {/* 其他任务类型的 UI 已暂时移除，只保留创建投票相关的功能 */}

              {isTaskType(taskType, "taskTypes.createVote", t) && (
                <>
                  {/* 投票开始时间和结束时间 - 两列布局 */}
                  {/* <div className="form-row">
                    <div className="form-item">
                      <label className="form-label required">{t("taskModal.voteStartTime")}</label>
                      <CustomDatePicker
                        selected={formData.startTime ? new Date(formData.startTime * 1000) : null}
                        onChange={handleVoteStartDateChange}
                        placeholderText={t("taskModal.placeholders.selectVoteStartTime")}
                        minDate={new Date()}
                        showTimeSelect={true}
                        timeIntervals={1}
                        timeFormat="HH:mm"
                      />
                    </div>
                    <div className="form-item">
                      <label className="form-label required">{t("taskModal.voteEndTime")}</label>
                      <CustomDatePicker
                        selected={formData.endTime ? new Date(formData.endTime * 1000) : null}
                        onChange={handleVoteEndDateChange}
                        placeholderText={t("taskModal.placeholders.selectVoteEndTime")}
                        minDate={formData.startTime ? new Date(formData.startTime * 1000) : new Date()}
                        showTimeSelect={true}
                        timeIntervals={1}
                        timeFormat="HH:mm"
                      />
                    </div>
                  </div> */}

                  {voteError && (
                    <div className="error-message">
                      {voteError}
                    </div>
                  )}
                </>
              )}

              {/* 备注信息已移除 */}
            </div>
          </div>
        </div>

        {/* Modal底部按钮 */}
        <div className="modal-footer">
          <button
            className="btn-complete"
            onClick={handleComplete}
          >
            {t("taskModal.buttons.complete")}
          </button>
          <button
            className="btn-close"
            onClick={handleClose}
          >
            {t("taskModal.buttons.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
