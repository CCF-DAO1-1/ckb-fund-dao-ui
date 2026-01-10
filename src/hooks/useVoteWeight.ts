"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getVoteWeight } from "@/server/proposal";
import { useTranslation } from "@/utils/i18n";
import { useWalletAddress } from "./useWalletAddress";

import { logger } from '@/lib/logger';
/**
 * 获取用户投票权重的 Hook
 * 提供获取用户投票权重的功能
 */
export function useVoteWeight() {
  const { t, locale } = useTranslation();
  const { walletAddress, isConnected } = useWalletAddress();
  const [voteWeight, setVoteWeight] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedAddress = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);

  // 当钱包地址变化时自动获取投票权重
  useEffect(() => {
    if (!walletAddress || !isConnected) {
      return;
    }
    
    // 如果地址没有变化，跳过请求
    if (walletAddress === lastFetchedAddress.current) {
      return;
    }
    
    // 防止并发请求
    if (isFetchingRef.current) {
      return;
    }
    
    // 更新 ref（在确认可以请求后再更新）
    lastFetchedAddress.current = walletAddress;

    const fetchVoteWeight = async () => {
      try {
        isFetchingRef.current = true;
        setIsLoading(true);
        setError(null);

        const response = await getVoteWeight({ ckb_addr: walletAddress });
        
        if (response && typeof response.weight === 'number') {
          setVoteWeight(response.weight / 100000000);
        } else {
          throw new Error("Response data error");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get vote weight";
        setError(errorMessage);
        logger.error("Failed to get vote weight:");
        setVoteWeight(0);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchVoteWeight();
  }, [walletAddress, isConnected]);

  // 获取投票权重（用于手动调用）
  const fetchVoteWeight = useCallback(async (ckb_addr?: string) => {
    const address = ckb_addr || walletAddress;
    
    if (!address) {
      setError(t("voteWeight.noCKBAddress"));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await getVoteWeight({ ckb_addr: address });
      
      if (response && typeof response.weight === 'number') {
        setVoteWeight(response.weight / 100000000);
      } else {
        throw new Error(t("voteWeight.responseDataError"));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t("voteWeight.getVoteWeightFailed");
      setError(errorMessage);
      logger.error(t("voteWeight.getVoteWeightFailed"), error);
      setVoteWeight(0);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, t]);

  // 刷新投票权重
  const refreshVoteWeight = useCallback(() => {
    fetchVoteWeight();
  }, [fetchVoteWeight]);

  // 格式化投票权重显示
  const formatVoteWeight = useCallback((weight: number, showUnit: boolean = true) => {
    // 将 locale 映射到数字格式化语言代码
    const numberLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    const formatted = weight.toLocaleString(numberLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return showUnit ? `${formatted} ${t("voteWeight.votes")}` : formatted;
  }, [t, locale]);

  // 检查是否有投票权限（权重大于0）
  const hasVotingPower = voteWeight > 0;

  return {
    voteWeight,
    isLoading,
    error,
    fetchVoteWeight,
    refreshVoteWeight,
    formatVoteWeight,
    hasVotingPower,
    walletAddress,
    isConnected,
  };
}

/**
 * 获取指定CKB地址投票权重的 Hook
 * 用于获取其他用户的投票权重
 */
export function useVoteWeightByAddress(ckb_addr: string) {
  const { t, locale } = useTranslation();
  const [voteWeight, setVoteWeight] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ckb_addr) {
      setError("Empty CKB address");
      return;
    }

    const fetchVoteWeight = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await getVoteWeight({ ckb_addr });
        
        if (response && typeof response.weight === 'number') {
          setVoteWeight(response.weight / 100000000);
        } else {
          throw new Error("Format error");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get vote weight";
        setError(errorMessage);
        logger.error("Failed to get vote weight:");
        setVoteWeight(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoteWeight();
  }, [ckb_addr]);

  // 格式化投票权重显示
  const formatVoteWeight = useCallback((weight: number, showUnit: boolean = true) => {
    // 将 locale 映射到数字格式化语言代码
    const numberLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    const formatted = weight.toLocaleString(numberLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return showUnit ? `${formatted} ${t("voteWeight.votes")}` : formatted;
  }, [t, locale]);

  // 检查是否有投票权限（权重大于0）
  const hasVotingPower = voteWeight > 0;

  return {
    voteWeight,
    isLoading,
    error,
    formatVoteWeight,
    hasVotingPower,
  };
}
