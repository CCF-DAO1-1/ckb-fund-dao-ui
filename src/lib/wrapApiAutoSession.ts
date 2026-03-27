import getPDSClient from "@/lib/pdsClient";
import storage from "@/lib/storage";
import toast from 'react-hot-toast';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';

function getAuthMessages() {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/zh')) {
    return zh.auth;
  }
  return en.auth;
}

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

        const msg = getAuthMessages()
        toast(msg.sessionRefreshed, { icon: '🔄', duration: 5000 })
      } catch {
        const msg = getAuthMessages()
        toast.error(msg.sessionExpired, { duration: 4000 });
      }
    }
    throw error
  }
}
