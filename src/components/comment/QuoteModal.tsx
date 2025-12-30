"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/modal/Modal";
import { useI18n } from "@/contexts/I18nContext";
import VditorRichTextEditor from "@/components/common/VditorRichTextEditor";
import useUserInfoStore from "@/store/userInfo";

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  onSubmit: (content: string) => void;
}

export default function QuoteModal({
  isOpen,
  onClose,
  selectedText,
  onSubmit,
}: QuoteModalProps) {
  const { messages } = useI18n();
  const { userInfo } = useUserInfoStore();
  const [content, setContent] = useState("");

  // 当弹窗打开且 selectedText 变化时，填充引用内容到编辑器
  useEffect(() => {
    if (isOpen && selectedText) {
      // 格式化引用内容：如果是纯文本则转换为 HTML，如果已经是 HTML 则直接使用
      const hasHtmlTags = /<[^>]+>/.test(selectedText);
      
      let quotedHtml: string;
      if (hasHtmlTags) {
        // 如果已经是 HTML，直接使用（但需要清理可能的嵌套 blockquote）
        quotedHtml = selectedText.replace(/<blockquote>[\s\S]*?<\/blockquote>/g, '').trim();
      } else {
        // 如果是纯文本，转换为 HTML（保留换行）
        quotedHtml = `<p>${selectedText.replace(/\n/g, '<br>')}</p>`;
      }
      
      // 使用 blockquote 包裹引用内容
      const quotedContent = `<blockquote>${quotedHtml}</blockquote>\n\n`;
      setContent(quotedContent);
    } else if (!isOpen) {
      // 关闭弹窗时清空内容
      setContent("");
    }
  }, [isOpen, selectedText]);

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content);
      setContent("");
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={messages.comment.quoteModal?.title || "引用评论"}
      size="large"
      buttons={[
        {
          text: messages.comment.quoteModal?.cancel || "取消",
          onClick: onClose,
          variant: 'secondary'
        },
        {
          text: messages.comment.quoteModal?.comment || messages.comment.publish || "评论",
          onClick: handleSubmit,
          variant: 'primary',
          disabled: !content.trim()
        }
      ]}
    >
      <div className="quote-modal-content">
        <VditorRichTextEditor
          value={content}
          onChange={setContent}
          placeholder={messages.comment.quoteModal?.editorPlaceholder || messages.comment.placeholder || "请输入评论..."}
          did={userInfo?.did}
          toolbarPreset="simple"
          mode="ir"
          height="300px"
          loadingText={messages.comment.editorLoading}
        />
      </div>
    </Modal>
  );
}

