"use client";

import React from "react";
// import { MdOutlineDelete } from "react-icons/md";

import "./comment.css";
import { CommentReplyProps } from "@/types/comment";
import Avatar from "@/components/common/Avatar";
import { getUserDisplayNameFromInfo } from "@/utils/userDisplayUtils";

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
  const parseReplyContent = () => {
    if (!isReplyToComment) {
      return { quotedContent: null, replyContent: comment.content };
    }

    // 使用正则表达式提取 blockquote 标签内容
    const blockquoteMatch = comment.content.match(/<blockquote>([\s\S]*?)<\/blockquote>/);

    if (blockquoteMatch) {
      const quotedContent = blockquoteMatch[1]; // blockquote 内的内容
      const replyContent = comment.content.replace(/<blockquote>[\s\S]*?<\/blockquote>/, '').trim(); // 移除 blockquote 后的内容
      return { quotedContent, replyContent };
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

          {/* 显示被引用的评论内容 */}
          {quotedContent && (
            <blockquote className="comment-quoted-content">
              <div
                dangerouslySetInnerHTML={{ __html: quotedContent }}
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
            dangerouslySetInnerHTML={{ __html: replyContent }}
            className="comment-content-html"
          />
        </div>
      )}
    </>
  );
}