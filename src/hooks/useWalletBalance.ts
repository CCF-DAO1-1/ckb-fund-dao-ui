"use client";

import { useState, useEffect } from "react";
import { ccc } from "@ckb-ccc/connector-react";

import { logger } from '@/lib/logger';
/**
 * 获取钱包余额的 Hook
 * 提供多种方法尝试获取用户的钱包余额
 */
export function useWalletBalance() {
  const { wallet, signerInfo } = ccc.useCcc();
  const [walletBalance, setWalletBalance] = useState<bigint>(BigInt(0));
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取钱包余额
  useEffect(() => {
    const getWalletBalance = async () => {
      if (!wallet || !signerInfo) {
        setIsLoadingBalance(false);
        return;
      }

      try {
        setError(null);
        let balance = BigInt(0);
        
        // 获取钱包地址
        let address = "";
        
        // 方法1: 从 signerInfo 获取地址
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((signerInfo as any).signer.getAddresses) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const addresses = await (signerInfo as any).signer.getAddresses();
          address = addresses?.[0] || "";
        }
        
        // 方法2: 从 signerInfo 属性获取地址
        if (!address) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          address = (signerInfo as any).signer.address || (signerInfo as any).signer.publicKey || "";
        }
        
        // 方法3: 从 wallet 获取地址
        if (!address) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((wallet as any).signer.getAddresses) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const addresses = await (wallet as any).signer.getAddresses();
            address = addresses?.[0] || "";
          }
        }
        
        // 方法4: 从 wallet 属性获取地址
        if (!address) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          address = (wallet as any).signer.address || (wallet as any).signer.publicKey || "";
        }

        if (!address) {
          throw new Error("无法获取钱包地址");
        }

        // 获取余额
        // 方法1: 使用 signerInfo.signer.getBalance
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((signerInfo as any).signer.getBalance) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          balance = await (signerInfo as any).signer.getBalance(address);
        }
        // 方法2: 使用 signerInfo.getBalance
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        else if ((signerInfo as any).getBalance) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          balance = await (signerInfo as any).getBalance(address);
        }
        // 方法3: 使用 wallet.signer.getBalance
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        else if ((wallet as any).signer.getBalance) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          balance = await (wallet as any).signer.getBalance(address);
        }
        // 方法4: 使用 wallet.getBalance
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        else if ((wallet as any).getBalance) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          balance = await (wallet as any).getBalance(address);
        }
        else {
          logger.warn("无法直接获取余额，使用默认值 0");
          balance = BigInt(0);
        }

        setWalletBalance(balance);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "获取钱包余额失败";
        setError(errorMessage);
        logger.error("获取钱包余额失败:");
        setWalletBalance(BigInt(0));
      } finally {
        setIsLoadingBalance(false);
      }
    };

    getWalletBalance();
  }, [wallet, signerInfo]);

  // 格式化余额显示（将 shannon 转换为 CKB）
  const formatBalance = (balance: bigint, showUnit: boolean = true) => {
    const ckbBalance = Number(balance) / 10**8;
    const formatted = ckbBalance.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8
    });
    return showUnit ? `${formatted} CKB` : formatted;
  };

  // 获取原始余额（shannon）
  const getRawBalance = () => walletBalance;

  // 获取 CKB 余额（已转换）
  const getCkbBalance = () => Number(walletBalance) / 10**8;

  return {
    walletBalance,
    isLoadingBalance,
    error,
    formatBalance,
    getRawBalance,
    getCkbBalance,
    isConnected: !!wallet && !!signerInfo,
  };
}
