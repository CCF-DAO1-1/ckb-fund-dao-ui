import { handleAuthError } from "./errorHandler";
import { APIError } from "@/types/errors";
import { logger } from "./logger";
import { userLogin } from "@/lib/user-account";
import storage from "@/lib/storage";
import toast from 'react-hot-toast';

/**
 * 重新走签名登录流程，获取新的 accessJwt。
 * 该 Web5 PDS 不支持标准 refreshSession 端点，所以用 signKey 重签。
 */
async function reLogin(): Promise<void> {
  const tokenInfo = storage.getToken();
  if (!tokenInfo) throw new Error('No stored credentials for re-login');
  const newSession = await userLogin(tokenInfo);
  if (!newSession) throw new Error('Re-login returned empty session');
  // userLogin 内部已更新 pdsClient.sessionManager.session，同步更新缓存
  storage.setUserInfoCache(newSession);
  logger.log('sessionWrapApi: 重新登录成功，已获取新 token');
}

export default async function sessionWrapApi<T>(callback: () => Promise<T>): Promise<T> {
  try {
    const result = await callback()
    return result
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // 检查 token 过期错误（包含 "Token has expired" 或 "BadJwt"）
    if (errorMessage.includes('Token has expired') || errorMessage.includes('BadJwt') || errorMessage.includes('ExpiredToken')) {
      try {
        await reLogin();
        return await callback();
      } catch (refreshError: unknown) {
        logger.error('sessionWrapApi: 重新登录失败', refreshError);
        // 只提示用户，不触发登出
        toast.error('登录已过期，请重新连接钱包', { duration: 4000 });
        throw Object.assign(new Error('Session expired'), { isSessionExpired: true, originalError: refreshError });
      }
    }
    throw error
  }
}
