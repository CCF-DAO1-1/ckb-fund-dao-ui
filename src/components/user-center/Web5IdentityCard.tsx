'use client';

import { useState, useEffect } from 'react';
import { GoDatabase, GoCopy, GoCheckCircle } from "react-icons/go";
import CopyButton from '@/components/ui/copy/CopyButton';
import { MdOutlinePrivacyTip, MdQrCode2, MdOutlineDescription } from "react-icons/md";
import storage from '@/lib/storage';
import useUserInfoStore from '@/store/userInfo';
import getPDSClient from '@/lib/pdsClient';
import { useTranslation } from '@/utils/i18n';
import KeyQRCodeModal from './KeyQRCodeModal';
import ExportDIDInfoModal from './ExportDIDInfoModal';

import { logger } from '@/lib/logger';
interface Web5IdentityCardProps {
  className?: string;
}

export default function Web5IdentityCard({ className = '' }: Web5IdentityCardProps) {
  const { t } = useTranslation();
  const { userInfo } = useUserInfoStore();
  const [did, setDid] = useState('');
  const [pds, setPds] = useState('');
  const [showKeyQRCodeModal, setShowKeyQRCodeModal] = useState(false);
  const [showExportDIDInfoModal, setShowExportDIDInfoModal] = useState(false);

  // 从本地存储和用户信息中获取 DID 和 PDS
  useEffect(() => {
    // 优先从 userInfo 获取
    if (userInfo?.did) {
      setDid(userInfo.did);
    } else {
      // 如果 userInfo 没有，尝试从 localStorage 获取
      const tokenData = storage.getToken();
      if (tokenData?.did) {
        setDid(tokenData.did);
      }
    }

    // 获取 PDS 地址
    try {
      if (userInfo?.handle && userInfo.handle.includes('.')) {
        const domain = userInfo.handle.substring(userInfo.handle.indexOf('.') + 1);
        setPds(`https://${domain}`);
      } else {
        const pdsClient = getPDSClient();
        if (pdsClient?.serviceUrl?.origin) {
          setPds(pdsClient.serviceUrl.origin);
        }
      }
    } catch (error) {
      logger.error('获取 PDS 地址失败:', error);
    }
  }, [userInfo]);

  const privacySettings = [
    { label: t('web5.dataEncryption'), status: t('web5.enabled'), enabled: true },
    { label: t('web5.anonymousBrowsing'), status: t('web5.enabled'), enabled: true },
    { label: t('web5.dataBackup'), status: t('web5.automatic'), enabled: true },
  ];

  const handleKeyQRCode = () => {
    setShowKeyQRCodeModal(true);
  };

  const handleExportDIDInfo = () => {
    setShowExportDIDInfoModal(true);
  };

  return (
    <div className={`web5-identity-card ${className}`}>
      <h3 className="card-title">{t('web5.title')}</h3>

      <div className="identity-section">
        <div className="field-group">
          <label className="field-label">{t('web5.did')}</label>
          <div className="input-group">
            <input
              type="text"
              value={did}
              readOnly
              className="field-input"
            />
            <CopyButton
              className="copy-button"
              text={did}
              title={t('copy.success')}
            >
              <GoCopy />
            </CopyButton>
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">{t('web5.pds')}</label>
          <div className="input-group">
            <input
              type="text"
              value={pds}
              readOnly
              className="field-input"
            />
            <button
              className="external-link-button"
              title={t('web5.openLink')}
            >
              <GoDatabase />
            </button>
          </div>
        </div>
      </div>

      <div className="privacy-section">
        <div className="privacy-header">
          <MdOutlinePrivacyTip />
          <h4 className="privacy-title">{t('web5.privacyControl')}</h4>
        </div>

        <div className="privacy-settings">
          {privacySettings.map((setting, index) => (
            <div key={index} className="privacy-item">
              <span className="privacy-label">{setting.label}</span>
              <div className="privacy-status">
                <span className="status-icon"><GoCheckCircle /></span>
                <span className="status-text">{setting.status}</span>

              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="web5-action-buttons">
        <button
          className="web5-action-button"
          onClick={handleKeyQRCode}
        >
          <MdQrCode2 className="button-icon" />
          <span>{t('web5.keyQRCode.title')}</span>
        </button>
        <button
          className="web5-action-button"
          onClick={handleExportDIDInfo}
        >
          <MdOutlineDescription className="button-icon" />
          <span>{t('web5.exportDIDInfo.title')}</span>
        </button>
      </div>

      <KeyQRCodeModal
        isOpen={showKeyQRCodeModal}
        onClose={() => setShowKeyQRCodeModal(false)}
      />
      <ExportDIDInfoModal
        isOpen={showExportDIDInfoModal}
        onClose={() => setShowExportDIDInfoModal(false)}
      />
    </div>
  );
}
