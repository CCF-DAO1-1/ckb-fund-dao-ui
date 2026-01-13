'use client';

import { useState, useEffect, useRef } from 'react';
import { MilestoneTrackingProps, MilestoneStatus } from '../../types/milestone';
import { VotingDetailsData } from '../../types/voting';
import MilestoneVoting from './MilestoneVoting';
import { useI18n } from '@/contexts/I18nContext';
import { getTimeline } from '@/server/timeline';
import { logger } from '@/lib/logger';
import './milestone.css';

export default function MilestoneTracking({
  milestones,

  className = '',
  voteWeight,
  proposal
}: MilestoneTrackingProps) {
  const { messages } = useI18n();
  const [latestVoteResult, setLatestVoteResult] = useState<VotingDetailsData | null>(null);
  const fetchedRef = useRef<string | null>(null);

  // 获取提案URI
  const proposalUri = 'uri' in proposal ? proposal.uri : null;

  // 获取时间线数据以查找最新的投票结果
  useEffect(() => {
    if (!proposalUri) return;
    if (fetchedRef.current === proposalUri) return;

    const fetchTimeline = async () => {
      fetchedRef.current = proposalUri;
      try {
        const response = await getTimeline({ uri: proposalUri });
        if (response && Array.isArray(response)) {
          // 查找最近的 VOTE_FINISHED (type 5) 事件
          // 假设 API 返回的顺序是按时间倒序或需要排序
          // 我们先按时间戳倒序排序
          const sortedEvents = [...response].sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          const voteFinishedEvent = sortedEvents.find(e => e.timeline_type === 5);

          if (voteFinishedEvent && voteFinishedEvent.message) {
            try {
              const result = JSON.parse(voteFinishedEvent.message) as VotingDetailsData;
              setLatestVoteResult(result);
            } catch (e) {
              logger.error('Failed to parse voting result from timeline:', e);
            }
          }
        }
      } catch (err) {
        logger.error('Failed to fetch timeline for milestone tracking:', err);
      }
    };

    fetchTimeline();
  }, [proposalUri]);

  // 获取里程碑状态样式
  const getMilestoneStatusClass = (status: MilestoneStatus) => {
    switch (status) {
      case MilestoneStatus.COMPLETED:
        return 'milestone-completed';
      case MilestoneStatus.IN_PROGRESS:
        return 'milestone-in-progress';
      case MilestoneStatus.CANCELLED:
        return 'milestone-cancelled';
      default:
        return 'milestone-pending';
    }
  };

  // 获取里程碑状态文本
  const getMilestoneStatusText = (status: MilestoneStatus) => {
    switch (status) {
      case MilestoneStatus.COMPLETED:
        return messages.proposalPhase.milestoneTracking.status.completed;
      case MilestoneStatus.IN_PROGRESS:
        return messages.proposalPhase.milestoneTracking.status.inProgress;
      case MilestoneStatus.CANCELLED:
        return messages.proposalPhase.milestoneTracking.status.cancelled;
      default:
        return messages.proposalPhase.milestoneTracking.status.pending;
    }
  };

  // 获取里程碑图标
  const getMilestoneIcon = (status: MilestoneStatus) => {
    switch (status) {
      case MilestoneStatus.COMPLETED:
        return '✓';
      case MilestoneStatus.IN_PROGRESS:
        return '●';
      case MilestoneStatus.CANCELLED:
        return '✗';
      default:
        return '○';
    }
  };

  return (
    <div className={`milestone-tracking-card ${className}`}>
      <h3 className="milestone-title">{messages.proposalPhase.milestoneTracking.title}</h3>
      <div className="milestone-list">
        {milestones.map((milestone) => (
          <div
            key={milestone.id}
            className={`milestone-item ${getMilestoneStatusClass(milestone.status)}`}
          >
            <div className="milestone-icon">
              {getMilestoneIcon(milestone.status)}
            </div>
            <div className="milestone-content">
              <div className="milestone-header">
                <span className="milestone-title-text">{milestone.title}</span>
                <span className={`milestone-status-badge ${getMilestoneStatusClass(milestone.status)}`}>
                  {getMilestoneStatusText(milestone.status)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 里程碑投票区域 */}
      {/* <div className="milestone-voting-section">
        {milestones
          .filter(milestone => {
            // 只在进行中状态显示
            if (milestone.status !== MilestoneStatus.IN_PROGRESS) return false;

            // 如果有 voteMetaId，说明正在投票，显示
            if (milestone.voteMetaId) return true;

            // 如果没有 voteMetaId（投票结束），但有最新的投票结果，也显示
            if (latestVoteResult) return true;

            return false;
          })
          .map((milestone) => (
            <MilestoneVoting
              key={`voting-${milestone.id}`}
              voteMetaId={milestone.voteMetaId || 0} // 如果没有ID但有结果，传0或其他占位符
              voteWeight={voteWeight}
              proposal={proposal}
              milestoneTitle={milestone.title}
              className="milestone-voting-item"
              // 如果没有正在进行的投票ID，则传入结束的结果
              finishedResult={!milestone.voteMetaId ? latestVoteResult || undefined : undefined}
            />
          ))}
      </div> */}
    </div>
  );
}
