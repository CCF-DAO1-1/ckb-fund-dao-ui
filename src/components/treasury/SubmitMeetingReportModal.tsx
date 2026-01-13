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

    // 校验必填项
    if (!selectedMeetingId) {
      toast.error(t("submitMeetingReport.errors.meetingRequired") || "请选择会议");
      setIsSubmitting(false);
      return;
    }

    if (!reportContent || !reportContent.trim()) {
      toast.error(t("submitMeetingReport.errors.reportRequired") || "请填写报告内容");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. 构建参数对象（用于签名）
      const params: {
        proposal_uri: string;
        meeting_id: number;
        report: string;
        timestamp: number;
      } = {
        proposal_uri: proposalUri || "",
        meeting_id: parseInt(selectedMeetingId, 10),
        report: reportContent,
        timestamp: Math.floor(Date.now() / 1000), // UTC 时间戳（秒）
      };

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
            {t("submitMeetingReport.contentLabel") || "报告内容"}
          </label>
          <div >
            <input
              type="text"
              id="report-content"
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
              className="form-input"
              placeholder={t("submitMeetingReport.contentPlaceholder") || "请输入报告链接地址..."}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#1A1D23",
                border: "1px solid #4C525C",
                borderRadius: "6px",
                color: "#FFFFFF",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
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

