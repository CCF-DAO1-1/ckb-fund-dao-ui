'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';
import { useRepliedList } from '@/hooks/useRepliedList';
import { RepliedItem } from '@/server/proposal';
import { postUriToHref } from '@/lib/postUriHref';
import { isMarkdown, markdownToHtml } from '@/utils/markdownUtils';
import DOMPurify from 'dompurify';

import { logger } from '@/lib/logger';

// Markdown 渲染工具函数 - 添加 DOMPurify 清洗
const renderContent = (content: string): string => {
  if (!content) return '';

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
      logger.warn('Markdown rendering failed, falling back to raw content:');
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

interface DiscussionRecord {
  id: string;
  commentDate: string;
  proposalName: string;
  proposalUri?: string;
  commentContent: string;
  userName?: string;
  userAvatar?: string;
  isReply?: boolean;
  parentCommentId?: string;
}

interface DiscussionRecordsTableProps {
  className?: string;
}

export default function DiscussionRecordsTable({ className = '' }: DiscussionRecordsTableProps) {
  const { messages, locale } = useI18n();
  const { comments, loading, error, page, totalPages, setPage } = useRepliedList({ page: 1, per_page: 10 });

  // 格式化日期 - 格式：2025/09/18 00:00
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  // 转换回复数据为表格格式
  const discussionRecords: DiscussionRecord[] = useMemo(() => {
    const unknownProposalText = messages.discussionRecords.unknownProposal || '未知提案';
    return comments.map((comment: RepliedItem) => {
      // 判断是否为回复：to 字段不为空字符串表示是回复
      const isReply = comment.to !== '' && comment.to !== null && comment.to !== undefined;
      // 从嵌套的 proposal 对象中获取提案标题和URI
      const proposalName = comment.proposal?.record?.data?.title || comment.proposal?.uri || unknownProposalText;
      const proposalUri = comment.proposal?.uri;
      // 使用 text 字段作为评论内容（支持 HTML 和 Markdown 格式）
      const commentContent = renderContent(comment.text || '');
      
      return {
        id: comment.uri || comment.cid,
        commentDate: formatDate(comment.created),
        proposalName,
        proposalUri,
        commentContent,
        isReply,
        parentCommentId: comment.to ? String(comment.to) : undefined,
      };
    });
  }, [comments, messages.discussionRecords.unknownProposal]);

  if (loading) {
    return <div className="loading-state">{messages.discussionRecords.loading || '加载中...'}</div>;
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div className={`discussion-records-list ${className}`}>
      <div className="discussion-list">
        {discussionRecords.length === 0 ? (
          <div className="no-data">{messages.discussionRecords.noData || '暂无数据'}</div>
        ) : (
          discussionRecords.map((record) => (
            <div key={record.id} className={`discussion-item ${record.isReply ? 'reply-item' : ''}`}>
              <div className="discussion-header">
                <span className="comment-date">{record.commentDate}</span>
                <span className="proposal-reference">
                  {messages.discussionRecords.proposalReference}{' '}
                  {record.proposalUri ? (
                    <Link 
                      href={`/${locale}/proposal/${postUriToHref(record.proposalUri)}`}
                      className="proposal-link"
                    >
                      {record.proposalName}
                    </Link>
                  ) : (
                    <span className="proposal-link">{record.proposalName}</span>
                  )}
                  {messages.discussionRecords.commentIn}
                </span>
              </div>
              <div className="discussion-content">
                {record.isReply && <div className="reply-indicator"></div>}
                <div className="comment-block">
                  {record.userAvatar && record.userName && (
                    <div className="user-info" style={{justifyContent:"flex-start"}}>
                      <span className="user-avatar">{record.userAvatar}</span>
                      <span className="user-name">{record.userName}</span>
                    </div>
                  )}
                  <div 
                    className="comment-text"
                    dangerouslySetInnerHTML={{ __html: record.commentContent }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
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
