
import getPDSClient from "@/lib/pdsClient";
import storage, { TokenStorageType } from "@/lib/storage";
import { Secp256k1Keypair } from "@atproto/crypto";
import { bytesFrom, hexFrom } from "@ckb-ccc/core";
import { FansWeb5CkbIndexAction, FansWeb5CkbPreIndexAction } from "web5-api";
// import { showGlobalToast } from "@/provider/toast";
import server from "@/server";
import { UserProfileType } from "@/store/userInfo";

import { logger } from '@/lib/logger';
export async function fetchUserProfile(did: string): Promise<UserProfileType> {
  const result = await server<UserProfileType>('/repo/profile', 'GET', {
    repo: did
  })
  return result
}

export async function userLogin(localStorage: TokenStorageType): Promise<FansWeb5CkbIndexAction.CreateSessionResult | undefined> {


  const pdsClient = getPDSClient()
  const { did, signKey, walletAddress } = localStorage

  const preLoginIndex = {
    $type: 'fans.web5.ckb.preIndexAction#createSession',
  }

  let preLogin: FansWeb5CkbPreIndexAction.Response

  try {
    preLogin = await pdsClient.fans.web5.ckb.preIndexAction({
      did,
      ckbAddr: walletAddress,
      index: preLoginIndex,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err && err.error === 'CkbDidocCellNotFound') {
      logger.log('CkbDidocCellNotFound', { did, walletAddress })
      await deleteErrUser(did, walletAddress, signKey)
      return
    } else {
      logger.error('preIndexAction 发生未知错误:', err)
      return
    }
  }

  // 修复：在赋值前使用了变量“preLogin”
  if (!preLogin || !preLogin.data || !preLogin.data.message) return

  const keyPair = await Secp256k1Keypair.import(signKey?.slice(2))
  const loginSig = await keyPair.sign(
    bytesFrom(preLogin.data.message, 'utf8'),
  )



  const loginIndex = {
    $type: 'fans.web5.ckb.indexAction#createSession',
  }

  const signingKey = keyPair.did()

  try {
    const loginInfo = await pdsClient.fans.web5.ckb.indexAction({
      did,
      message: preLogin.data.message,
      signingKey: signingKey,
      signedBytes: hexFrom(loginSig),
      ckbAddr: walletAddress,
      index: loginIndex,
    })

    const result = loginInfo.data.result as FansWeb5CkbIndexAction.CreateSessionResult

    // 🔧 关键修复：通过 sessionManager 设置 session，这样后续请求才能带上 accessJwt
    pdsClient.sessionManager.session = {
      ...result,
      active: result.active ?? true
    }

    logger.log('✅ Session 已设置:', { session: pdsClient.sessionManager.session })

    return result

  } catch (err) {
    logger.error('登录失败:', err);
    // alert("登录失败")
    // showGlobalToast({
    //   title: '登录失败',
    //   icon: 'error',
    //   duration: 4000
    // })
  }
}


export async function deleteErrUser(did: string, address: string, signKey: string) {
  const preDelectIndex = {
    $type: 'fans.web5.ckb.preIndexAction#deleteAccount',
  }
  const pdsClient = getPDSClient()
  const preDelete = await pdsClient.fans.web5.ckb.preIndexAction({
    did,
    ckbAddr: address,
    index: preDelectIndex,
  })

  const keyPair = await Secp256k1Keypair.import(signKey?.slice(2))
  const signingKey = keyPair.did()
  const deleteSig = await keyPair.sign(
    bytesFrom(preDelete.data.message, 'utf8'),
  )

  const deleteIndex = {
    $type: 'fans.web5.ckb.indexAction#deleteAccount',
  }

  await pdsClient.fans.web5.ckb.indexAction({
    did,
    message: preDelete.data.message,
    signingKey,
    signedBytes: hexFrom(deleteSig),
    ckbAddr: address,
    index: deleteIndex,
  })

  storage.removeToken()
  logger.log('web5 delete account finish', { did, address })
}