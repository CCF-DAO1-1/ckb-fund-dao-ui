"use client";

import { ProposalMilestone } from "@/server/proposal";
import { useI18n } from "@/contexts/I18nContext";
import { isMarkdown, markdownToHtml } from "@/utils/markdownUtils";
import DOMPurify from 'dompurify';
import "./proposal.css";

interface MilestoneListProps {
  milestones: ProposalMilestone[];
}

export default function MilestoneList({ milestones }: MilestoneListProps) {
  const { messages, locale } = useI18n();

  // 渲染内容（支持 Markdown 和 HTML）
  const renderContent = (content: string): string => {
    if (!content) return messages.proposalDetail.notFilled;

    let html = content;

    // 如果内容已经是 HTML（包含 HTML 标签且不是 Markdown），直接使用
    if (content.trim().startsWith('<') && !isMarkdown(content)) {
      html = content;
    }
    // 如果是 Markdown，转换为 HTML
    else if (isMarkdown(content)) {
      try {
        html = markdownToHtml(content);
      } catch (error) {
        console.warn('Markdown rendering failed, falling back to raw content:', error);
        html = content;
      }
    }

    // ✅ 使用 DOMPurify 清洗 HTML，防止 XSS 攻击
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'code', 'pre', 'a', 'img',
        'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'div', 'span'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'target', 'rel', 'class'],
      ALLOW_DATA_ATTR: false,
    });
  };

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
                __html: renderContent(milestone.description || ''),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

