"use client";

import { useState, useCallback } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { logger } from '@/lib/logger';
// import { Secp256k1Keypair } from "@atproto/crypto";
// import * as cbor from "@ipld/dag-cbor";
// import { base32 } from "@scure/base";
// import { hexToUint8Array, uint8ArrayToHex } from "@/lib/dag-cbor";
// import { UnsignedCommit } from "@atproto/repo";
// import { CID } from "multiformats";
// import getPDSClient from "@/lib/pdsClient";

// 类型定义
interface CkbBalanceResult {
  isEnough: boolean;
  expectedCapacity?: string;
  error?: string;
}

interface ExtraIsEnoughState {
  capacity: string;
  isEnough: boolean;
}

interface ChangeParams {
  createdTx?: unknown;
  did?: string;
  createdSignKeyPriv?: string;
}

// Token 配置接口
interface TokenConfig {
  codeHash: string;
  hashType: string;
  cellDeps: unknown[];
}

// 签名器接口（兼容 CKB CCC）
interface Signer {
  getAddresses(): Promise<string[]>;
  getBalance(address: string): Promise<bigint>;
  findCells?(query: unknown, reverse?: boolean, order?: string, limit?: number): AsyncIterable<unknown>;
  client_?: unknown;
}

// 注意：createAccount 相关功能已移至 createAccoute.ts

// 默认的 token 配置（测试网）
const DEFAULT_TOKEN_CONFIG: TokenConfig = {
  codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
  hashType: "type",
  cellDeps: [
    {
      outPoint: {
        txHash: "0x71a7ba8fc96301fe4be6c354fadefc3c3c8e3d1e5c0b0b0b0b0b0b0b0b0b0b0",
        index: "0x0"
      },
      depType: "code"
    }
  ]
};

// CKB 测试网配置
const CKB_TESTNET_CONFIG = {
  rpcUrl: "https://testnet.ckb.dev",
  networkId: "testnet",
  minCapacity: BigInt(355 * 10**8), // 355 CKB in shannons
};

// 工具函数（暂时未使用）
// const hexFrom = (bytes: Uint8Array): string => {
//   return Array.from(bytes)
//     .map(b => b.toString(16).padStart(2, '0'))
//     .join('');
// };

const fixedPointToString = (value: bigint): string => {
  return value.toString();
};

const numFrom = (value: number): bigint => {
  return BigInt(value);
};

