import getPDSClient from "./pdsClient";
import storage from "./storage";

import { logger } from '@/lib/logger';
// 自定义错误类型，用于标识 session 过期错误
export interface SessionExpiredError extends Error {
  isSessionExpired: true;
}

// 防止并发刷新 token（用于 PDS API）
let isRefreshingPDSToken = false;
let refreshPDSTokenPromise: Promise<string> | null = null;

// 请求队列：当 token 刷新时，其他请求会等待刷新完成
type QueuedRequest = {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
};

let requestQueue: QueuedRequest[] = [];

/**
 * 刷新 PDS session token
 * 与 request.ts 中的 refreshAccessToken 逻辑保持一致
 */
async function refreshToken() {
  // 如果正在刷新，返回同一个 Promise
  if (isRefreshingPDSToken && refreshPDSTokenPromise) {
    return refreshPDSTokenPromise;
  }

  const pdsClient = getPDSClient()
  const localStorage = storage.getToken()
  if (!localStorage) {
    throw new Error('No local storage found')
  }

  // 检查是否有 refreshJwt
  if (!pdsClient.session?.refreshJwt) {
    throw new Error('No refresh token available')
  }

  isRefreshingPDSToken = true;
  refreshPDSTokenPromise = (async () => {
    try {
      const { data } = await pdsClient.com.atproto.server.refreshSession()

      // 更新 sessionManager
      pdsClient.sessionManager.session = {
        ...data,
        active: data.active ?? true
      }

      // 更新缓存中的 userInfo（包含新的 accessJwt 和 refreshJwt）
      storage.setUserInfoCache(data)

      // 如果 Zustand store 已经初始化，也需要更新 store 中的 userInfo
      // 使用动态导入避免循环依赖，并且只在客户端执行
      if (typeof window !== 'undefined') {
        try {
          const { default: useUserInfoStore } = await import('../store/userInfo');
          const updateUserInfoFromSession = useUserInfoStore.getState().updateUserInfoFromSession;
          if (updateUserInfoFromSession) {
            updateUserInfoFromSession();
          }
        } catch (importError) {
          // 如果导入失败（比如 SSR），忽略错误
          logger.warn('无法更新 Zustand store 中的 userInfo:', { error: importError });
        }
      }

      const newToken = data.accessJwt;

      // 通知队列中的所有请求
      requestQueue.forEach(({ resolve }) => resolve(newToken));
      requestQueue = [];

      return newToken;
    } catch (error: unknown) {
      logger.error('Failed to refresh token:', { error })

      // 检查是否是 refresh token 也过期了
      const err = error as { error?: string; message?: string; status?: number };
      const errorMessage = err?.message || String(error);
      const isRefreshTokenExpired =
        err?.status === 400 ||
        err?.error === 'BadJwt' ||
        err?.error === 'ExpiredToken' ||
        err?.error === 'InvalidRequest' ||
        errorMessage.includes('Token has expired') ||
        errorMessage.includes('BadJwt')

      // 如果 refresh token 也过期了，清除 session 并提示用户重新登录
      if (isRefreshTokenExpired && typeof window !== 'undefined') {
        try {
          // 清除 session - 使用 logout 方法或直接设置 session 为 null
          if (typeof pdsClient.logout === 'function') {
            pdsClient.logout();
          } else {
            // 如果 logout 方法不存在，直接清除 session
            // @ts-expect-error - sessionManager.session 可能允许设置为 null
            pdsClient.sessionManager.session = null;
          }

          // 清除本地存储的 token
          storage.removeToken();

          // 清除 userInfo cache
          storage.removeUserInfoCache();

          // 更新 Zustand store
          const { default: useUserInfoStore } = await import('../store/userInfo');
          const { logout } = useUserInfoStore.getState();
          if (logout) {
            logout();
          }

          logger.warn('Refresh token 已过期，已清除 session，请重新登录');
        } catch (clearError) {
          logger.error('清除 session 失败:', clearError);
        }
      }

      // 通知队列中的所有请求失败
      let errorObj: Error;
      if (error instanceof Error) {
        errorObj = error;
      } else if (typeof error === 'object' && error !== null) {
        // 尝试提取错误消息
        const err = error as { message?: string; error?: string };
        const msg = err.message || err.error || JSON.stringify(error);
        errorObj = new Error(msg);
        // 保留原始对象的属性
        Object.assign(errorObj, error);
      } else {
        errorObj = new Error(String(error));
      }

      requestQueue.forEach(({ reject }) => reject(errorObj));
      requestQueue = [];

      // 抛出错误，由调用者处理
      throw errorObj
    } finally {
      isRefreshingPDSToken = false;
      refreshPDSTokenPromise = null;
    }
  })();

  return refreshPDSTokenPromise;
}

/**
 * 等待 token 刷新完成
 */
async function waitForTokenRefresh(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (refreshPDSTokenPromise) {
      refreshPDSTokenPromise.then(resolve).catch(reject);
    } else {
      requestQueue.push({ resolve, reject });
    }
  });
}

interface ApiError {
  status?: number;
  error?: string;
  message?: string;
}

/**
 * 包装 API 调用，处理 token 过期自动刷新
 * @param apiCall API 调用函数
 * @param retryCount 重试次数
 */
export default async function sessionWrapApi<T>(apiCall: () => Promise<T>, retryCount = 1): Promise<T> {
  try {
    return await apiCall()
  } catch (error: unknown) {
    // 检查是否是 token 过期错误
    // 这里假设错误码或错误信息包含特定标识，需根据实际 PDS 响应调整
    const err = error as ApiError;
    const errorMessage = err?.message || String(error);
    const isTokenExpired =
      err?.status === 401 ||
      err?.error === 'ExpiredToken' ||
      err?.error === 'BadJwt' ||
      err?.error === 'InvalidRequest' ||
      errorMessage.includes('Token has expired') ||
      errorMessage.includes('token') ||
      errorMessage.includes('BadJwt')

    if (isTokenExpired && retryCount > 0) {
      try {
        // 如果正在刷新，等待刷新完成
        let newAccessToken: string;
        if (isRefreshingPDSToken) {
          newAccessToken = await waitForTokenRefresh();
        } else {
          newAccessToken = await refreshToken();
        }

        // 刷新成功后重试 API 调用
        return await sessionWrapApi(apiCall, retryCount - 1)
      } catch (refreshError: unknown) {
        // 检查 refresh token 是否也过期了
        const refreshErr = refreshError as { error?: string; message?: string; status?: number };
        const refreshErrorMessage = refreshErr?.message || String(refreshError);
        const isRefreshTokenExpired =
          refreshErr?.status === 400 ||
          refreshErr?.error === 'BadJwt' ||
          refreshErr?.error === 'ExpiredToken' ||
          refreshErr?.error === 'InvalidRequest' ||
          refreshErrorMessage.includes('Token has expired') ||
          refreshErrorMessage.includes('BadJwt')

        // 如果 refresh token 也过期了，抛出更明确的错误
        if (isRefreshTokenExpired) {
          const expiredError = new Error('Session expired, please login again') as SessionExpiredError;
          expiredError.isSessionExpired = true;
          throw expiredError;
        }

        // 其他刷新错误，抛出原始错误
        throw refreshError
      }
    }

    throw error
  }
}

