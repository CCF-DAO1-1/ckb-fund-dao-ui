/**
 * 任务列表 Hook
 * 提供任务列表的获取、分页、错误处理等功能
 */
import { useState, useEffect, useCallback } from 'react';
import { getTaskList, TaskListParams, TaskItem } from '@/server/task';
import useUserInfoStore from '@/store/userInfo';

import { logger } from '@/lib/logger';
export interface UseTaskListResult {
  tasks: TaskItem[];
  loading: boolean;
  error: string;
  errorCode?: number; // HTTP 状态码（如 403）
  page: number;
  perPage: number;
  total?: number;
  totalPages?: number;
  refetch: (params?: Partial<TaskListParams>) => Promise<void>;
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
}

/**
 * 使用任务列表Hook
 * @param initialParams 初始查询参数
 * @returns 任务列表、分页信息、加载状态、错误信息和重新获取函数
 * 
 * @example
 * ```tsx
 * const { tasks, loading, error, refetch, setPage } = useTaskList({ 
 *   did: 'did:plc:xxx',
 *   page: 0, 
 *   per_page: 20
 * });
 * 
 * if (loading) return <div>加载中...</div>;
 * if (error) return <div>错误: {error}</div>;
 * 
 * return (
 *   <div>
 *     {tasks.map(task => <TaskItem key={task.id} task={task} />)}
 *   </div>
 * );
 * ```
 */
export function useTaskList(
  initialParams: Omit<TaskListParams, 'did'> = { page: 0, per_page: 20 }
): UseTaskListResult {
  const { userInfo } = useUserInfoStore();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [errorCode, setErrorCode] = useState<number | undefined>(undefined);
  const [page, setPage] = useState<number>(initialParams.page || 0);
  const [perPage, setPerPage] = useState<number>(initialParams.per_page || 20);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [totalPages, setTotalPages] = useState<number | undefined>(undefined);

  const fetchTasks = useCallback(async (params?: Partial<TaskListParams>) => {
    if (!userInfo?.did) {
      setLoading(false);
      setError('用户未登录');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setErrorCode(undefined);

      // 合并参数：优先使用传入的参数，否则使用当前状态
      const finalParams: TaskListParams = {
        did: userInfo.did,
        page: params?.page ?? page,
        per_page: params?.per_page ?? perPage,
        ...params,
      };
      
      const response = await getTaskList(finalParams);
      
      // 处理返回数据
      if (response && Array.isArray(response.tasks)) {
        setTasks(response.tasks);
        setTotal(response.total);
        
        // 计算总页数：优先使用接口返回的 total_pages，否则根据 total 和 per_page 计算
        if (response.total_pages !== undefined) {
        setTotalPages(response.total_pages);
        } else if (response.total !== undefined && finalParams.per_page) {
          const calculatedTotalPages = Math.ceil(response.total / finalParams.per_page);
          setTotalPages(calculatedTotalPages);
        } else {
          setTotalPages(undefined);
        }
      } else if (Array.isArray(response)) {
        // 兼容：如果后端直接返回数组
        setTasks(response);
        setTotal(response.length);
        setTotalPages(Math.ceil(response.length / (finalParams.per_page || 20)));
      } else {
        // 空数据
        setTasks([]);
        setTotal(0);
        setTotalPages(0);
      }
    } catch (err) {
      logger.error('获取任务列表失败:', err);
      
      const error = err as { response?: { status?: number }; message?: string };
      const statusCode = error.response?.status;
      
      setErrorCode(statusCode);
      
      // 根据错误类型设置错误信息
      const errorMessages: Record<number, string> = {
        401: '需要登录才能查看任务列表',
        403: '没有权限查看任务列表',
        500: '服务器错误，请稍后重试',
      };
      
      setError(errorMessages[statusCode || 0] || error.message || '获取任务列表失败，请稍后重试');
      setTasks([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.did]);

  // 当依赖项变化时自动获取数据
  useEffect(() => {
    if (userInfo?.did) {
      fetchTasks({ page, per_page: perPage });
    }
  }, [userInfo?.did, page, perPage, fetchTasks]);
  
  // 页码设置函数
  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // 每页数量设置函数
  const handleSetPerPage = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
  }, []);

  return {
    tasks,
    loading,
    error,
    errorCode,
    page,
    perPage,
    total,
    totalPages,
    refetch: fetchTasks,
    setPage: handleSetPage,
    setPerPage: handleSetPerPage,
  };
}
