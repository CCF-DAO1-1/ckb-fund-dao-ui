"use client";

import { useState, useEffect, useMemo } from "react";
import { ProposalStatus } from "@/utils/proposalUtils";
import TaskProcessingModal, { TaskType } from "@/components/proposal/TaskProcessingModal";
import Tag from "@/components/ui/tag/Tag";
import { useTaskList } from "@/hooks/useTaskList";
import { TaskItem } from "@/server/task";
import { useTranslation } from "@/utils/i18n";
import { useI18n } from "@/contexts/I18nContext";
import { useRouter } from "next/navigation";
import UpdateReceiverAddrModal from "./UpdateReceiverAddrModal";
import SendFundsModal from "./SendFundsModal";
import CreateMeetingModal from "./CreateMeetingModal";
import SubmitMeetingReportModal from "./SubmitMeetingReportModal";
import SubmitDelayReportModal from "./SubmitDelayReportModal";
import { getTaskTypeText, TaskType as TaskTypeEnum } from "@/utils/taskUtils";

import { logger } from '@/lib/logger';
interface ProposalItem {
  id: string;
  name: string;
  type: string;
  status: ProposalStatus;
  taskType: TaskType;
  task_type: number; // task_type 数字值（数组下标）
  deadline: string;
  isNew?: boolean;
  progress?: string;
  uri: string; // 添加uri字段用于跳转
  budget?: number; // 添加预算字段
  message?: string; // 任务消息（保留用于兼容）
}

// 任务类型映射已移至 @/utils/taskUtils

// 格式化截止日期
const formatDeadline = (deadline: string, locale: 'en' | 'zh' = 'en'): string => {
  try {
    const deadlineDate = new Date(deadline);
    const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    return deadlineDate.toLocaleString(dateLocale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    }) + ' (UTC+8)';
  } catch (error) {
    logger.error('格式化截止日期失败:');
    return deadline;
  }
};

// 将任务数据转换为ManagementCenter需要的格式
const adaptTaskData = (task: TaskItem, t: (key: string) => string, locale: 'en' | 'zh' = 'en'): ProposalItem => {
  // 从任务数据的 target 字段中提取提案信息
  const proposal = task.target;
  const proposalType = proposal.record.data.proposalType || '';
  const status = proposal.state as ProposalStatus;
  const title = proposal.record.data.title || '';
  const uri = proposal.uri || '';
  const budget = proposal.record.data.budget ? parseFloat(proposal.record.data.budget) : 0;

  // 根据 task_type 数字值获取任务类型翻译
  const taskType = getTaskTypeText(task.task_type, t) as TaskType;
  
  // 格式化截止日期
  const deadline = formatDeadline(task.deadline, locale);

  return {
    id: task.id.toString(),
    name: title,
    type: proposalType,
    status: status,
    taskType: taskType,
    task_type: task.task_type, // 保存原始的 task_type 数字值
    deadline: deadline,
    isNew: false, // 可以根据创建时间判断是否为新任务
    uri: uri,
    budget: budget,
    message: task.message, // 保留任务消息（用于兼容）
  };
};



