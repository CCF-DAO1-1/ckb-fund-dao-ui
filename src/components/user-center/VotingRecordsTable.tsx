'use client';

import { useMemo } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useSelfVoteList } from '@/hooks/useSelfVoteList';
import { SelfVoteItem } from '@/server/proposal';

interface VotingRecord {
  id: string;
  proposalName: string;
  votingStage: string;
  myChoice: string;
  voteQuantity: string;
  voteDate: string;
}

interface VotingRecordsTableProps {
  className?: string;
}

export default function VotingRecordsTable({ className = '' }: VotingRecordsTableProps) {
  const { messages } = useI18n();
  const { votes, loading, error, page, totalPages, setPage } = useSelfVoteList({ page: 1, per_page: 10 });

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

  // 转换投票数据为表格格式
  const votingRecords: VotingRecord[] = useMemo(() => {
    // 获取投票选项文本
    const getVoteOptionText = (voteOption: string): string => {
      const optionMap: { [key: string]: string } = {
        'Agree': messages.votingRecords.choices.approve,
        'Against': messages.votingRecords.choices.against,
        'Abstain': messages.votingRecords.choices.abstain,
        'approve': messages.votingRecords.choices.approve,
        'against': messages.votingRecords.choices.against,
        'abstain': messages.votingRecords.choices.abstain,
      };
      return optionMap[voteOption] || voteOption;
    };

    return votes.map((vote: SelfVoteItem) => {
      // 从 proposal_uri 提取提案名称（暂时使用URI，后续可以获取提案详情）
      const proposalName = vote.proposal_uri || messages.votingRecords.unknownProposal || '未知提案';
      // 投票阶段暂时显示为"投票"（后续可以根据 vote_meta_id 获取详细信息）
      const votingStage = messages.votingRecords.votingStages.voting || '投票';
      // 投票选项
      const myChoice = getVoteOptionText(vote.vote_option);
      // 投票数量暂时不显示（需要从其他地方获取）
      const voteQuantity = '-';
      // 投票时间
      const voteDate = formatDate(vote.vote_time || vote.created);

      return {
        id: String(vote.id),
        proposalName,
        votingStage,
        myChoice,
        voteQuantity,
        voteDate,
      };
    });
  }, [votes, messages]);

  const getChoiceClass = (choice: string) => {
    const choiceMap: { [key: string]: string } = {
      [messages.votingRecords.choices.approve]: 'choice-approve',
      [messages.votingRecords.choices.against]: 'choice-against',
      [messages.votingRecords.choices.abstain]: 'choice-abstain'
    };
    return choiceMap[choice] || 'choice-default';
  };

  if (loading) {
    return <div className="loading-state">{messages.votingRecords.loading || '加载中...'}</div>;
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div className={`voting-records-table ${className}`}>
      <div className="table-container">
        <table className="records-table">
          <thead>
            <tr>
              <th>{messages.votingRecords.tableHeaders.proposal}</th>
              <th>{messages.votingRecords.tableHeaders.votingStage}</th>
              <th>{messages.votingRecords.tableHeaders.myChoice}</th>
              <th>{messages.votingRecords.tableHeaders.voteQuantity}</th>
              <th>{messages.votingRecords.tableHeaders.voteDate}</th>
            </tr>
          </thead>
          <tbody>
            {votingRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="no-data">
                  {messages.votingRecords.noData || '暂无投票记录'}
                </td>
              </tr>
            ) : (
              votingRecords.map((record) => (
                <tr key={record.id}>
                  <td className="proposal-name">{record.proposalName}</td>
                  <td className="voting-stage">{record.votingStage}</td>
                  <td className={`my-choice ${getChoiceClass(record.myChoice)}`}>
                    {record.myChoice}
                  </td>
                  <td className="vote-quantity">{record.voteQuantity}</td>
                  <td className="vote-date">{record.voteDate}</td>
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
    </div>
  );
}
