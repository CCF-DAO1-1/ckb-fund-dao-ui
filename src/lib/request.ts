import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import getPDSClient from "@/lib/pdsClient";
import toast from "react-hot-toast";

const isServer = typeof window === "undefined";

// 修正找不到 'next-runtime-env'
export const SERVER = process.env.NEXT_PUBLIC_API_ADDRESS || ''

// 防止并发刷新 token
let isRefreshingToken = false;
let refreshTokenPromise: Promise<string> | null = null;

/**
 * 刷新 access token
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
          console.warn('无法更新 Zustand store 中的 userInfo:', importError);
        }
      }
      
      return data.accessJwt;
    } finally {
      isRefreshingToken = false;
      refreshTokenPromise = null;
    }
  })();

  return refreshTokenPromise;
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

    console.log('API请求:', {
      url: `${SERVER}${url}`,
      method: config.method,
      hasToken: !!token
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

    console.log('API响应:', {
      url,
      status: response.status,
      data: response.data
    });
  } catch (e) {
    const error = e as AxiosError;
    
    // 检查是否是 401 错误（token 过期）
    const isUnauthorized = error.response?.status === 401;
    const responseData = error.response?.data;
    const isTokenExpired = isUnauthorized && responseData && 
      (typeof responseData === 'object' && responseData !== null &&
       (('code' in responseData && (responseData as { code?: number }).code === 401) ||
        ('error' in responseData && (responseData as { error?: string }).error === 'ExpiredToken')));

    // 如果是 token 过期，尝试刷新 token 并重试
    if (isTokenExpired && pdsClient.session?.refreshJwt) {
      try {
        console.log('Token 过期，尝试刷新 token...');
        const newAccessToken = await refreshAccessToken();
        
        // 使用新的 token 重试请求
        response = await makeRequest(newAccessToken);
        
        console.log('Token 刷新成功，重试请求成功:', {
          url,
          status: response.status
        });
      } catch (refreshError) {
        console.error('刷新 token 失败:', refreshError);
        // 刷新失败，抛出原始错误
        throw error;
      }
    } else {
      // 其他错误，正常处理
      console.error('API请求失败:', {
        url,
        error: error.message || String(e),
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });

      if (!isServer) {
        toast.error(error.message || '网络请求失败');
      }

      // 如果是 axios 错误，尝试返回错误响应
      if (error.response) {
        response = error.response;
      } else {
        // 网络错误或其他错误，返回一个模拟响应
        throw new Error(error.message || '网络请求失败');
      }
    }
  }

  // 检查响应数据中的错误码（在数据提取之前）
  const responseData = response?.data;
  
  if (responseData?.code === 401 && !pdsClient.session?.refreshJwt) {
    // 如果是 401 且没有 refreshJwt，可能需要重新登录
    // throttleLogout();
  }

  // 处理 404 错误，跳转到 404 页面
  if (responseData?.code === 404 || 
      (responseData?.error === 'NotFound' && responseData?.message === 'NOT_FOUND')) {
    if (!isServer && typeof window !== 'undefined') {
      // 获取当前语言环境
      const locale = window.location.pathname.split('/')[1] || 'zh';
      window.location.href = `/${locale}/error/404`;
      // 返回一个永远不会resolve的Promise，阻止后续处理
      return new Promise(() => {});
    }
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