import defineAPI from "@/server/defineAPI";
import { RequestConfig } from "@/lib/request";

export default function server<T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  params: Record<string, unknown> = {},
  options?: RequestConfig,
): Promise<T> {
  return defineAPI(url, method)(
    params,
    options,
  ) as Promise<T>;
}

// 导出 API 接口
export * from './proposal';
export * from './comment';
export * from './pds';
export * from './timeline';
export * from './task';
