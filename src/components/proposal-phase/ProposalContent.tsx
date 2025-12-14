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
import { writesPDSOperation } from "@/app/posts/utils";
import useUserInfoStore from "@/store/userInfo";
import { ProposalDetailResponse } from "@/server/proposal";
import { getUserDisplayNameFromInfo } from "@/utils/userDisplayUtils";
import MilestoneList from "./MilestoneList";
import { useRouter } from "next/navigation";
import { postUriToHref } from "@/lib/postUriHref";

interface ProposalContentProps {
  proposal: ProposalDetailResponse;
  commentsCount: number;
  onQuote: (selectedText: string) => void;
}

export default function ProposalContent({
  proposal,
  commentsCount,
  onQuote,
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
      const result = await writesPDSOperation({
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
        <QuoteButton onQuote={onQuote} />
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
                            __html: proposal.record.data.background || messages.proposalDetail.notFilled,
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
                            __html: proposal.record.data.goals || messages.proposalDetail.notFilled,
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
                            __html: proposal.record.data.team || messages.proposalDetail.notFilled,
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

