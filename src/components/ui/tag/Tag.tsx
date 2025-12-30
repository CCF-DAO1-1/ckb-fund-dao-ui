"use client";

import React from "react";
import "./Tag.css";
import { ProposalStatus, getStatusTagClass } from "@/utils/proposalUtils";
import { useTranslation } from "@/utils/i18n";

interface TagProps {
  variant?: "status" | "date" | "type" | "budget" | "default";
  status?: ProposalStatus;
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

export default function Tag({
  variant = "status",
  status,
  text,
  size = "md",
  className = "",
  onClick
}: TagProps) {
  const { t } = useTranslation();

  // 基础类名
  const baseClasses = "tag";
  const sizeClasses = `tag-${size}`;
  const clickableClasses = onClick ? "tag-clickable" : "";

  // 获取状态文本的多语言支持
  const getStatusText = (status: ProposalStatus): string => {
    switch (status) {
      case ProposalStatus.DRAFT:
        return t("proposalStatus.draft");
      case ProposalStatus.INITIATION_VOTE:
        return t("proposalStatus.initiationVote");
      case ProposalStatus.WAITING_FOR_START_FUND:
        return t("proposalStatus.waitingForStartFund");
      case ProposalStatus.IN_PROGRESS:
        return t("proposalStatus.inProgress");
      case ProposalStatus.MILESTONE_VOTE:
        return t("proposalStatus.milestoneVote");
      case ProposalStatus.DELAY_VOTE:
        return t("proposalStatus.delayVote");
      case ProposalStatus.WAITING_FOR_MILESTONE_FUND:
        return t("proposalStatus.waitingForMilestoneFund");
      case ProposalStatus.REVIEW_VOTE:
        return t("proposalStatus.reviewVote");
      case ProposalStatus.WAITING_FOR_ACCEPTANCE_REPORT:
        return t("proposalStatus.waitingForAcceptanceReport");
      case ProposalStatus.COMPLETED:
        return t("proposalStatus.completed");
      case ProposalStatus.REEXAMINE_VOTE:
        return t("proposalStatus.reexamineVote");
      // 向后兼容的旧状态值
      case ProposalStatus.REVIEW:
        return t("proposalStatus.communityReview");
      case ProposalStatus.VOTE:
        return t("proposalStatus.voting");
      case ProposalStatus.MILESTONE:
        return t("proposalStatus.milestoneDelivery");
      case ProposalStatus.APPROVED:
        return t("proposalStatus.approved");
      case ProposalStatus.REJECTED:
        return t("proposalStatus.rejected");
      case ProposalStatus.ENDED:
        return t("proposalStatus.ended");
      default:
        return t("proposalStatus.unknown");
    }
  };

  // 根据 variant 确定显示内容和样式
  let displayText = text || "";
  let variantClasses = "";

  if (variant === "status" && status !== undefined) {
    displayText = getStatusText(status);
    variantClasses = `tag-status ${getStatusTagClass(status)}`;
  } else if (variant === "date") {
    variantClasses = "tag-variant-date";
  } else if (variant === "type") {
    variantClasses = "tag-variant-type";
  } else if (variant === "budget") {
    variantClasses = "tag-variant-budget";
  } else {
    variantClasses = "tag-default";
  }

  return (
    <span
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {displayText}
    </span>
  );
}
