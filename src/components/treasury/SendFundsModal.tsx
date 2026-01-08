"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/modal/Modal";
import { useTranslation } from "@/utils/i18n";
import toast from "react-hot-toast";
import useUserInfoStore from "@/store/userInfo";
import { sendFunds } from "@/server/task";
import { generateSignature } from "@/lib/signature";

export interface SendFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  proposalUri?: string;
}

export default function SendFundsModal({
  isOpen,
  onClose,
  onSuccess,
  proposalUri,
}: SendFundsModalProps) {
  const { t } = useTranslation();
  const { userInfo } = useUserInfoStore();
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!userInfo?.did) {
      toast.error(t("sendFunds.errors.userNotLoggedIn") || "请先登录");
      return;
    }

    // 验证金额
    if (!amount.trim()) {
      toast.error(t("sendFunds.errors.amountRequired") || "请输入拨款金额");
      return;
    }

    // 验证金额格式（必须是数字）
    const amountNum = parseFloat(amount.trim());
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error(t("sendFunds.errors.invalidAmount") || "请输入有效的金额（大于0的数字）");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 构建参数对象（用于签名）
      const params = {
        amount: amount.trim(),
        proposal_uri: proposalUri || "",
        timestamp: Math.floor(Date.now() / 1000), // UTC 时间戳（秒）
      };

      // 2. 生成签名
      const { signed_bytes: signedBytes, signing_key_did: signingKeyDid } = await generateSignature(params);

      // 3. 调用 API
      const response = await sendFunds({
        did: userInfo.did,
        params: params,
        signed_bytes: signedBytes,
        signing_key_did: signingKeyDid,
      });

      if (response) {
        toast.success(t("sendFunds.success") || "拨款提交成功");
        setAmount("");
        onSuccess?.();
        onClose();
      } else {
        throw new Error(t("sendFunds.errors.submitFailed") || "提交失败");
      }
    } catch (error) {
      console.error("拨款失败:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || t("sendFunds.errors.submitFailed") || "提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setAmount("");
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("sendFunds.title") || "拨款"}
      size="large"
      buttons={[
        {
          text: t("common.cancel") || "取消",
          onClick: handleClose,
          variant: "secondary",
          disabled: isSubmitting,
        },
        {
          text: t("sendFunds.submit") || "提交",
          onClick: handleSubmit,
          variant: "primary",
          disabled: isSubmitting || !amount.trim(),
        },
      ]}
    >
      <div style={{ padding: "20px 0" }}>
        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="fund-amount"
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {t("sendFunds.amountLabel") || "拨款金额"}
          </label>
          <input
            id="fund-amount"
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t("sendFunds.amountPlaceholder") || "请输入拨款金额"}
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
              {t("sendFunds.proposalUri") || "提案 URI"}:
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

