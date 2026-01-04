"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { IoDocumentTextOutline } from "react-icons/io5";
import { AiOutlineComment } from "react-icons/ai";
import { FaHeart, FaShare } from "react-icons/fa";
import { RingLoader } from "react-spinners";
import CopyButton from "@/components/ui/copy/CopyButton";
import Tag from "@/components/ui/tag/Tag";
import QuoteButton from "@/components/comment/QuoteButton";
import Avatar from "@/components/common/Avatar";
import { createPDSRecord } from "@/server/pds";
import useUserInfoStore from "@/store/userInfo";
import { ProposalDetailResponse } from "@/server/proposal";
import { getUserDisplayNameFromInfo } from "@/utils/userDisplayUtils";
import MilestoneList from "./MilestoneList";
import { useRouter } from "next/navigation";
import { postUriToHref } from "@/lib/postUriHref";

interface ProposalContentProps {
  proposal: ProposalDetailResponse;
  commentsCount: number;
  onQuote: (selectedText: string, onSubmit: (content: string) => void) => void;
  commentSubmitFn?: (content: string) => void;
}

export default function ProposalContent({
  proposal,
  commentsCount,
  onQuote,
  commentSubmitFn,
}: ProposalContentProps) {
  const { messages, locale } = useI18n();
  const { userInfo } = useUserInfoStore();

  const router = useRouter();

  // 点赞相关状态
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  // 初始化点赞数量
  useEffect(() => {
    if (proposal) {
      setLikeCount(parseInt(proposal.like_count) || 0);
    }
  }, [proposal]);

  // 点赞处理
  const handleLike = async () => {
    if (!proposal?.uri || !userInfo?.did) {
      return;
    }

    if (isLiked || isLiking) {
      return;
    }

    setIsLiking(true);

    try {
      const result = await createPDSRecord({
        record: {
          $type: 'app.dao.like',
          to: proposal.uri,
          viewer: userInfo.did,
        },
        did: userInfo.did,
      });

      if (result) {
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('点赞失败:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const getProposalTypeText = (type: string) => {
    const types: { [key: string]: string } = {
      funding: messages.proposalDetail.proposalTypes.funding,
      governance: messages.proposalDetail.proposalTypes.governance,
      technical: messages.proposalDetail.proposalTypes.technical,
      community: messages.proposalDetail.proposalTypes.community,
      development: messages.proposalDetail.proposalTypes.development,
      ecosystem: messages.proposalDetail.proposalTypes.ecosystem,
      research: messages.proposalDetail.proposalTypes.research,
      infrastructure: messages.proposalDetail.proposalTypes.infrastructure,
    };
    return types[type] || messages.proposalDetail.proposalTypes.unknown;
  };

  // 检测内容是否为 Markdown 格式
  const isMarkdown = (content: string): boolean => {
    if (!content || typeof content !== 'string') return false;
    
    // 如果内容以 HTML 标签开头，可能是 HTML
    if (content.trim().startsWith('<')) {
      // 检查是否包含常见的 Markdown 语法
      const markdownPatterns = [
        /^#{1,6}\s/m,           // 标题
        /^\*\s/m,               // 无序列表
        /^-\s/m,                // 无序列表
        /^\d+\.\s/m,            // 有序列表
        /\[.*\]\(.*\)/m,        // 链接
        /!\[.*\]\(.*\)/m,       // 图片
        /```/m,                 // 代码块
        /`[^`]+`/m,             // 行内代码
        /^\>/m,                 // 引用
        /^\|.*\|/m,             // 表格
      ];
      
      // 如果包含 HTML 标签但同时也包含 Markdown 语法，可能是混合格式
      // 这里我们优先判断为 Markdown
      return markdownPatterns.some(pattern => pattern.test(content));
    }
    
    // 检查是否包含 Markdown 语法特征
    const markdownIndicators = [
      /^#{1,6}\s/m,           // 标题
      /^\*\s/m,               // 无序列表
      /^-\s/m,                // 无序列表
      /^\d+\.\s/m,            // 有序列表
      /\[.*\]\(.*\)/m,        // 链接
      /!\[.*\]\(.*\)/m,       // 图片
      /```[\s\S]*```/m,       // 代码块
      /`[^`]+`/m,             // 行内代码
      /^\>/m,                 // 引用
      /^\|.*\|/m,             // 表格
    ];
    
    return markdownIndicators.some(pattern => pattern.test(content));
  };

  // 简单的 Markdown 到 HTML 转换函数（处理基本语法）
  const markdownToHtml = (markdown: string): string => {
    let html = markdown;
    
    // 先处理代码块，避免代码块内的内容被其他规则处理
    const codeBlocks: string[] = [];
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push(`<pre><code>${code}</code></pre>`);
      return placeholder;
    });
    
    // 处理行内代码
    const inlineCodes: string[] = [];
    html = html.replace(/`([^`]+)`/g, (match, code) => {
      const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
      inlineCodes.push(`<code>${code}</code>`);
      return placeholder;
    });
    
    // 先处理图片（必须在链接之前，因为图片语法包含链接语法）
    // 图片 ![alt](url) - 使用更精确的正则，确保 ! 在开头
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
      // 转义 URL 中的特殊字符
      const escapedUrl = url.replace(/"/g, '&quot;');
      const escapedAlt = alt.replace(/"/g, '&quot;');
      return `<img src="${escapedUrl}" alt="${escapedAlt}" style="max-width: 100%; height: auto; display: block; margin: 12px 0; border-radius: 6px;" />`;
    });
    
    // 处理链接 [text](url) - 现在不会匹配图片了
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // 恢复行内代码
    inlineCodes.forEach((code, index) => {
      html = html.replace(`__INLINE_CODE_${index}__`, code);
    });
    
    // 恢复代码块
    codeBlocks.forEach((code, index) => {
      html = html.replace(`__CODE_BLOCK_${index}__`, code);
    });
    
    // 标题 (# ## ### 等)
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // 粗体 **text** 或 __text__（避免匹配图片中的 !）
    html = html.replace(/(?<!!)\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // 斜体 *text* 或 _text_（避免匹配列表标记）
    html = html.replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_(?!_)([^_]+?)(?<!_)_(?!_)/g, '<em>$1</em>');
    
    // 引用 > text
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
    
    // 无序列表 - 或 *
    html = html.replace(/^[\*\-] (.*$)/gim, '<li>$1</li>');
    // 将连续的 <li> 标签包裹在 <ul> 中
    html = html.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');
    
    // 有序列表 1. 2. 等
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
    
    // 换行（两个空格或两个换行符）
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br />');
    
    // 包裹段落
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }
    
    return html;
  };

  // 渲染内容（支持 Markdown 和 HTML）
  const renderContent = (content: string): string => {
    if (!content) return messages.proposalDetail.notFilled;
    
    // 如果内容已经是 HTML（包含 HTML 标签且不是 Markdown），直接返回
    if (content.trim().startsWith('<') && !isMarkdown(content)) {
      return content;
    }
    
    // 如果是 Markdown，转换为 HTML
    if (isMarkdown(content)) {
      try {
        return markdownToHtml(content);
      } catch (error) {
        console.warn('Markdown rendering failed, falling back to raw content:', error);
        return content;
      }
    }
    
    // 默认情况：如果既不是 HTML 也不是 Markdown，按原样返回
    return content;
  };

  if (!proposal) {
    return null;
  }

  const steps = [
    { id: 2, name: messages.proposalDetail.projectBackground, description: messages.proposalDetail.stepDescriptions.projectBackground },
    { id: 3, name: messages.proposalDetail.projectGoals, description: messages.proposalDetail.stepDescriptions.projectGoals },
    { id: 4, name: messages.proposalDetail.teamIntroduction, description: messages.proposalDetail.stepDescriptions.teamIntroduction },
    { id: 5, name: messages.proposalDetail.projectBudget, description: messages.proposalDetail.stepDescriptions.projectBudget },
    { id: 6, name: messages.proposalDetail.milestones, description: messages.proposalDetail.stepDescriptions.milestones },
  ];

  return (
    <>
      {/* 提案头部信息 */}
      <div className="proposal-header-card">
        <div className="proposal-title-section">
          <h1 className="proposal-main-title">
            {proposal.record.data.title}
            {userInfo?.did === proposal.author.did && (
              <img
                src="/icon/edit.svg"
                alt="edit"
                style={{
                  display: "inline-block",
                  width: "20px",
                  height: "20px",
                  marginLeft: "12px",
                  cursor: "pointer",
                  verticalAlign: "middle",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/${locale}/proposal/edit/${postUriToHref(proposal.uri)}`);
                }}
              />
            )}
          </h1>

          <div className="proposal-author-info">
            <div className="author-avatar">
              <Avatar did={proposal.author.did} size={40} />
            </div>
            <div className="author-details">
              <div className="author-name">
                {getUserDisplayNameFromInfo({
                  displayName: proposal.author.displayName,
                  handle: proposal.author.handle,
                  did: proposal.author.did,
                })}
              </div>
              <div className="author-did">
                {proposal.author.did}
                <CopyButton
                  className="copy-btn"
                  text={proposal.author.did}
                  ariaLabel="copy-author-did"
                >
                </CopyButton>
              </div>
            </div>
          </div>

          <div className="proposal-meta-tags">
            <Tag
              variant="date"
              size="sm"
              text={new Date(proposal.record.created).toLocaleDateString(
                locale === "zh" ? "zh-CN" : "en-US",
                {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }
              )}
            />
            <Tag
              variant="type"
              size="sm"
              text={getProposalTypeText(proposal.record.data.proposalType)}
            />
            <Tag
              variant="budget"
              size="sm"
              text={proposal.record.data.budget
                ? `${Number(
                  proposal.record.data.budget
                ).toLocaleString()}.000 CKB`
                : "未设置预算"}
            />
            <Tag status={proposal.state} size="sm" />
          </div>

          <div className="proposal-actions">
            <a
              href="#proposal-detail"
              className="action-btn secondary-btn"
            >
              <IoDocumentTextOutline />
              {messages.proposalDetail.proposalDetails}
            </a>
            <a
              href="#comment-section"
              className="action-btn secondary-btn"
            >
              <AiOutlineComment />
              {messages.proposalDetail.communityDiscussion} ({commentsCount})
            </a>
          </div>
        </div>
      </div>

      <div id="proposal-detail" className="proposal-detail">
        <QuoteButton onQuote={onQuote} commentSubmitFn={commentSubmitFn} />
        {/* 所有步骤内容按顺序展示 */}
        {steps.map((step) => (
          <div key={step.id} className="proposal-step-content">
            <div className="step-title-container">
              <h2 className="step-title">{step.name} </h2>
            </div>

            <div className="step-content">
              {(() => {
                switch (step.id) {
                  case 2: // 项目背景
                    return (
                      <div className="form-fields">
                        <div
                          className="proposal-html-content"
                          dangerouslySetInnerHTML={{
                            __html: renderContent(proposal.record.data.background || ''),
                          }}
                        />
                      </div>
                    );

                  case 3: // 项目目标
                    return (
                      <div className="form-fields">
                        <div
                          className="proposal-html-content"
                          dangerouslySetInnerHTML={{
                            __html: renderContent(proposal.record.data.goals || ''),
                          }}
                        />
                      </div>
                    );

                  case 4: // 团队介绍
                    return (
                      <div className="form-fields">
                        <div
                          className="proposal-html-content"
                          dangerouslySetInnerHTML={{
                            __html: renderContent(proposal.record.data.team || ''),
                          }}
                        />
                      </div>
                    );

                  case 5: // 项目预算
                    return (
                      <div className="form-fields">
                        <div className="proposal-field">
                          <label className="form-label">
                            {messages.proposalDetail.budgetAmount}
                          </label>
                          <span className="proposal-value">
                            {proposal.record.data.budget
                              ? `${Number(
                                proposal.record.data.budget
                              ).toLocaleString()}.000 CKB`
                              : messages.proposalDetail.notFilled}
                          </span>
                        </div>
                      </div>
                    );

                  case 6: // 里程碑
                    return (
                      <div className="form-fields">
                        {proposal.record.data.milestones && proposal.record.data.milestones.length > 0 ? (
                          <>
                            {/* <div className="milestone-summary">
                                <p>{messages.proposalDetail.currentMilestone} {proposal.state-1000} / {proposal.record.data.milestones.length}</p>
                                <p>{messages.proposalDetail.progress} {Math.round((proposal.state-1000)/proposal.record.data.milestones.length*100)}%</p>
                              </div> */}
                            <MilestoneList milestones={proposal.record.data.milestones} />
                          </>
                        ) : (
                          <p>{messages.proposalDetail.noMilestoneInfo}</p>
                        )}
                      </div>
                    );

                  default:
                    return null;
                }
              })()}
            </div>
          </div>
        ))}
      </div>

      <div className="proposal-like">
        <a
          className={`button-actions ${isLiked ? 'liked' : ''} ${isLiking ? 'loading' : ''}`}
          onClick={handleLike}
          style={{
            color: isLiked ? '#ff4d6d' : undefined,
            cursor: isLiked || isLiking ? 'default' : 'pointer'
          }}
        >
          {isLiking ? (
            <>
              <RingLoader size={16} color={isLiked ? '#ff4d6d' : '#ffffff'} />
              <span style={{ marginLeft: '4px' }}>{messages.proposalDetail.liking}</span>
            </>
          ) : (
            <>
              <FaHeart /> {likeCount}
            </>
          )}
        </a>
        <a className="button-actions">
          <FaShare /> {messages.proposalDetail.share}
        </a>
      </div>
    </>

  );
}

