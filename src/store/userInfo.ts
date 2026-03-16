import { create } from 'zustand'
import createSelectors from './helper/createSelector';
import { ccc } from "@ckb-ccc/core";
import getPDSClient from "@/lib/pdsClient";
import storage, { TokenStorageType } from "@/lib/storage";
import { FansWeb5CkbCreateAccount, ComAtprotoServerCreateSession } from "web5-api";
import { createPDSRecord } from "@/server/pds";
import { handleToNickName } from "@/lib/handleToNickName";
import { fetchUserProfile, userLogin } from "@/lib/user-account";

import { logger } from '@/lib/logger';
export type UserProfileType = {
  did: string
  displayName?: string
  highlight?: string  // 在白名单内才有这个字段
  post_count?: string
  comment_count?: string
  created?: string
  handle?: string
}

type UserInfoStoreValue = {
  userInfo?: ComAtprotoServerCreateSession.OutputSchema
  initialized?: boolean
  userProfile?: UserProfileType
  isWhiteListUser?: boolean
  visitorId?: string
}

const STORAGE_VISITOR = '@dao:visitor'


type UserInfoStore = UserInfoStoreValue & {

  setStoreData: (storeData: UserInfoStoreValue) => void
  storageUserInfo: (params: { signKey: string; ckbAddr: string; userInfo: FansWeb5CkbCreateAccount.OutputSchema }) => void
  web5Login: () => Promise<void>
  getUserProfile: () => Promise<UserProfileType | undefined>;
  logout: () => void
  writeProfile: () => Promise<'NO_NEED' | 'SUCCESS' | 'FAIL' | 'NOT_LOGGED_IN'>
  resetUserStore: () => void
  initialize: (signer?: ccc.Signer) => Promise<void>
  importUserDid: (info: TokenStorageType) => Promise<void>
  updateUserInfoFromSession: () => void  // 从 session 更新 userInfo
}

// 使用模块级别的 ref 来防止重复登录
let isLoggingIn = false;
// 使用模块级别的 ref 来防止重复获取用户资料
let isFetchingProfile = false;

