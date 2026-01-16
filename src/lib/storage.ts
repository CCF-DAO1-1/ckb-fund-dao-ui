/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from "@/lib/logger";
const ACCESS_TOKEN_STORE_KEY = '@dao:client';
const USER_INFO_CACHE_KEY = '@dao:userInfo';
const USER_PROFILE_CACHE_KEY = '@dao:userProfile';
const PROPOSAL_DRAFT_KEY_PREFIX = '@dao:proposal_draft:';

// 缓存过期时间：24小时（毫秒）
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000;

// 草稿缓存过期时间：7天（毫秒）
const DRAFT_CACHE_EXPIRY_TIME = 24 * 24 * 60 * 60 * 1000;

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
  return (() => { }) as unknown as T;
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
    // Collect all keys to remove, excluding the access token
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key !== ACCESS_TOKEN_STORE_KEY) {
        keysToRemove.push(key);
      }
    }
    // Remove identified keys
    keysToRemove.forEach(key => window.localStorage.removeItem(key));
  }),
  setToken: clientRun((accTokenVal: TokenStorageType) => {
    window.localStorage.setItem(ACCESS_TOKEN_STORE_KEY, JSON.stringify(accTokenVal));
  }),
  getToken: clientRun(() => {
    const res = window.localStorage.getItem(ACCESS_TOKEN_STORE_KEY)
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
      logger.error('解析用户信息缓存失败:', e);
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
      logger.error('解析用户资料缓存失败:', e);
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

  // 提案草稿缓存（基于用户 DID）
  setProposalDraft: clientRun((draftData: any, did: string) => {
    const draftKey = `${PROPOSAL_DRAFT_KEY_PREFIX}${did}`;
    const cacheItem: CacheItem<any> = {
      data: {
        ...draftData,
        savedAt: new Date().toISOString(),
        version: 1, // 版本号，用于未来兼容性
      },
      timestamp: Date.now(),
      expiry: Date.now() + DRAFT_CACHE_EXPIRY_TIME,
    };
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(cacheItem));
    } catch (e) {
      // localStorage 可能已满，尝试清理旧草稿
      logger.warn('保存草稿失败，可能是存储空间不足:', { error: e });
      // 清理过期的草稿
      storage.clearExpiredDrafts();
      // 重试一次
      try {
        window.localStorage.setItem(draftKey, JSON.stringify(cacheItem));
      } catch (retryError) {
        logger.error('重试保存草稿仍然失败:', retryError);
      }
    }
  }),

  getProposalDraft: clientRun((did: string) => {
    if (!did) return null;

    const draftKey = `${PROPOSAL_DRAFT_KEY_PREFIX}${did}`;
    const cached = window.localStorage.getItem(draftKey);
    if (!cached) return null;

    try {
      const cacheItem: CacheItem<any> = JSON.parse(cached);
      // 检查是否过期
      if (Date.now() > cacheItem.expiry) {
        window.localStorage.removeItem(draftKey);
        return null;
      }
      // 返回草稿数据（不包含缓存元数据）
      const { savedAt, version, ...draftData } = cacheItem.data;
      return {
        ...draftData,
        savedAt,
        version: version || 1,
      };
    } catch (e) {
      logger.error('解析提案草稿缓存失败:', e);
      window.localStorage.removeItem(draftKey);
      return null;
    }
  }),

  removeProposalDraft: clientRun((did: string) => {
    if (!did) return;
    const draftKey = `${PROPOSAL_DRAFT_KEY_PREFIX}${did}`;
    window.localStorage.removeItem(draftKey);
  }),

  // 清除所有过期的草稿
  clearExpiredDrafts: clientRun(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(PROPOSAL_DRAFT_KEY_PREFIX)) {
          try {
            const cached = window.localStorage.getItem(key);
            if (cached) {
              const cacheItem: CacheItem<any> = JSON.parse(cached);
              if (Date.now() > cacheItem.expiry) {
                keysToRemove.push(key);
              }
            }
          } catch (e) {
            // 解析失败，也删除
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(key => window.localStorage.removeItem(key));
      if (keysToRemove.length > 0) {
        logger.log(`清理了 ${keysToRemove.length} 个过期草稿`);
      }
    } catch (e) {
      logger.error('清理过期草稿失败:', e);
    }
  }),

  // 清除所有草稿（用于登出时）
  clearAllDrafts: clientRun(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(PROPOSAL_DRAFT_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => window.localStorage.removeItem(key));
    } catch (e) {
      logger.error('清除所有草稿失败:', e);
    }
  }),
}

export default storage;