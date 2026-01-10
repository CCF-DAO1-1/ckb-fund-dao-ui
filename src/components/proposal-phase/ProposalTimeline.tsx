'use client';

import { useState, useEffect } from 'react';
import { TimelineEventStatus, ProposalTimelineProps, TimelineEvent, TimelineEventType } from '../../types/timeline';
import { formatDate } from '../../utils/proposalUtils';
import { useI18n } from '@/contexts/I18nContext';
import { getTimeline, TimelineEventRaw } from '@/server/timeline';
import './timeline.css';

// 将 timeline_type 直接映射到 TimelineEventType（后端返回的值就是枚举值）
const mapTimelineTypeToEventType = (timelineType: number): TimelineEventType => {
  // 确保值在有效范围内
  if (timelineType >= 0 && timelineType <= 13) {
    return timelineType as TimelineEventType;
  }
  return TimelineEventType.DEFAULT;
};

// 根据事件类型生成标题
const generateEventTitle = (eventType: TimelineEventType): string => {
  switch (eventType) {
    case TimelineEventType.DEFAULT:
      return '默认事件';
    case TimelineEventType.CREATE_AMA:
      return '创建 AMA 会议';
    case TimelineEventType.SUBMIT_AMA_REPORT:
      return '提交 AMA 报告';
    case TimelineEventType.INITIATION_VOTE:
      return '立项投票';
    case TimelineEventType.UPDATE_RECEIVER_ADDR:
      return '更新收款地址';
    case TimelineEventType.SEND_INITIAL_FUND:
      return '发送启动资金';
    case TimelineEventType.SUBMIT_MILESTONE_REPORT:
      return '提交里程碑报告';
    case TimelineEventType.SUBMIT_DELAY_REPORT:
      return '提交延期报告';
    case TimelineEventType.SEND_MILESTONE_FUND:
      return '发送里程碑资金';
    case TimelineEventType.SUBMIT_ACCEPTANCE_REPORT:
      return '提交验收报告';
    case TimelineEventType.CREATE_REEXAMINE_MEETING:
      return '创建复审会议';
    case TimelineEventType.REEXAMINE_VOTE:
      return '复审投票';
    case TimelineEventType.RECTIFICATION_VOTE:
      return '整改投票';
    case TimelineEventType.SUBMIT_RECTIFICATION_REPORT:
      return '提交整改报告';
    default:
      return '时间线事件';
  }
};

// 转换 API 返回的数据格式为组件期望的格式
const convertTimelineEvents = (rawEvents: TimelineEventRaw[]): TimelineEvent[] => {
  return rawEvents.map((raw) => {
    const eventType = mapTimelineTypeToEventType(raw.timeline_type);
    const title = generateEventTitle(eventType);

    // 根据时间戳判断状态（简化处理，实际可能需要更复杂的逻辑）
    const now = new Date();
    const eventDate = new Date(raw.timestamp);
    const isPast = eventDate < now;
    const status = isPast ? TimelineEventStatus.COMPLETED : TimelineEventStatus.IN_PROGRESS;

    return {
      id: String(raw.id),
      type: eventType,
      status,
      title,
      description: raw.operator?.displayName ? `操作者: ${raw.operator.displayName}` : undefined,
      date: raw.timestamp,
      // 重要事件：立项投票、发送启动资金、提交验收报告
      isImportant: eventType === TimelineEventType.INITIATION_VOTE ||
        eventType === TimelineEventType.SEND_INITIAL_FUND ||
        eventType === TimelineEventType.SUBMIT_ACCEPTANCE_REPORT,
    };
  });
};

export default function ProposalTimeline({ proposalUri, className = '' }: ProposalTimelineProps) {
  const { messages, locale } = useI18n();
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  // 获取时间线数据
  useEffect(() => {
    if (!proposalUri) {
      setEvents([]);
      return;
    }

    const fetchTimeline = async () => {
      try {
        const response = await getTimeline({ uri: proposalUri });

        if (response && Array.isArray(response)) {
          // 转换 API 返回的数据格式
          const convertedEvents = convertTimelineEvents(response);
          setEvents(convertedEvents);
        } else {
          setEvents([]);
        }
      } catch (error) {
        console.error('获取时间线失败:', error);
        // 如果获取失败，设置为空数组，不显示时间线
        setEvents([]);
      }
    };

    fetchTimeline();
  }, [proposalUri]);

  // 使用获取的时间线数据
  const displayEvents = events || [];

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