const useUserInfoStore = createSelectors(
  create<UserInfoStore>((set, get) => ({
    userInfo: undefined,
    initialized: undefined,
    userProfile: undefined,
    isWhiteListUser: undefined,
    visitorId: undefined,

    setStoreData: (params) => {
      set(() => ({ ...params }))
    },

    storageUserInfo: async ({ signKey, ckbAddr, userInfo }) => {
      // 在客户端环境下存储 token
      if (typeof window !== 'undefined') {
        storage.setToken({
          did: userInfo.did,
          signKey,
          walletAddress: ckbAddr
        })
      }

      // 🔧 关键修复：通过 sessionManager 设置 session，这样后续请求才能带上 accessJwt
      const pdsClient = getPDSClient()
      pdsClient.sessionManager.session = {
        ...userInfo,
        active: true
      }

      logger.log('✅ Session 已设置:', { session: pdsClient.sessionManager.session })

      // 保存 userInfo 到缓存
      storage.setUserInfoCache(userInfo);

      set(() => ({ userInfo, userProfile: { did: userInfo.did, handle: userInfo.handle } }))
    },

    writeProfile: async () => {
      const { userInfo, userProfile } = get();
      if (!userInfo) return 'NOT_LOGGED_IN';
      if (userProfile && userProfile.displayName) return 'NO_NEED'

      try {
        // 解析 handle 获取 PDS 服务域名
        let serviceEndpoint = undefined;
        if (userInfo.handle && userInfo.handle.includes('.')) {
          const domain = userInfo.handle.substring(userInfo.handle.indexOf('.') + 1);
          serviceEndpoint = `https://${domain}`;
        }

        await createPDSRecord({
          record: {
            $type: "app.actor.profile",
            displayName: handleToNickName(userInfo.handle),
            handle: userInfo.handle
          },
          did: userInfo.did,
          rkey: "self",
          serviceEndpoint: serviceEndpoint,
        })
        return 'SUCCESS'
      } catch (e) {
        logger.log('write profile err', { error: e })
        return 'FAIL'
      }
    },

    web5Login: async () => {
      // 防止并发登录请求
      if (isLoggingIn) {
        logger.log('登录请求正在进行中，跳过重复请求');
        return;
      }

      const localStorage = storage.getToken()
      if (!localStorage) return

      try {
        isLoggingIn = true;
        const userInfoRes = await userLogin(localStorage)  // ← 调用登录函数
        if (!userInfoRes) return

        // 保存 userInfo 到缓存
        storage.setUserInfoCache(userInfoRes);

        set(() => ({ userInfo: userInfoRes }))
        await get().getUserProfile()
      } finally {
        isLoggingIn = false;
      }
    },

    /* 清除用户信息+缓存 */
    logout: () => {
      storage.removeToken()
      storage.clearUserCache()  // 清除所有用户相关缓存
      get().resetUserStore()
    },

    /* 只清除用户信息，保留缓存 */
    resetUserStore() {
      getPDSClient().logout()
      storage.clearUserCache()  // 清除所有用户相关缓存
      set(() => ({ userInfo: undefined, userProfile: undefined, isWhiteListUser: false }))
    },

    getUserProfile: async () => {
      const userInfo = get().userInfo
      if (!userInfo) return

      // 防止并发请求
      if (isFetchingProfile) {
        logger.log('用户资料正在获取中，跳过重复请求');
        return;
      }

      // 优先从缓存读取
      const cachedProfile = storage.getUserProfileCache()
      if (cachedProfile && cachedProfile.did === userInfo.did) {
        // 缓存有效，直接使用
        set(() => ({
          userProfile: { ...cachedProfile, handle: userInfo.handle },
          isWhiteListUser: !!cachedProfile.highlight,
        }))
        return cachedProfile
      }

      try {
        isFetchingProfile = true;

        const result = await fetchUserProfile(userInfo.did)

        // 保存到缓存
        storage.setUserProfileCache(result);

        set(() => ({
          userProfile: { ...result, handle: userInfo.handle },
          isWhiteListUser: !!result.highlight,
        }))

        // 没有displayName说明需要补充写入profile
        if (!result.displayName) {
          const status = await get().writeProfile()
          if (status === 'SUCCESS') {
            // 写 profile 成功后，需要重新获取 profile 以获取最新的 displayName
            // 这里允许重新请求，因为这是必要的刷新
            const profile = await fetchUserProfile(userInfo.did)
            // 更新缓存
            storage.setUserProfileCache(profile);
            set(() => ({ userProfile: { ...profile, handle: userInfo.handle }, isWhiteListUser: !!profile.highlight }))
            return profile
          }
        }

        return result
      } finally {
        isFetchingProfile = false;
      }
    },

    initialize: async () => {
      const token = storage.getToken()

      // 如果 token 存在，尝试从缓存恢复 userInfo 和 userProfile
      if (token) {
        const cachedUserInfo = storage.getUserInfoCache()
        const cachedUserProfile = storage.getUserProfileCache()

        // 检查缓存的 did 是否与 token 的 did 匹配
        if (cachedUserInfo && cachedUserInfo.did === token.did) {
          // 恢复 session（如果缓存中有 userInfo，说明之前已经登录过）
          const pdsClient = getPDSClient()
          pdsClient.sessionManager.session = {
            ...cachedUserInfo,
            active: cachedUserInfo.active ?? true
          }

          set(() => ({ userInfo: cachedUserInfo }))

          // 如果有缓存的 userProfile 且 did 匹配，恢复 userProfile
          if (cachedUserProfile && cachedUserProfile.did === cachedUserInfo.did) {
            set(() => ({
              userProfile: { ...cachedUserProfile, handle: cachedUserInfo.handle },
              isWhiteListUser: !!cachedUserProfile.highlight,
            }))
          } else {
            // 缓存中没有 userProfile 或 did 不匹配，尝试获取（但不阻塞初始化）
            // 使用 setTimeout 异步获取，不阻塞初始化流程
            setTimeout(() => {
              get().getUserProfile().catch(err => {
                logger.error('从缓存恢复后获取用户资料失败:', err)
              })
            }, 0)
          }

          // 设置 visitorId
          let visitor = localStorage.getItem(STORAGE_VISITOR)
          if (!visitor) {
            const random4Digit = Math.floor(Math.random() * 9000) + 1000;
            visitor = random4Digit.toString()
            localStorage.setItem(STORAGE_VISITOR, visitor)
          }
          set(() => ({ initialized: true, visitorId: visitor }))
          return
        } else {
          // did 不匹配，清除缓存并重新登录
          storage.clearUserCache()
        }
      } else {
        // token 不存在，清除缓存
        storage.clearUserCache()
      }

      // 缓存中没有有效的 userInfo 或 token 不存在，尝试登录
      await get().web5Login()

      let visitor = localStorage.getItem(STORAGE_VISITOR)
      if (!visitor) {
        const random4Digit = Math.floor(Math.random() * 9000) + 1000;
        visitor = random4Digit.toString()
        localStorage.setItem(STORAGE_VISITOR, visitor)
      }
      set(() => ({ initialized: true, visitorId: visitor }))
    },

    importUserDid: async (info) => {
      storage.setToken(info)
      await get().web5Login()
    },

    // 从 session 更新 userInfo（用于 token 刷新后同步）
    updateUserInfoFromSession: () => {
      const pdsClient = getPDSClient()
      const session = pdsClient.sessionManager.session

      if (session && session.did) {
        // 更新缓存
        storage.setUserInfoCache(session)

        // 更新 store
        set(() => ({ userInfo: session }))
      }
    }

  })),
)

export default useUserInfoStore
