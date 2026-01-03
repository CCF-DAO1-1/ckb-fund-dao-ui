'use client';

import { useMemo } from 'react';
import Tag from "@/components/ui/tag/Tag";
import { ProposalStatus } from "@/utils/proposalUtils";
import VotingRecordsTable from './VotingRecordsTable';
import DiscussionRecordsTable from './DiscussionRecordsTable';
import { useI18n } from '@/contexts/I18nContext';
import { useSelfProposalList } from '@/hooks/useSelfProposalList';
import { SelfProposalItem } from '@/server/proposal';

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

export default function RecordsTable({ activeTab, setActiveTab, className = '' }: RecordsTableProps) {
  const { messages } = useI18n();
  const { proposals, loading, error, page, totalPages, setPage } = useSelfProposalList({ page: 1, per_page: 10 });

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
      console.log("提案数据:", proposals);
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
      }
      if (state === ProposalStatus.REVIEW) {
        actions.push(messages.recordsTable.actions.startVoting);
      }
      if (state === ProposalStatus.MILESTONE) {
        actions.push(messages.recordsTable.actions.milestoneDelivery);
      }

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
    console.log(`执行操作: ${action}, 记录ID: ${recordId}`);
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
          return <div className="loading-state">加载中...</div>;
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
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    proposalRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="proposal-name">{record.name}</td>
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
    </div>
  );
}
