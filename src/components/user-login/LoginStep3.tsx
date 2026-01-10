"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { handleCopy } from "@/utils/common";
import { CreateAccountStatus, CREATE_STATUS } from "@/hooks/createAccount";
import { ExtraIsEnoughState } from "@/hooks/checkCkb";
import CopyButton from "../ui/copy/CopyButton";
import { useTranslation } from "@/utils/i18n";

import { logger } from '@/lib/logger';
interface LoginStep3Props {
  accountName: string;
  isDragging: boolean;
  isDropped: boolean;
  showInsufficientFunds: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onRecheckBalance?: () => void;
  createLoading?: boolean;
  createStatus?: CreateAccountStatus;
  // 余额检查相关属性
  balanceLoading?: boolean;
  extraIsEnough?: ExtraIsEnoughState;
  balanceError?: string | null;
}

export default function LoginStep3({
  accountName,
  isDragging,
  isDropped,
  showInsufficientFunds,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onRecheckBalance,
  createLoading = false,
  createStatus,
  balanceLoading = false,
  extraIsEnough,
  balanceError,
}: LoginStep3Props) {
  const { t } = useTranslation();
  const { walletAddress, isLoadingAddress, formatAddress } = useWalletAddress();
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const dragTargetRef = useRef<HTMLDivElement>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  
  // 复制地址到剪贴板（统一行为+toast）
  const handleCopyAddress = () => {
    if (walletAddress) {
      handleCopy(walletAddress, t("copy.addressSuccess"));
    }
  };

  // 移动端触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    // 创建模拟的 dragStart 事件
    const syntheticEvent = {
      ...e,
      dataTransfer: {
        effectAllowed: "move",
        dropEffect: "move",
      },
    } as unknown as React.DragEvent;
    onDragStart(syntheticEvent);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // 防止页面滚动
    if (!touchStartPosRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
    
    // 如果移动距离足够大，认为是拖拽操作
    if (deltaX > 5 || deltaY > 5) {
      // 创建模拟的 dragOver 事件
      const syntheticEvent = {
        ...e,
        preventDefault: () => {},
        dataTransfer: {
          effectAllowed: "move",
          dropEffect: "move",
        },
      } as unknown as React.DragEvent;
      onDragOver(syntheticEvent);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    
    // 检查触摸结束位置是否在目标区域内
    if (dragTargetRef.current) {
      const targetRect = dragTargetRef.current.getBoundingClientRect();
      const isInTarget = 
        endX >= targetRect.left &&
        endX <= targetRect.right &&
        endY >= targetRect.top &&
        endY <= targetRect.bottom;
      
      if (isInTarget) {
        // 创建模拟的 drop 事件
        const syntheticEvent = {
          ...e,
          preventDefault: () => {},
          dataTransfer: {
            effectAllowed: "move",
            dropEffect: "move",
          },
        } as unknown as React.DragEvent;
        onDrop(syntheticEvent);
      }
    }
    
    onDragEnd();
    touchStartPosRef.current = null;
  };

  // 当 createLoading 为 true 时，确保 SVG 动画能够播放
  useEffect(() => {
    if (createLoading && svgContainerRef.current) {
      const objectElement = svgContainerRef.current.querySelector('object');
      if (!objectElement) return;

      const handleLoad = () => {
        try {
          const svgDoc = (objectElement as HTMLObjectElement).contentDocument;
          if (svgDoc) {
            const svgElement = svgDoc.querySelector('svg#ej0HNe5rAG41');
            if (svgElement) {
              // 等待 SVGator 播放器初始化
              const checkPlayer = () => {
                const player = (svgElement as HTMLElement & { svgatorPlayer?: { play: () => void } }).svgatorPlayer;
                if (player) {
                  player.play();
                } else {
                  setTimeout(checkPlayer, 100);
                }
              };
              checkPlayer();
            }
          }
        } catch {
          // 跨域限制时忽略错误
          logger.log('SVG animation may not work due to CORS restrictions');
        }
      };

      // 如果已经加载完成
      if ((objectElement as HTMLObjectElement).contentDocument) {
        handleLoad();
      } else {
        objectElement.addEventListener('load', handleLoad);
      }

      return () => {
        objectElement.removeEventListener('load', handleLoad);
      };
    }
  }, [createLoading]);
  
  // 如果创建成功，显示成功信息
  if (createStatus?.status === CREATE_STATUS.SUCCESS) {
    return (
      <div className="login-info-section">
        <h3 className="login-info-title">{t("loginStep4.accountCreatedSuccess")}</h3>
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
                {accountName || "alice"}
              </div>
            </div>
            <div className="success-details">
              <div className="success-name">
                {accountName || "alice"}.ckb.xyz
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
  
  return (
    <div className="login-info-section">
      <h3 className="login-info-title">
        {t("loginStep3.dragTitle")}
      </h3>
      <p className="login-description">
        {t("loginStep3.description")}
      </p>
      <div className="drag-drop-container">
        <div className="drag-source">
          <div
            className={`planet-account ${isDragging ? "dragging" : ""}`}
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <Image
              src="/nervos-planet.png"
              alt="planet"
              width={75}
              height={40}
            />
          </div>
          <div className="account-info">
            <div className="account-name">
              {accountName || "alice"}
            </div>
            <div className="account-address" style={{ cursor: 'pointer' }}>
              {isLoadingAddress ? t("loginStep3.gettingAddress") : formatAddress(walletAddress)} 
              <CopyButton text={walletAddress} className="copy-button" ariaLabel="copy-wallet-address" />
            </div>
          </div>
          
          {/* 余额状态显示 - 只在余额不足时显示 */}
          {extraIsEnough && !extraIsEnough.isEnough && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              fontSize: '12px',
              color:'#333'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {t("loginStep3.insufficientBalance")}
              </div>
              <div>
                {t("loginStep3.requiredCapacity")}
              </div>
              {balanceLoading && (
                <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                  {t("loginStep3.checkingBalance")}
                </div>
              )}
              {balanceError && (
                <div style={{ marginTop: '4px', color: '#dc3545' }}>
                  {t("loginStep3.error")} {balanceError}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="drag-target">
          <div
            ref={dragTargetRef}
            className={`nervos-galaxy ${isDropped ? "dropped" : ""}`}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <div className="galaxy-core" ref={svgContainerRef}>
              {createLoading ? (
                <object 
                  data="/nervos_galaxy_rotate.svg" 
                  type="image/svg+xml"
                  width={240} 
                  height={160}
                  style={{ width: '240px', height: '160px' }}
                  aria-label="planet"
                />
              ) : (
                <Image 
                  src="/nervos-galaxy.png" 
                  alt="planet" 
                  width={240} 
                  height={160} 
                />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 状态信息 - 移动端显示在 drag-drop-container 下方 */}
      {showInsufficientFunds && (
        <div className="insufficient-funds-warning">
          {t("loginStep3.insufficientFundsWarning")}
          {onRecheckBalance && (
            <button 
              className="recheck-balance-btn" 
              onClick={onRecheckBalance}
              style={{ 
                marginTop: '8px', 
                padding: '4px 8px', 
                fontSize: '12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {t("loginStep3.recheckBalance")}
            </button>
          )}
        </div>
      )}

      {/* 创建账户状态显示 */}
      {createLoading && (
        <div className="create-account-loading">
          <div>{t("loginStep3.creatingAccount")}</div>
          <div style={{ fontSize: '12px', color: 'red', marginTop: '4px' }}>
            {t("loginStep3.pleaseWait")}
          </div>
        </div>
      )}

      {createStatus?.status === CREATE_STATUS.FAILURE && (
        <div className="create-account-error">
          <div>{t("loginStep3.accountCreationFailed")}</div>
          <div className="error-reason">
            {createStatus.reason}
          </div>
        </div>
      )}
    </div>
  );
}
