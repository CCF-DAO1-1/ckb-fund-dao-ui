'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Tag from "@/components/ui/tag/Tag";
import { ProposalStatus } from "@/utils/proposalUtils";
import { postUriToHref } from "@/lib/postUriHref";
import VotingRecordsTable from './VotingRecordsTable';
import DiscussionRecordsTable from './DiscussionRecordsTable';
import { useI18n } from '@/contexts/I18nContext';
import { useSelfProposalList } from '@/hooks/useSelfProposalList';
import { SelfProposalItem } from '@/server/proposal';
import TaskProcessingModal, { TaskType } from "@/components/proposal/TaskProcessingModal";
import { useTranslation } from "@/utils/i18n";

import { logger } from '@/lib/logger';
interface RecordsTableProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  className?: string;
}

interface ProposalRecord {
  id: string;
  name: string;
  type: string;
  budget: string;
  status: string;
  publishDate: string;
  actions: string[];
}

interface ProposalItemForModal {
  id: string;
  name: string;
  type: string;
  status: ProposalStatus;
  taskType: TaskType;
  deadline: string;
  isNew?: boolean;
  progress?: string;
  uri: string;
  budget?: number;
}

export default function RecordsTable({ activeTab, setActiveTab, className = '' }: RecordsTableProps) {
  const router = useRouter();
  const { messages, locale } = useI18n();
  const { t } = useTranslation();
  const { proposals, loading, error, page, totalPages, setPage, refetch } = useSelfProposalList({ page: 1, per_page: 10 });

  // 任务处理 Modal 状态
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalItemForModal | undefined>(undefined);

  // 格式化日期
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      }) + ' (UTC+8)';
    } catch {
      return dateString;
    }
  };

  // 格式化预算
  const formatBudget = (budget: string): string => {
    try {
      const num = parseFloat(budget);
      if (isNaN(num)) return budget;
      return new Intl.NumberFormat('zh-CN').format(num) + ' CKB';
    } catch {
      return budget;
    }
  };

  // 转换提案数据为表格格式
  const proposalRecords: ProposalRecord[] = useMemo(() => {
    // 调试：打印提案数据
    if (proposals.length > 0) {
      logger.log("提案数据已加载", { count: proposals.length });
    }
    return proposals.map((proposal: SelfProposalItem) => {
      const state = proposal.state as ProposalStatus;
      const title = proposal.record.data.title || '';
      const budget = proposal.record.data.budget || '0';
      const proposalType = proposal.record.data.proposalType || '';
      const created = proposal.record.created || '';

      // 获取提案类型文本
      const getProposalTypeText = (type: string): string => {
        if (type === 'funding') {
          return messages.recordsTable.proposalTypes.budgetApplication;
        }
        return type;
      };

      // 根据状态确定可用的操作
      const actions: string[] = [];
      if (state === ProposalStatus.DRAFT) {
        actions.push(messages.recordsTable.actions.edit);
        actions.push(messages.recordsTable.actions.startVoting);
      }
      if (state === ProposalStatus.INITIATION_VOTE) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        actions.push((messages.recordsTable.actions as any).viewVote);
      }
      // if (state === ProposalStatus.MILESTONE) {
      //   actions.push(messages.recordsTable.actions.milestoneDelivery);
      // }

      return {
        id: proposal.uri || proposal.cid,
        name: title,
        type: getProposalTypeText(proposalType),
        budget: formatBudget(budget),
        status: String(state),
        publishDate: formatDate(created),
        actions,
      };
    });
  }, [proposals, messages]);

  const tabs = [
    { key: 'proposals', label: messages.recordsTable.tabs.proposals },
    { key: 'voting', label: messages.recordsTable.tabs.voting },
    { key: 'discussion', label: messages.recordsTable.tabs.discussion }
  ];



  const handleAction = (action: string, recordId: string) => {
    logger.log(`执行操作: ${action}, 记录ID: ${recordId}`);

    // 如果是编辑操作
    if (action === messages.recordsTable.actions.edit) {
      const path = `/${locale}/proposal/edit/${postUriToHref(recordId)}`;
      router.push(path);
      return;
    }

    // 如果是查看投票操作
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (action === (messages.recordsTable.actions as any).viewVote) {
      const path = `/${locale}/proposal/${postUriToHref(recordId)}`;
      router.push(path);
      return;
    }

    // 如果是开启投票操作
    if (action === messages.recordsTable.actions.startVoting) {
      // 从 proposals 中找到对应的提案
      const proposal = proposals.find((p: SelfProposalItem) => (p.uri || p.cid) === recordId);
      if (proposal) {
        const state = proposal.state as ProposalStatus;
        const budget = proposal.record.data.budget ? parseFloat(proposal.record.data.budget) : 0;
        const proposalItem: ProposalItemForModal = {
          id: recordId,
          name: proposal.record.data.title || '',
          type: proposal.record.data.proposalType || '',
          status: state,
          taskType: t("taskTypes.createVote"),
          deadline: '',
          uri: proposal.uri || proposal.cid,
          budget: budget,
        };
        handleCreateVote(proposalItem);
      }
    }
  };

  // 创建投票相关
  const handleCreateVote = (proposal: ProposalItemForModal) => {
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

  const renderTableContent = () => {
    switch (activeTab) {
      case 'voting':
        return <VotingRecordsTable />;
      case 'discussion':
        return <DiscussionRecordsTable />;
      case 'proposals':
      default:
        if (loading) {
          return <div className="loading-state">{messages.recordsTable.loading || '加载中...'}</div>;
        }
        if (error) {
          return <div className="error-state">{error}</div>;
        }
        return (
          <>
            <div className="table-container">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>{messages.recordsTable.tableHeaders.proposal}</th>
                    <th>{messages.recordsTable.tableHeaders.type}</th>
                    <th>{messages.recordsTable.tableHeaders.budget}</th>
                    <th>{messages.recordsTable.tableHeaders.status}</th>
                    <th>{messages.recordsTable.tableHeaders.publishDate}</th>
                    <th>{messages.recordsTable.tableHeaders.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {proposalRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="no-data">
                        {messages.recordsTable.noData || '暂无数据'}
                      </td>
                    </tr>
                  ) : (
                    proposalRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="proposal-name">
                          <Link href={`/${locale}/proposal/${postUriToHref(record.id)}`} className="hover:text-primary hover:underline">
                            {record.name}
                          </Link>
                        </td>
                        <td className="proposal-type">{record.type}</td>
                        <td className="proposal-budget">{record.budget}</td>
                        <td className="proposal-status">
                          <Tag status={Number(record.status) as ProposalStatus} size="sm" />
                        </td>
                        <td className="proposal-date">{record.publishDate}</td>
                        <td className="proposal-actions">
                          {record.actions.map((action, index) => (
                            <button
                              key={index}
                              className={`action-button ${action === messages.recordsTable.actions.rectificationComplete ? 'filled' : 'outlined'}`}
                              onClick={() => handleAction(action, record.id)}
                            >
                              {action}
                            </button>
                          ))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages && totalPages > 0 && (
              <div className="pagination">
                <button
                  className="pagination-button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  &lt;
                </button>
                <span className="pagination-info">
                  {page} / {totalPages}
                </span>
                <button
                  className="pagination-button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  &gt;
                </button>
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className={`records-table-container ${className}`}>
      <div className="records-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderTableContent()}

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
