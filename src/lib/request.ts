import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import getPDSClient from "@/lib/pdsClient";
import { logger } from "@/lib/logger";
import { handleAPIError, handleAuthError, handle404Error } from "@/lib/errorHandler";
import { APIError } from "@/types/errors";

const isServer = typeof window === "undefined";

// 修正找不到 'next-runtime-env'
export const SERVER = process.env.NEXT_PUBLIC_API_ADDRESS || ''

// 防止并发刷新 token
let isRefreshingToken = false;
let refreshTokenPromise: Promise<string> | null = null;

// 请求队列：当 token 刷新时，其他请求等待
type QueuedRequest = {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
};

let requestQueue: QueuedRequest[] = [];

/**
 * 刷新 access token
 * 支持请求队列：当 token 刷新时，其他请求会等待刷新完成
 */
async function refreshAccessToken(): Promise<string> {
  // 如果正在刷新，返回同一个 Promise
  if (isRefreshingToken && refreshTokenPromise) {
    return refreshTokenPromise;
  }

  isRefreshingToken = true;
  refreshTokenPromise = (async () => {
    try {
      const pdsClient = getPDSClient();

      // 检查是否有 refreshJwt
      if (!pdsClient.session?.refreshJwt) {
        throw new Error('No refresh token available');
      }

      const { data } = await pdsClient.com.atproto.server.refreshSession();

      // 更新 sessionManager
      pdsClient.sessionManager.session = {
        ...data,
        active: data.active ?? true
      };

      // 更新缓存中的 userInfo（包含新的 accessJwt 和 refreshJwt）
      const { default: storage } = await import("./storage");
      storage.setUserInfoCache(data);

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
          logger.warn('无法更新 Zustand store 中的 userInfo', { error: importError });
        }
      }

      const newToken = data.accessJwt;

      // 通知队列中的所有请求
      requestQueue.forEach(({ resolve }) => resolve(newToken));
      requestQueue = [];

      return newToken;
    } catch (error: unknown) {
      logger.error('Failed to refresh token:', { error });

      // 检查是否是 refresh token 也过期了
      const err = error as { error?: string; message?: string; status?: number };
      const errorMessage = err?.message || String(error);
      const isRefreshTokenExpired =
        err?.status === 400 ||
        err?.status === 401 ||
        err?.error === 'BadJwt' ||
        err?.error === 'ExpiredToken' ||
        err?.error === 'InvalidRequest' ||
        errorMessage.includes('Token has expired') ||
        errorMessage.includes('BadJwt');

      // 如果 refresh token 也过期了，清除 session 并提示用户重新登录
      if (isRefreshTokenExpired && typeof window !== 'undefined') {
        try {
          const pdsClient = getPDSClient();
          // 清除 session - 使用 logout 方法或直接设置 session 为 null
          if (typeof pdsClient.logout === 'function') {
            pdsClient.logout();
          } else {
            // 如果 logout 方法不存在，直接清除 session
            // @ts-expect-error - sessionManager.session 可能允许设置为 null
            pdsClient.sessionManager.session = null;
          }

          // 清除本地存储的 token
          const { default: storage } = await import("./storage");
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
      throw errorObj;
    } finally {
      isRefreshingToken = false;
      refreshTokenPromise = null;
    }
  })();

  return refreshTokenPromise;
}

/**
 * 等待 token 刷新完成
 */
async function waitForTokenRefresh(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (refreshTokenPromise) {
      refreshTokenPromise.then(resolve).catch(reject);
    } else {
      requestQueue.push({ resolve, reject });
    }
  });
}

export type RequestConfig = AxiosRequestConfig & {
  // 获取完整的axios响应，否则只返回data
  getWholeResponse?: boolean
  // 获取完成的业务数据，否则只返回业务数据的data
  getWholeBizData?: boolean
}

type ConfigWithWholeResponse = AxiosRequestConfig & {
  getWholeResponse: true
}

type ConfigWithWholeBizData = AxiosRequestConfig & {
  getWholeBizData: true
}

type ConfigWithOriginData = AxiosRequestConfig & {
  getWholeResponse: true
  getWholeBizData: true
}

export interface APIResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
  success?: boolean;
  errorData?: Array<{
    errorCode: string;
    errorMessage: string;
    propertyName: string;
  }>;
}

export async function requestAPI<T = unknown, O extends ConfigWithOriginData = ConfigWithOriginData>(
  url: string,
  config: O
): Promise<AxiosResponse<APIResponse<T>>>;

export async function requestAPI<T = unknown, O extends ConfigWithWholeResponse = ConfigWithWholeResponse>(
  url: string,
  config: O
): Promise<AxiosResponse<T>>;

