"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/modal/Modal";
import { useTranslation } from "@/utils/i18n";
import toast from "react-hot-toast";
import useUserInfoStore from "@/store/userInfo";
import { submitMeetingReport } from "@/server/task";
import { generateSignature } from "@/lib/signature";
import VditorRichTextEditor from "@/components/common/VditorRichTextEditor";
import MeetingSelect, { MeetingItem } from "./MeetingSelect";

import { logger } from '@/lib/logger';
export interface SubmitMeetingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  proposalUri?: string;
}

export default function SubmitMeetingReportModal({
  isOpen,
  onClose,
  onSuccess,
  proposalUri,
}: SubmitMeetingReportModalProps) {
  const { t } = useTranslation();
  const { userInfo } = useUserInfoStore();
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [reportContent, setReportContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 当选择会议时
  const handleMeetingChange = (meeting: MeetingItem | null) => {
    setSelectedMeetingId(meeting ? String(meeting.id) : "");
  };

  // 重置表单
  useEffect(() => {
    if (!isOpen) {
      setSelectedMeetingId("");
      setReportContent("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!userInfo?.did) {
      toast.error(t("submitMeetingReport.errors.userNotLoggedIn") || "请先登录");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 构建参数对象（用于签名）
      const params: {
        proposal_uri: string;
        meeting_id?: number;
        report?: string;
        timestamp: number;
      } = {
        proposal_uri: proposalUri || "",
        timestamp: Math.floor(Date.now() / 1000), // UTC 时间戳（秒）
      };

      // 如果选择了会议，添加 meeting_id
      if (selectedMeetingId) {
        params.meeting_id = parseInt(selectedMeetingId, 10);
      }

      // 如果有报告内容，添加 report
      if (reportContent.trim()) {
        params.report = reportContent.trim();
      }

      // 2. 生成签名
      const { signed_bytes: signedBytes, signing_key_did: signingKeyDid } = await generateSignature(params);

      // 3. 调用 API
      const response = await submitMeetingReport({
        did: userInfo.did,
        params: params,
        signed_bytes: signedBytes,
        signing_key_did: signingKeyDid,
      });

      if (response) {
        toast.success(t("submitMeetingReport.success") || "AMA报告提交成功");
        onSuccess?.();
        onClose();
      } else {
        throw new Error(t("submitMeetingReport.errors.submitFailed") || "提交失败");
      }
    } catch (error) {
      logger.error("提交AMA报告失败:");
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || t("submitMeetingReport.errors.submitFailed") || "提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedMeetingId("");
      setReportContent("");
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("submitMeetingReport.title") || "提交AMA报告"}
      size="large"
      buttons={[
        {
          text: t("common.cancel") || "取消",
          onClick: handleClose,
          variant: "secondary",
          disabled: isSubmitting,
        },
        {
          text: t("submitMeetingReport.submit") || "提交",
          onClick: handleSubmit,
          variant: "primary",
          disabled: isSubmitting,
        },
      ]}
    >
      <div style={{ padding: "20px 0" }}>
        {/* 会议选择 */}
        <MeetingSelect
          value={selectedMeetingId}
          onChange={handleMeetingChange}
          proposalUri={proposalUri}
          disabled={isSubmitting}
        />

        {/* 报告内容 */}
        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="report-content"
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {t("submitMeetingReport.contentLabel") || "报告内容（可选）"}
          </label>
          <div style={{ minHeight: "200px" }}>
            <VditorRichTextEditor
              value={reportContent}
              onChange={setReportContent}
              mode="ir"
              toolbarPreset="simple"
              placeholder={t("submitMeetingReport.contentPlaceholder") || "请输入报告内容..."}
            />
          </div>
        </div>

        {proposalUri && (
          <div style={{
            marginTop: "12px",
            fontSize: "12px",
            color: "#8A949E",
            wordBreak: "break-all",
            overflowWrap: "break-word",
            lineHeight: "1.5"
          }}>
            <div style={{ marginBottom: "4px", fontWeight: 500 }}>
              {t("submitMeetingReport.proposalUri") || "提案 URI"}:
            </div>
            <div style={{
              wordBreak: "break-all",
              overflowWrap: "break-word",
              color: "#CCCCCC"
            }}>
              {proposalUri}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

