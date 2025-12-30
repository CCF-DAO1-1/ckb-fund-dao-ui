"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";
import QuoteModal from "./QuoteModal";

interface QuoteButtonProps {
  onQuote: (selectedText: string, onSubmit: (content: string) => void) => void;
  commentSubmitFn?: (content: string) => void;
}

export default function QuoteButton({ onQuote, commentSubmitFn }: QuoteButtonProps) {
  const { messages } = useI18n();
  const [isClient, setIsClient] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [onSubmitCallback, setOnSubmitCallback] = useState<((content: string) => void) | null>(null);

  useEffect(() => {
    // 确保在客户端环境中运行
    if (typeof window === 'undefined') return;
    
    setIsClient(true);

    // 只监听提案详情区域内的文本选择
    const proposalDetail = document.getElementById('proposal-detail');
    if (!proposalDetail) {
      return;
    }

    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      // 检查选中的文本是否在提案详情区域内
      if (text && text.length > 0 && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const commonAncestor = range.commonAncestorContainer;
        
        // 检查选中的内容是否在提案详情区域内
        // 排除按钮、链接等交互元素
        const ancestorElement = commonAncestor.nodeType === Node.TEXT_NODE 
          ? commonAncestor.parentElement 
          : commonAncestor as HTMLElement;
        
        if (!ancestorElement) {
          setIsVisible(false);
          return;
        }

        // 检查是否在提案详情区域内，且不是按钮、链接等交互元素
        const isInProposalDetail = proposalDetail.contains(ancestorElement);
        const isInteractiveElement = ancestorElement.closest('button, a, input, textarea, select');
        
        // 检查是否在提案内容区域（排除标题、按钮等）
        const isInContentArea = ancestorElement.closest('.proposal-html-content, .proposal-step-content, .step-content');
        
        if (isInProposalDetail && !isInteractiveElement && isInContentArea && text.length > 0) {
          const rect = range.getBoundingClientRect();
          const newPosition = {
            top: rect.top - 50,
            left: rect.left + rect.width / 2
          };
          setSelectedText(text);
          setPosition(newPosition);
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      } else {
        setIsVisible(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // 如果点击的是引用按钮，不隐藏
      if (target.closest('.quote-button-container') || target.closest('.quote-button')) {
        return;
      }
      
      // 如果点击的是提案详情区域内，不隐藏（让选择逻辑处理）
      if (target.closest('#proposal-detail')) {
        return;
      }
      
      // 点击外部隐藏按钮
      setIsVisible(false);
      setSelectedText('');
    };

    const handleScroll = () => {
      setIsVisible(false);
    };

    // 在 proposal-detail 元素上监听 mouseup 事件
    proposalDetail.addEventListener('mouseup', handleSelection);
    // 全局监听点击事件以处理点击外部的情况
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', handleScroll);

    return () => {
      proposalDetail.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleQuoteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 显示弹窗，传递提交函数
    if (selectedText) {
      setIsModalOpen(true);
      setIsVisible(false);
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleModalSubmit = (content: string) => {
    // 如果有评论提交函数，直接调用
    if (commentSubmitFn) {
      commentSubmitFn(content);
    } else {
      // 否则调用父组件传递的 onQuote
      onQuote(selectedText, (finalContent: string) => {
        // 这里 finalContent 是从弹窗编辑器中的内容
      });
    }
    setSelectedText('');
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedText('');
  };

  if (!isClient) {
    return null;
  }

  return (
    <>
      {/* 选择检测的引用按钮 */}
      <div
        className="quote-button-container"
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          transform: 'translateX(-50%)',
          display: isVisible ? 'block' : 'none',
          zIndex: 9999,
          pointerEvents: 'auto',
        }}
      >
        <button
          className="quote-button"
          onClick={handleQuoteClick}
          title={messages.comment.quoteTitle || "引用"}
          style={{
            background: '#00CC9B',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 4px 12px rgba(0, 204, 155, 0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          {messages.comment.quote || "引用"}
        </button>
      </div>

      {/* 引用弹窗 */}
      <QuoteModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        selectedText={selectedText}
        onSubmit={handleModalSubmit}
      />
    </>
  );
}
