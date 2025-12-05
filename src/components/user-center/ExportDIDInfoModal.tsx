'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/modal/Modal';
import { AiOutlineExport } from 'react-icons/ai';
import { useTranslation } from '@/utils/i18n';
import storage from '@/lib/storage';
import { encryptData } from '@/lib/encrypt';
import { toast } from 'react-hot-toast';
import './ExportDIDInfoModal.css';
import useUserInfoStore from '@/store/userInfo';

const regex = /^[A-Za-z0-9]{8}$/;

interface ExportDIDInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'password' | 'export';

export default function ExportDIDInfoModal({ isOpen, onClose }: ExportDIDInfoModalProps) {
  const { t } = useTranslation();
  const { userProfile } = useUserInfoStore();
  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [validateStatus, setValidateStatus] = useState<boolean | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  const passwordRef = useRef('');

  // 关闭并重置状态
  const handleClose = () => {
    passwordRef.current = '';
    setStep('password');
    setPassword('');
    setValidateStatus(undefined);
    setExporting(false);
    onClose();
  };

  // 处理密码确认
  const handleConfirmPassword = () => {
    if (validateStatus) {
      passwordRef.current = password;
      setStep('export');
    }
  };

  // 导出DID信息
  const handleExport = async () => {
    const tokenData = storage.getToken();
    if (!tokenData) {
      console.error('未找到用户信息');
      toast.error(t('web5.exportDIDInfo.exportFailed') || '导出失败');
      return;
    }

    setExporting(true);

    try {
      // 加密存储信息
      const content = await encryptData(JSON.stringify(tokenData), passwordRef.current);

      if (!content) {
        setExporting(false);
        toast.error(t('web5.exportDIDInfo.encryptFailed') || '加密失败');
        return;
      }

      // 创建文件并下载
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${userProfile?.handle || 'Web5DID-info'}.key`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExporting(false);
      toast.success(t('web5.exportDIDInfo.exportSuccess') || '导出成功');
      handleClose();
    } catch (error) {
      console.error('导出失败:', error);
      setExporting(false);
      toast.error(t('web5.exportDIDInfo.exportFailed') || '导出失败');
    }
  };

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setStep('password');
      setPassword('');
      setValidateStatus(undefined);
      setExporting(false);
      passwordRef.current = '';
    }
  }, [isOpen]);

  const renderContent = () => {
    switch (step) {
      case 'password':
        return (
          <div className="export-did-modal-content">
            <p className="export-did-title">{t('web5.exportDIDInfo.passwordTitle1')}</p>
            <p className="export-did-title">{t('web5.exportDIDInfo.passwordTitle2')}</p>
            <p className="export-did-note">{t('web5.exportDIDInfo.passwordNote')}</p>
            <div className="export-did-input-wrapper">
              <input
                type="text"
                className={`export-did-password-input ${validateStatus === false ? 'error' : ''}`}
                placeholder={t('web5.exportDIDInfo.passwordPlaceholder')}
                value={password}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 8);
                  setPassword(value);
                  const flag = regex.test(value);
                  setValidateStatus(flag);
                }}
                maxLength={8}
              />
              {validateStatus === false && (
                <p className="export-did-error">
                  {t('web5.exportDIDInfo.passwordError')}
                </p>
              )}
            </div>
          </div>
        );

      case 'export':
        return (
          <div className="export-did-modal-content export-step">
            <div className="export-did-content-wrapper">
              <div className="export-did-icon-container">
                <AiOutlineExport className="export-did-icon" />
              </div>
              <div className="export-did-text-content">
                <p className="export-did-title">{t('web5.exportDIDInfo.exportTitle')}</p>
                <p className="export-did-explanation">{t('web5.exportDIDInfo.explanation')}</p>
                <p className="export-did-warning">{t('web5.exportDIDInfo.warning')}</p>
              </div>
            </div>
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
            text: t('web5.exportDIDInfo.cancel'),
            onClick: handleClose,
            variant: 'secondary' as const,
          },
          {
            text: t('web5.exportDIDInfo.confirm'),
            onClick: handleConfirmPassword,
            variant: 'primary' as const,
            disabled: !validateStatus,
          },
        ];

      case 'export':
        return [
          {
            text: t('web5.exportDIDInfo.cancel'),
            onClick: handleClose,
            variant: 'secondary' as const,
          },
          {
            text: exporting ? t('web5.exportDIDInfo.exporting') || '导出中...' : t('web5.exportDIDInfo.export'),
            onClick: handleExport,
            variant: 'primary' as const,
            disabled: exporting,
          },
        ];

      default:
        return [];
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('web5.exportDIDInfo.title')}
      size="medium"
      buttons={renderButtons()}
      className="export-did-info-modal"
    >
      {renderContent()}
    </Modal>
  );
}

