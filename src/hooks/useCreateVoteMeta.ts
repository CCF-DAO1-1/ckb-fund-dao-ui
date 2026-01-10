"use client";

import { useState, useCallback } from "react";
import { initiationVote, InitiationVoteParams, InitiationVoteResponse, updateMetaTxHash } from "@/server/proposal";
import useUserInfoStore from "@/store/userInfo";
import * as cbor from '@ipld/dag-cbor';
import { uint8ArrayToHex } from "@/lib/dag-cbor";
import storage from "@/lib/storage";
import { Secp256k1Keypair } from "@atproto/crypto";
import { useTranslation } from "@/utils/i18n";
import { ccc } from "@ckb-ccc/core";

/**
 * 发起立项投票的 Hook
 * 提供提交立项投票到 /api/proposal/initiation_vote 接口的功能
 */
export function useCreateVoteMeta() {
  const { userInfo } = useUserInfoStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  // 为 initiation_vote 生成 signed_bytes
  const generateInitiationVoteSignedBytes = useCallback(async (params: {
    proposal_uri: string;
    timestamp: number;
  }) => {
    try {
      // 1. 将params对象用cbor.encode编码
      const unsignedCommit = cbor.encode(params);
      // 2. 从storage获取signKey并创建keyPair
      const storageInfo = storage.getToken();
      if (!storageInfo?.signKey) {
        throw new Error(t("taskModal.errors.userNotLoggedIn"));
      }

      const keyPair = await Secp256k1Keypair.import(storageInfo?.signKey?.slice(2));

      // 3. 用keyPair.sign签名
      const signature = await keyPair.sign(unsignedCommit);

      // 4. 转换为hex字符串
      const signedBytes = uint8ArrayToHex(signature);

      return signedBytes;
    } catch (error) {
      console.error("生成立项投票签名字节失败:", error);
      throw new Error(t("taskModal.errors.signatureFailed"));
    }
  }, [t]);

  // 为 update_meta_tx_hash 生成 signed_bytes
  const generateUpdateMetaTxHashSignedBytes = useCallback(async (params: {
    id: number;
    tx_hash: string;
    timestamp: number;
  }) => {
    try {
      // 1. 将params对象用cbor.encode编码
      const unsignedCommit = cbor.encode(params);
      // 2. 从storage获取signKey并创建keyPair
      const storageInfo = storage.getToken();
      if (!storageInfo?.signKey) {
        throw new Error(t("taskModal.errors.userNotLoggedIn"));
      }

      const keyPair = await Secp256k1Keypair.import(storageInfo?.signKey?.slice(2));

      // 3. 用keyPair.sign签名
      const signature = await keyPair.sign(unsignedCommit);

      // 4. 转换为hex字符串
      const signedBytes = uint8ArrayToHex(signature);

      return signedBytes;
    } catch (error) {
      console.error("生成更新交易哈希签名字节失败:", error);
      throw new Error(t("taskModal.errors.signatureFailed"));
    }
  }, [t]);

  // 创建投票元数据（发起立项投票）
  const createVoteMetaData = useCallback(async (params: {
    proposalUri: string;
    proposalState: number; // 提案状态
    signedBytes?: string;
    signingKeyDid?: string;
  }) => {
    if (!userInfo?.did) {
      setError(t("taskModal.errors.userNotLoggedIn"));
      return { success: false, error: t("taskModal.errors.userNotLoggedIn") };
    }

    try {
      setIsLoading(true);
      setError(null);

      // 构建参数对象（只包含 proposal_uri）
      const voteParams = {
        proposal_uri: params.proposalUri,
        timestamp: Math.floor(Date.now() / 1000), // UTC 时间戳（秒）
      };

      // 生成signed_bytes
      const signedBytes = params.signedBytes || await generateInitiationVoteSignedBytes(voteParams);

      // 获取signing_key_did
      const storageInfo = storage.getToken();
      if (!storageInfo?.signKey) {
        throw new Error(t("taskModal.errors.userNotLoggedIn"));
      }
      const keyPair = await Secp256k1Keypair.import(storageInfo.signKey.slice(2));
      const signingKeyDid = keyPair.did();

      const initiationVoteParams: InitiationVoteParams = {
        uri: params.proposalUri, // 路径参数
        state: params.proposalState, // 路径参数
        did: userInfo.did,
        params: voteParams,
        signed_bytes: signedBytes,
        signing_key_did: params.signingKeyDid || signingKeyDid,
      };

      const response = await initiationVote(initiationVoteParams);

      // API 返回格式: {code: 200, data: {...}, message: "OK"}
      // requestAPI 会自动提取 data 字段
      if (response) {
        return {
          success: true,
          data: response,
        };
      } else {
        throw new Error(t("taskModal.errors.createVoteFailed"));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t("taskModal.errors.createVoteFailed");

      // 处理特定的错误类型
      let displayMessage = errorMessage;
      if (errorMessage.includes("not administrator")) {
        displayMessage = t("taskModal.errors.insufficientPermissions");
      } else if (errorMessage.includes("administrator") && errorMessage.includes("does not exist")) {
        displayMessage = t("taskModal.errors.systemError");
      } else if (errorMessage.includes(t("voteMeta.userSignKeyNotExists"))) {
        displayMessage = t("taskModal.errors.userNotLoggedIn");
      } else if (errorMessage.includes(t("voteMeta.signatureGenerationFailed"))) {
        displayMessage = t("taskModal.errors.signatureFailed");
      }

      setError(displayMessage);
      console.error(t("voteMeta.createVoteMetaError"), error);
      return { success: false, error: displayMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userInfo?.did, generateInitiationVoteSignedBytes, t]);

  // 为社区审议中的提案创建投票
  const createReviewVote = useCallback(async (proposalUri: string, proposalState: number = 1) => {
    return createVoteMetaData({
      proposalUri,
      proposalState, // 默认使用 REVIEW 状态 (1)
    });
  }, [createVoteMetaData]);

  // 根据 API 返回的 outputsData 组装并发送交易
  // 参照: https://github.com/web5fans/web5-components/blob/dev/vote/create-vote-meta/src/index.ts
  // 和 https://github.com/web5fans/web5-components/blob/dev/vote/create-vote-meta/src/molecules.ts
  const buildAndSendTransaction = useCallback(async (
    response: InitiationVoteResponse | { outputsData?: string[]; vote_meta?: unknown },
    signer: ccc.Signer | null | undefined | unknown
  ) => {
    if (!signer) {
      throw new Error(t("wallet.signerNotConnected"));
    }

    // 类型断言以确保 signer 是正确的类型
    const typedSigner = signer as ccc.Signer;

    try {
      // 获取钱包地址
      const addresses = await typedSigner.getAddresses();
      if (!addresses || addresses.length === 0) {
        throw new Error(t("wallet.cannotGetAddress"));
      }

      const fromAddress = addresses[0];

      // 获取锁定脚本和客户端
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cccClient = (typedSigner as any).client_ || new ccc.ClientPublicTestnet();
      const { script: lock } = await ccc.Address.fromString(fromAddress, cccClient);

      // 解析 outputsData（每个元素是十六进制字符串，代表编码后的输出数据）
      // outputsData 是 molecules 编码的数据，需要与对应的 outputs 配对
      // 根据 web5-components 的结构，outputsData[0] 包含投票元数据的编码
      if (!response.outputsData || response.outputsData.length === 0) {
        throw new Error("响应中缺少 outputsData");
      }
      const outputsData = response.outputsData.map((hexStr: string) => {
        // 确保是 0x 开头的格式
        const hex = hexStr.startsWith('0x') ? hexStr : `0x${hexStr}`;
        return hex;
      });


      const tx = ccc.Transaction.default();

      // 完成输入（至少需要一个输入来支付费用）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tx.completeInputsAtLeastOne(typedSigner as any);

      // 如果 outputsData 不为空，创建对应的输出
      // 注意：这里需要根据实际的投票合约来设置 type script
      // 由于我们没有合约的详细信息，这里使用一个通用结构
      if (outputsData.length > 0) {
        // 创建输出数组
        // 实际使用时，需要根据投票合约来设置 type script
        // 这里假设每个 outputsData 对应一个输出，使用相同的 lock script
        const outputs = outputsData.map(() => ({
          lock,
          // type script 需要根据实际的投票合约来设置
          // 如果 API 没有返回 type script 信息，可能需要从配置或 molecules 解析
        }));

        // 使用 Transaction.from 重新创建包含输出的交易
        // 或者使用现有的方法设置输出
        // 注意：Transaction API 可能不支持直接设置 outputs，需要重新构建
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentInputs = (tx as any).inputs || [];

        // 重新创建交易，包含完整的结构
        const newTx = ccc.Transaction.from({
          inputs: currentInputs,
          outputs: outputs,
          outputsData: outputsData,
        });

        // 如果有 cell deps，需要添加
        // 这里可能需要从投票合约配置中获取
        // await newTx.addCellDepInfos(cccClient, cellDeps);

        // 完成费用计算
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await newTx.completeFeeBy(typedSigner as any);

        // 签名并发送
        await typedSigner.signTransaction(newTx);
        const txHash = await typedSigner.sendTransaction(newTx);

        console.log("投票交易已发送:", txHash);

        // 发送交易后，调用更新交易哈希接口
        const voteMeta = (response as InitiationVoteResponse).vote_meta;
        if (voteMeta?.id && userInfo?.did) {
          try {
            // 生成签名参数
            const updateParams = {
              id: voteMeta.id,
              tx_hash: txHash,
              timestamp: Math.floor(Date.now() / 1000), // UTC 时间戳（秒）
            };

            // 生成 signed_bytes
            const signedBytes = await generateUpdateMetaTxHashSignedBytes(updateParams);

            // 获取 signing_key_did
            const storageInfo = storage.getToken();
            if (!storageInfo?.signKey) {
              throw new Error(t("taskModal.errors.userNotLoggedIn"));
            }
            const keyPair = await Secp256k1Keypair.import(storageInfo.signKey.slice(2));
            const signingKeyDid = keyPair.did();

            // 调用更新接口
            await updateMetaTxHash({
              did: userInfo.did,
              params: updateParams,
              signed_bytes: signedBytes,
              signing_key_did: signingKeyDid,
            });
            console.log("交易哈希已更新到服务器");
          } catch (updateError) {
            console.error("更新交易哈希失败:", updateError);
            // 即使更新失败，也返回成功，因为交易已经发送
          }
        }

        return {
          success: true,
          txHash,
          voteMeta
        };
      } else {
        // 如果没有 outputsData，只完成费用和发送
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tx.completeFeeBy(typedSigner as any);
        await typedSigner.signTransaction(tx);
        const txHash = await typedSigner.sendTransaction(tx);

        // 发送交易后，调用更新交易哈希接口
        const voteMeta = (response as InitiationVoteResponse).vote_meta;
        if (voteMeta?.id && userInfo?.did) {
          try {
            // 生成签名参数
            const updateParams = {
              id: voteMeta.id,
              tx_hash: txHash,
              timestamp: Math.floor(Date.now() / 1000), // UTC 时间戳（秒）
            };

            // 生成 signed_bytes
            const signedBytes = await generateUpdateMetaTxHashSignedBytes(updateParams);

            // 获取 signing_key_did
            const storageInfo = storage.getToken();
            if (!storageInfo?.signKey) {
              throw new Error(t("taskModal.errors.userNotLoggedIn"));
            }
            const keyPair = await Secp256k1Keypair.import(storageInfo.signKey.slice(2));
            const signingKeyDid = keyPair.did();

            // 调用更新接口
            await updateMetaTxHash({
              did: userInfo.did,
              params: updateParams,
              signed_bytes: signedBytes,
              signing_key_did: signingKeyDid,
            });
            console.log("交易哈希已更新到服务器");
          } catch (updateError) {
            console.error("更新交易哈希失败:", updateError);
            // 即使更新失败，也返回成功，因为交易已经发送
          }
        }

        return {
          success: true,
          txHash,
          voteMeta
        };
      }
    } catch (error) {
      console.error("构建或发送交易失败:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`交易构建失败: ${errorMessage}`);
    }
  }, [t, userInfo?.did, generateUpdateMetaTxHashSignedBytes]);

  // 清除错误状态
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createVoteMetaData,
    createReviewVote,
    buildAndSendTransaction,
    isLoading,
    error,
    clearError,
  };
}
