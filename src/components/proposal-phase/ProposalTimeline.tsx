'use client';

import { TimelineEventStatus, ProposalTimelineProps, TimelineEvent, TimelineEventType } from '../../types/timeline';
import { formatDate } from '../../utils/proposalUtils';
import { useI18n } from '@/contexts/I18nContext';
import './timeline.css';
import { useMemo } from 'react';

// 事件类型配置
const eventTypeConfig: Record<TimelineEventType, { title: string; description: string; isImportant?: boolean }> = {
  [TimelineEventType.REVIEW_START]: { title: '审议开始', description: '提案进入审议阶段' },
  [TimelineEventType.REVIEW_END]: { title: '审议结束', description: '审议阶段已完成' },
  [TimelineEventType.COMMUNITY_INQUIRY_1]: { title: '第一次社区质询会', description: '第一次社区质询会已举行' },
  [TimelineEventType.COMMUNITY_INQUIRY_2]: { title: '第二次社区质询会', description: '第二次社区质询会已举行' },
  [TimelineEventType.COMMUNITY_DISCUSSION]: { title: '社区讨论', description: '社区成员积极参与讨论' },
  [TimelineEventType.PROPOSAL_PUBLISHED]: { title: '提案发布', description: '提案已成功发布到社区', isImportant: true },
  [TimelineEventType.VOTE_START]: { title: '提案投票开始', description: '投票阶段正式开始', isImportant: true },
  [TimelineEventType.VOTE_END]: { title: '提案投票结束', description: '投票阶段已结束', isImportant: true },
  [TimelineEventType.VOTE_REMINDER]: { title: '投票提醒', description: '提醒社区成员参与投票' },
  [TimelineEventType.PROPOSAL_APPROVED]: { title: '提案通过', description: '提案已通过投票', isImportant: true },
  [TimelineEventType.PROPOSAL_REJECTED]: { title: '提案拒绝', description: '提案未通过投票' },
  [TimelineEventType.MILESTONE_TRACKING]: { title: '里程碑追踪', description: '正在追踪项目里程碑进度', isImportant: true },
  [TimelineEventType.PROJECT_REVIEW]: { title: '项目复核', description: '项目复核阶段' },
  [TimelineEventType.PROJECT_COMPLETED]: { title: '项目完成', description: '项目已成功完成', isImportant: true },
  [TimelineEventType.PROJECT_CANCELLED]: { title: '项目取消', description: '项目已被取消' },
};

// 生成随机 mock 数据
const generateRandomMockEvents = (): TimelineEvent[] => {
  const now = Date.now();
  const events: TimelineEvent[] = [];

  // 所有事件类型
  const allEventTypes = Object.values(TimelineEventType);

  // 随机选择 8-15 个事件
  const eventCount = Math.floor(Math.random() * 8) + 8;
  const selectedTypes = [...allEventTypes]
    .sort(() => Math.random() - 0.5)
    .slice(0, eventCount);

  // 按时间顺序生成事件（从过去到未来）
  const timePoints: number[] = [];

  // 过去的事件（30-1天前）
  const pastEventCount = Math.floor(selectedTypes.length * 0.4);
  for (let i = 0; i < pastEventCount; i++) {
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    timePoints.push(now - daysAgo * 24 * 60 * 60 * 1000);
  }

  // 现在的事件（今天）
  if (Math.random() > 0.3) {
    timePoints.push(now);
  }

  // 未来的事件（1-90天后）
  const futureEventCount = selectedTypes.length - pastEventCount - (timePoints.includes(now) ? 1 : 0);
  for (let i = 0; i < futureEventCount; i++) {
    const daysLater = Math.floor(Math.random() * 90) + 1;
    timePoints.push(now + daysLater * 24 * 60 * 60 * 1000);
  }

  // 排序时间点
  timePoints.sort((a, b) => a - b);

  // 生成事件
  timePoints.forEach((time, index) => {
    const type = selectedTypes[index] || selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
    const config = eventTypeConfig[type];
    const isPast = time < now;
    const isFuture = time > now;

    // 根据时间确定状态
    let status: TimelineEventStatus;
    if (isPast) {
      // 过去的事件：随机已完成或已取消
      status = Math.random() > 0.1 ? TimelineEventStatus.COMPLETED : TimelineEventStatus.CANCELLED;
    } else if (isFuture) {
      // 未来的事件：随机待处理或进行中
      status = Math.random() > 0.5 ? TimelineEventStatus.PENDING : TimelineEventStatus.IN_PROGRESS;
    } else {
      // 现在的事件：进行中
      status = TimelineEventStatus.IN_PROGRESS;
    }

    events.push({
      id: `mock-${index + 1}-${Date.now()}`,
      type,
      status,
      title: config.title,
      description: config.description,
      date: new Date(time).toISOString(),
      isImportant: config.isImportant || Math.random() > 0.7,
    });
  });

  return events;
};

export default function ProposalTimeline({ events, className = '' }: ProposalTimelineProps) {
  const { messages, locale } = useI18n();

  // 如果没有传入 events 或 events 为空，使用随机生成的 mock 数据
  const mockEvents = useMemo(() => generateRandomMockEvents(), []);
  const displayEvents = events && events.length > 0 ? events : mockEvents;

  // 获取事件状态样式
  const getEventStatusClass = (status: TimelineEventStatus) => {
    switch (status) {
      case TimelineEventStatus.COMPLETED:
        return 'timeline-event-completed';
      case TimelineEventStatus.IN_PROGRESS:
        return 'timeline-event-in-progress';
      case TimelineEventStatus.CANCELLED:
        return 'timeline-event-cancelled';
      default:
        return 'timeline-event-pending';
    }
  };


  // 按日期排序事件（最新的在前）
  const sortedEvents = [...displayEvents].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className={`timeline-card ${className}`}>
      <h3 className="timeline-title">{messages.proposalPhase.proposalTimeline.title}</h3>
      <div className="timeline">
        {sortedEvents.map((event) => (
          <div
            key={event.id}
            className={`timeline-item ${getEventStatusClass(event.status)}`}
          >
            <div className={`timeline-dot ${event.status === TimelineEventStatus.IN_PROGRESS ? 'timeline-dot-active' : ''}`}>
            </div>
            <div className="timeline-content">
              <div className="timeline-event">
                {event.title}
              </div>
              <div className="timeline-date">
                {formatDate(event.date, locale)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
