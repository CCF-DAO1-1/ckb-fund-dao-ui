import getPDSClient from "./pdsClient";
import { handleAuthError } from "./errorHandler";
import { APIError } from "@/types/errors";
import { logger } from "./logger";

export default async function sessionWrapApi<T>(callback: () => Promise<T>): Promise<T> {
  try {
    const result = await callback()
    return result
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // 检查 token 过期错误（包含 "Token has expired" 或 "BadJwt"）
    if (errorMessage.includes('Token has expired') || errorMessage.includes('BadJwt') || errorMessage.includes('ExpiredToken')) {
      try {
        await getPDSClient().sessionManager.refreshSession();
        return await callback();
      } catch (refreshError: unknown) {
        logger.error('sessionWrapApi: PDS Session Refresh Failed', refreshError);
        // 如果刷新也失败了，触发强制退出逻辑
        const apiError = new APIError('登录状态已失效，请重新登录', 401, 'AUTH_ERROR');
        handleAuthError(apiError);

        // 抛出特定的错误结构，以便业务组件(如 ProposalComments) 能够按预期识别
        throw Object.assign(new Error('Session expired'), { isSessionExpired: true, originalError: refreshError });
      }
    }
    throw error
  }
}
