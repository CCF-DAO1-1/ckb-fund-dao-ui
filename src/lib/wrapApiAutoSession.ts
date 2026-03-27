import getPDSClient from "@/lib/pdsClient";
import storage from "@/lib/storage";
import toast from 'react-hot-toast';

export default async function sessionWrapApi<T>(callback: () => Promise<T>): Promise<T> {
  try {
    const result = await callback()
    return result
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Token has expired') || errorMessage.includes('BadJwt') || errorMessage.includes('ExpiredToken')) {
      try {
        const client = getPDSClient()
        await client.sessionManager.refreshSession()

        // 同步新 token 到 localStorage
        const newSession = client.session
        if (newSession) {
          const current = storage.getUserInfoCache()
          if (current) {
            storage.setUserInfoCache({ ...current, ...newSession })
          }
        }

        // 提示用户刷新页面以使用新 token
        toast('登录已自动续期，请刷新页面后继续操作', {
          icon: '🔄',
          duration: 5000,
        })
      } catch {
        toast.error('登录已过期，请重新连接钱包', { duration: 4000 });
      }
    }
    throw error
  }
}
