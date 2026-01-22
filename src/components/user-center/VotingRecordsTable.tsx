'use client';

import { useMemo, useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useSelfVoteList } from '@/hooks/useSelfVoteList';
import { SelfVoteItem } from '@/server/proposal';
import { ProposalStatus } from '@/utils/proposalUtils';
import Link from 'next/link';
import { postUriToHref } from "@/lib/postUriHref";
import storage from "@/lib/storage";

interface VotingRecord {
  id: string;
  proposalName: string;
  proposalUri?: string;
  votingStage: string;
  myChoice: string;
  voteQuantity: string;
  voteDate: string;
}

interface VotingRecordsTableProps {
  className?: string;
}

export default function VotingRecordsTable({ className = '' }: VotingRecordsTableProps) {
  const { messages, locale } = useI18n();
  const { votes, loading, error, page, totalPages, setPage } = useSelfVoteList({ page: 1, per_page: 10 });

  // 获取当前用户的钱包地址，用于查找投票权重
  // 使用 useState + useEffect 避免 hydration mismatch
  const [currentUserAddr, setCurrentUserAddr] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCurrentUserAddr(storage.getToken()?.walletAddress);
  }, []);

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
    const getVoteOptionText = (candidate: string): string => {
      const optionMap: { [key: string]: string } = {
        'Agree': messages.votingRecords.choices.approve,
        'Against': messages.votingRecords.choices.against,
        'Abstain': messages.votingRecords.choices.abstain,
        'approve': messages.votingRecords.choices.approve,
        'against': messages.votingRecords.choices.against,
        'abstain': messages.votingRecords.choices.abstain,
      };
      return optionMap[candidate] || candidate;
    };

    return votes.map((vote: SelfVoteItem) => {
      // 1. 提取提案名称：优先使用 proposal.record.data.title，其次 proposal_uri
      const proposalName = vote.proposal?.record?.data?.title || vote.proposal_uri || messages.votingRecords.unknownProposal || '未知提案';
      const proposalUri = vote.proposal_uri || vote.proposal?.uri;

      // 2. 投票阶段：根据 vote_meta.proposal_state 获取
      let votingStage = messages.votingRecords.votingStages.voting || '投票';
      if (vote.vote_meta?.proposal_state !== undefined) {
        const state = vote.vote_meta.proposal_state;
        switch (state) {
          case ProposalStatus.INITIATION_VOTE:
            votingStage = messages.proposalStatus?.initiationVote || '立项投票';
            break;
          case ProposalStatus.MILESTONE_VOTE:
            votingStage = messages.proposalStatus?.milestoneVote || '里程碑投票';
            break;
          case ProposalStatus.DELAY_VOTE:
            votingStage = messages.proposalStatus?.delayVote || '延期投票';
            break;
          case ProposalStatus.WAITING_REEXAMINE:
            votingStage = messages.proposalStatus?.waitingReexamine || '等待复核';
            break;
          case ProposalStatus.REEXAMINE_VOTE:
            votingStage = messages.proposalStatus?.reexamineVote || '复核投票';
            break;
          case ProposalStatus.RECTIFICATION_VOTE:
            votingStage = messages.proposalStatus?.rectificationVote || '整改投票';
            break;
          default:
            // 尝试直接使用 Tag 组件的逻辑或者 fallback
            votingStage = messages.votingRecords.votingStages.voting || '投票';
        }
      }

      // 3. 投票选项：根据 candidates_index 从 vote_meta.candidates 获取
      let myChoice = '-';
      if (vote.vote_meta?.candidates && typeof vote.candidates_index === 'number') {
        const candidate = vote.vote_meta.candidates[vote.candidates_index];
        if (candidate) {
          myChoice = getVoteOptionText(candidate);
        }
      } else if (vote.vote_option) {
        // 兼容旧字段
        myChoice = getVoteOptionText(vote.vote_option);
      }

      // 4. 投票数量：从 vote_meta.results.valid_votes 中查找当前用户的权重
      let voteQuantity = '-';
      if (vote.vote_meta?.results?.valid_votes && currentUserAddr && typeof vote.candidates_index === 'number') {
        const voters = vote.vote_meta.results.valid_votes[vote.candidates_index];
        if (Array.isArray(voters)) {
          // 查找当前用户的投票记录 [addr, weight]
          const userVote = voters.find((v: [string, number]) => v[0] === currentUserAddr);
          if (userVote) {
            voteQuantity = (userVote[1] / 100000000).toLocaleString();
          }
        }
      }

      // 5. 投票时间：优先使用 created
      const voteDate = formatDate(vote.created || vote.vote_time || '');

      return {
        id: String(vote.id),
        proposalName,
        proposalUri,
        votingStage,
        myChoice,
        voteQuantity,
        voteDate,
      };
    });
  }, [votes, messages, currentUserAddr]);

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
                  <td className="proposal-name">
                    {record.proposalUri ? (
                      <Link href={`/${locale}/proposal/${postUriToHref(record.proposalUri)}`} className="hover:text-primary hover:underline">
                        {record.proposalName}
                      </Link>
                    ) : (
                      record.proposalName
                    )}
                  </td>
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
