"use client";

import { useState, useEffect, useRef } from "react";
import getPDSClient from "@/lib/pdsClient";
import storage, { TokenStorageType } from "@/lib/storage";
import { Secp256k1Keypair } from "@atproto/crypto";
import { bytesFrom, hexFrom, ccc, Script, numFrom, fixedPointToString } from "@ckb-ccc/core";
import { FansWeb5CkbIndexAction, FansWeb5CkbPreIndexAction, FansWeb5CkbCreateAccount } from "web5-api";
import * as cbor from "@ipld/dag-cbor";
import { tokenConfig, DEFAULT_FEE_RATE } from "@/constant/token";
import { useWallet } from "@/provider/WalletProvider";

import { DidWeb5Data } from "@/lib/molecules"; // 暂时不使用，避免序列化问题
import useUserInfoStore from "@/store/userInfo";
import { base32 } from "@scure/base";
import { hexToUint8Array, uint8ArrayToHex } from "@/lib/dag-cbor";
// import { UnsignedCommit } from "@atproto/repo";
// import { CID } from "multiformats";
import server from "@/server";
import { UserProfileType } from "@/store/userInfo";

import { logger } from '@/lib/logger';
export enum CREATE_STATUS {
  INIT,
  SUCCESS,
  FAILURE
}

export type CreateAccountStatus = { status: CREATE_STATUS; reason?: string }

// 类型定义
export interface CkbBalanceResult {
  isEnough: boolean;
  expectedCapacity?: string;
  error?: string;
}

export interface ExtraIsEnoughState {
  capacity: string;
  isEnough: boolean;
}

type CreateUserParamsType = {
  did?: string
  createdTx?: ccc.Transaction
  createdSignKeyPriv?: string
}

const initialCapacity = 455
const SEND_TRANSACTION_ERR_MESSAGE = 'SendTransaction Error'

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
      await deleteErrUser(did, walletAddress, signKey)
      return
    } else {
      logger.error('preIndexAction 发生未知错误:', err)
      return
    }
  }

  if (!preLogin || !preLogin.data || !preLogin.data.message) return

  // 确保私钥格式正确
  const signKeyStr = typeof signKey === 'string' ? signKey : String(signKey);
  const cleanSignKey = signKeyStr.startsWith('0x') ? signKeyStr.slice(2) : signKeyStr;

  const keyPair = await Secp256k1Keypair.import(cleanSignKey)
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    logger.error('登录失败:', err);
    // alert('登录失败')
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

  // 确保私钥格式正确
  const signKeyStr = typeof signKey === 'string' ? signKey : String(signKey);
  const cleanSignKey = signKeyStr.startsWith('0x') ? signKeyStr.slice(2) : signKeyStr;

  const keyPair = await Secp256k1Keypair.import(cleanSignKey)
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
}

