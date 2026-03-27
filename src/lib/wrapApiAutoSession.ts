import getPDSClient from "@/lib/pdsClient";
import toast from 'react-hot-toast';

export default async function sessionWrapApi<T>(callback: () => Promise<T>): Promise<T> {
  try {
    const result = await callback()
    return result
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Token has expired') || errorMessage.includes('BadJwt') || errorMessage.includes('ExpiredToken')) {
      try {
        await getPDSClient().sessionManager.refreshSession()
        return await callback()
      } catch (refreshError: unknown) {
        toast.error('登录已过期，请重新连接钱包', { duration: 4000 });
        throw refreshError;
      }
    }
    throw error
  }
}
