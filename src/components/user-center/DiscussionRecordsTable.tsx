'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';
import { useRepliedList } from '@/hooks/useRepliedList';
import { RepliedItem } from '@/server/proposal';
import { postUriToHref } from '@/lib/postUriHref';

// Markdown 渲染工具函数
const isMarkdown = (content: string): boolean => {
  if (!content || typeof content !== 'string') return false;
  
  if (content.trim().startsWith('<')) {
    const markdownPatterns = [
      /^#{1,6}\s/m,
      /^\*\s/m,
      /^-\s/m,
      /^\d+\.\s/m,
      /\[.*\]\(.*\)/m,
      /!\[.*\]\(.*\)/m,
      /```/m,
      /`[^`]+`/m,
      /^\>/m,
      /^\|.*\|/m,
    ];
    return markdownPatterns.some(pattern => pattern.test(content));
  }
  
  const markdownIndicators = [
    /^#{1,6}\s/m,
    /^\*\s/m,
    /^-\s/m,
    /^\d+\.\s/m,
    /\[.*\]\(.*\)/m,
    /!\[.*\]\(.*\)/m,
    /```[\s\S]*```/m,
    /`[^`]+`/m,
    /^\>/m,
    /^\|.*\|/m,
  ];
  
  return markdownIndicators.some(pattern => pattern.test(content));
};

const markdownToHtml = (markdown: string): string => {
  let html = markdown;
  
  const codeBlocks: string[] = [];
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre><code>${code}</code></pre>`);
    return placeholder;
  });
  
  const inlineCodes: string[] = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
    inlineCodes.push(`<code>${code}</code>`);
    return placeholder;
  });
  
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
    const escapedUrl = url.replace(/"/g, '&quot;');
    const escapedAlt = alt.replace(/"/g, '&quot;');
    return `<img src="${escapedUrl}" alt="${escapedAlt}" style="max-width: 100%; height: auto; display: block; margin: 12px 0; border-radius: 6px;" />`;
  });
  
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  inlineCodes.forEach((code, index) => {
    html = html.replace(`__INLINE_CODE_${index}__`, code);
  });
  
  codeBlocks.forEach((code, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, code);
  });
  
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  html = html.replace(/(?<!!)\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  html = html.replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_(?!_)([^_]+?)(?<!_)_(?!_)/g, '<em>$1</em>');
  
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
  
  // 处理无序列表：先标记列表项
  html = html.replace(/^[\*\-]\s+(.*)$/gim, '__LIST_ITEM__$1__END_LIST_ITEM__');
  
  // 处理有序列表：先标记列表项
  html = html.replace(/^\d+\.\s+(.*)$/gim, '__LIST_ITEM__$1__END_LIST_ITEM__');
  
  // 将连续的列表项标记包裹在 <ul> 中
  html = html.replace(/(__LIST_ITEM__.*?__END_LIST_ITEM__(?:\s*__LIST_ITEM__.*?__END_LIST_ITEM__)*)/g, (match) => {
    const items = match.match(/__LIST_ITEM__(.*?)__END_LIST_ITEM__/g) || [];
    const listItems = items.map(item => {
      const content = item.replace(/__LIST_ITEM__(.*?)__END_LIST_ITEM__/, '$1');
      return `<li>${content}</li>`;
    }).join('');
    return `<ul>${listItems}</ul>`;
  });
  
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br />');
  
  if (!html.trim().match(/^<(ul|ol|blockquote|h[1-3]|pre|p)/)) {
    html = '<p>' + html + '</p>';
  }
  
  return html;
};

const renderContent = (content: string): string => {
  if (!content) return '';
  
  if (content.trim().startsWith('<') && !isMarkdown(content)) {
    return content;
  }
  
  if (isMarkdown(content)) {
    try {
      return markdownToHtml(content);
    } catch (error) {
      console.warn('Markdown rendering failed, falling back to raw content:', error);
      return content;
    }
  }
  
  return content;
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
