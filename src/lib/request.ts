import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import getPDSClient from "@/lib/pdsClient";
import { handle404Error } from "@/lib/errorHandler";

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
  const token = getPDSClient().session?.accessJwt
  const response = await axios(`${SERVER}${url}`, {
    ...config,
    headers: {
      Authorization: token ? `Bearer ${token}` : token,
      ...config.headers,
    },
  });

  if (response?.data?.code === 401) {
    // 不做登出处理，由 wrapApiAutoSession 的 refreshSession 负责
  }

  const responseData = response?.data;

  // 处理 404 错误，跳转到 404 页面
  if (responseData?.code === 404 ||
    (responseData?.error === 'NotFound' && responseData?.message === 'NOT_FOUND')) {
    handle404Error();
    return new Promise(() => { });
  }

  const bizDataOnly = config.getWholeBizData !== true
  if (bizDataOnly)
    response.data = response.data.data
  const getResponse = config.getWholeResponse === true
  return getResponse ? response : response.data
}

export type FetchAPIReturnType<OPTIONS extends AxiosRequestConfig, ReturnDataType> =
  OPTIONS extends ConfigWithOriginData ? Promise<AxiosResponse<APIResponse<ReturnDataType | null>>>
  : OPTIONS extends ConfigWithWholeResponse ? Promise<AxiosResponse<ReturnDataType | null>>
  : OPTIONS extends ConfigWithWholeBizData ? Promise<APIResponse<ReturnDataType | null>>
  : Promise<ReturnDataType | null>;