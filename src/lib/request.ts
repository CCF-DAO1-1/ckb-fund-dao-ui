import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import getPDSClient from "@/lib/pdsClient";
import { logger } from "@/lib/logger";
import { handleAPIError, handleAuthError, handle404Error } from "@/lib/errorHandler";
import { APIError } from "@/types/errors";

// 并发刷新锁：多个并发请求同时 401 时，只执行一次 refreshSession
let refreshPromise: Promise<void> | null = null;

const isServer = typeof window === "undefined";

// 修正找不到 'next-runtime-env'
export const SERVER = process.env.NEXT_PUBLIC_API_ADDRESS || ''

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
      // 标准 ExpiredTokenError
      ('error' in responseData && (responseData as { error?: string }).error === 'ExpiredToken') ||
      // InvalidRequest + BadJwt: Token has expired
      ('error' in responseData && (responseData as { error?: string }).error === 'InvalidRequest') ||
      ('message' in responseData && (responseData as { message?: string }).message?.includes('BadJwt'))
    );

    const isTokenExpired = isUnauthorized || isTokenExpiredBody;

    // 如果是 token 过期，先尝试静默刷新，成功则重试请求，失败才登出
    if (isTokenExpired) {
      logger.warn('Token 过期，尝试静默刷新...', { url });
      try {
        // 并发保护：多个请求同时 401 时，共享同一次刷新操作
        if (!refreshPromise) {
          refreshPromise = getPDSClient().sessionManager.refreshSession()
            .finally(() => { refreshPromise = null; });
        }
        await refreshPromise;

        // 刷新成功，使用新 token 重试原请求
        const newToken = getPDSClient().session?.accessJwt;
        logger.log('Token 刷新成功，重试请求', { url });
        response = await makeRequest(newToken);
      } catch (refreshError) {
        logger.error('Token 刷新失败，触发登出', { url, refreshError });
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
  const isTokenExpiredResponse = responseData?.code === 401 || (
    responseData && typeof responseData === 'object' && responseData !== null && (
      ('error' in responseData && (responseData as { error?: string }).error === 'ExpiredToken') ||
      ('error' in responseData && (responseData as { error?: string }).error === 'InvalidRequest') ||
      ('message' in responseData && (responseData as { message?: string }).message?.includes('BadJwt'))
    )
  );

  if (isTokenExpiredResponse) {
    logger.warn('响应返回 401，说明业务 Token 过期或未授权，触发登出', { url });
    const apiError = new APIError('认证失败', 401, 'AUTH_ERROR');
    handleAuthError(apiError);
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