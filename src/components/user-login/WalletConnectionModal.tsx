"use client";

import React, { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/modal/Modal";
import { useTranslation } from "@/utils/i18n";
import useUserInfoStore from "@/store/userInfo";
import CopyButton from "@/components/ui/copy/CopyButton";
import { MdCloudUpload, MdError } from "react-icons/md";
import { ccc } from "@ckb-ccc/connector-react";
import storage from "@/lib/storage";
import "./ImportDidModal.css";

import { logger } from '@/lib/logger';
export default function WalletConnectionModal() {
  const { t } = useTranslation();
  const { userInfo, initialized, logout } = useUserInfoStore();
  const { open, wallet, signerInfo, disconnect } = ccc.useCcc();
  const isConnected = Boolean(wallet) && Boolean(signerInfo);

  const [showModal, setShowModal] = useState(false);
  const [showWalletMismatchModal, setShowWalletMismatchModal] = useState(false);
  const [registeredWalletAddress, setRegisteredWalletAddress] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);

  // 格式化地址显示（显示前10位...后10位）
  const formatAddress = (address: string) => {
    if (!address) return "";
    if (address.length <= 20) return address;
    return `${address.slice(0, 10)}...${address.slice(-10)}`;
  };

  // 验证钱包地址
  const verifyWalletAddress = useCallback(async () => {
    if (!userInfo || !isConnected || !signerInfo || !registeredWalletAddress) return;

    try {
      setIsVerifying(true);
      const addresses = await signerInfo.signer.getAddresses();
      const connectedAddress = addresses[0];

      // 比较地址（不区分大小写）
      if (connectedAddress.toLowerCase() !== registeredWalletAddress.toLowerCase()) {
        // 地址不一致，显示错误弹窗并断开连接
        setShowWalletMismatchModal(true);
        setIsConnecting(false);
        // 断开连接
        try {
          await disconnect();
        } catch (err) {
          logger.error("断开连接失败:", err);
        }
      } else {
        // 地址一致，关闭弹窗
        setShowModal(false);
      }
    } catch (err) {
      logger.error("获取钱包地址失败:", err);
      setError(t("importDid.getWalletAddressFailed") || "获取钱包地址失败");
    } finally {
      setIsVerifying(false);
    }
  }, [userInfo, isConnected, signerInfo, registeredWalletAddress, disconnect, t]);

  // 检查是否需要显示弹窗
  useEffect(() => {
    if (!initialized || !userInfo) return;

    const tokenData = storage.getToken();
    const storedWalletAddress = tokenData?.walletAddress;

    if (!storedWalletAddress) return;

    // 设置注册时的钱包地址
    if (!registeredWalletAddress) {
      setRegisteredWalletAddress(storedWalletAddress);
    }

    if (!isConnected) {
      // 有 userInfo 但没有连接钱包，显示弹窗
      setShowModal(true);
    } else if (isConnected && registeredWalletAddress) {
      // 有 userInfo 且已连接钱包，验证地址是否匹配
      verifyWalletAddress();
    }
  }, [initialized, userInfo, isConnected, registeredWalletAddress, verifyWalletAddress]);

  // 处理钱包连接
  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);
      setError("");
      await open();
    } catch (err) {
      logger.error("连接钱包失败:", err);
      setError(t("importDid.walletConnectFailed") || "连接钱包失败");
      setIsConnecting(false);
    }
  };

  // 监听钱包连接状态变化，自动验证
  useEffect(() => {
    if (showModal && isConnected && signerInfo && registeredWalletAddress) {
      verifyWalletAddress();
    }
  }, [showModal, isConnected, signerInfo, registeredWalletAddress, verifyWalletAddress]);

  // 处理钱包地址不匹配弹窗确认
  const handleWalletMismatchConfirm = async () => {
    setShowWalletMismatchModal(false);
    // 断开连接
    try {
      await disconnect();
    } catch (err) {
      logger.error("断开连接失败:", err);
    }
    // 重置连接状态，允许重新连接
    setIsConnecting(false);
  };

  // 处理登出
  const handleLogout = async () => {
    try {
      // 断开钱包连接
      if (isConnected) {
        try {
          await disconnect();
        } catch (err) {
          logger.error("断开连接失败:", err);
        }
      }
      // 调用 store 的 logout 方法（清除 store 状态）
      logout();
      // 清除所有 localStorage
      storage.clear();
      // 刷新页面
      window.location.reload();
    } catch (err) {
      logger.error("登出失败:", err);
    }
  };

  // 如果不需要显示弹窗，返回 null
  if (!showModal && !showWalletMismatchModal) {
    return null;
  }

  return (
    <>
      {/* 连接钱包弹窗 */}
      <Modal
        isOpen={showModal && !showWalletMismatchModal}
        onClose={handleLogout} // 强制行为：关闭即登出
        title={t("importDid.identityVerification") || "身份验证"}
        showCloseButton={false}
        className="identity-verification-modal"
      >
        <div className="identity-verification-content">
          <p className="identity-verification-desc">
            {t("importDid.identityVerificationDesc") || "为确保账户安全，请连接创建此DID时的钱包地址以验证身份"}
          </p>

          <div className="identity-verification-info">
            {/* DID Display */}
            <div className="identity-verification-row">
              <span className="identity-verification-label">
                {t("importDid.web5DidAccount") || "Web 5 DID 账号："}
              </span>
              <span className="identity-verification-value">
                {userInfo?.handle || "..."}
              </span>
            </div>

            {/* CKB Address Display */}
            {registeredWalletAddress && (
              <div className="identity-verification-row">
                <span className="identity-verification-label">
                  {t("importDid.registeredWalletAddress") || "注册时的CKB地址："}
                </span>
                <span className="identity-verification-address">
                  {formatAddress(registeredWalletAddress)}
                </span>
                <CopyButton
                  text={registeredWalletAddress}
                  className="identity-verification-copy-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor" />
                  </svg>
                </CopyButton>
              </div>
            )}
          </div>

          <div className="identity-verification-actions">
            {!isConnected ? (
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="btn btn-primary identity-verification-btn-connect"
              >
                {isConnecting ? t("importDid.connecting") : (t("importDid.connectWalletButton") || "连接钱包")}
              </button>
            ) : (
              <div className="identity-verification-status">
                <div className="import-did-icon-large identity-verification-icon">
                  <MdCloudUpload />
                </div>
                {isVerifying ? t("importDid.verifyingWallet") : t("importDid.connecting")}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="btn btn-secondary identity-verification-btn-close"
            >
              {t("importDid.close") || "关闭"}
            </button>
          </div>
        </div>
      </Modal>

      {/* 钱包地址不匹配提示弹窗 */}
      <Modal
        isOpen={showWalletMismatchModal}
        onClose={handleWalletMismatchConfirm}
        size="small"
        showCloseButton={false}
        buttons={[
          {
            text: t("importDid.walletMismatchConfirm") || "确认",
            onClick: handleWalletMismatchConfirm,
            variant: 'primary' as const,
          },
        ]}
        className="import-did-success-modal"
      >
        <div className="import-did-success-content">
          <div className="import-did-success-icon" style={{ color: '#dc3545' }}>
            <MdError />
          </div>
          <p className="import-did-success-title" style={{ color: '#dc3545' }}>
            {t("importDid.walletMismatchTitle")}
          </p>
          <p className="import-did-success-message">
            {t("importDid.walletMismatchMessage")}
          </p>
          {registeredWalletAddress && (
            <div style={{ marginTop: '16px', fontSize: '14px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
                {t("importDid.registeredWalletAddress")}
              </div>
              <div style={{ color: '#666', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {formatAddress(registeredWalletAddress)}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
