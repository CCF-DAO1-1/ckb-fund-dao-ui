/**
 * 获取提案详情的自定义Hook
 */
import { useState, useEffect, useCallback } from 'react';
import { getProposalDetail, ProposalDetailResponse } from '@/server/proposal';
import { getPostUriHref } from "@/lib/postUriHref";
import useUserInfoStore from '@/store/userInfo';

interface UseProposalDetailResult {
  proposal: ProposalDetailResponse | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
}

/**
 * 使用提案详情Hook
 * @param uri 提案的URI
 * @returns 提案详情、加载状态、错误信息和重新获取函数
 * 
 * @example
 * ```tsx
 * const { proposal, loading, error, refetch } = useProposalDetail(uri);
 * 
 * if (loading) return <div>加载中...</div>;
 * if (error) return <div>错误: {error}</div>;
 * if (!proposal) return <div>提案不存在</div>;
 * 
 * return <div>{proposal.title}</div>;
 * ```
 */
export function useProposalDetail(uri: string | null): UseProposalDetailResult {
  const [proposal, setProposal] = useState<ProposalDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // 从 store 中获取用户的 did 作为 viewer
  const { userInfo } = useUserInfoStore();
  const viewer = userInfo?.did || null;

  const fetchProposal = useCallback(async () => {
    if (!uri) {
      setError('提案URI不能为空');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const data = await getProposalDetail({ 
        uri: getPostUriHref(uri),
        viewer: viewer 
      });
      
      setProposal(data);
    } catch (err) {
      console.error('获取提案详情失败:', err);
      
      const error = err as { response?: { status?: number }; message?: string };
      
      // 根据不同的错误类型设置错误信息
      if (error.response?.status === 404) {
        setError('提案不存在');
      } else if (error.response?.status === 401) {
        setError('需要登录才能查看');
      } else if (error.response?.status === 403) {
        setError('没有权限查看该提案');
      } else {
        setError(error.message || '获取提案详情失败，请稍后重试');
      }
      
      setProposal(null);
    } finally {
      setLoading(false);
    }
  }, [uri, viewer]);

  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  return {
    proposal,
    loading,
    error,
    refetch: fetchProposal,
  };
}

