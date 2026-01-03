'use client';

import { useMemo } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useRepliedList } from '@/hooks/useRepliedList';
import { RepliedItem } from '@/server/proposal';

interface DiscussionRecord {
  id: string;
  commentDate: string;
  proposalName: string;
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
  const { messages } = useI18n();
  const { comments, loading, error } = useRepliedList({ page: 1, per_page: 10 });

  // 格式化日期
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      });
    } catch {
      return dateString;
    }
  };

  // 转换回复数据为表格格式
  const discussionRecords: DiscussionRecord[] = useMemo(() => {
    return comments.map((comment: RepliedItem) => {
      // 判断是否为回复：to 字段不为空字符串表示是回复
      const isReply = comment.to !== '' && comment.to !== null && comment.to !== undefined;
      // 从嵌套的 proposal 对象中获取提案标题
      const proposalName = comment.proposal?.record?.data?.title || comment.proposal?.uri || '未知提案';
      // 使用 text 字段作为评论内容（HTML格式）
      const commentContent = comment.text || '';
      
      return {
        id: comment.uri || comment.cid,
        commentDate: formatDate(comment.created),
        proposalName,
        commentContent,
        isReply,
        parentCommentId: comment.to ? String(comment.to) : undefined,
      };
    });
  }, [comments]);

  if (loading) {
    return <div className="loading-state">加载中...</div>;
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div className={`discussion-records-list ${className}`}>
      <div className="discussion-list">
        {discussionRecords.length === 0 ? (
          <div className="no-data">暂无数据</div>
        ) : (
          discussionRecords.map((record) => (
            <div key={record.id} className={`discussion-item ${record.isReply ? 'reply-item' : ''}`}>
              <div className="discussion-header">
                <span className="comment-date">{record.commentDate}</span>
                <span className="proposal-reference">
                  {messages.discussionRecords.proposalReference} <span className="proposal-link">{record.proposalName}</span>{messages.discussionRecords.commentIn}
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
                  <div className="comment-text">{record.commentContent}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
