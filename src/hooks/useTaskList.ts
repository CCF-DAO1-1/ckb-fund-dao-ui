/**
 * 获取任务列表的自定义Hook
 */
import { useState, useEffect, useCallback } from 'react';
import { getTaskList, TaskListParams, TaskItem } from '@/server/task';
import useUserInfoStore from '@/store/userInfo';

interface UseTaskListResult {
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

      // 使用传入的参数，如果没有则使用当前的 page 和 perPage 状态
      const finalParams: TaskListParams = {
        did: userInfo.did,
        page: params?.page !== undefined ? params.page : page,
        per_page: params?.per_page !== undefined ? params.per_page : perPage,
        ...params,
      };
      
      const response = await getTaskList(finalParams);
      
      // 处理返回数据结构
      if (response && Array.isArray(response.tasks)) {
        setTasks(response.tasks);
        setTotal(response.total);
        setTotalPages(response.total_pages);
      } else if (Array.isArray(response)) {
        // 如果后端直接返回数组
        setTasks(response);
      } else {
        setTasks([]);
        setTotal(0);
        setTotalPages(0);
      }
    } catch (err) {
      console.error('获取任务列表失败:', err);
      const error = err as { response?: { status?: number }; message?: string };
      const statusCode = error.response?.status;
      
      // 保存错误状态码
      setErrorCode(statusCode);
      
      // 根据不同的错误类型设置错误信息
      if (statusCode === 401) {
        setError('需要登录才能查看任务列表');
      } else if (statusCode === 403) {
        setError('没有权限查看任务列表');
      } else if (statusCode === 500) {
        setError('服务器错误，请稍后重试');
      } else {
        setError(error.message || '获取任务列表失败，请稍后重试');
      }
      
      setTasks([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.did]);

  // 当 userInfo.did、page 或 perPage 变化时获取数据
  useEffect(() => {
    if (userInfo?.did) {
      fetchTasks({ page, per_page: perPage });
    }
  }, [userInfo?.did, page, perPage, fetchTasks]);
  
  // 包装 setPage，确保页码变化时触发数据获取
  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // 包装 setPerPage，确保每页数量变化时触发数据获取
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
