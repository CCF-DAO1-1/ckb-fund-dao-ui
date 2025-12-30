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
      // 参考 bbs-fe 的实现：使用更标准的引用格式
      // 如果 quotedText 已经是 HTML，直接使用；否则转换为 HTML
      const quotedHtml = quotedText.startsWith('<') 
        ? quotedText 
        : `<p>${quotedText.replace(/\n/g, '<br>')}</p>`;
      
      // 使用 blockquote 包裹引用内容，参考 bbs-fe 的格式
      const quotedContent = `<blockquote>${quotedHtml}</blockquote>\n\n`;
      
      setContent(prevContent => {
        // 如果已有内容，在前面插入引用；如果没有内容，直接设置引用
        // 避免重复插入引用
        if (prevContent.includes(quotedHtml)) {
          return prevContent;
        }
        return prevContent.trim() ? quotedContent + prevContent : quotedContent;
      });
    } else if (!quotedText && isClient) {
      // 如果 quotedText 被清空，也清空编辑器内容（可选）
      // setContent("");
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
