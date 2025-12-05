"use client";

import { ProposalMilestone } from "@/server/proposal";
import { useI18n } from "@/contexts/I18nContext";
import "./proposal.css";

interface MilestoneListProps {
  milestones: ProposalMilestone[];
}

export default function MilestoneList({ milestones }: MilestoneListProps) {
  const { messages, locale } = useI18n();

  if (!milestones || milestones.length === 0) {
    return (
      <div className="milestone-list-empty">
        <p>{messages.proposalDetail.noMilestoneInfo}</p>
      </div>
    );
  }

  // 按 index 排序
  const sortedMilestones = [...milestones].sort((a, b) => a.index - b.index);

  // 将 locale 映射到日期格式化语言代码
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(dateLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="milestone-list-container">
      {sortedMilestones.map((milestone) => (
        <div key={milestone.id} className="milestone-card">
          <h3 className="milestone-card-title">
            {messages.proposalDetail.milestone} {milestone.index + 1}: {milestone.title}
          </h3>

          <div className="milestone-card-info">
            <div className="milestone-info-item">
              <span className="milestone-info-label">{messages.proposalDetail.deliveryTime}:</span>
              <span className="milestone-info-value">{formatDate(milestone.date)}</span>
            </div>
          </div>

          <div className="milestone-card-description">
            <div
              className="proposal-html-content"
              dangerouslySetInnerHTML={{
                __html: milestone.description || messages.proposalDetail.notFilled,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

