import getPDSClient from "./pdsClient";
import storage from "./storage";

async function refreshToken() {
  const pdsClient = getPDSClient()
  const localStorage = storage.getToken()
  if (!localStorage) {
    throw new Error('No local storage found')
  }

  // 尝试刷新 token
  try {
    const { data } = await pdsClient.com.atproto.server.refreshSession()
    
    // 更新 sessionManager
    pdsClient.sessionManager.session = {
      ...data,
      active: data.active ?? true
    }
    
    return data.accessJwt
  } catch (error) {
    console.error('Failed to refresh token:', error)
    // 如果刷新失败，可能需要重新登录
    // 这里简单抛出错误，由调用者处理
    throw error
  }
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
    const isTokenExpired = err?.status === 401 || err?.error === 'ExpiredToken' || err?.message?.includes('token')
    
    if (isTokenExpired && retryCount > 0) {
      try {
        await refreshToken()
        // 刷新成功后重试 API 调用
        return await sessionWrapApi(apiCall, retryCount - 1)
      } catch (refreshError) {
        // 刷新失败，抛出原始错误或刷新错误
        throw refreshError
      }
    }
    
    throw error
  }
}

