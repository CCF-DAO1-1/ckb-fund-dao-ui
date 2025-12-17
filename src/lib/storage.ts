/* eslint-disable @typescript-eslint/no-explicit-any */
const ACCESS_TOKEN_STORE_KEY = '@dao:client';
const USER_INFO_CACHE_KEY = '@dao:userInfo';
const USER_PROFILE_CACHE_KEY = '@dao:userProfile';

// 缓存过期时间：24小时（毫秒）
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000;

export type TokenStorageType = {
  did: string
  walletAddress: string
  signKey: string
}

type CacheItem<T> = {
  data: T
  timestamp: number
  expiry: number
}

const clientRun = <T extends (...args: any[]) => any>(f: T) => {
  if (typeof window !== 'undefined') {
    return f;
  }
  return (() => {}) as unknown as T;
}

const storage = {
  getItem: clientRun((key: string) => {
    return window.localStorage.getItem(key);
  }),
  setItem: clientRun((key: string, value: string) => {
    return window.localStorage.setItem(key, value);
  }),
  removeItem: clientRun((key: string) => {
    return window.localStorage.removeItem(key);
  }),
  clear: clientRun(() => {
    return window.localStorage.clear();
  }),
  setToken: clientRun((accTokenVal: TokenStorageType) => {
    window.localStorage.setItem(ACCESS_TOKEN_STORE_KEY, JSON.stringify(accTokenVal));
  }),
  getToken: clientRun(() => {
    const res =  window.localStorage.getItem(ACCESS_TOKEN_STORE_KEY)
    return res ? JSON.parse(res) as TokenStorageType : null;
  }),
  removeToken: clientRun(() => {
    return window.localStorage.removeItem(ACCESS_TOKEN_STORE_KEY);
  }),
  
  // 用户信息缓存
  setUserInfoCache: clientRun((userInfo: any) => {
    const cacheItem: CacheItem<any> = {
      data: userInfo,
      timestamp: Date.now(),
      expiry: Date.now() + CACHE_EXPIRY_TIME,
    };
    window.localStorage.setItem(USER_INFO_CACHE_KEY, JSON.stringify(cacheItem));
  }),
  
  getUserInfoCache: clientRun(() => {
    const cached = window.localStorage.getItem(USER_INFO_CACHE_KEY);
    if (!cached) return null;
    
    try {
      const cacheItem: CacheItem<any> = JSON.parse(cached);
      // 检查是否过期
      if (Date.now() > cacheItem.expiry) {
        window.localStorage.removeItem(USER_INFO_CACHE_KEY);
        return null;
      }
      return cacheItem.data;
    } catch (e) {
      console.error('解析用户信息缓存失败:', e);
      window.localStorage.removeItem(USER_INFO_CACHE_KEY);
      return null;
    }
  }),
  
  removeUserInfoCache: clientRun(() => {
    return window.localStorage.removeItem(USER_INFO_CACHE_KEY);
  }),
  
  // 用户资料缓存
  setUserProfileCache: clientRun((userProfile: any) => {
    const cacheItem: CacheItem<any> = {
      data: userProfile,
      timestamp: Date.now(),
      expiry: Date.now() + CACHE_EXPIRY_TIME,
    };
    window.localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(cacheItem));
  }),
  
  getUserProfileCache: clientRun(() => {
    const cached = window.localStorage.getItem(USER_PROFILE_CACHE_KEY);
    if (!cached) return null;
    
    try {
      const cacheItem: CacheItem<any> = JSON.parse(cached);
      // 检查是否过期
      if (Date.now() > cacheItem.expiry) {
        window.localStorage.removeItem(USER_PROFILE_CACHE_KEY);
        return null;
      }
      return cacheItem.data;
    } catch (e) {
      console.error('解析用户资料缓存失败:', e);
      window.localStorage.removeItem(USER_PROFILE_CACHE_KEY);
      return null;
    }
  }),
  
  removeUserProfileCache: clientRun(() => {
    return window.localStorage.removeItem(USER_PROFILE_CACHE_KEY);
  }),
  
  // 清除所有用户相关缓存
  clearUserCache: clientRun(() => {
    window.localStorage.removeItem(USER_INFO_CACHE_KEY);
    window.localStorage.removeItem(USER_PROFILE_CACHE_KEY);
  }),
}

export default storage;