export async function requestAPI<T = unknown, O extends ConfigWithWholeBizData = ConfigWithWholeBizData>(
  url: string,
  config: O
): Promise<APIResponse<T>>;
export async function requestAPI<T = unknown, O = RequestConfig>(url: string, config: O): Promise<T>
export async function requestAPI(url: string, config: RequestConfig) {
  const pdsClient = getPDSClient()

  const makeRequest = async (accessToken?: string) => {
    const token = accessToken || pdsClient.session?.accessJwt;

    logger.apiRequest(config.method || 'GET', `${SERVER}${url}`, {
      hasToken: !!token,
    });

    return await axios(`${SERVER}${url}`, {
      ...config,
      headers: {
        Authorization: token ? `Bearer ${token}` : token,
        ...config.headers,
      },
    });
  };

  let response;
  try {
    response = await makeRequest();

    logger.apiResponse(
      config.method || 'GET',
      url,
      response.status,
      { dataSize: JSON.stringify(response.data).length }
    );
  } catch (e) {
    const error = e as AxiosError;

    // 检查是否是 401 错误（token 过期）
    const status = error.response?.status;
    const responseData = error.response?.data;

    // 检查是否是认证相关错误
    const isUnauthorized = status === 401;

    // 检查响应体是否包含 token 过期信息（支持 InvalidRequest/BadJwt 等格式）
    const isTokenExpiredBody = responseData && typeof responseData === 'object' && responseData !== null && (
      // 标准 401 code
      ('code' in responseData && (responseData as { code?: number }).code === 401) ||
      // 标准 ExpiredToken error
      ('error' in responseData && (responseData as { error?: string }).error === 'ExpiredToken') ||
      // InvalidRequest + BadJwt
      ('error' in responseData && (responseData as { error?: string }).error === 'InvalidRequest' &&
        ('message' in responseData && (responseData as { message?: string }).message?.includes('BadJwt'))) ||
      // 通用消息包含 Token has expired 或 BadJwt
      ('message' in responseData && (
        (responseData as { message?: string }).message?.includes('Token has expired') ||
        (responseData as { message?: string }).message?.includes('BadJwt')
      ))
    );

    const isTokenExpired = isUnauthorized || isTokenExpiredBody;

    // 如果是 token 过期，尝试刷新 token 并重试
    if (isTokenExpired) {
      if (pdsClient.session?.refreshJwt) {
        try {
          logger.info('Token 过期，尝试刷新 token', { url });

          // 如果正在刷新，等待刷新完成
          let newAccessToken: string;
          if (isRefreshingToken) {
            newAccessToken = await waitForTokenRefresh();
          } else {
            newAccessToken = await refreshAccessToken();
          }

          // 使用新的 token 重试请求
          response = await makeRequest(newAccessToken);

          logger.info('Token 刷新成功，重试请求成功', {
            url,
            status: response.status
          });
        } catch (refreshError: unknown) {
          logger.error('刷新 token 失败', refreshError, { url });

          // 检查是否是 refresh token 也过期了
          const refreshErr = refreshError as { error?: string; message?: string; status?: number };
          const refreshErrorMessage = refreshErr?.message || String(refreshError);
          const isRefreshTokenExpired =
            refreshErr?.status === 400 ||
            refreshErr?.status === 401 ||
            refreshErr?.error === 'BadJwt' ||
            refreshErr?.error === 'ExpiredToken' ||
            refreshErr?.error === 'InvalidRequest' ||
            refreshErrorMessage.includes('Token has expired') ||
            refreshErrorMessage.includes('BadJwt');

          // 如果 refresh token 也过期了，清除 session
          if (isRefreshTokenExpired) {
            try {
              const pdsClient = getPDSClient();
              if (typeof pdsClient.logout === 'function') {
                pdsClient.logout();
              }

              const { default: storage } = await import("./storage");
              storage.removeToken();
              storage.removeUserInfoCache();

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

          // 刷新失败，处理认证错误
          const apiError = APIError.fromAxiosError(error);
          handleAuthError(apiError);
          throw apiError;
        }
      } else {
        // 没有 refreshJwt，无法刷新，需要重新登录
        logger.warn('Token 过期且没有 refresh token，需要重新登录', { url });
        const apiError = APIError.fromAxiosError(error);
        handleAuthError(apiError);
        throw apiError;
      }
    } else {
      // 其他错误，使用统一的错误处理
      const apiError = handleAPIError(error, {
        context: { url, method: config.method },
      });

      // 如果是 axios 错误，尝试返回错误响应
      if (error.response) {
        response = error.response;
      } else {
        // 网络错误或其他错误
        throw apiError;
      }
    }
  }

  // 检查响应数据中的错误码（在数据提取之前）
  const responseData = response?.data;

  // 处理响应中的 401 错误（业务层面的 token 过期）
  if (responseData?.code === 401) {
    if (pdsClient.session?.refreshJwt) {
      // 有 refreshJwt，尝试刷新并重试
      try {
        logger.info('响应返回 401，尝试刷新 token', { url });
        let newAccessToken: string;
        if (isRefreshingToken) {
          newAccessToken = await waitForTokenRefresh();
        } else {
          newAccessToken = await refreshAccessToken();
        }
        // 使用新的 token 重试请求
        response = await makeRequest(newAccessToken);
      } catch (refreshError) {
        logger.error('刷新 token 失败', refreshError, { url });
        const apiError = new APIError('认证失败', 401, 'AUTH_ERROR');
        handleAuthError(apiError);
      }
    } else {
      // 没有 refreshJwt，需要重新登录
      logger.warn('响应返回 401 且没有 refresh token，需要重新登录', { url });
      const apiError = new APIError('认证失败', 401, 'AUTH_ERROR');
      handleAuthError(apiError);
    }
  }

  // 处理 404 错误，跳转到 404 页面
  if (responseData?.code === 404 ||
    (responseData?.error === 'NotFound' && responseData?.message === 'NOT_FOUND')) {
    handle404Error();
    // 返回一个永远不会resolve的Promise，阻止后续处理
    return new Promise(() => { });
  }

  const bizDataOnly = config.getWholeBizData !== true
  if (bizDataOnly && responseData?.data !== undefined)
    response.data = responseData.data
  const getResponse = config.getWholeResponse === true
  return getResponse ? response : response.data
}

export type FetchAPIReturnType<OPTIONS extends AxiosRequestConfig, ReturnDataType> =
  OPTIONS extends ConfigWithOriginData ? Promise<AxiosResponse<APIResponse<ReturnDataType | null>>>
  : OPTIONS extends ConfigWithWholeResponse ? Promise<AxiosResponse<ReturnDataType | null>>
  : OPTIONS extends ConfigWithWholeBizData ? Promise<APIResponse<ReturnDataType | null>>
  : Promise<ReturnDataType | null>;