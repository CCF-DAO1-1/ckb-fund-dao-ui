"use client";

import React, { useState } from "react";
import { FaRegHeart, FaHeart } from "react-icons/fa";
import {
  MdOutlineModeComment /*, MdOutlineEdit, MdOutlineDelete */,
} from "react-icons/md";
import { GrShareOption } from "react-icons/gr";
import { RingLoader } from "react-spinners";
import { useI18n } from "@/contexts/I18nContext";
// import dynamic from "next/dynamic";

import "./comment.css";
import { CommentItemProps } from "@/types/comment";
import CommentReply from "./CommentReply";
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

// 移除了内联回复框，不再需要 ReactQuill
// 动态导入ReactQuill，禁用SSR
// const ReactQuill = dynamic(() => import("react-quill-new"), {
//   ssr: false,
//   loading: () => (
//     <div
//       style={{
//         height: "120px",
//         marginBottom: "10px",
//         border: "1px solid #4C525C",
//         borderRadius: "6px",
//         backgroundColor: "#262A33",
//         padding: "12px",
//         color: "#6b7280",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//       }}
//     >
//       编辑器加载中...
//     </div>
//   ),
// });

export default function CommentItem({
  comment,
  onLike,
  onReply,
  onEdit, // 暂时屏蔽
  onDelete, // 暂时屏蔽
}: CommentItemProps) {
  const { messages, locale } = useI18n();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unusedEdit = onEdit;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unusedDelete = onDelete;
  // 点赞 loading 状态
  const [isLiking, setIsLiking] = useState(false);

  // 判断是否为回复评论
  const isReplyToComment = comment.to && comment.to.did;
  const replyToName = isReplyToComment
    ? getUserDisplayNameFromInfo(comment.to)
    : null;
  // const [isReplying, setIsReplying] = useState(false);
  // const [replyContent, setReplyContent] = useState("");
  // const [isClient, setIsClient] = useState(false);

  // // 检查是否在客户端
  // useEffect(() => {
  //   setIsClient(true);
  // }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return messages.comment.timeAgo.justNow;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}${messages.comment.timeAgo.minutesAgo}`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}${messages.comment.timeAgo.hoursAgo}`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 86400)}${messages.comment.timeAgo.daysAgo}`;
    // 将 locale 映射到日期格式化语言代码
    const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    return date.toLocaleDateString(dateLocale);
  };

  // 修改为直接调用 onReply，传递评论内容作为引用
  const handleReply = () => {
    // 将评论内容和作者信息传递给父组件
    onReply(comment.id, comment.content);
  };

  const handleLike = async () => {
    // 如果已经点赞或正在点赞，不再重复操作
    if (comment.isLiked || isLiking) {
      return;
    }

    setIsLiking(true);
    try {
      await onLike(comment.id);
    } catch (error) {
      console.error('点赞失败:', error);
    } finally {
      setIsLiking(false);
    }
  };

  // 暂时屏蔽编辑和删除功能
  /* const handleEdit = () => {
    const newContent = prompt("编辑评论:", comment.content);
    if (newContent && newContent !== comment.content) {
      onEdit(comment.id, newContent);
    }
  };

  const handleDelete = () => {
    if (window.confirm("确定要删除这条评论吗？")) {
      onDelete(comment.id);
    }
  }; */

  // 暂时不需要这些配置，因为移除了内联回复框
  // const quillModules = {
  //   toolbar: [
  //     [{ header: [1, 2, false] }],
  //     ["bold", "italic", "underline"],
  //     ["image", "code-block"],
  //   ],
  // };

  // const quillFormats = [
  //   "header",
  //   "bold",
  //   "italic",
  //   "underline",
  //   "image",
  //   "code-block",
  // ];

  return (
    <div className="comment-item">
      <div className="comment-item-avatar">
        <Avatar
          did={comment.author.did}
          size={40}
        />
      </div>
      <div className="comment-item-container">
        <div className="comment-item-content">
          <div className="comment-item-header">
            <h3>
              {comment.author.name}
              <span>{formatTimeAgo(comment.createdAt)}</span>
            </h3>
            {/* 暂时屏蔽编辑和删除功能 */}
            {/* {comment.isAuthor && (
              <div className="comment-actions">
                <button onClick={handleEdit} className="comment-action-btn">
                  <MdOutlineEdit />
                </button>
                <button onClick={handleDelete} className="comment-action-btn">
                  <MdOutlineDelete />
                </button>
              </div>
            )} */}
          </div>

          <div className="comment-item-text">
            {isReplyToComment && replyToName ? (
              <CommentReply comment={comment} onDelete={onDelete} />
            ) : (
              <div
                dangerouslySetInnerHTML={{ __html: renderContent(comment.content) }}
                className="comment-content-html"
              />
            )}
          </div>

          {/* 移除内联回复框，点击回复按钮时将引用填充到主评论框 */}
        </div>
        <div className="comment-item-footer">
          <button onClick={handleReply} className="comment-footer-button">
            <MdOutlineModeComment />
            {messages.comment.reply}
          </button>
          <button
            onClick={handleLike}
            className={`comment-footer-button ${comment.isLiked ? "liked" : ""
              } ${isLiking ? "loading" : ""}`}
            disabled={isLiking || comment.isLiked}
          >
            {isLiking ? (
              <>
                <RingLoader size={14} color={comment.isLiked ? '#ff4d6d' : '#ffffff'} />
                <span style={{ marginLeft: '4px' }}>{messages.comment.liking}</span>
              </>
            ) : (
              <>
                {comment.isLiked ? <FaHeart /> : <FaRegHeart />}
                {comment.likes > 0 && <span>{comment.likes}</span>}
              </>
            )}
          </button>

          <button className="comment-footer-button">
            <GrShareOption />
            {messages.comment.share}
          </button>
        </div>
      </div>
    </div>
  );
}
