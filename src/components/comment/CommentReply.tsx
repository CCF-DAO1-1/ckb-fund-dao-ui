"use client";

import React from "react";
// import { MdOutlineDelete } from "react-icons/md";

import "./comment.css";
import { CommentReplyProps } from "@/types/comment";
import Avatar from "@/components/common/Avatar";
import { getUserDisplayNameFromInfo } from "@/utils/userDisplayUtils";

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
  // 匹配连续的列表项标记（可能包含换行）
  html = html.replace(/(__LIST_ITEM__.*?__END_LIST_ITEM__(?:\s*__LIST_ITEM__.*?__END_LIST_ITEM__)*)/g, (match) => {
    // 提取所有列表项内容
    const items = match.match(/__LIST_ITEM__(.*?)__END_LIST_ITEM__/g) || [];
    const listItems = items.map(item => {
      const content = item.replace(/__LIST_ITEM__(.*?)__END_LIST_ITEM__/, '$1');
      return `<li>${content}</li>`;
    }).join('');
    return `<ul>${listItems}</ul>`;
  });
  
  // 处理换行：先处理段落分隔，再处理单行换行
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br />');
  
  // 如果内容不是以 HTML 标签开头，包裹在段落中
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