export default function ManagementCenter() {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const router = useRouter();
  // UI 状态
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalItem | undefined>(undefined);
  const [showUpdateAddrModal, setShowUpdateAddrModal] = useState(false);
  const [selectedTaskForAddr, setSelectedTaskForAddr] = useState<TaskItem | undefined>(undefined);
  const [showSendFundsModal, setShowSendFundsModal] = useState(false);
  const [selectedTaskForFunds, setSelectedTaskForFunds] = useState<TaskItem | undefined>(undefined);
  const [showCreateMeetingModal, setShowCreateMeetingModal] = useState(false);
  const [selectedTaskForMeeting, setSelectedTaskForMeeting] = useState<TaskItem | undefined>(undefined);
  const [showSubmitMeetingReportModal, setShowSubmitMeetingReportModal] = useState(false);
  const [selectedTaskForMeetingReport, setSelectedTaskForMeetingReport] = useState<TaskItem | undefined>(undefined);
  const [showSubmitDelayReportModal, setShowSubmitDelayReportModal] = useState(false);
  const [selectedTaskForDelayReport, setSelectedTaskForDelayReport] = useState<TaskItem | undefined>(undefined);
  
  // 筛选状态（暂时未使用，保留用于未来功能）
  // const [activeTab, setActiveTab] = useState("pending");
  // const [activeFilter, setActiveFilter] = useState("all");
  // const [searchQuery, setSearchQuery] = useState("");

  // 使用任务列表数据
  const { 
    tasks: rawTasks, 
    loading, 
    error, 
    errorCode,
    refetch,
    page,
    totalPages,
    setPage,
  } = useTaskList({
    page: 1,
    per_page: 10,
  });

  // 处理 403 权限错误，跳转到无权限页面
  useEffect(() => {
    if (errorCode === 403) {
      router.push(`/${locale}/error/403`);
    }
  }, [errorCode, locale, router]);

  // 转换任务数据格式
  const proposals = useMemo(() => {
    return rawTasks.map(task => adaptTaskData(task, t, locale));
  }, [rawTasks, t, locale]);

  // 标记新任务（创建时间在24小时内的）
  const proposalsWithNewFlag = useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return proposals.map(proposal => {
      const task = rawTasks.find(t => t.id.toString() === proposal.id);
      if (task) {
        const createdDate = new Date(task.created);
        return { ...proposal, isNew: createdDate > oneDayAgo };
      }
      return proposal;
    });
  }, [proposals, rawTasks]);

  // 根据筛选条件过滤提案（当前显示所有任务，筛选功能暂时未启用）
  const filteredProposals = useMemo(() => {
    // 暂时返回所有提案，筛选功能可以后续启用
    return proposalsWithNewFlag;
  }, [proposalsWithNewFlag]);




  // ========== 任务操作处理函数 ==========
  
  // 添加钱包地址相关
  const handleAddReceiverAddr = (proposal: ProposalItem) => {
    const task = rawTasks.find(t => t.id.toString() === proposal.id);
    if (task) {
      setSelectedTaskForAddr(task);
      setShowUpdateAddrModal(true);
    }
  };

  const handleUpdateAddrSuccess = () => {
    refetch();
    setShowUpdateAddrModal(false);
    setSelectedTaskForAddr(undefined);
  };

  const handleUpdateAddrModalClose = () => {
    setShowUpdateAddrModal(false);
    setSelectedTaskForAddr(undefined);
  };

  // 拨款相关
  const handleSendFunds = (proposal: ProposalItem) => {
    const task = rawTasks.find(t => t.id.toString() === proposal.id);
    if (task) {
      setSelectedTaskForFunds(task);
      setShowSendFundsModal(true);
    }
  };

  const handleSendFundsSuccess = () => {
    refetch();
    setShowSendFundsModal(false);
    setSelectedTaskForFunds(undefined);
  };

  const handleSendFundsModalClose = () => {
    setShowSendFundsModal(false);
    setSelectedTaskForFunds(undefined);
  };

  // 创建会议相关
  const handleCreateMeeting = (proposal: ProposalItem) => {
    const task = rawTasks.find(t => t.id.toString() === proposal.id);
    if (task) {
      setSelectedTaskForMeeting(task);
      setShowCreateMeetingModal(true);
    }
  };

  const handleCreateMeetingSuccess = () => {
    refetch();
    setShowCreateMeetingModal(false);
    setSelectedTaskForMeeting(undefined);
  };

  const handleCreateMeetingModalClose = () => {
    setShowCreateMeetingModal(false);
    setSelectedTaskForMeeting(undefined);
  };

  // 提交AMA报告相关
  const handleSubmitMeetingReport = (proposal: ProposalItem) => {
    const task = rawTasks.find(t => t.id.toString() === proposal.id);
    if (task) {
      setSelectedTaskForMeetingReport(task);
      setShowSubmitMeetingReportModal(true);
    }
  };

  const handleSubmitMeetingReportSuccess = () => {
    refetch();
    setShowSubmitMeetingReportModal(false);
    setSelectedTaskForMeetingReport(undefined);
  };

  const handleSubmitMeetingReportModalClose = () => {
    setShowSubmitMeetingReportModal(false);
    setSelectedTaskForMeetingReport(undefined);
  };

  // 提交延期报告相关
  const handleSubmitDelayReport = (proposal: ProposalItem) => {
    const task = rawTasks.find(t => t.id.toString() === proposal.id);
    if (task) {
      setSelectedTaskForDelayReport(task);
      setShowSubmitDelayReportModal(true);
    }
  };

  const handleSubmitDelayReportSuccess = () => {
    refetch();
    setShowSubmitDelayReportModal(false);
    setSelectedTaskForDelayReport(undefined);
  };

  const handleSubmitDelayReportModalClose = () => {
    setShowSubmitDelayReportModal(false);
    setSelectedTaskForDelayReport(undefined);
  };

  // 创建投票相关
  const handleCreateVote = (proposal: ProposalItem) => {
    setSelectedProposal({ ...proposal, taskType: t("taskTypes.createVote") });
    setShowTaskModal(true);
  };

  const handleTaskComplete = (data: unknown) => {
    logger.log("任务完成数据已收到");
    if (selectedProposal?.taskType === t("taskTypes.createVote")) {
      refetch();
    }
    setShowTaskModal(false);
    setSelectedProposal(undefined);
  };

  const handleTaskModalClose = () => {
    setShowTaskModal(false);
    setSelectedProposal(undefined);
  };

  return (
    <div className="management-center">
      {/* 筛选和搜索功能暂时未启用，保留用于未来扩展 */}

      {/* 提案表格 */}
      <div className="proposals-table">
        {loading ? (
          <div className="loading-state">
            <p>{t("managementCenter.loading")}</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>
              {t("managementCenter.loadFailed")}: {error}
            </p>
            <button onClick={() => refetch()}>
              {t("managementCenter.retry")}
            </button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("management.proposalTitle")}</th>
                <th>{t("managementCenter.type")}</th>
                <th>{t("management.status")}</th>
                <th>{t("managementCenter.taskType")}</th>
                <th>{t("management.deadline")}</th>
                <th>{t("management.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="no-data">
                    {t("management.noData")}
                  </td>
                </tr>
              ) : (
                filteredProposals.map((proposal) => {
                  // 根据 task_type 判断任务类型
                  const taskType = proposal.task_type;
                  const isUpdateReceiverAddr = taskType === TaskTypeEnum.UPDATE_RECEIVER_ADDR;
                  const isSendInitialFund = taskType === TaskTypeEnum.SEND_INITIAL_FUND;
                  const isSendMilestoneFund = taskType === TaskTypeEnum.SEND_MILESTONE_FUND;
                  const isCreateAMA = taskType === TaskTypeEnum.CREATE_AMA;
                  const isSubmitAMAReport = taskType === TaskTypeEnum.SUBMIT_AMA_REPORT;
                  const isSubmitDelayReport = taskType === TaskTypeEnum.SUBMIT_DELAY_REPORT;
                  const isInitiationVote = taskType === TaskTypeEnum.INITIATION_VOTE;
                  const isReexamineVote = taskType === TaskTypeEnum.REEXAMINE_VOTE;
                  const isRectificationVote = taskType === TaskTypeEnum.RECTIFICATION_VOTE;
                  const isCreateReexamineMeeting = taskType === TaskTypeEnum.CREATE_REEXAMINE_MEETING;
                  
                  return (
                  <tr key={proposal.id}>
                    <td>
                      <div className="proposal-name">
                        {proposal.name}
                        {proposal.isNew && <span className="new-tag">NEW</span>}
                      </div>
                    </td>
                    <td>{proposal.type}</td>
                    <td>
                      <Tag status={proposal.status} size="sm" />
                    </td>
                    <td>{proposal.taskType}</td>
                    <td>{proposal.deadline}</td>
                    <td>
                      <div className="action-buttons">
                        {/* <button
                          className="task-action-button"
                          onClick={() => handleTaskProcess(proposal)}
                        >
                          {t("taskModal.buttons.process")}
                        </button> */}
                        {/* 根据 task_type 显示对应的操作按钮 */}
                        {(isInitiationVote || isReexamineVote || isRectificationVote) && (
                          <button
                            className="vote-action-button"
                            onClick={() => handleCreateVote(proposal)}
                            style={{
                              marginLeft: "8px",
                              padding: "6px 12px",
                              backgroundColor: "#00CC9B",
                              color: "#000000",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            {t("taskModal.buttons.createVote")}
                          </button>
                        )}
                        {isUpdateReceiverAddr && (
                          <button
                            className="add-addr-button"
                            onClick={() => handleAddReceiverAddr(proposal)}
                            style={{
                              marginLeft: "8px",
                              padding: "6px 12px",
                              backgroundColor: "#00CC9B",
                              color: "#000000",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            {t("updateReceiverAddr.addButton") || "添加钱包地址"}
                          </button>
                        )}
                        {(isSendInitialFund || isSendMilestoneFund) && (
                          <button
                            className="send-funds-button"
                            onClick={() => handleSendFunds(proposal)}
                            style={{
                              marginLeft: "8px",
                              padding: "6px 12px",
                              backgroundColor: "#00CC9B",
                              color: "#000000",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            {t("sendFunds.button") || "拨款"}
                          </button>
                        )}
                        {(isCreateAMA || isCreateReexamineMeeting) && (
                          <button
                            className="create-meeting-button"
                            onClick={() => handleCreateMeeting(proposal)}
                            style={{
                              marginLeft: "8px",
                              padding: "6px 12px",
                              backgroundColor: "#00CC9B",
                              color: "#000000",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            {t("createMeeting.button") || "组织会议"}
                          </button>
                        )}
                        {isSubmitAMAReport && (
                          <button
                            className="submit-meeting-report-button"
                            onClick={() => handleSubmitMeetingReport(proposal)}
                            style={{
                              marginLeft: "8px",
                              padding: "6px 12px",
                              backgroundColor: "#00CC9B",
                              color: "#000000",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            {t("submitMeetingReport.button") || "提交AMA报告"}
                          </button>
                        )}
                        {isSubmitDelayReport && (
                          <button
                            className="submit-delay-report-button"
                            onClick={() => handleSubmitDelayReport(proposal)}
                            style={{
                              marginLeft: "8px",
                              padding: "6px 12px",
                              backgroundColor: "#00CC9B",
                              color: "#000000",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            {t("submitDelayReport.button") || "提交延期报告"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* 分页组件 */}
        {!loading && !error && (
          <div className="task-pagination">
            <button
              className="pagination-button"
              disabled={!totalPages || page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label="上一页"
            >
              ‹
            </button>
            <span className="pagination-info">
              {page} {totalPages ? `/ ${totalPages}` : ''}
            </span>
            <button
              className="pagination-button"
              disabled={!totalPages || page >= totalPages}
              onClick={() => setPage(page + 1)}
              aria-label="下一页"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* 任务处理Modal */}
      <TaskProcessingModal
        isOpen={showTaskModal}
        onClose={handleTaskModalClose}
        onComplete={handleTaskComplete}
        taskType={selectedProposal?.taskType}
        proposal={selectedProposal}
      />

      {/* 添加钱包地址Modal */}
      <UpdateReceiverAddrModal
        isOpen={showUpdateAddrModal}
        onClose={handleUpdateAddrModalClose}
        onSuccess={handleUpdateAddrSuccess}
        proposalUri={selectedTaskForAddr?.target?.uri}
      />

      {/* 拨款Modal */}
      <SendFundsModal
        isOpen={showSendFundsModal}
        onClose={handleSendFundsModalClose}
        onSuccess={handleSendFundsSuccess}
        proposalUri={selectedTaskForFunds?.target?.uri}
      />

      {/* 创建会议Modal */}
      <CreateMeetingModal
        isOpen={showCreateMeetingModal}
        onClose={handleCreateMeetingModalClose}
        onSuccess={handleCreateMeetingSuccess}
        proposalUri={selectedTaskForMeeting?.target?.uri}
      />

      {/* 提交AMA报告Modal */}
      <SubmitMeetingReportModal
        isOpen={showSubmitMeetingReportModal}
        onClose={handleSubmitMeetingReportModalClose}
        onSuccess={handleSubmitMeetingReportSuccess}
        proposalUri={selectedTaskForMeetingReport?.target?.uri}
      />

      {/* 提交延期报告Modal */}
      <SubmitDelayReportModal
        isOpen={showSubmitDelayReportModal}
        onClose={handleSubmitDelayReportModalClose}
        onSuccess={handleSubmitDelayReportSuccess}
        proposalUri={selectedTaskForDelayReport?.target?.uri}
      />
    </div>
  );
}
