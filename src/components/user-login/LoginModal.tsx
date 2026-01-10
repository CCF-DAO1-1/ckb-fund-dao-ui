"use client";

import React, { useState, useRef, useEffect } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { Modal } from "../ui/modal";
import LoginProgress from "./LoginProgress";
import LoginStep1 from "./LoginStep1";
import LoginStep2 from "./LoginStep2";
import LoginStep3 from "./LoginStep3";
import LoginStep4 from "./LoginStep4";
import LoginFooter from "./LoginFooter";
import { useAccountNameValidation } from "@/hooks/useAccountNameValidation";
import { useCheckCkb } from "@/hooks/checkCkb";
import useCreateAccount, { CREATE_STATUS } from "@/hooks/createAccount";
import { USER_DOMAIN } from "@/constant/Network";
import { useTranslation } from "@/utils/i18n";
import { logger } from '@/lib/logger';
interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { t } = useTranslation();
  const { open, wallet, signerInfo, disconnect } = ccc.useCcc();
  const [currentStep, setCurrentStep] = useState(1);
  const [accountName, setAccountName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isDropped, setIsDropped] = useState(false);
  const [showInsufficientFunds, setShowInsufficientFunds] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [shouldAutoAdvance, setShouldAutoAdvance] = useState(true); // 是否应该自动进入下一步
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const walletRef = useRef(wallet);
  const signerInfoRef = useRef(signerInfo);
  
  const {
    isValidating,
    validationResult,
    validationError,
    debouncedValidateAccountName,
  } = useAccountNameValidation();

  const { checkSimpleBalance, isLoading: balanceLoading, extraIsEnough, error: balanceError } = useCheckCkb();
  const { createAccount, loading: createLoading, createStatus, resetCreateStatus } = useCreateAccount({
    createSuccess: () => {
      // 注册成功后跳转到 step 4 显示成功信息
      setCurrentStep(4);
    },
  });


  // 检查是否已连接钱包
  const isConnected = Boolean(wallet) && Boolean(signerInfo);
  
  // 同步 wallet 和 signerInfo 到 ref，以便在超时回调中访问最新值
  useEffect(() => {
    walletRef.current = wallet;
    signerInfoRef.current = signerInfo;
  }, [wallet, signerInfo]);

  // 重置连接状态的辅助函数
  const resetConnectionState = () => {
    setIsConnecting(false);
    setShouldAutoAdvance(false);
    setCurrentStep(1);
    setAccountName("");
    setIsDropped(false);
    setShowInsufficientFunds(false);
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  };

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);
      setShouldAutoAdvance(true); // 允许自动前进
      
      // 清除之前的超时（如果有）
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }
      
      // 设置超时检测：如果10秒内没有连接成功，则认为连接失败
      connectTimeoutRef.current = setTimeout(() => {
        // 检查当前是否仍未连接（使用 ref 获取最新值，避免闭包问题）
        if (!walletRef.current || !signerInfoRef.current) {
          logger.error(t("loginModal.connectWalletFailed"), "连接超时");
          resetConnectionState();
        }
      }, 10000); // 10秒超时
      
      await open();
      // 注意：open() 可能不会抛出错误，连接成功会通过 useEffect 监听状态变化来处理
      
    } catch (error) {
      logger.error(t("loginModal.connectWalletFailed"), error);
      resetConnectionState();
    }
  };

  // 断开钱包连接
  const handleDisconnectWallet = async () => {
    try {
      // 调用 ccc 库的断开连接方法
      await disconnect();
      // 重置所有状态
     
      setIsConnecting(false);
    } catch (error) {
      logger.error(t("loginModal.disconnectWalletFailed"), error);
    }
  };

 

  // 监听钱包连接状态 - 连接成功后自动进入第二步（仅在首次连接时）
  React.useEffect(() => {
    if (isConnected && signerInfo && currentStep === 1 && shouldAutoAdvance) {
      setIsConnecting(false);
      // 清除连接超时定时器
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      // 钱包连接成功后自动进入第二步（设置名称）
      setCurrentStep(2);
      setShouldAutoAdvance(false); // 标记已经自动前进过，防止再次自动跳转
    }
  }, [isConnected, signerInfo, currentStep, shouldAutoAdvance, wallet]);

  // 清理超时定时器
  useEffect(() => {
    return () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }
    };
  }, []);

  // 进入步骤3（上链存储）时重置状态
  React.useEffect(() => {
    if (currentStep === 3) {
      setIsDropped(false);
      setShowInsufficientFunds(false);
      setIsDragging(false);
      resetCreateStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // 当开始加载时清除 createStatus
  React.useEffect(() => {
    if (createLoading) {
      resetCreateStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createLoading]);

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 返回到步骤1
  const handleBackToStep1 = () => {
    setCurrentStep(1);
    setAccountName("");
    setShouldAutoAdvance(false); // 阻止自动跳转到步骤2
  };

  // 返回到步骤2
  const handleBackToStep2 = () => {
    setCurrentStep(2);
    setIsDropped(false);
    setShowInsufficientFunds(false);
  };



  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropped(true);
    setIsDragging(false);
    
    // 真实检查CKB余额
    if (signerInfo) {
      try {
        // 检查简单余额（需要355 CKB）
        const balanceResult = await checkSimpleBalance(signerInfo, BigInt(355 * 10**8));
        
        if (balanceResult.isEnough) {
          // 余额充足，开始创建账户
          setShowInsufficientFunds(false);
          logger.log(t("loginModal.balanceCheckPassed"));
          
          // 直接调用创建账户方法，它会自动处理余额验证和私钥生成
          if (signerInfo?.signer && wallet) {
            // 从signer中获取钱包地址
            const addresses = await signerInfo.signer.getAddresses();
            const walletAddress = addresses[0];
            
            await createAccount(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              signerInfo.signer as any, // 类型转换
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              wallet as any, // 类型转换
              `${accountName}.${USER_DOMAIN}`,
              walletAddress, // 使用从signer获取的地址
            );
          }
        } else {
          // 余额不足，显示警告
          setShowInsufficientFunds(true);
          logger.log(t("loginModal.insufficientBalance"));
        }
      } catch (error) {
        logger.error(t("loginModal.balanceCheckError"));
        setShowInsufficientFunds(true);
      }
    } else {
      logger.error(t("loginModal.signerNotFound"));
      setShowInsufficientFunds(true);
    }
  };

  // 重新检查余额
  const handleRecheckBalance = async () => {
    if (signerInfo) {
      try {
        const balanceResult = await checkSimpleBalance(signerInfo, BigInt(355 * 10**8));
        logger.log("Balance check result received");
        if (balanceResult.isEnough) {
          setShowInsufficientFunds(false);
          logger.log(t("loginModal.recheckBalancePassed"));
          
          // 调用创建账户方法
          if (signerInfo?.signer && wallet) {
            // 从signer中获取钱包地址
            const addresses = await signerInfo.signer.getAddresses();
            const walletAddress = addresses[0];
            
            await createAccount(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              signerInfo.signer as any, // 类型转换
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              wallet as any, // 类型转换
              `${accountName}.${USER_DOMAIN}`,
              walletAddress, // 使用从signer获取的地址
            );
          }
        } else {
          setShowInsufficientFunds(true);
          logger.log(t("loginModal.stillInsufficientBalance"));
        }
      } catch (error) {
        logger.error(t("loginModal.recheckBalanceError"));
        setShowInsufficientFunds(true);
      }
    }
  };

  const handleComplete = () => {
    onClose();
    setCurrentStep(1);
    setAccountName("");
    setIsDropped(false);
    setShowInsufficientFunds(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("loginModal.createAccount")}
      size="large"
      className="login-modal"
      showCloseButton={true}
    >

        {/* 进度指示器 */}
        {currentStep !== 1 && currentStep !== 4 && (
          <LoginProgress 
            currentStep={currentStep} 
            isSuccess={createStatus?.status === CREATE_STATUS.SUCCESS}
          />
        )}
        {/* 主要内容区域 - 根据步骤显示不同内容 */}
        {currentStep === 1 && (
          <LoginStep1 
            onDisconnect={handleDisconnectWallet}
           
          />
        )}

        {currentStep === 2 && (
          <LoginStep2
            accountName={accountName}
            setAccountName={setAccountName}
            debouncedValidateAccountName={debouncedValidateAccountName}
            isValidating={isValidating}
            validationResult={validationResult}
            validationError={validationError}
          />
        )}

        {currentStep === 3 && (
          <LoginStep3
            accountName={accountName}
            isDragging={isDragging}
            isDropped={isDropped}
            showInsufficientFunds={showInsufficientFunds}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onRecheckBalance={handleRecheckBalance}
            createLoading={createLoading}
            createStatus={createStatus}
            // 添加余额检查相关状态
            balanceLoading={balanceLoading}
            extraIsEnough={extraIsEnough}
            balanceError={balanceError}
          />
        )}

        {currentStep === 4 && (
          <LoginStep4
            accountName={accountName}
          />
        )}

        {/* 底部区域 */}
        <LoginFooter
          currentStep={currentStep}
          validationResult={validationResult}
          isValidating={isValidating}
          onConnectWallet={handleConnectWallet}
          onNextStep={handleNextStep}
          onComplete={handleComplete}
          onBackToStep1={handleBackToStep1}
          onBackToStep2={handleBackToStep2}
          isConnecting={isConnecting}
          isConnected={isConnected}
          createStatus={createStatus}
        />
    </Modal>
  );
}
