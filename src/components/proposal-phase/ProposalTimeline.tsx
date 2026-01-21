'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TimelineEventStatus, ProposalTimelineProps, TimelineEvent, TimelineEventType } from '../../types/timeline';
import { VotingDetailsData } from '../../types/voting';
import { formatDateTime } from '../../utils/proposalUtils';
import { useI18n } from '@/contexts/I18nContext';
import { getTimeline, TimelineEventRaw } from '@/server/timeline';
import { IoMdDocument, IoMdEye } from "react-icons/io";
import { Tooltip } from 'react-tooltip';
import VotingDetailsModal from './VotingDetailsModal';
import './timeline.css';

import { logger } from '@/lib/logger';
import ReportContentModal from './ReportContentModal';

// Helper to check if string is URL
const isUrl = (str: string) => {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// VotingDetailsData imported from types/voting

// 将 timeline_type 直接映射到 TimelineEventType（后端返回的值就是枚举值）
const mapTimelineTypeToEventType = (timelineType: number): TimelineEventType => {
  // 确保值在有效范围内
  if (timelineType >= 0 && timelineType <= 20) {
    return timelineType as TimelineEventType;
  }
  return TimelineEventType.DEFAULT;
};

// 根据事件类型生成标题的国际化key
const getEventTitleKey = (eventType: TimelineEventType): string => {
  switch (eventType) {
    case TimelineEventType.DEFAULT:
      return 'proposalPhase.proposalTimeline.eventTypes.default';
    case TimelineEventType.PROPOSAL_CREATED:
      return 'proposalPhase.proposalTimeline.eventTypes.proposalCreated';
    case TimelineEventType.PROPOSAL_EDITED:
      return 'proposalPhase.proposalTimeline.eventTypes.proposalEdited';
    case TimelineEventType.INITIATION_VOTE:
      return 'proposalPhase.proposalTimeline.eventTypes.initiationVote';
    case TimelineEventType.UPDATE_RECEIVER_ADDR:
      return 'proposalPhase.proposalTimeline.eventTypes.updateReceiverAddr';
    case TimelineEventType.VOTE_FINISHED:
      return 'proposalPhase.proposalTimeline.eventTypes.voteFinished';
    case TimelineEventType.SEND_INITIAL_FUND:
      return 'proposalPhase.proposalTimeline.eventTypes.sendInitialFund';
    case TimelineEventType.SUBMIT_MILESTONE_REPORT:
      return 'proposalPhase.proposalTimeline.eventTypes.submitMilestoneReport';
    case TimelineEventType.SUBMIT_DELAY_REPORT:
      return 'proposalPhase.proposalTimeline.eventTypes.submitDelayReport';
    case TimelineEventType.MILESTONE_VOTE:
      return 'proposalPhase.proposalTimeline.eventTypes.milestoneVote';
    case TimelineEventType.DELAY_VOTE:
      return 'proposalPhase.proposalTimeline.eventTypes.delayVote';
    case TimelineEventType.SEND_MILESTONE_FUND:
      return 'proposalPhase.proposalTimeline.eventTypes.sendMilestoneFund';
    case TimelineEventType.REEXAMINE_VOTE:
      return 'proposalPhase.proposalTimeline.eventTypes.reexamineVote';
    case TimelineEventType.ACCEPTANCE_VOTE:
      return 'proposalPhase.proposalTimeline.eventTypes.acceptanceVote';
    case TimelineEventType.RECTIFICATION_VOTE:
      return 'proposalPhase.proposalTimeline.eventTypes.rectificationVote';
    case TimelineEventType.SUBMIT_ACCEPTANCE_REPORT:
      return 'proposalPhase.proposalTimeline.eventTypes.submitAcceptanceReport';
    case TimelineEventType.CREATE_AMA:
      return 'proposalPhase.proposalTimeline.eventTypes.createAMA';
    case TimelineEventType.SUBMIT_AMA_REPORT:
      return 'proposalPhase.proposalTimeline.eventTypes.submitAMAReport';
    case TimelineEventType.CREATE_REEXAMINE_MEETING:
      return 'proposalPhase.proposalTimeline.eventTypes.createReexamineMeeting';
    case TimelineEventType.SUBMIT_REEXAMINE_REPORT:
      return 'proposalPhase.proposalTimeline.eventTypes.submitReexamineReport';
    case TimelineEventType.RECTIFICATION:
      return 'proposalPhase.proposalTimeline.eventTypes.rectification';
    default:
      return 'proposalPhase.proposalTimeline.eventTypes.timelineEvent';
  }
};

export default function ProposalTimeline({ proposalUri, className = '' }: ProposalTimelineProps) {
  const { messages, locale } = useI18n();
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  // 使用 ref 来追踪已经请求过的 uri，避免重复请求
  const lastFetchedUriRef = useRef<string | null>(null);

  // 根据事件类型获取国际化标题
  const getEventTitle = (eventType: TimelineEventType): string => {
    const key = getEventTitleKey(eventType);
    const parts = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = messages;
    for (const part of parts) {
      value = value?.[part];
    }
    return typeof value === 'string' ? value : key;
  };

  // 转换 API 返回的数据格式为组件期望的格式
  const convertTimelineEvents = useCallback((rawEvents: TimelineEventRaw[]): TimelineEvent[] => {
    return rawEvents.map((raw) => {
      const eventType = mapTimelineTypeToEventType(raw.timeline_type);
      const title = getEventTitle(eventType);

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
        description: raw.operator?.displayName ? `${raw.operator.displayName}` : undefined,
        date: raw.timestamp,
        // 重要事件：立项投票、发送启动资金、提交验收报告
        isImportant: eventType === TimelineEventType.INITIATION_VOTE ||
          eventType === TimelineEventType.SEND_INITIAL_FUND ||
          eventType === TimelineEventType.SUBMIT_ACCEPTANCE_REPORT,
        message: raw.message,
      };
    });
  }, []);

  // 获取时间线数据
  useEffect(() => {
    if (!proposalUri) {
      setEvents([]);
      lastFetchedUriRef.current = null;
      return;
    }

    // 如果 uri 与上次请求相同，跳过请求
    if (lastFetchedUriRef.current === proposalUri) {
      return;
    }

    const fetchTimeline = async () => {
      // 在请求前更新 ref，防止重复请求
      lastFetchedUriRef.current = proposalUri;

      try {
        const response = await getTimeline({ uri: proposalUri });

        if (response && Array.isArray(response)) {
          // 转换 API 返回的数据格式
          const convertedEvents = convertTimelineEvents(response);
          setEvents(convertedEvents);
        } else {
          setEvents([]);
        }
      } catch (err) {
        logger.error('获取时间线失败:', err);
        // 如果获取失败，设置为空数组，不显示时间线
        setEvents([]);
        // 请求失败时重置标记，允许重试
        lastFetchedUriRef.current = null;
      }
    };

    fetchTimeline();
  }, [proposalUri, convertTimelineEvents]);

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

  // 投票详情Modal状态
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [votingData, setVotingData] = useState<VotingDetailsData | null>(null);

  // 报告内容Modal状态
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
  }>({
    isOpen: false,
    title: '',
    content: '',
  });

  const handleReportClick = (message: string, title: string) => {
    if (isUrl(message)) {
      window.open(message, '_blank');
    } else {
      setReportModal({
        isOpen: true,
        title,
        content: message,
      });
    }
  };

  // 处理查看投票详情
  const handleViewVotingDetails = (message: string) => {
    try {
      const data = JSON.parse(message);
      setVotingData(data);
      setShowVotingModal(true);
    } catch (e) {
      logger.error('解析投票详情失败', e);
    }
  };

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
                {/* 
                  特殊处理类型 16 (SUBMIT_ACCEPTANCE_REPORT / SUBMIT_AMA_REPORT 混淆点)
                  用户要求：timeline_type为16时,展示的时间线标题为,提交AMA报告,后面应有一个文档的icon,tooltip展示message中的说明文字
                  注意：Enum 中 16 目前定义为 SUBMIT_ACCEPTANCE_REPORT，但我们根据 timeline_type (raw type) 来判断
                */}
                {event.type === TimelineEventType.SUBMIT_MILESTONE_REPORT ? (
                  <div className="ama-icon-container">
                    <span>{event.title}</span>
                    {event.message && (
                      <>
                        <IoMdDocument
                          className="document-icon"
                          data-tooltip-id={`tooltip-${event.id}`}
                          data-tooltip-content={isUrl(event.message || "") ? event.message : "点击查看报告详情"}
                          size={14}
                          onClick={() => handleReportClick(event.message || "", event.title)}
                          style={{ cursor: 'pointer' }}
                        />
                        <Tooltip id={`tooltip-${event.id}`} />
                      </>
                    )}
                  </div>
                ) : event.type === TimelineEventType.SUBMIT_ACCEPTANCE_REPORT ? (
                  <div className="ama-icon-container">
                    <span>{event.title}</span>
                    {event.message && (
                      <>
                        <IoMdDocument
                          className="document-icon"
                          data-tooltip-id={`tooltip-${event.id}`}
                          data-tooltip-content={isUrl(event.message || "") ? event.message : "点击查看报告详情"}
                          size={14}
                          onClick={() => handleReportClick(event.message || "", event.title)}
                          style={{ cursor: 'pointer' }}
                        />
                        <Tooltip id={`tooltip-${event.id}`} />
                      </>
                    )}
                  </div>
                ) : event.type === TimelineEventType.CREATE_AMA ? (
                  <div className="ama-icon-container">
                    <span>{event.title}</span>
                    {event.message && (
                      <>
                        <IoMdDocument
                          className="document-icon"
                          data-tooltip-id={`tooltip-${event.id}`}
                          data-tooltip-content={isUrl(event.message || "") ? event.message : "点击查看报告详情"}
                          size={14}
                          onClick={() => handleReportClick(event.message || "", messages.proposalPhase.proposalTimeline.amaReport)}
                          style={{ cursor: 'pointer' }}
                        />
                        <Tooltip id={`tooltip-${event.id}`} />
                      </>
                    )}
                  </div>
                ) : (
                  <div className="timeline-event-content">
                    <span>{event.title}</span>
                    {event.type === TimelineEventType.VOTE_FINISHED && event.message && (
                      <span
                        className="view-details-icon"
                        onClick={() => handleViewVotingDetails(event.message!)}
                        title={messages.common?.viewDetails || "View Details"}
                      >
                        <IoMdEye />
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="timeline-date">
                {formatDateTime(event.date, locale)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <VotingDetailsModal
        isOpen={showVotingModal}
        onClose={() => setShowVotingModal(false)}
        data={votingData}
      />

      <ReportContentModal
        isOpen={reportModal.isOpen}
        onClose={() => setReportModal(prev => ({ ...prev, isOpen: false }))}
        title={reportModal.title}
        content={reportModal.content}
      />
    </div>
  );
}
