/**
 * 请求去重 Hook
 * 用于防止短时间内对同一个接口发起重复请求
 */
import { useRef, useCallback } from 'react';

// 定义请求函数类型
type RequestFunction<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult>;

/**
 * 请求去重 Hook
 * @param delayMs 去重延迟时间（毫秒），默认 300ms
 * @returns 包装后的请求函数
 *
 * @example
 * ```tsx
 * const fetchData = useRequestDedup(async (id: string) => {
 *   return await getProposalDetail({ uri: id });
 * }, 300);
 *
 * // 在组件中使用
 * useEffect(() => {
 *   fetchData(proposalId);
 * }, [proposalId]);
 * ```
 */
export function useRequestDedup(
  delayMs: number = 300
) {
  const pendingRequestRef = useRef<Promise<unknown> | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgsRef = useRef<unknown[] | null>(null);

  const dedupedRequest = useCallback(<TArgs extends unknown[], TResult>(
    requestFn: RequestFunction<TArgs, TResult>,
    ...args: TArgs
  ): Promise<TResult> => {
    // 检查参数是否与上次相同
    const argsChanged = !lastArgsRef.current ||
      JSON.stringify(args) !== JSON.stringify(lastArgsRef.current);

    // 如果有pending的请求且参数相同，直接返回
    if (pendingRequestRef.current && !argsChanged) {
      return pendingRequestRef.current as Promise<TResult>;
    }

    // 更新参数记录
    lastArgsRef.current = args;

    // 清除之前的延迟
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // 如果参数变化了，清除旧的 pending 请求
    if (argsChanged) {
      pendingRequestRef.current = null;
    }

    // 创建新的请求
    const promise = new Promise<TResult>((resolve, reject) => {
      timeoutRef.current = setTimeout(async () => {
        try {
          const result = await requestFn(...args);
          pendingRequestRef.current = null;
          resolve(result);
        } catch (error) {
          pendingRequestRef.current = null;
          reject(error);
        }
      }, delayMs);
    });

    pendingRequestRef.current = promise;
    return promise;
  }, [delayMs]);

  return dedupedRequest;
}

/**
 * 简化版：基于参数缓存的请求去重
 * 如果参数相同且在缓存时间内，直接返回缓存结果
 */
export function useRequestCache(
  cacheTimeMs: number = 5000
) {
  const cacheRef = useRef<Map<string, { data: unknown; timestamp: number }>>(new Map());

  const cachedRequest = useCallback(<TArgs extends unknown[], TResult>(
    requestFn: RequestFunction<TArgs, TResult>,
    ...args: TArgs
  ): Promise<TResult> => {
    const cacheKey = JSON.stringify(args);
    const cached = cacheRef.current.get(cacheKey);
    const now = Date.now();

    // 如果缓存存在且未过期，返回缓存数据
    if (cached && (now - cached.timestamp) < cacheTimeMs) {
      return Promise.resolve(cached.data as TResult);
    }

    // 发起新请求
    return requestFn(...args).then((data: TResult) => {
      // 更新缓存
      cacheRef.current.set(cacheKey, { data, timestamp: now });
      return data;
    });
  }, [cacheTimeMs]);

  return cachedRequest;
}
