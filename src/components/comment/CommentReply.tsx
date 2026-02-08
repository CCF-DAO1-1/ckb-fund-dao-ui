"use client";

import React from "react";
// import { MdOutlineDelete } from "react-icons/md";

import "./comment.css";
import { CommentReplyProps } from "@/types/comment";
import Avatar from "@/components/common/Avatar";
import { getUserDisplayNameFromInfo } from "@/utils/userDisplayUtils";
import { isMarkdown, markdownToHtml } from "@/utils/markdownUtils";
import DOMPurify from 'dompurify';

import { logger } from '@/lib/logger';
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

export default function CommentReply({
  comment,
  onDelete // 暂时屏蔽
}: CommentReplyProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unusedDelete = onDelete;

  // 暂时屏蔽删除功能
  /* const handleDelete = () => {
    if (window.confirm("确定要删除这条评论吗？")) {
      onDelete(comment.id);
    }
  }; */

  // 格式化时间（暂时未使用）
  // const formatTimeAgo = (dateString: string) => {
  //   const date = new Date(dateString);
  //   const now = new Date();
  //   const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  //   
  //   if (diffInSeconds < 60) return "刚刚";
  //   if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
  //   if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
  //   if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}天前`;
  //   return date.toLocaleDateString("zh-CN");
  // };

  // 判断是否为回复评论
  const isReplyToComment = comment.to && comment.to.did;
  const replyToName = isReplyToComment
    ? getUserDisplayNameFromInfo(comment.to)
    : null;

  // 拆分引用内容和回复内容
  // 参考 bbs-fe 的实现：更健壮的解析逻辑，支持嵌套引用
  const parseReplyContent = () => {
    if (!isReplyToComment) {
      return { quotedContent: null, replyContent: comment.content };
    }

    // 使用更健壮的正则表达式提取 blockquote 标签内容
    // 支持嵌套的 blockquote（虽然不常见，但更安全）
    const blockquoteRegex = /<blockquote>([\s\S]*?)<\/blockquote>/;
    const blockquoteMatch = comment.content.match(blockquoteRegex);

    if (blockquoteMatch) {
      const quotedContent = blockquoteMatch[1].trim(); // blockquote 内的内容
      // 移除第一个 blockquote 及其内容，保留后续内容
      const replyContent = comment.content
        .replace(blockquoteRegex, '')
        .replace(/^\s*<p><br><\/p>\s*/, '') // 移除可能的空段落
        .replace(/^\s*\n+\s*/, '') // 移除开头的换行
        .trim();
      
      return { 
        quotedContent: quotedContent || null, 
        replyContent: replyContent || null 
      };
    }

    return { quotedContent: null, replyContent: comment.content };
  };

  const { quotedContent, replyContent } = parseReplyContent();

  return (
    <>
      <div className="comment-reply-item">
        <div className="comment-reply-content">
          <div className="comment-reply-header">
            <h4>

              {isReplyToComment && replyToName && (
                <span className="reply-to-indicator">
                  <Avatar
                    did={comment.to?.did}
                    size={20}
                    className="reply-to-avatar"
                  />
                  <span className="reply-to-name">{replyToName}</span>
                </span>
              )}
              {/* <span className="comment-time">{formatTimeAgo(comment.createdAt)}</span> */}
            </h4>
            {/* 暂时屏蔽删除功能 */}
            {/* {comment.isAuthor && (
            <div className="comment-reply-actions">
              <button onClick={handleDelete} className="comment-reply-action-btn">
                <MdOutlineDelete />
              </button>
            </div>
          )} */}
          </div>

          {/* 显示被引用的评论内容 - 参考 bbs-fe 的显示方式 */}
          {quotedContent && (
            <blockquote className="comment-quoted-content">
              <div
                dangerouslySetInnerHTML={{ __html: renderContent(quotedContent) }}
                className="comment-content-html"
              />
            </blockquote>
          )}


        </div>
      </div>
      {/* 显示回复的内容 */}
      {replyContent && (
        <div className="comment-reply-text" style={{ marginTop: "12px" }}>
          <div
            dangerouslySetInnerHTML={{ __html: renderContent(replyContent) }}
            className="comment-content-html"
          />
        </div>
      )}
    </>
  );
}