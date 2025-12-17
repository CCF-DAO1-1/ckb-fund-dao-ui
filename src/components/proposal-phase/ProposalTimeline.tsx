'use client';

import { useState, useEffect } from 'react';
import { TimelineEventStatus, ProposalTimelineProps, TimelineEvent, TimelineEventType } from '../../types/timeline';
import { formatDate } from '../../utils/proposalUtils';
import { useI18n } from '@/contexts/I18nContext';
import { getTimeline, TimelineEventRaw } from '@/server/timeline';
import './timeline.css';

// 将 timeline_type 映射到 TimelineEventType
const mapTimelineTypeToEventType = (timelineType: number, message: string): TimelineEventType => {
  // 根据 timeline_type 和 message 映射到对应的事件类型
  // 这里需要根据实际的 timeline_type 值来映射
  switch (timelineType) {
    case 1: // 提案创建
      return TimelineEventType.PROPOSAL_PUBLISHED;
    case 2: // 审议开始
      return TimelineEventType.REVIEW_START;
    case 3: // 投票开始
      return TimelineEventType.VOTE_START;
    case 4: // 投票结束
      return TimelineEventType.VOTE_END;
    case 5: // 提案通过
      return TimelineEventType.PROPOSAL_APPROVED;
    case 6: // 提案拒绝
      return TimelineEventType.PROPOSAL_REJECTED;
    case 7: // 里程碑追踪
      return TimelineEventType.MILESTONE_TRACKING;
    case 8: // 项目完成
      return TimelineEventType.PROJECT_COMPLETED;
    default:
      // 根据 message 推断类型
      if (message.includes('created') || message.includes('发布')) {
        return TimelineEventType.PROPOSAL_PUBLISHED;
      }
      if (message.includes('vote') || message.includes('投票')) {
        return TimelineEventType.VOTE_START;
      }
      if (message.includes('approved') || message.includes('通过')) {
        return TimelineEventType.PROPOSAL_APPROVED;
      }
      if (message.includes('rejected') || message.includes('拒绝')) {
        return TimelineEventType.PROPOSAL_REJECTED;
      }
      return TimelineEventType.PROPOSAL_PUBLISHED;
  }
};

// 根据事件类型和消息生成标题
const generateEventTitle = (eventType: TimelineEventType, message: string): string => {
  switch (eventType) {
    case TimelineEventType.PROPOSAL_PUBLISHED:
      return '提案发布';
    case TimelineEventType.REVIEW_START:
      return '审议开始';
    case TimelineEventType.VOTE_START:
      return '投票开始';
    case TimelineEventType.VOTE_END:
      return '投票结束';
    case TimelineEventType.PROPOSAL_APPROVED:
      return '提案通过';
    case TimelineEventType.PROPOSAL_REJECTED:
      return '提案拒绝';
    case TimelineEventType.MILESTONE_TRACKING:
      return '里程碑追踪';
    case TimelineEventType.PROJECT_COMPLETED:
      return '项目完成';
    default:
      return message || '时间线事件';
  }
};

// 转换 API 返回的数据格式为组件期望的格式
const convertTimelineEvents = (rawEvents: TimelineEventRaw[]): TimelineEvent[] => {
  return rawEvents.map((raw) => {
    const eventType = mapTimelineTypeToEventType(raw.timeline_type, raw.message);
    const title = generateEventTitle(eventType, raw.message);
    
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
      isImportant: eventType === TimelineEventType.PROPOSAL_PUBLISHED || 
                   eventType === TimelineEventType.VOTE_START ||
                   eventType === TimelineEventType.PROPOSAL_APPROVED ||
                   eventType === TimelineEventType.PROJECT_COMPLETED,
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
