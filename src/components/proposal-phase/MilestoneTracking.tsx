'use client';

import { MilestoneTrackingProps, MilestoneStatus } from '../../types/milestone';
import MilestoneVoting from './MilestoneVoting';
import { MilestoneVoteOption } from '../../types/milestoneVoting';
import { useI18n } from '@/contexts/I18nContext';
import useUserInfoStore from '@/store/userInfo';
import { prepareVote } from '@/server/proposal';
import './milestone.css';

export default function MilestoneTracking({
  milestones,
  currentMilestone, // eslint-disable-line @typescript-eslint/no-unused-vars
  totalMilestones, // eslint-disable-line @typescript-eslint/no-unused-vars
  className = ''
}: MilestoneTrackingProps) {
  const { messages } = useI18n();
  const { userInfo } = useUserInfoStore();

  // 处理里程碑投票
  const handleMilestoneVote = async (milestoneId: string, option: MilestoneVoteOption) => {
    if (!userInfo?.did) {
      const errorMsg = messages.voting?.errors?.userNotLoggedIn || '投票失败: 用户未登录';
      console.error(errorMsg);
      return;
    }

    try {
      // 暂时使用 vote_meta_id = 2
      const voteMetaId = 1;

      const response = await prepareVote({
        did: userInfo.did,
        vote_meta_id: voteMetaId,
      });

      const approveText = messages.voting?.options?.approve || '赞成';
      const rejectText = messages.voting?.options?.reject || '反对';
      const optionText = option === MilestoneVoteOption.APPROVE ? approveText : rejectText;
      const logMsg = messages.voting?.logs?.milestoneVotePrepareSuccess || '里程碑投票准备成功';
      console.log(`${logMsg}: 里程碑 ${milestoneId}, vote_meta_id=${voteMetaId}, option=${optionText}`, response);
    } catch (error) {
      const errorLogMsg = messages.voting?.logs?.milestoneVotePrepareFailed || '里程碑投票准备失败';
      console.error(errorLogMsg + ':', error);
    }
  };

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

              {/* 进度条 - 仅在进行中状态显示 */}
              {/* {milestone.status === MilestoneStatus.IN_PROGRESS && (
                <div className="milestone-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${milestone.progress}%` }}
                    />
                  </div>
                  <span className="progress-text">{milestone.progress}%</span>
                </div>
              )} */}


            </div>
          </div>
        ))}
      </div>

      {/* 里程碑投票区域 */}
      <div className="milestone-voting-section">
        {milestones
          .filter(milestone => milestone.votingInfo && milestone.status === MilestoneStatus.IN_PROGRESS)
          .map((milestone) => (
            <MilestoneVoting
              key={`voting-${milestone.id}`}
              votingInfo={milestone.votingInfo!}
              onVote={handleMilestoneVote}
              className="milestone-voting-item"
            />
          ))}
      </div>
    </div>
  );
}
