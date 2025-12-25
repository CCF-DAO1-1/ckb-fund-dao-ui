"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { CommentQuoteProps } from "@/types/comment";
import "./comment.css";
import "./quill-editor.css";
import "react-quill-new/dist/quill.snow.css";
import Avatar from "@/components/common/Avatar";
import useUserInfoStore from "@/store/userInfo";
import { useI18n } from "@/contexts/I18nContext";
import { useImageUpload } from "@/hooks/useImageUpload";

// 动态导入ReactQuill，禁用SSR
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "200px",
        marginBottom: "10px",
        border: "1px solid #4C525C",
        borderRadius: "6px",
        backgroundColor: "#262A33",
        padding: "12px",
        color: "#6b7280",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* 这里会在组件内部使用国际化文本 */}
    </div>
  ),
});

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

  // 图片上传 handler
  const imageHandler = useImageUpload(userInfo?.did);

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, false] }],
        ["bold", "italic", "underline"],
        ["blockquote", "code-block"],
        ["image"],
      ],
      handlers: {
        image: imageHandler,
      },
    },
  }), [imageHandler]);

  const quillFormats = [
    "header",
    "bold",
    "italic",
    "underline",
    "blockquote",
    "image",
    "code-block",
  ];

  return (
    <div className={`comment-quote ${isReply ? "comment-quote-reply" : ""}`}>
      <div className="comment-quote-avatar">
        <Avatar did={userInfo?.did} size={40} alt="avatar" />
      </div>
      <div className="comment-quote-main">
        <div className="editor-container">
          {isClient ? (
            <div className="quill-wrapper">
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={quillModules}
                formats={quillFormats}
                placeholder={placeholder || messages.comment.placeholder}
              />
            </div>
          ) : (
            <div
              style={{
                borderRadius: "8px",
                backgroundColor: "#262A33",
                padding: "12px",
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {messages.comment.editorLoading}
            </div>
          )}
        </div>
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
