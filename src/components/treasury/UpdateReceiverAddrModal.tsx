"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/modal/Modal";
import { useTranslation } from "@/utils/i18n";
import toast from "react-hot-toast";
import useUserInfoStore from "@/store/userInfo";
import { updateReceiverAddr } from "@/server/proposal";
import { generateSignature } from "@/lib/signature";

import { logger } from '@/lib/logger';
export interface UpdateReceiverAddrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  proposalUri?: string;
}

export default function UpdateReceiverAddrModal({
  isOpen,
  onClose,
  onSuccess,
  proposalUri,
}: UpdateReceiverAddrModalProps) {
  const { t } = useTranslation();
  const { userInfo } = useUserInfoStore();
  const [walletAddress, setWalletAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!userInfo?.did) {
      toast.error(t("updateReceiverAddr.errors.userNotLoggedIn") || "请先登录");
      return;
    }

    // 验证钱包地址
    if (!walletAddress.trim()) {
      toast.error(t("updateReceiverAddr.errors.addressRequired") || "请输入钱包地址");
      return;
    }

    // CKB 地址格式验证（支持主网 ckb 和测试网 ckt）
    const trimmedAddress = walletAddress.trim();
    if (!trimmedAddress.startsWith("ckb") && !trimmedAddress.startsWith("ckt")) {
      toast.error(t("updateReceiverAddr.errors.invalidAddress") || "请输入有效的 CKB 地址（支持 ckb 和 ckt）");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 构建参数对象（用于签名）
      const params = {
        proposal_uri: proposalUri || "",
        receiver_addr: walletAddress.trim(),
        timestamp: Math.floor(Date.now() / 1000), // UTC 时间戳（秒）
      };

      // 2. 生成签名
      const { signed_bytes: signedBytes, signing_key_did: signingKeyDid } = await generateSignature(params);

      // 3. 调用 API
      const response = await updateReceiverAddr({
        did: userInfo.did,
        params: params,
        signed_bytes: signedBytes,
        signing_key_did: signingKeyDid,
      });

      if (response) {
        toast.success(t("updateReceiverAddr.success") || "钱包地址已提交");
        setWalletAddress("");
        onSuccess?.();
        onClose();
      } else {
        throw new Error(t("updateReceiverAddr.errors.submitFailed") || "提交失败");
      }
    } catch (error) {
      logger.error("更新钱包地址失败:");
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || t("updateReceiverAddr.errors.submitFailed") || "提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setWalletAddress("");
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("updateReceiverAddr.title") || "添加项目方金库钱包地址"}
      size="large"
      buttons={[
        {
          text: t("common.cancel") || "取消",
          onClick: handleClose,
          variant: "secondary",
          disabled: isSubmitting,
        },
        {
          text: t("updateReceiverAddr.submit") || "提交",
          onClick: handleSubmit,
          variant: "primary",
          disabled: isSubmitting || !walletAddress.trim(),
        },
      ]}
    >
      <div style={{ padding: "20px 0" }}>
        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="wallet-address"
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {t("updateReceiverAddr.addressLabel") || "钱包地址"}
          </label>
          <input
            id="wallet-address"
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder={t("updateReceiverAddr.addressPlaceholder") || "请输入 CKB 钱包地址"}
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
              {t("updateReceiverAddr.proposalUri") || "提案 URI"}:
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

