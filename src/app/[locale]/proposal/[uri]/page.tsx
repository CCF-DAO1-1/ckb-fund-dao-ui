"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from 'next/navigation';
import { useTranslation } from "../../../../utils/i18n";
import { useI18n } from "@/contexts/I18nContext";
import "@/styles/proposal.css";

import "@/styles/quill-editor.css";
import { ProposalContent, ProposalComments, ProposalSidebar } from "@/components/proposal-phase";
import { useProposalDetail } from "@/hooks/useProposalDetail";
import { useCommentList } from "@/hooks/useCommentList";

export default function ProposalDetail() {
  useTranslation();
  const { messages } = useI18n();
  const params = useParams();
  const uri = useMemo(() => params?.uri as string, [params?.uri]);
  
  // 获取提案详情（用于面包屑和标题）
  const { proposal, loading, error } = useProposalDetail(uri);
  
  // 获取评论列表（统一在主页面获取，避免重复请求）
  const { 
    comments: apiComments, 
    loading: commentsLoading, 
    error: commentsError, 
    refetch: refetchComments 
  } = useCommentList(proposal?.uri || null);
  
  // 引用文本状态（用于从 ProposalContent 传递到 ProposalComments）
  const [quotedText, setQuotedText] = useState("");

  // useEffect(() => {
  //   // 处理锚点高亮
  //   const handleHashChange = () => {
  //     const hash = window.location.hash;
  //     const buttons = document.querySelectorAll('.proposal-actions a');
      
  //     buttons.forEach(button => {
  //       button.classList.remove('primary-btn');
  //       button.classList.add('secondary-btn');
  //     });
      
  //     if (hash === '#proposal-detail') {
  //       const detailButton = document.querySelector('a[href="#proposal-detail"]');
  //       if (detailButton) {
  //         detailButton.classList.remove('secondary-btn');
  //         detailButton.classList.add('primary-btn');
  //       }
  //     } else if (hash === '#comment-section') {
  //       const commentButton = document.querySelector('a[href="#comment-section"]');
  //       if (commentButton) {
  //         commentButton.classList.remove('secondary-btn');
  //         commentButton.classList.add('primary-btn');
  //       }
  //     }
  //   };

  //   // 初始设置
  //   if (!window.location.hash) {
  //     window.location.hash = '#proposal-detail';
  //   }
  //   handleHashChange();
    
  //   // 监听hash变化
  //   window.addEventListener('hashchange', handleHashChange);
    
  //   return () => {
  //     window.removeEventListener('hashchange', handleHashChange);
  //   };
  // }, []);

  const handleQuote = (selectedText: string) => {
    // 设置引用文本并跳转到评论区域
    setQuotedText(selectedText);
    window.location.hash = '#comment-section';
    setTimeout(() => {
      const commentSection = document.getElementById('comment-section');
      if (commentSection) {
        commentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  if (loading) {
    return (
      <div className="container">
        <main>
          <div className="main-content">
            <div className="step-container">
              <div className="loading-state">
                <div className="loading-text">{messages.proposalDetail.loading}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <main>
          <div className="main-content">
            <div className="step-container">
              <div className="flex justify-center items-center h-64">
                <div className="text-red-500">{error}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="container">
        <main>
          <div className="main-content">
            <div className="step-container">
              <div className="flex justify-center items-center h-64">
                <div className="text-white">{messages.proposalDetail.proposalNotFound}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <main>
        <div className="proposal-detail-layout">
          {/* 面包屑导航 */}
          <div className="breadcrumb">
            <span>{messages.proposalDetail.governanceHome}</span>
            <span className="breadcrumb-separator">&gt;</span>
            <span>{proposal.record.data.title}</span>
          </div>

          <div className="proposal-content-wrapper">
            {/* 左侧主要内容 */}
            <div className="proposal-main-content">
              <ProposalContent
                proposal={proposal}
                commentsCount={apiComments?.length || 0}
                onQuote={handleQuote}
              />
              <ProposalComments 
                proposal={proposal} 
                apiComments={apiComments || []}
                commentsLoading={commentsLoading}
                commentsError={commentsError}
                onRefetchComments={refetchComments}
                quotedText={quotedText} 
              />
            </div>
            {/* 右侧投票和操作区 */}
            {proposal && (
              <ProposalSidebar proposal={proposal} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
