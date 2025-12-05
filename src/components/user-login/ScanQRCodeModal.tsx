'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/modal/Modal';
import { Html5Qrcode } from 'html5-qrcode';
import { useTranslation } from '@/utils/i18n';
import useUserInfoStore from '@/store/userInfo';
import { TokenStorageType } from '@/lib/storage';
import { decryptData } from '@/lib/encrypt';
import { MdClose, MdPhotoCamera, MdImage, MdCheckCircle } from 'react-icons/md';
import './ScanQRCodeModal.css';

interface ScanQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ScanMode = 'camera' | 'file';

export default function ScanQRCodeModal({ isOpen, onClose, onSuccess }: ScanQRCodeModalProps) {
  const { t } = useTranslation();
  const [scanMode, setScanMode] = useState<ScanMode>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [scannedData, setScannedData] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importUserDid = useUserInfoStore((state) => state.importUserDid);

  // 解析二维码数据并导入
  const parseAndImportQRData = async (qrData: string, pinPassword?: string) => {
    try {
      const dataToParse = qrData.trim();

      // 尝试解析JSON
      let parsedData: TokenStorageType | null = null;

      try {
        const jsonData = JSON.parse(dataToParse);
        if (jsonData.did && jsonData.signKey && jsonData.walletAddress) {
          // 如果包含密码字段，需要验证PIN
          if (jsonData.password && pinPassword) {
            if (jsonData.password !== pinPassword) {
              throw new Error(t('web5.scanQRCode.invalidPin') || 'PIN密码不正确');
            }
          }
          parsedData = {
            did: jsonData.did,
            signKey: jsonData.signKey,
            walletAddress: jsonData.walletAddress,
          };
        }
      } catch {
        // 不是JSON格式，尝试解密
        if (pinPassword && pinPassword.length === 4) {
          try {
            const decrypted = await decryptData(dataToParse, pinPassword);
            if (decrypted) {
              const jsonData = JSON.parse(decrypted);
              if (jsonData.did && jsonData.signKey && jsonData.walletAddress) {
                parsedData = {
                  did: jsonData.did,
                  signKey: jsonData.signKey,
                  walletAddress: jsonData.walletAddress,
                };
              }
            }
          } catch (err) {
            console.error('解密失败:', err);
          }
        }
      }

      if (!parsedData) {
        // 如果数据包含密码字段，需要输入PIN
        try {
          const jsonData = JSON.parse(dataToParse);
          if (jsonData.password !== undefined && !pinPassword) {
            setScannedData(dataToParse);
            setShowPasswordInput(true);
            return;
          }
        } catch {
          // 不是JSON，可能需要PIN解密
          if (!pinPassword) {
            setScannedData(dataToParse);
            setShowPasswordInput(true);
            return;
          }
        }
        throw new Error(t('web5.scanQRCode.invalidQRCode') || '无效的二维码数据');
      }

      // 导入用户DID
      await importUserDid(parsedData);
      // 显示成功弹窗
      setShowSuccessModal(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || t('web5.scanQRCode.importFailed') || '导入失败');
      setIsScanning(false);
    }
  };

  // 处理PIN确认
  const handlePinConfirm = async () => {
    if (password.length !== 4 || !/^\d{4}$/.test(password)) {
      setError(t('web5.scanQRCode.invalidPinFormat') || 'PIN必须是4位数字');
      return;
    }
    setError('');
    await parseAndImportQRData(scannedData, password);
  };

  // 开始扫描摄像头
  const startCameraScan = async () => {
    if (!scanAreaRef.current) return;

    try {
      setIsScanning(true);
      setError('');

      const html5QrCode = new Html5Qrcode(scanAreaRef.current.id);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // 使用后置摄像头
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // 扫描成功
          stopScanning();
          parseAndImportQRData(decodedText);
        },
        () => {
          // 扫描错误（忽略，继续扫描）
        }
      );
    } catch (err: unknown) {
      console.error('启动摄像头失败:', err);
      setError(t('web5.scanQRCode.cameraError') || '无法访问摄像头，请检查权限设置');
      setIsScanning(false);
    }
  };

  // 停止扫描
  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('停止扫描失败:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  // 处理文件选择
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(t('web5.scanQRCode.invalidFileType') || '请选择图片文件');
      return;
    }

    try {
      setIsScanning(true);
      setError('');

      // 使用临时容器进行文件扫描
      const tempContainerId = 'temp-qr-scanner';
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

      setIsScanning(false);
      parseAndImportQRData(decodedText);
    } catch (err: unknown) {
      console.error('扫描文件失败:', err);
      setError(t('web5.scanQRCode.scanFailed') || '无法识别二维码，请确保图片清晰');
      setIsScanning(false);
    }
  };

  // 关闭并清理
  const handleClose = () => {
    stopScanning();
    setScanMode('camera');
    setError('');
    setPassword('');
    setShowPasswordInput(false);
    setScannedData('');
    setShowSuccessModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  // 处理成功弹窗确认
  const handleSuccessConfirm = () => {
    setShowSuccessModal(false);
    onSuccess?.();
    handleClose();
    // 刷新页面
    window.location.reload();
  };

  // 切换扫描模式
  const switchMode = (mode: ScanMode) => {
    stopScanning();
    setScanMode(mode);
    setError('');
    setShowPasswordInput(false);
    setScannedData('');
  };

  // 清理资源
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  // 当弹窗关闭时停止扫描
  useEffect(() => {
    if (!isOpen) {
      stopScanning();
    }
  }, [isOpen]);

  const renderContent = () => {
    if (showPasswordInput) {
      return (
        <div className="scan-qr-modal-content">
          <p className="scan-qr-instruction">{t('web5.scanQRCode.enterPin')}</p>
          <input
            type="password"
            className="scan-qr-pin-input"
            placeholder={t('web5.scanQRCode.pinPlaceholder')}
            value={password}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPassword(value);
              setError('');
            }}
            maxLength={4}
          />
          {error && <p className="scan-qr-error">{error}</p>}
        </div>
      );
    }

    return (
      <div className="scan-qr-modal-content">
        {/* 模式切换 */}
        <div className="scan-qr-mode-switch">
          <button
            className={`scan-qr-mode-button ${scanMode === 'camera' ? 'active' : ''}`}
            onClick={() => switchMode('camera')}
            disabled={isScanning}
          >
            <MdPhotoCamera />
            <span>{t('web5.scanQRCode.cameraMode')}</span>
          </button>
          <button
            className={`scan-qr-mode-button ${scanMode === 'file' ? 'active' : ''}`}
            onClick={() => switchMode('file')}
            disabled={isScanning}
          >
            <MdImage />
            <span>{t('web5.scanQRCode.fileMode')}</span>
          </button>
        </div>

        {/* 扫描区域 */}
        <div className="scan-qr-area">
          {scanMode === 'camera' ? (
            <>
              <div id="qr-reader" ref={scanAreaRef} className="qr-reader-container"></div>
              {!isScanning && (
                <button
                  className="scan-qr-start-button"
                  onClick={startCameraScan}
                >
                  {t('web5.scanQRCode.startScan')}
                </button>
              )}
              {isScanning && (
                <button
                  className="scan-qr-stop-button"
                  onClick={stopScanning}
                >
                  {t('web5.scanQRCode.stopScan')}
                </button>
              )}
            </>
          ) : (
            <>
              <div className="scan-qr-file-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="scan-qr-file-input"
                  id="qr-file-input"
                />
                <label htmlFor="qr-file-input" className="scan-qr-file-label">
                  <MdImage className="file-icon" />
                  <span>{t('web5.scanQRCode.selectImage')}</span>
                </label>
              </div>
            </>
          )}
        </div>

        {error && <p className="scan-qr-error">{error}</p>}
      </div>
    );
  };

  const renderButtons = () => {
    if (showPasswordInput) {
      return [
        {
          text: t('web5.scanQRCode.cancel'),
          onClick: handleClose,
          variant: 'secondary' as const,
        },
        {
          text: t('web5.scanQRCode.confirm'),
          onClick: handlePinConfirm,
          variant: 'primary' as const,
          disabled: password.length !== 4,
        },
      ];
    }

    return [
      {
        text: t('web5.scanQRCode.close'),
        onClick: handleClose,
        variant: 'secondary' as const,
      },
    ];
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !showSuccessModal}
        onClose={handleClose}
        title={t('web5.scanQRCode.title')}
        size="medium"
        buttons={renderButtons()}
        className="scan-qr-code-modal"
      >
        {renderContent()}
      </Modal>

      {/* 成功提示弹窗 */}
      <Modal
        isOpen={showSuccessModal}
        onClose={handleSuccessConfirm}
        size="small"
        showCloseButton={false}
        buttons={[
          {
            text: t('web5.scanQRCode.successConfirm') || '确认',
            onClick: handleSuccessConfirm,
            variant: 'primary' as const,
          },
        ]}
        className="scan-qr-success-modal"
      >
        <div className="scan-qr-success-content">
          <div className="scan-qr-success-icon">
            <MdCheckCircle />
          </div>
          <p className="scan-qr-success-message">
            {t('web5.scanQRCode.loginSuccess') || '登录成功！'}
          </p>
        </div>
      </Modal>
    </>
  );
}

