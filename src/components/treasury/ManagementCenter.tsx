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

interface ProposalItem {
  id: string;
  name: string;
  type: string;
  status: ProposalStatus;
  taskType: TaskType;
  deadline: string;
  isNew?: boolean;
  progress?: string;
  uri: string; // 添加uri字段用于跳转
  budget?: number; // 添加预算字段
}

// 任务类型枚举映射（根据后端枚举值）
// 任务类型：1=CreateAMA, 3=InitiationVote等（根据实际后端枚举值调整）
const TASK_TYPE_MAP: Record<number, string> = {
  1: 'organizeAMA', // CreateAMA
  2: 'publishMinutes', // SubmitAMAReport (假设，需要根据实际枚举确认)
  3: 'createVote', // InitiationVote
  4: 'milestoneAllocation', // UpdateReceiverAddr (假设，需要根据实际枚举确认)
  5: 'milestoneAllocation', // SendInitialFund
  6: 'publishReport', // SubmitReport (假设，需要根据实际枚举确认)
  7: 'milestoneVerification', // SubmitAcceptanceReport (假设，需要根据实际枚举确认)
  8: 'organizeMeeting', // CreateReexamineMeeting
  9: 'createVote', // ReexamineVote
  10: 'createVote', // RectificationVote
  11: 'publishReport', // SubmitRectificationReport (假设，需要根据实际枚举确认)
};

// 将任务类型数字映射到翻译键
const getTaskTypeByNumber = (taskType: number, t: (key: string) => string): TaskType => {
  const taskTypeKey = TASK_TYPE_MAP[taskType];
  if (taskTypeKey) {
    return t(`taskTypes.${taskTypeKey}`) as TaskType;
  }
  // 如果找不到映射，返回默认值
  return t('taskTypes.organizeMeeting') as TaskType;
};

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
    console.error('格式化截止日期失败:', error);
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
  const taskType = getTaskTypeByNumber(task.task_type, t);
  
  // 格式化截止日期
  const deadline = formatDeadline(task.deadline, locale);

  return {
    id: task.id.toString(),
    name: title,
    type: proposalType,
    status: status,
    taskType: taskType,
    deadline: deadline,
    isNew: false, // 可以根据创建时间判断是否为新任务
    uri: uri,
    budget: budget,
  };
};



export default function ManagementCenter() {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("pending");
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalItem | undefined>(undefined);

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

  // 转换数据格式
  const proposals = useMemo(() => {
    return rawTasks.map(task => adaptTaskData(task, t, locale));
  }, [rawTasks, t, locale]);

  // 计算筛选选项的计数
  // const filterCounts = useMemo(() => {
  //   const counts = {
  //     all: proposals.length,
  //     ama: proposals.filter(p => p.taskType === t("taskTypes.organizeAMA")).length,
  //     milestone: proposals.filter(p => p.taskType === t("taskTypes.milestoneVerification")).length,
  //     allocation: proposals.filter(p => p.taskType === t("taskTypes.milestoneAllocation")).length,
  //     completion: proposals.filter(p => p.taskType === t("taskTypes.publishReport")).length,
  //   };

  //   return getFilterOptions(t).map(option => ({
  //     ...option,
  //     count: counts[option.key as keyof typeof counts] || 0
  //   }));
  // }, [proposals, t]);

  // 根据筛选条件过滤提案
  const filteredProposals = useMemo(() => {
    let filtered = proposals;

    // 根据标签页过滤
    if (activeTab === "new") {
      filtered = filtered.filter(p => p.isNew);
    } else if (activeTab === "pending") {
      filtered = filtered.filter(p =>
        p.status === ProposalStatus.REVIEW ||
        p.status === ProposalStatus.VOTE ||
        p.status === ProposalStatus.MILESTONE
      );
    }

    // 根据筛选器过滤
    if (activeFilter !== "all") {
      switch (activeFilter) {
        case "ama":
          filtered = filtered.filter(p => p.taskType === t("taskTypes.organizeAMA"));
          break;
        case "milestone":
          filtered = filtered.filter(p => p.taskType === t("taskTypes.milestoneVerification"));
          break;
        case "allocation":
          filtered = filtered.filter(p => p.taskType === t("taskTypes.milestoneAllocation"));
          break;
        case "completion":
          filtered = filtered.filter(p => p.taskType === t("taskTypes.publishReport"));
          break;
      }
    }

    // 根据搜索查询过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.type.toLowerCase().includes(query) ||
        p.taskType.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [proposals, activeTab, activeFilter, searchQuery, t]);

  // 标记新任务（创建时间在24小时内的）
  useEffect(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    proposals.forEach(proposal => {
      const task = rawTasks.find(t => t.id.toString() === proposal.id);
      if (task) {
        const createdDate = new Date(task.created);
        proposal.isNew = createdDate > oneDayAgo;
      }
    });
  }, [proposals, rawTasks]);


  // const handleTaskProcess = (proposal: ProposalItem) => {
  //   setSelectedProposal(proposal);
  //   setShowTaskModal(true);
  // };

  const handleCreateVote = (proposal: ProposalItem) => {
    setSelectedProposal({ ...proposal, taskType: t("taskTypes.createVote") });
    setShowTaskModal(true);
  };

  const handleTaskComplete = (data: unknown) => {
    console.log("任务完成数据:", data);

    // 如果是投票创建任务，刷新任务列表
    if (selectedProposal?.taskType === t("taskTypes.createVote")) {
      console.log("投票创建成功，刷新任务列表");
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
      {/* 顶部标签页 */}
      {/* <div className="management-tabs">
        <button
          className={`tab-button ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          {t("managementCenter.newProposals")}
        </button>
        <button
          className={`tab-button ${activeTab === "new" ? "active" : ""}`}
          onClick={() => setActiveTab("new")}
        >
          {t("managementCenter.newProposals")}
          <span className="badge">{proposals.filter(p => p.isNew).length}</span>
        </button>
      </div> */}

      {/* 筛选按钮 */}
      <div className="filter-section">
        {/* <div className="filter-buttons">
          {filterCounts.map((option) => (
            <button
              key={option.key}
              className={`filter-button ${
                activeFilter === option.key ? "active" : ""
              }`}
              onClick={() => setActiveFilter(option.key)}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div> */}

        {/* 搜索框 */}
        {/* <div className="search-section">
          <input
            type="search"
            placeholder={t("managementCenter.searchProposals")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="management-search-input"
          />
        </div> */}
      </div>

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
                filteredProposals.map((proposal) => (
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
                        {proposal.status === ProposalStatus.REVIEW && (
                          <button
                            className="vote-action-button"
                            onClick={() => handleCreateVote(proposal)}
                          >
                            {t("taskModal.buttons.createVote")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* 分页组件 */}
        {!loading && !error && totalPages && totalPages > 1 && (
          <div className="task-pagination">
            <button
              className="pagination-button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label="上一页"
            >
              ‹
            </button>
            <span className="pagination-info">
              {page} / {totalPages}
            </span>
            <button
              className="pagination-button"
              disabled={page >= totalPages}
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
    </div>
  );
}
