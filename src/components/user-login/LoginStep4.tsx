"use client";

import React from "react";
import Image from "next/image";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { handleCopy } from "@/utils/common";
import CopyButton from "../ui/copy/CopyButton";
import { useTranslation } from "@/utils/i18n";

interface LoginStep4Props {
  accountName: string;
}

export default function LoginStep4({ accountName }: LoginStep4Props) {
  const { t } = useTranslation();
  const { walletAddress, isLoadingAddress, formatAddress } = useWalletAddress();

  // 复制地址到剪贴板
  const handleCopyAddress = () => {
    if (walletAddress) {
      handleCopy(walletAddress, t("copy.addressSuccess"));
    }
  };
  return (
    <div className="login-info-section">
      <h3 className="login-info-title" style={{ textAlign: 'center' }}>{t("loginStep4.accountCreatedSuccess")}</h3>
      <p className="success-description">
        {t("loginStep4.successDescription")}
      </p>
      <div className="success-info">
        <div className="success-card">
          <div className="success-head">
            <div className="card-img">
              <Image src="/nervos-planet.png" alt="planet" width={60} height={32} />
            </div>
            <div className="card-name">
              {accountName}
            </div>
          </div>
          <div className="success-details">
            <div className="success-name">
              {accountName}.ccfdao.org
            </div>
            <div className="success-address" onClick={handleCopyAddress} style={{ cursor: 'pointer' }}>
              {isLoadingAddress ? t("loginStep4.gettingAddress") : formatAddress(walletAddress)}
              <CopyButton text={walletAddress} className="copy-button" ariaLabel="copy-wallet-address" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
