"use client";

import { useState, useEffect, useCallback } from "react";
import { getReplied, RepliedItem } from "@/server/proposal";
import useUserInfoStore from "@/store/userInfo";

export interface UseRepliedListResult {
  comments: RepliedItem[];
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
 * 使用个人回复列表Hook
 * @param initialParams 初始查询参数
 * @returns 回复列表、分页信息、加载状态、错误信息和重新获取函数
 */
export function useRepliedList(
  initialParams: { page?: number; per_page?: number } = { page: 1, per_page: 10 }
): UseRepliedListResult {
  const { userInfo } = useUserInfoStore();
  const [comments, setComments] = useState<RepliedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState<number>(initialParams.page || 1);
  const [perPage, setPerPage] = useState<number>(initialParams.per_page || 10);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [totalPages, setTotalPages] = useState<number | undefined>(undefined);

  const fetchComments = useCallback(async () => {
    if (!userInfo?.did) {
      setLoading(false);
      setError("");
      setComments([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await getReplied({
        did: userInfo.did,
        page,
        per_page: perPage,
      });

      if (response) {
        // 处理响应数据 - 使用 rows 字段
        if (Array.isArray(response.rows)) {
          setComments(response.rows);
        } else if (Array.isArray(response.comments)) {
          // 兼容旧格式
          setComments(response.comments);
        } else if (Array.isArray(response)) {
          // 如果响应直接是数组
          setComments(response);
        } else {
          setComments([]);
        }

        setTotal(response.total);
        setTotalPages(response.total_pages);
      } else {
        setComments([]);
        setTotal(0);
        setTotalPages(0);
      }
    } catch (err) {
      console.error("获取个人回复列表失败:", err);

      const error = err as { response?: { status?: number }; message?: string };
      const statusCode = error.response?.status;

      // 根据错误类型设置错误信息
      const errorMessages: Record<number, string> = {
        401: "需要登录才能查看回复列表",
        403: "没有权限查看回复列表",
        500: "服务器错误，请稍后重试",
      };

      setError(errorMessages[statusCode || 0] || error.message || "获取回复列表失败，请稍后重试");
      setComments([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [userInfo?.did, page, perPage]);

  // 当依赖项变化时自动获取数据
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // 页码设置函数
  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // 每页数量设置函数
  const handleSetPerPage = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
  }, []);

  return {
    comments,
    loading,
    error,
    page,
    perPage,
    total,
    totalPages,
    refetch: fetchComments,
    setPage: handleSetPage,
    setPerPage: handleSetPerPage,
  };
}

