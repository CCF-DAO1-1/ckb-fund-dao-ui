/**
 * API 拦截器配置
 * 用于处理特定接口的请求/响应拦截
 */
import { Interceptors } from "./utils";
import { logger } from "@/lib/logger";

const interceptors = new Interceptors();

/**
 * 全局请求拦截器示例
 * 可以在这里添加特定接口的请求拦截逻辑
 */

// 示例：为特定接口添加自定义处理
// interceptors.add(
//   'GET /proposal/detail',
//   // 请求拦截器
//   (params, config) => {
//     logger.debug('Intercepting proposal detail request', params);
//     return [params, config];
//   },
//   // 响应拦截器
//   (response, params, config) => {
//     logger.debug('Intercepting proposal detail response', { response });
//     return response;
//   }
// );

/**
 * 通用拦截器：记录所有 API 请求
 */
export function setupGlobalInterceptors() {
  // 可以在这里添加全局拦截逻辑
  logger.info('API interceptors initialized');
}

export default interceptors;

