import getPDSClient from "./pdsClient";

export default async function sessionWrapApi<T>(callback: () => Promise<T>): Promise<T> {
  try {
    const result = await callback()
    return result
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes('Token has expired')) {
      await getPDSClient().sessionManager.refreshSession()
      return await callback()
    }
    throw error
  }
}

