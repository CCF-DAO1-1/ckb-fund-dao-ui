'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/modal/Modal';
import { QRCodeSVG } from 'qrcode.react';
import { MdRefresh } from 'react-icons/md';
import { useTranslation } from '@/utils/i18n';
import storage from '@/lib/storage';
import './KeyQRCodeModal.css';

import { logger } from '@/lib/logger';
interface KeyQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'password' | 'qrcode' | 'expired';

export default function KeyQRCodeModal({ isOpen, onClose }: KeyQRCodeModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 生成二维码数据
  const generateQRCodeData = () => {
    const tokenData = storage.getToken();
    if (!tokenData) {
      logger.error('未找到用户信息');
      return;
    }

    // 生成包含DID和signKey的加密数据
    // 这里使用简单的JSON格式，实际应该加密
    const data = {
      did: tokenData.did,
      signKey: tokenData.signKey,
      walletAddress: tokenData.walletAddress,
      password: password, // 临时密码
      timestamp: Date.now(),
    };

    return JSON.stringify(data);
  };

  // 处理密码确认
  const handleConfirmPassword = () => {
    if (password.length !== 4 || !/^\d{4}$/.test(password)) {
      return; // 密码必须是4位数字
    }

    const data = generateQRCodeData();
    if (data) {
      setQrCodeData(data);
      const expires = Date.now() + 5 * 60 * 1000; // 5分钟后过期
      setExpiresAt(expires);
      setStep('qrcode');

      // 设置过期检查
      intervalRef.current = setInterval(() => {
        if (Date.now() >= expires) {
          setStep('expired');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }
      }, 1000);
    }
  };

  // 刷新二维码 - 重新设置密码
  const handleRefresh = () => {
    setStep('password');
    setPassword('');
    setQrCodeData('');
    setExpiresAt(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setStep('password');
      setPassword('');
      setQrCodeData('');
      setExpiresAt(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isOpen]);

  const renderContent = () => {
    switch (step) {
      case 'password':
        return (
          <div className="key-qr-modal-content">
            <p className="key-qr-instruction">{t('web5.keyQRCode.passwordInstruction')}</p>
            <input
              type="password"
              className="key-qr-password-input"
              placeholder={t('web5.keyQRCode.passwordPlaceholder')}
              value={password}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPassword(value);
              }}
              maxLength={4}
            />
            <p className="key-qr-note">{t('web5.keyQRCode.passwordNote')}</p>
          </div>
        );

      case 'qrcode':
        return (
          <div className="key-qr-modal-content">
            <div className="key-qr-code-container">
              {qrCodeData && <QRCodeSVG value={qrCodeData} size={200} />}
            </div>
            <p className="key-qr-instruction">{t('web5.keyQRCode.qrCodeInstruction')}</p>
            <p className="key-qr-note">{t('web5.keyQRCode.qrCodeNote')}</p>
          </div>
        );

      case 'expired':
        return (
          <div className="key-qr-modal-content">
            <div className="key-qr-code-container expired">
              {qrCodeData && <QRCodeSVG value={qrCodeData} size={200} />}
              <div className="key-qr-refresh-overlay">
                <MdRefresh className="refresh-icon" />
              </div>
            </div>
            <p className="key-qr-expired-message">{t('web5.keyQRCode.expiredMessage')}</p>
          </div>
        );

      default:
        return null;
    }
  };

  const renderButtons = () => {
    switch (step) {
      case 'password':
        return [
          {
            text: t('web5.keyQRCode.cancel'),
            onClick: onClose,
            variant: 'secondary' as const,
          },
          {
            text: t('web5.keyQRCode.confirm'),
            onClick: handleConfirmPassword,
            variant: 'primary' as const,
            disabled: password.length !== 4,
          },
        ];

      case 'qrcode':
        return [
          {
            text: t('web5.keyQRCode.close'),
            onClick: onClose,
            variant: 'secondary' as const,
          },
        ];

      case 'expired':
        return [
          {
            text: t('web5.keyQRCode.close'),
            onClick: onClose,
            variant: 'secondary' as const,
          },
          {
            text: t('web5.keyQRCode.refresh'),
            onClick: handleRefresh,
            variant: 'primary' as const,
          },
        ];

      default:
        return [];
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('web5.keyQRCode.title')}
      size="medium"
      buttons={renderButtons()}
      className="key-qr-code-modal"
    >
      {renderContent()}
    </Modal>
  );
}

