"use client";

import { useState, useEffect, useMemo } from "react";
import { ccc } from "@ckb-ccc/connector-react";

import { logger } from '@/lib/logger';
/**
 * 获取钱包地址的 Hook
 * 提供多种方法尝试获取用户的钱包地址
 */
export function useWalletAddress() {
  const { wallet, signerInfo } = ccc.useCcc();
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取钱包地址
  useEffect(() => {
    const getWalletAddress = async () => {
      if (!wallet || !signerInfo) {
        setIsLoadingAddress(false);
        return;
      }

      try {
        setError(null);
        let address = "";
        
        // 方法1: 从 signerInfo 获取
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((signerInfo as any).signer.getAddresses) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const addresses = await (signerInfo as any).signer.getAddresses();
          address = addresses?.[0] || "";
        }
        
        // 方法2: 从 signerInfo 属性获取
        if (!address) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          address = (signerInfo as any).signer.address || (signerInfo as any).signer.publicKey || "";
        }
        
        // 方法3: 从 wallet 获取
        if (!address) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((wallet as any).signer.getAddresses) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const addresses = await (wallet as any).signer.getAddresses();
            address = addresses?.[0] || "";
          }
        }
        
        // 方法4: 从 wallet 属性获取
        if (!address) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          address = (wallet as any).signer.address || (wallet as any).signer.publicKey || "";
        }

        if (address) {
          setWalletAddress(address);
        } else {
          setError("无法获取钱包地址");
          logger.warn("无法获取钱包地址");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "获取钱包地址失败";
        setError(errorMessage);
        logger.error("获取钱包地址失败:");
      } finally {
        setIsLoadingAddress(false);
      }
    };

    getWalletAddress();
  }, [wallet, signerInfo]);

  // 复制地址到剪贴板
  const copyAddress = async () => {
    if (walletAddress) {
      try {
        await navigator.clipboard.writeText(walletAddress);
        return true;
      } catch (error) {
        logger.error("复制失败:");
        return false;
      }
    }
    return false;
  };

  // 格式化地址显示
  const formatAddress = (address: string, maxLength: number = 16) => {
    if (!address) return "获取地址中...";
    if (address.length <= maxLength) return address;
    const start = Math.ceil(maxLength / 2);
    const end = Math.floor(maxLength / 2);
    return `${address.slice(0, start)}...${address.slice(-end)}`;
  };

  // 使用 useMemo 来稳定 isConnected 的值
  const isConnected = useMemo(() => !!wallet && !!signerInfo, [wallet, signerInfo]);

  return {
    walletAddress,
    isLoadingAddress,
    error,
    copyAddress,
    formatAddress,
    isConnected,
  };
}
