"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Modal from "@/components/ui/modal/Modal";
import { useTranslation } from "@/utils/i18n";
import useUserInfoStore from "@/store/userInfo";
import { TokenStorageType } from "@/lib/storage";
import { MdCloudUpload, MdError } from "react-icons/md";
import { decryptData } from "@/lib/encrypt";
import { Html5Qrcode } from "html5-qrcode";
import { ccc } from "@ckb-ccc/connector-react";
import "./ImportDidModal.css";

import { logger } from '@/lib/logger';
enum ImportStep {
  UPLOAD = "upload",
  SELECT_FILE = "select_file",
  ENTER_PASSWORD = "enter_password",
  VERIFYING = "verifying",
  CONNECT_WALLET = "connect_wallet",
  SUCCESS = "success",
}

interface ImportDidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ImportDidModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportDidModalProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<ImportStep>(ImportStep.UPLOAD);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWalletMismatchModal, setShowWalletMismatchModal] = useState(false);
  const [importedWalletAddress, setImportedWalletAddress] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importUserDid = useUserInfoStore((state) => state.importUserDid);
  const { open, wallet, signerInfo, disconnect } = ccc.useCcc();
  const isConnected = Boolean(wallet) && Boolean(signerInfo);

  // 重置状态
  const resetState = () => {
    setCurrentStep(ImportStep.UPLOAD);
    setSelectedFile(null);
    setFileContent("");
    setPassword("");
    setError("");
    setIsVerifying(false);
    setShowSuccessModal(false);
    setShowWalletMismatchModal(false);
    setImportedWalletAddress("");
    setIsConnecting(false);
  };

  // 关闭弹窗
  const handleClose = () => {
    resetState();
    onClose();
  };

  // 处理文件选择
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError("");

    // 检查文件类型
    const isImage = file.type.startsWith("image/");
    const isText = file.type === "text/plain" || file.name.endsWith(".txt");

    if (!isImage && !isText) {
      setError(t("importDid.invalidFileType"));
      return;
    }

    try {
      if (isText) {
        // 读取txt文件内容
        const text = await file.text();
        setFileContent(text.trim());
        setCurrentStep(ImportStep.ENTER_PASSWORD);
      } else if (isImage) {
        // 对于图片文件，扫描二维码
        setIsVerifying(true);
        setError("");

        try {
          // 使用临时容器进行文件扫描
          const tempContainerId = 'temp-qr-scanner-import';
          let tempContainer = document.getElementById(tempContainerId);
          if (!tempContainer) {
            tempContainer = document.createElement('div');
            tempContainer.id = tempContainerId;
            tempContainer.style.display = 'none';
            document.body.appendChild(tempContainer);
          }

          const html5QrCode = new Html5Qrcode(tempContainerId);
          const decodedText = await html5QrCode.scanFile(file, false);

          // 清理临时容器
          html5QrCode.clear();
          if (tempContainer && tempContainer.parentNode) {
            tempContainer.parentNode.removeChild(tempContainer);
          }

          // 设置扫描到的二维码数据
          setFileContent(decodedText.trim());
          setCurrentStep(ImportStep.ENTER_PASSWORD);
        } catch (scanErr: unknown) {
          logger.error('扫描二维码失败:', scanErr);
          setError(t("importDid.qrCodeScanFailed"));
        } finally {
          setIsVerifying(false);
        }
      }
    } catch (err) {
      setError(t("importDid.fileReadError"));
      logger.error("读取文件失败:", err);
      setIsVerifying(false);
    }
  };

  // 处理密码输入
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 限制为8位数字或字母
    const filtered = value.replace(/[^A-Za-z0-9]/g, '').slice(0, 8);
    setPassword(filtered);
    setError("");
  };

  // 验证并导入
  const handleVerify = async () => {
    const passwordRegex = /^[A-Za-z0-9]{8}$/;
    if (!passwordRegex.test(password)) {
      setError(t("importDid.passwordLengthError"));
      return;
    }

    if (!fileContent) {
      setError(t("importDid.noFileContent"));
      return;
    }

    setIsVerifying(true);
    setError("");
    setCurrentStep(ImportStep.VERIFYING);

    try {
      // 解析DID数据
      // 这里需要根据实际的数据格式来解析
      // 假设fileContent是加密的字符串，需要根据密码解密
      const decryptedData = await decryptDidData(fileContent, password);

      // 验证数据格式
      if (!decryptedData.did || !decryptedData.signKey || !decryptedData.walletAddress) {
        throw new Error(t("importDid.invalidDataFormat"));
      }

      // 保存导入的钱包地址
      setImportedWalletAddress(decryptedData.walletAddress);

      // 导入用户DID
      const tokenData: TokenStorageType = {
        did: decryptedData.did,
        signKey: decryptedData.signKey,
        walletAddress: decryptedData.walletAddress,
      };

      await importUserDid(tokenData);

      // 进入连接钱包步骤
      setCurrentStep(ImportStep.CONNECT_WALLET);
    } catch (err: unknown) {
      const errorMessage = (err && typeof err === "object" && "message" in err) ? (err as { message?: string }).message : undefined;
      setError(errorMessage || t("importDid.verificationFailed"));
      setCurrentStep(ImportStep.ENTER_PASSWORD);
    } finally {
      setIsVerifying(false);
    }
  };

  // 解密DID数据
  const decryptDidData = async (
    encryptedData: string,
    password: string
  ): Promise<TokenStorageType> => {
    try {
      let dataToParse = encryptedData.trim();

      // 处理 @dao-client: 前缀（storage格式）
      if (dataToParse.startsWith("@dao-client:")) {
        dataToParse = dataToParse.replace("@dao-client:", "").trim();
      }

      // 尝试解析为JSON（如果已经是解密后的数据）
      if (dataToParse.startsWith("{")) {
        try {
          const parsed = JSON.parse(dataToParse);
          if (parsed.did && parsed.signKey && parsed.walletAddress) {
            return parsed;
          }
        } catch {
          // 不是有效的JSON，继续尝试解密
        }
      }

      // 尝试使用密码解密（AES-GCM）
      if (password && password.length >= 8) {
        try {
          const decrypted = await decryptData(dataToParse, password);
          if (decrypted) {
            const parsed = JSON.parse(decrypted);
            if (parsed.did && parsed.signKey && parsed.walletAddress) {
              return parsed;
            }
          }
        } catch (err) {
          logger.error('AES解密失败:', err);
          // 继续尝试其他方式
        }
      }

      // 尝试base64解码（兼容旧格式）
      try {
        const decoded = atob(dataToParse);
        const parsed = JSON.parse(decoded);
        if (parsed.did && parsed.signKey && parsed.walletAddress) {
          return parsed;
        }
      } catch {
        // 不是base64编码，继续尝试其他方式
      }

      // 如果所有方式都失败，抛出错误
      throw new Error(t("importDid.decryptionFailed"));
    } catch (err: unknown) {
      const errorMessage = (err && typeof err === "object" && "message" in err) ? (err as { message?: string }).message : undefined;
      if (errorMessage === t("importDid.decryptionFailed")) {
        throw err;
      }
      logger.error('解密过程出错:', err);
      throw new Error(t("importDid.decryptionFailed"));
    }
  };

  // 处理钱包连接
  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);
      setError("");
      await open();
    } catch (err) {
      logger.error("连接钱包失败:", err);
      setError(t("importDid.walletConnectFailed"));
      setIsConnecting(false);
    }
  };

  // 验证钱包地址
  useEffect(() => {
    const verifyWalletAddress = async () => {
      if (currentStep === ImportStep.CONNECT_WALLET && isConnected && signerInfo && importedWalletAddress) {
        try {
          const addresses = await signerInfo.signer.getAddresses();
          const connectedAddress = addresses[0];

          // 比较地址（不区分大小写）
          if (connectedAddress.toLowerCase() !== importedWalletAddress.toLowerCase()) {
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
            // 地址一致，显示成功弹窗
            setIsConnecting(false);
            setShowSuccessModal(true);
          }
        } catch (err) {
          logger.error("获取钱包地址失败:", err);
          setError(t("importDid.getWalletAddressFailed"));
          setIsConnecting(false);
        }
      }
    };

    verifyWalletAddress();
  }, [currentStep, isConnected, signerInfo, importedWalletAddress, disconnect, t]);

  // 处理成功弹窗确认
  const handleSuccessConfirm = () => {
    resetState();
    onClose();
    onSuccess?.();
    // 刷新页面
    window.location.reload();
  };

  // 格式化地址显示（显示前10位...后10位）
  const formatAddress = (address: string) => {
    if (!address) return "";
    if (address.length <= 20) return address;
    return `${address.slice(0, 10)}...${address.slice(-10)}`;
  };

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

  return (
    <>
      <Modal
        isOpen={isOpen && !showSuccessModal}
        onClose={handleClose}
        title={t("importDid.title")}
        size="medium"
        showCloseButton={true}
        className="import-did-modal"
      >
        <div className="import-did-content">
          {/* 步骤1: 上传文件 */}
          {currentStep === ImportStep.UPLOAD && (
            <div className="import-did-step">
              <p className="import-did-select-label">
                {t("importDid.selectKeyInfo")}
              </p>
              <div
                className="import-did-upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.txt"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
                <div className="import-did-icon-large">
                  <Image src="/icon/upload.svg" alt="upload" width={60} height={60} />
                </div>
                <p className="import-did-instruction">
                  {t("importDid.clickToSelect")}
                </p>
                <p className="import-did-hint">
                  {t("importDid.supportedFormats")}
                </p>
              </div>
            </div>
          )}

          {/* 步骤2: 输入密码 */}
          {currentStep === ImportStep.ENTER_PASSWORD && (
            <div className="import-did-step">
              <div className="import-did-password-section">
                <p className="import-did-instruction">
                  {t("importDid.enterPassword")}
                </p>
                <div className="import-did-password-input-container">
                  <input
                    type="password"
                    className={`import-did-password-input ${error ? 'import-did-password-input-error' : ''}`}
                    placeholder={t("importDid.passwordPlaceholder")}
                    value={password}
                    onChange={handlePasswordChange}
                    maxLength={8}
                    disabled={isVerifying}
                  />
                </div>
                {error && <div className="import-did-error">{error}</div>}
                <div className="import-did-buttons">
                  <button
                    className="import-did-button import-did-button-primary"
                    onClick={handleVerify}
                    disabled={password.length !== 8 || isVerifying}
                  >
                    {t("importDid.confirm")}
                  </button>
                  <button
                    className="import-did-button import-did-button-secondary"
                    onClick={() => {
                      resetState();
                      setCurrentStep(ImportStep.UPLOAD);
                    }}
                    disabled={isVerifying}
                  >
                    {t("importDid.cancel")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 步骤3: 验证中 */}
          {currentStep === ImportStep.VERIFYING && (
            <div className="import-did-step">
              <div className="import-did-verifying">
                <div className="import-did-icon-large">
                  <Image src="/icon/import.svg" alt="import" width={100} height={100} />
                </div>
                <p className="import-did-verifying-text">
                  {t("importDid.verifying")}
                </p>
              </div>
            </div>
          )}

          {/* 步骤4: 连接钱包 */}
          {currentStep === ImportStep.CONNECT_WALLET && (
            <div className="import-did-step">
              <div className="import-did-password-section">
                <p className="import-did-instruction">
                  {t("importDid.connectWallet")}
                </p>
                <p className="import-did-hint" style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                  {t("importDid.connectWalletHint")}
                </p>
                {error && <div className="import-did-error">{error}</div>}
                <div className="import-did-buttons">
                  {!isConnected ? (
                    <button
                      className="import-did-button import-did-button-primary"
                      onClick={handleConnectWallet}
                      disabled={isConnecting}
                    >
                      {isConnecting ? t("importDid.connecting") : t("importDid.connectWalletButton")}
                    </button>
                  ) : (
                    <div className="import-did-verifying">
                      <div className="import-did-icon-large">
                        <MdCloudUpload />
                      </div>
                      <p className="import-did-verifying-text">
                        {t("importDid.verifyingWallet")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </Modal>

      {/* 成功提示弹窗 */}
      <Modal
        isOpen={showSuccessModal}
        onClose={handleSuccessConfirm}
        size="small"
        showCloseButton={false}
        buttons={[
          {
            text: t("importDid.successConfirm"),
            onClick: handleSuccessConfirm,
            variant: 'primary' as const,
          },
        ]}
        className="import-did-success-modal"
      >
        <div className="import-did-success-content">
          <div className="import-did-success-icon">
            <Image src="/icon/success.svg" alt="success" width={100} height={100} />
          </div>
          <p className="import-did-success-title">
            {t("importDid.verificationSuccess")}
          </p>
          <p className="import-did-success-message">
            {t("importDid.loginComplete")}
          </p>
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
            text: t("importDid.walletMismatchConfirm"),
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
          {importedWalletAddress && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '14px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
                {t("importDid.registeredWalletAddress")}
              </div>
              <div style={{ color: '#666', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {formatAddress(importedWalletAddress)}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

