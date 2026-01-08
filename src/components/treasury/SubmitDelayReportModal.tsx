"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/modal/Modal";
import { useTranslation } from "@/utils/i18n";
import toast from "react-hot-toast";
import useUserInfoStore from "@/store/userInfo";
import { submitDelayReport } from "@/server/task";
import { generateSignature } from "@/lib/signature";
import VditorRichTextEditor from "@/components/common/VditorRichTextEditor";

export interface SubmitDelayReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  proposalUri?: string;
}

export default function SubmitDelayReportModal({
  isOpen,
  onClose,
  onSuccess,
  proposalUri,
}: SubmitDelayReportModalProps) {
  const { t } = useTranslation();
  const { userInfo } = useUserInfoStore();
  const [delayReason, setDelayReason] = useState("");
  const [delayDuration, setDelayDuration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 重置表单
  useEffect(() => {
    if (!isOpen) {
      setDelayReason("");
      setDelayDuration("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!userInfo?.did) {
      toast.error(t("submitDelayReport.errors.userNotLoggedIn") || "请先登录");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 构建参数对象（用于签名）
      const params: {
        proposal_uri: string;
        delay_reason?: string;
        delay_duration?: number;
        timestamp: number;
      } = {
        proposal_uri: proposalUri || "",
        timestamp: Math.floor(Date.now() / 1000), // UTC 时间戳（秒）
      };

      // 如果有延期原因，添加 delay_reason
      if (delayReason.trim()) {
        params.delay_reason = delayReason.trim();
      }

      // 如果有延期时长，添加 delay_duration
      if (delayDuration.trim()) {
        const durationNum = parseInt(delayDuration.trim(), 10);
        if (!isNaN(durationNum) && durationNum > 0) {
          params.delay_duration = durationNum;
        }
      }

      // 2. 生成签名
      const { signed_bytes: signedBytes, signing_key_did: signingKeyDid } = await generateSignature(params);

      // 3. 调用 API
      const response = await submitDelayReport({
        did: userInfo.did,
        params: params,
        signed_bytes: signedBytes,
        signing_key_did: signingKeyDid,
      });

      if (response) {
        toast.success(t("submitDelayReport.success") || "延期报告提交成功");
        onSuccess?.();
        onClose();
      } else {
        throw new Error(t("submitDelayReport.errors.submitFailed") || "提交失败");
      }
    } catch (error) {
      console.error("提交延期报告失败:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || t("submitDelayReport.errors.submitFailed") || "提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setDelayReason("");
      setDelayDuration("");
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("submitDelayReport.title") || "提交延期报告"}
      size="large"
      buttons={[
        {
          text: t("common.cancel") || "取消",
          onClick: handleClose,
          variant: "secondary",
          disabled: isSubmitting,
        },
        {
          text: t("submitDelayReport.submit") || "提交",
          onClick: handleSubmit,
          variant: "primary",
          disabled: isSubmitting,
        },
      ]}
    >
      <div style={{ padding: "20px 0" }}>
        {/* 延期原因 */}
        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="delay-reason"
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {t("submitDelayReport.reasonLabel") || "延期原因（可选）"}
          </label>
          <div style={{ minHeight: "150px" }}>
            <VditorRichTextEditor
              value={delayReason}
              onChange={setDelayReason}
              mode="ir"
              toolbarPreset="simple"
              placeholder={t("submitDelayReport.reasonPlaceholder") || "请输入延期原因..."}
            />
          </div>
        </div>

        {/* 延期时长 */}
        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="delay-duration"
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {t("submitDelayReport.durationLabel") || "延期时长（天数，可选）"}
          </label>
          <input
            id="delay-duration"
            type="number"
            min="1"
            value={delayDuration}
            onChange={(e) => setDelayDuration(e.target.value)}
            placeholder={t("submitDelayReport.durationPlaceholder") || "请输入延期天数"}
            disabled={isSubmitting}
            style={{
              width: "100%",
              maxWidth: "460px",
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
              {t("submitDelayReport.proposalUri") || "提案 URI"}:
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

