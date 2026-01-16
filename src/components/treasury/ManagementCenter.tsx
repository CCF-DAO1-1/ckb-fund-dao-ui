"use client";

import { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/utils/i18n";
import { useI18n } from "@/contexts/I18nContext";
import { useTaskList } from "@/hooks/useTaskList";
import { useManagementModals } from "@/hooks/useManagementModals";
import { adaptTaskData, markNewTasks } from "@/utils/managementCenterUtils";
import TaskTable from "./TaskTable";
import TaskProcessingModal from "@/components/proposal/TaskProcessingModal";
import UpdateReceiverAddrModal from "./UpdateReceiverAddrModal";
import SendFundsModal from "./SendFundsModal";
import CreateMeetingModal from "./CreateMeetingModal";
import SubmitMeetingReportModal from "./SubmitMeetingReportModal";
import SubmitMilestoneReportModal from "./SubmitMilestoneReportModal";
import SubmitDelayReportModal from "./SubmitDelayReportModal";
import SubmitAcceptanceReportModal from "./SubmitAcceptanceReportModal";
import { postUriToHref } from '@/lib/postUriHref';
import { logger } from '@/lib/logger';

export default function ManagementCenter() {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const router = useRouter();

  // 获取任务列表数据
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

  // 统一的模态框管理
  const modals = useManagementModals(refetch, rawTasks);

  // 处理 403 权限错误
  useEffect(() => {
    if (errorCode === 403) {
      router.push(`/${locale}/error/403`);
    }
  }, [errorCode, locale, router]);

  // 转换并标记任务数据
  const proposals = useMemo(() => {
    const adapted = rawTasks.map(task => adaptTaskData(task, t, locale));
    return markNewTasks(adapted, rawTasks);
  }, [rawTasks, t, locale]);

  // 统一的操作处理器
  const handleAction = (action: string, proposal: any) => {
    // 提交整改报告跳转
    if (action === 'submitRectificationReport') {
      const href = postUriToHref(proposal.uri);
      router.push(`/${locale}/proposal/admin-edit/${href}`);
      return;
    }

    // 对于创建投票操作，统一设置taskType为"创建投票"
    // 这样TaskProcessingModal可以通过proposal.task_type来区分具体的投票类型
    if (action === 'createVote') {
      const modifiedProposal = { ...proposal, taskType: t("taskTypes.createVote") };
      modals.open(action, modifiedProposal);
    } else {
      modals.open(action, proposal);
    }
  };

  // 创建投票的特殊处理（需要修改taskType）
  const handleTaskComplete = (data: unknown) => {
    logger.log("任务完成数据已收到");
    refetch();
    modals.close('createVote');
  };

  return (
    <div className="management-center">
      {/* 任务表格 */}
      <TaskTable
        proposals={proposals}
        loading={loading}
        error={error}
        onRetry={refetch}
        onAction={handleAction}
      />

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

      {/* 所有模态框 */}
      <TaskProcessingModal
        isOpen={modals.taskModal.isOpen}
        onClose={() => modals.close('createVote')}
        onComplete={handleTaskComplete}
        taskType={modals.taskModal.selectedProposal?.taskType}
        proposal={modals.taskModal.selectedProposal}
      />

      <UpdateReceiverAddrModal
        isOpen={modals.updateAddrModal.isOpen}
        onClose={() => modals.close('updateReceiverAddr')}
        onSuccess={() => modals.onSuccess('updateReceiverAddr')}
        proposalUri={modals.updateAddrModal.selectedTask?.target?.uri}
      />

      <SendFundsModal
        isOpen={modals.sendFundsModal.isOpen}
        onClose={() => modals.close('sendFunds')}
        onSuccess={() => modals.onSuccess('sendFunds')}
        proposalUri={modals.sendFundsModal.selectedTask?.target?.uri}
      />

      <CreateMeetingModal
        isOpen={modals.createMeetingModal.isOpen}
        onClose={() => modals.close('createMeeting')}
        onSuccess={() => modals.onSuccess('createMeeting')}
        proposalUri={modals.createMeetingModal.selectedTask?.target?.uri}
      />

      <SubmitMeetingReportModal
        isOpen={modals.submitMeetingReportModal.isOpen}
        onClose={() => modals.close('submitMeetingReport')}
        onSuccess={() => modals.onSuccess('submitMeetingReport')}
        proposalUri={modals.submitMeetingReportModal.selectedTask?.target?.uri}
      />

      <SubmitDelayReportModal
        isOpen={modals.submitDelayReportModal.isOpen}
        onClose={() => modals.close('submitDelayReport')}
        onSuccess={() => modals.onSuccess('submitDelayReport')}
        proposalUri={modals.submitDelayReportModal.selectedTask?.target?.uri}
      />

      <SubmitMilestoneReportModal
        isOpen={modals.submitMilestoneReportModal.isOpen}
        onClose={() => modals.close('submitMilestoneReport')}
        onSuccess={() => modals.onSuccess('submitMilestoneReport')}
        proposalUri={modals.submitMilestoneReportModal.selectedTask?.target?.uri}
      />

      <SubmitAcceptanceReportModal
        isOpen={modals.submitAcceptanceReportModal.isOpen}
        onClose={() => modals.close('submitAcceptanceReport')}
        onSuccess={() => modals.onSuccess('submitAcceptanceReport')}
        proposalUri={modals.submitAcceptanceReportModal.selectedTask?.target?.uri}
      />
    </div>
  );
}
