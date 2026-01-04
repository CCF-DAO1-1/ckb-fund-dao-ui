"use client";

import { useState, useEffect, useCallback } from "react";
import { listSelfProposal, ListSelfProposalResponse, SelfProposalItem } from "@/server/proposal";
import useUserInfoStore from "@/store/userInfo";

export interface UseSelfProposalListResult {
  proposals: SelfProposalItem[];
  loading: boolean;
  error: string;
  page: number;
  perPage: number;
  total?: number;
  totalPages?: number;
  refetch: () => Promise<void>;
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
}

/**
 * 使用个人提案列表Hook
 * @param initialParams 初始查询参数
 * @returns 提案列表、分页信息、加载状态、错误信息和重新获取函数
 */
export function useSelfProposalList(
  initialParams: { page?: number; per_page?: number } = { page: 1, per_page: 10 }
): UseSelfProposalListResult {
  const { userInfo } = useUserInfoStore();
  const [proposals, setProposals] = useState<SelfProposalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState<number>(initialParams.page || 1);
  const [perPage, setPerPage] = useState<number>(initialParams.per_page || 10);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [totalPages, setTotalPages] = useState<number | undefined>(undefined);

  const fetchProposals = useCallback(async () => {
    if (!userInfo?.did) {
      setLoading(false);
      setError("");
      setProposals([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await listSelfProposal({
        did: userInfo.did,
        page,
        per_page: perPage,
      });

      if (response) {
        // 注意：requestAPI 会自动提取 response.data.data，所以这里 response 已经是 data 字段的内容
        // 处理响应数据 - 优先使用 rows 字段（真实API格式，经过 requestAPI 处理后）
        let currentTotal: number | undefined;
        let currentTotalPages: number | undefined;
        
        if (response.rows && Array.isArray(response.rows)) {
          setProposals(response.rows);
          currentTotal = response.total;
          currentTotalPages = response.total_pages;
        } else if (response.data?.rows && Array.isArray(response.data.rows)) {
          // 如果还有嵌套的 data 字段（某些情况下）
          setProposals(response.data.rows);
          currentTotal = response.data.total;
          currentTotalPages = response.data.total_pages;
        } else if (Array.isArray(response.proposals)) {
          // 兼容旧格式
          setProposals(response.proposals);
          currentTotal = response.total;
          currentTotalPages = response.total_pages;
        } else if (Array.isArray(response)) {
          // 如果响应直接是数组
          setProposals(response);
          currentTotal = undefined;
          currentTotalPages = undefined;
        } else {
          // 调试：打印响应数据以便排查问题
          console.log("个人提案列表响应数据:", response);
          setProposals([]);
          currentTotal = 0;
          currentTotalPages = 0;
        }
        
        // 设置 total 和 totalPages
        setTotal(currentTotal);
        // 如果 API 返回了 total_pages，直接使用；否则根据 total 和 perPage 计算
        if (currentTotalPages !== undefined) {
          setTotalPages(currentTotalPages);
        } else if (currentTotal !== undefined && perPage > 0) {
          const calculatedTotalPages = Math.ceil(currentTotal / perPage);
          setTotalPages(calculatedTotalPages);
        } else {
          setTotalPages(undefined);
        }
      } else {
        setProposals([]);
        setTotal(0);
        setTotalPages(0);
      }
    } catch (err) {
      console.error("获取个人提案列表失败:", err);

      const error = err as { response?: { status?: number }; message?: string };
      const statusCode = error.response?.status;

      // 根据错误类型设置错误信息
      const errorMessages: Record<number, string> = {
        401: "需要登录才能查看提案列表",
        403: "没有权限查看提案列表",
        500: "服务器错误，请稍后重试",
      };

      setError(errorMessages[statusCode || 0] || error.message || "获取提案列表失败，请稍后重试");
      setProposals([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [userInfo?.did, page, perPage]);

  // 当依赖项变化时自动获取数据
  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  // 页码设置函数
  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // 每页数量设置函数
  const handleSetPerPage = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
  }, []);

  return {
    proposals,
    loading,
    error,
    page,
    perPage,
    total,
    totalPages,
    refetch: fetchProposals,
    setPage: handleSetPage,
    setPerPage: handleSetPerPage,
  };
}

