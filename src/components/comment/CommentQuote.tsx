"use client";

import React, { useState, useEffect } from "react";
import { CommentQuoteProps } from "@/types/comment";
import "./comment.css";
import Avatar from "@/components/common/Avatar";
import useUserInfoStore from "@/store/userInfo";
import { useI18n } from "@/contexts/I18nContext";
import VditorRichTextEditor from "@/components/common/VditorRichTextEditor";

export default function CommentQuote({
  onSubmit,
  placeholder,
  parentId,
  isReply = false,
  quotedText = ""
}: CommentQuoteProps) {
  const { messages } = useI18n();
  const { userInfo } = useUserInfoStore();
  const [content, setContent] = useState(quotedText);
  const [isClient, setIsClient] = useState(false);

  // 检查是否在客户端
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 当quotedText变化时更新content
  useEffect(() => {
    if (quotedText && isClient) {
      // 在现有内容之前插入引用内容，保留当前输入的内容
      const quotedContent = `<blockquote>${quotedText}</blockquote><p><br></p>`;
      setContent(prevContent => {
        // 如果已有内容，在前面插入引用；如果没有内容，直接设置引用
        return prevContent.trim() ? quotedContent + prevContent : quotedContent;
      });
    }
  }, [quotedText, isClient]);

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content, parentId);
      setContent("");
    }
  };

  return (
    <div className={`comment-quote ${isReply ? "comment-quote-reply" : ""}`}>
      <div className="comment-quote-avatar">
        <Avatar did={userInfo?.did} size={40} alt="avatar" />
      </div>
      <div className="comment-quote-main">
        <VditorRichTextEditor
          value={content}
          onChange={setContent}
          placeholder={placeholder || messages.comment.placeholder}
          did={userInfo?.did}
          toolbarPreset="simple"
          mode="ir"
          loadingText={messages.comment.editorLoading}
        />
        <div className="comment-quote-actions">
          <button
            onClick={handleSubmit}
            className="comment-quote-submit"
            disabled={!content.trim()}
          >
            {messages.comment.publish}
          </button>
        </div>
      </div>
    </div>
  );
}