// 完整的创建账户 Hook
export default function useCreateAccount({ createSuccess }: {
  createSuccess?: () => void
}) {
  const { storageUserInfo, resetUserStore } = useUserInfoStore()
  const { signer, walletClient } = useWallet()

  const [extraIsEnough, setExtraIsEnough] = useState<ExtraIsEnoughState>({
    capacity: initialCapacity.toString(),
    isEnough: false
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [createStatus, setCreateStatus] = useState<CreateAccountStatus>({
    status: CREATE_STATUS.INIT
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const createUserParamsRef = useRef<CreateUserParamsType>({
    did: undefined,
    createdTx: undefined,
    createdSignKeyPriv: undefined
  })

  const changeParams = (obj: CreateUserParamsType) => {
    createUserParamsRef.current = { ...createUserParamsRef.current, ...obj }
  }

  // 判断CKB是否足够
  const validateIsEnough = async (userHandle: string) => {
    if (!signer) return false

    // 将 userHandle 转换为全小写
    const normalizedHandle = userHandle.toLowerCase()

    try {
      const fromAddress = await signer.getAddresses()

      const keyPair = await Secp256k1Keypair.create({
        exportable: true
      })
      const signKeyPriv = await keyPair.export()

      // 确保私钥是Uint8Array格式
      let privateKeyBytes: Uint8Array;
      if (signKeyPriv instanceof Uint8Array) {
        privateKeyBytes = signKeyPriv;
      } else if (typeof signKeyPriv === 'string') {
        // 如果是字符串，转换为Uint8Array
        const hexStr = signKeyPriv as string;
        const cleanHex = hexStr.startsWith('0x') ? hexStr.slice(2) : hexStr;
        privateKeyBytes = new Uint8Array(cleanHex.match(/.{2}/g)?.map((byte: string) => parseInt(byte, 16)) || []);
      } else {
        throw new Error('私钥格式不正确');
      }

      const strSignKeyPriv = ccc.hexFrom(privateKeyBytes)
      const signingKey = keyPair.did()

      const diDoc = {
        verificationMethods: {
          atproto: signingKey,
        },
        alsoKnownAs: [`at://${normalizedHandle}`],
        services: {
          atproto_pds: {
            type: 'AtprotoPersonalDataServer',
            endpoint: getPDSClient().serviceUrl.origin,
          },
        },
      }


      const cborEncoded = cbor.encode(diDoc);
      const didWeb5Data0 = DidWeb5Data.from({
        type: "DidWeb5DataV1",
        value: {
          document: cborEncoded,
          localId: null,
        },
      })
      const didWeb5Data0Str = hexFrom(didWeb5Data0.toBytes())

      const { script: lock } = await ccc.Address.fromString(
        fromAddress[0],
        signer.client as never,
      )

      // 移除 outputDataLenRange 限制，允许查找所有可用 cell
      // 将 limit 设为 undefined 以查找所有符合条件的 cell
      let cell = null
      const cells = []
      for await (const c of signer.findCells(
        {
          scriptLenRange: [0, 1],
          // 移除 outputDataLenRange 限制条件
        },
        true,
        'desc',
        undefined,
      )) {
        cells.push(c)
        // 只取第一个 cell 作为输入（其他 cell 会通过 completeInputsByCapacity 自动聚合）
        if (!cell) {
          cell = c
        }
      }

      logger.log('📊 找到的 cells 数量:', cells.length)

      if (!cell) {
        startPolling(normalizedHandle)
        return false
      }

      const input = ccc.CellInput.from({ previousOutput: cell.outPoint })

      const args = ccc.hashCkb(
        ccc.bytesConcat(input.toBytes(), ccc.numLeToBytes(0, 8)),
      )

      const type = new Script(tokenConfig.codeHash, tokenConfig.hashType, args)



      const tx = ccc.Transaction.from({
        inputs: [{ previousOutput: input.previousOutput }],
        outputs: [{ lock, type }],
        outputsData: [didWeb5Data0Str],
      })

      await tx.addCellDepInfos(signer.client as unknown as never, tokenConfig.cellDeps as never)

      try {
        await tx.completeInputsByCapacity(signer as unknown as never)
        setExtraIsEnough({ capacity: "0", isEnough: true })
      } catch {
        const expectedCapacity = fixedPointToString(tx.getOutputsCapacity() + numFrom(0))
        setExtraIsEnough({ capacity: expectedCapacity, isEnough: false })
        startPolling(normalizedHandle)
        return false
      }

      // 使用指定的 feeRate 完成交易费用计算
      await tx.completeFeeBy(signer as unknown as never, DEFAULT_FEE_RATE)

      const preDid = base32.encode(hexToUint8Array(args.slice(2, 42))).toLowerCase()
      changeParams({
        createdTx: tx,
        did: `did:ckb:${preDid}`,
        createdSignKeyPriv: strSignKeyPriv
      })

      return true
    } catch (error) {
      logger.error('验证余额时发生错误:')
      return false
    }
  }

  // 启动轮询
  const startPolling = (userHandle: string) => {
    if (intervalRef.current) return

    intervalRef.current = setInterval(async () => {
      await validateIsEnough(userHandle)
    }, 10000);
  };

  // 停止轮询
  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const prepareAccount = async (userHandle: string, address: string) => {
    setCreateLoading(true)

    // 将 userHandle 转换为全小写
    const normalizedHandle = userHandle.toLowerCase()

    const signKey = createUserParamsRef.current.createdSignKeyPriv

    // 检查私钥是否存在且格式正确
    if (!signKey) {
      throw new Error('私钥未生成，请重新验证余额');
    }

    // 确保私钥是字符串格式
    const signKeyStr = typeof signKey === 'string' ? signKey : String(signKey);

    // 移除0x前缀并确保是有效的十六进制字符串
    const cleanSignKey = signKeyStr.startsWith('0x') ? signKeyStr.slice(2) : signKeyStr;

    const keyPair = await Secp256k1Keypair.import(cleanSignKey)
    const signingKey = keyPair.did()

    let txHash;
    const createdTx = createUserParamsRef.current.createdTx

    try {
      // 1. 先发送上链交易
      txHash = await signer?.sendTransaction(createdTx! as unknown as never)
    } catch (error) {
      logger.error('发送交易失败:', error);
      throw new Error(SEND_TRANSACTION_ERR_MESSAGE);
    }

    if (!txHash) return
    logger.log('txHash received', { txHash })

    let pdsAccountDid: string | undefined;

    try {
      // 2. 调用 preCreateAccount
      const res = await getPDSClient().fans.web5.ckb.preCreateAccount({
        handle: normalizedHandle,
        signingKey,
        did: createUserParamsRef.current.did || '',
      })

      const preCreateResult = res.data
      pdsAccountDid = preCreateResult.did;

      // 将十六进制字符串转换为Uint8Array用于签名
      const encoded = hexToUint8Array(preCreateResult.unSignBytes);

      // 手动签名commit
      const sig = await keyPair.sign(encoded)

      // 3. 调用 web5CreateAccount 提交到 PDS
      const createParams: FansWeb5CkbCreateAccount.InputSchema = {
        handle: normalizedHandle!,
        password: signKey,
        signingKey,
        ckbAddr: address,
        root: {
          did: preCreateResult.did,
          version: 3,
          rev: preCreateResult.rev,
          prev: preCreateResult.prev,
          data: preCreateResult.data,
          signedBytes: uint8ArrayToHex(sig),
        },
      }

      const createRes = await getPDSClient().web5CreateAccount(createParams)
      const userInfo = createRes.data

      // 4. 保存用户信息
      storageUserInfo({
        signKey,
        ckbAddr: address,
        userInfo
      })
    } catch (error) {
      // PDS 操作失败，但上链交易已发送
      // 这里暂时不做处理，让用户重新尝试
      logger.error('PDS 操作失败:', error);
      throw error;
    }

    // 5. 等待交易确认
    const txRes = await walletClient?.waitTransaction(txHash, 0, 60000 * 2)

    if (txRes?.status !== 'committed') {
      // 只有当 PDS 账户创建成功后，上链交易失败时才需要删除
      if (pdsAccountDid) {
        await deleteErrUser(pdsAccountDid, address, signKey!)
      }
    }

    setCreateLoading(false)

    // 注册成功 - 交易已确认上链
    logger.log('🎉 注册成功！交易已确认上链');
    logger.log('📊 交易详情:', {
      txHash,
      txRes,
      userHandle: normalizedHandle,
      address,
      did: pdsAccountDid
    });

    createSuccess?.()
    setCreateStatus({
      status: CREATE_STATUS.SUCCESS,
      reason: undefined
    })
  }

  const createAccount = async (
    signer: ccc.Signer,
    walletClient: ccc.Client,
    userHandle: string,
    address: string
  ) => {
    stopPolling()

    try {
      // 确保私钥已生成，如果没有则重新验证余额
      if (!createUserParamsRef.current.createdSignKeyPriv) {
        setCreateLoading(true)
        const flag = await validateIsEnough(userHandle)
        if (!flag) {
          setCreateLoading(false)
          return
        }
      }

      await prepareAccount(userHandle, address)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      logger.error('创建账户过程中发生错误:', err)

      // 只有当 PDS 账户已创建成功但上链交易失败时才需要删除
      // 这里我们不再删除，因为在 prepareAccount 中已经处理了

      resetUserStore()

      setCreateLoading(false)
      setCreateStatus({
        status: CREATE_STATUS.FAILURE,
        reason: errorMessage
      })
      changeParams({
        did: undefined,
        createdTx: undefined,
        createdSignKeyPriv: undefined,
      })
    }
  }



  useEffect(() => {
    stopPolling();
    setCreateStatus({
      status: CREATE_STATUS.INIT,
      reason: undefined
    })
    setExtraIsEnough({ capacity: initialCapacity.toString(), isEnough: false })
  }, []);

  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, []);

  return {
    extraIsEnough,
    createAccount,
    loading: createLoading,
    createStatus,
    resetCreateStatus: () => {
      setCreateStatus(prev => ({
        ...prev,
        status: CREATE_STATUS.INIT
      }))
    }
  }
}