// 主要的 CKB 余额检查 Hook
export function useCheckCkb() {
  const [isLoading, setIsLoading] = useState(false);
  const [extraIsEnough, setExtraIsEnough] = useState<ExtraIsEnoughState>({ capacity: "0", isEnough: true });
  const [error, setError] = useState<string | null>(null);
  
  // 注意：createAccount 相关状态已移至 createAccoute.ts

  // 检查 CKB 余额是否充足（简化版本，专注于余额检查）
  const validateIsEnough = useCallback(async (
    signer: Signer,
    userHandle: string,
    tokenConfig: TokenConfig = DEFAULT_TOKEN_CONFIG,
    changeParams?: (params: ChangeParams) => void,
    startPolling?: () => void
  ): Promise<CkbBalanceResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!signer) {
        throw new Error("签名器未连接");
      }

      const fromAddress = await signer.getAddresses();
      if (!fromAddress || fromAddress.length === 0) {
        throw new Error("无法获取钱包地址");
      }

      // 创建密钥对（简化版本）
      // const keyPair = await Secp256k1Keypair.create({
      //   exportable: true
      // });
      // const signKeyPriv = await keyPair.export();
      // const strSignKeyPriv = hexFrom(signKeyPriv);
      // const signingKey = keyPair.did();

      // 创建 DID 文档（简化版本）
      // const diDoc = {
      //   verificationMethods: {
      //     atproto: signingKey,
      //   },
      //   alsoKnownAs: [`at://${userHandle}`],
      //   services: {
      //     atproto_pds: {
      //       type: 'AtprotoPersonalDataServer',
      //       endpoint: getPDSClient().serviceUrl.origin,
      //     },
      //   },
      // };

      // 简化的 DID 数据
      const didWeb5Data0Str = JSON.stringify({ userHandle, timestamp: Date.now() });

      // 获取锁定脚本
      const { script: lock } = await ccc.Address.fromString(
        fromAddress[0],
        signer.client_ as never,
      );

      // 查找可用的 cell
      let cell = null;
      if (signer.findCells) {
        for await (const c of signer.findCells(
          {
            scriptLenRange: [0, 1],
            outputDataLenRange: [0, 1],
          },
          true,
          'desc',
          1,
        )) {
          cell = c;
          break;
        }
      }

      if (!cell) {
        if (startPolling) {
          startPolling();
        }
        setExtraIsEnough({ capacity: "0", isEnough: false });
        return { isEnough: false, error: "未找到可用的 cell" };
      }

      // 创建交易输入
      const input = ccc.CellInput.from({ previousOutput: (cell as { outPoint: never }).outPoint });
      const args = ccc.hashCkb(
        ccc.bytesConcat(input.toBytes(), ccc.numLeToBytes(0, 8)),
      );

      // 创建类型脚本
      const type = new ccc.Script(tokenConfig.codeHash as `0x${string}`, tokenConfig.hashType as "type" | "data", args);

      // 创建交易
      const tx = ccc.Transaction.from({
        inputs: [{ previousOutput: input.previousOutput }],
        outputs: [{ lock, type }],
        outputsData: [didWeb5Data0Str],
      });

      // 添加 cell 依赖
      await tx.addCellDepInfos(signer.client_ as never, tokenConfig.cellDeps as never);

      try {
        // 尝试完成输入容量
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any).completeInputsByCapacity(signer);
        setExtraIsEnough({ capacity: "0", isEnough: true });
        
        // 完成手续费计算
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any).completeFeeBy(signer);

        // 生成简化的 DID（暂时未使用）
        // const preDid = args.slice(2, 42);

        // 调用回调函数更新参数（暂时注释）
        // if (changeParams) {
        //   changeParams({
        //     createdTx: tx,
        //     did: `did:web5:${preDid}`,
        //     createdSignKeyPriv: strSignKeyPriv
        //   });
        // }

        return { isEnough: true };
      } catch (error) {
        // 计算所需容量
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expectedCapacity = fixedPointToString((tx as any).getOutputsCapacity() + numFrom(0));
        setExtraIsEnough({ capacity: expectedCapacity, isEnough: false });
        
        if (startPolling) {
          startPolling();
        }
        
        return { 
          isEnough: false, 
          expectedCapacity,
          error: error instanceof Error ? error.message : "CKB 余额不足"
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "检查 CKB 余额时发生未知错误";
      setError(errorMessage);
      return { 
        isEnough: false, 
        error: errorMessage 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 检查简单余额（不创建交易）
  const checkSimpleBalance = useCallback(async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signerInfo: any, // 使用 CKB CCC 的 signerInfo
    requiredCapacity: bigint = CKB_TESTNET_CONFIG.minCapacity // 使用测试网配置
  ): Promise<CkbBalanceResult> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!signerInfo) {
        throw new Error("签名器未连接");
      }

      // 获取地址 - 使用 CKB CCC 的正确方式
      let fromAddress = "";
      
      // 方法1: 从 signerInfo.signer 获取
      if (signerInfo.signer?.getAddresses) {
        const addresses = await signerInfo.signer.getAddresses();
        fromAddress = addresses?.[0] || "";
      }
      
      // 方法2: 从 signerInfo.signer 属性获取
      if (!fromAddress) {
        fromAddress = signerInfo.signer?.address || signerInfo.signer?.publicKey || "";
      }
      
      // 方法3: 从 signerInfo 直接获取
      if (!fromAddress) {
        fromAddress = signerInfo.address || signerInfo.publicKey || "";
      }

      if (!fromAddress) {
        throw new Error("无法获取钱包地址");
      }

      logger.log("CKB Balance Check (Testnet):", {
        address: fromAddress,
        requiredCapacity: requiredCapacity.toString(),
        requiredCKB: Number(requiredCapacity) / 10**8,
        network: "testnet"
      });

      // 获取地址的余额 - 使用 CKB CCC 的正确方式
      let balance = BigInt(0);
      
      if (signerInfo.signer?.getBalance) {
        balance = await signerInfo.signer.getBalance(fromAddress);
      } else if (signerInfo.getBalance) {
        balance = await signerInfo.getBalance(fromAddress);
      } else {
        // 如果没有 getBalance 方法，尝试通过其他方式获取余额
        logger.warn("无法直接获取余额，使用默认值 0");
        balance = BigInt(0);
      }
      
      logger.log("Balance Check Result:", {
        currentBalance: balance.toString(),
        currentCKB: Number(balance) / 10**8,
        requiredCapacity: requiredCapacity.toString(),
        requiredCKB: Number(requiredCapacity) / 10**8,
        isEnough: balance >= requiredCapacity
      });
      
      if (balance >= requiredCapacity) {
        setExtraIsEnough({ capacity: balance.toString(), isEnough: true });
        return { isEnough: true };
      } else {
        const needed = requiredCapacity - balance;
        setExtraIsEnough({ capacity: needed.toString(), isEnough: false });
        return { 
          isEnough: false, 
          expectedCapacity: needed.toString(),
          error: `余额不足，需要至少 ${Number(requiredCapacity) / 10**8} CKB，当前余额 ${Number(balance) / 10**8} CKB`
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "检查余额时发生错误";
      setError(errorMessage);
      setExtraIsEnough({ capacity: "0", isEnough: false });
      return { 
        isEnough: false, 
        error: errorMessage 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 注意：createAccount 方法已移至 createAccoute.ts

  return {
    validateIsEnough,
    checkSimpleBalance,
    isLoading,
    extraIsEnough,
    error,
    setError
  };
}

// 导出类型
export type { CkbBalanceResult, ExtraIsEnoughState, ChangeParams, TokenConfig, Signer };