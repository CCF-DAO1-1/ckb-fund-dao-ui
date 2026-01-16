/**
 * 更新投票元数据交易哈希的工具函数
 */

import { updateMetaTxHash } from "@/server/proposal";
import storage from "@/lib/storage";
import { Secp256k1Keypair } from "@atproto/crypto";
import { uint8ArrayToHex } from "@/lib/dag-cbor";
import * as cbor from '@ipld/dag-cbor';
import { logger } from '@/lib/logger';

/**
 * 为 update_meta_tx_hash 生成签名字节
 */
export async function generateUpdateMetaTxHashSignature(params: {
    id: number;
    tx_hash: string;
    timestamp: number;
}): Promise<string> {
    try {
        const unsignedCommit = cbor.encode(params);
        const storageInfo = storage.getToken();

        if (!storageInfo?.signKey) {
            throw new Error("用户未登录或缺少签名密钥");
        }

        const keyPair = await Secp256k1Keypair.import(storageInfo.signKey.slice(2));
        const signature = await keyPair.sign(unsignedCommit);

        return uint8ArrayToHex(signature);
    } catch (error) {
        logger.error("生成更新交易哈希签名失败:", error);
        throw new Error("生成签名失败");
    }
}

/**
 * 更新投票元数据的交易哈希到服务器
 * @param voteMetaId - 投票元数据ID
 * @param txHash - 交易哈希
 * @param userDid - 用户DID
 * @returns 是否成功
 */
export async function updateVoteMetaTxHash(
    voteMetaId: number,
    txHash: string,
    userDid: string
): Promise<{ success: boolean; error?: string }> {
    try {
        logger.log("开始更新交易哈希到服务器...", { voteMetaId, txHash });

        const updateParams = {
            id: voteMetaId,
            tx_hash: txHash,
            timestamp: Math.floor(Date.now() / 1000),
        };

        // 生成签名
        const signedBytes = await generateUpdateMetaTxHashSignature(updateParams);

        // 获取签名密钥DID
        const storageInfo = storage.getToken();
        if (!storageInfo?.signKey) {
            throw new Error("缺少签名密钥");
        }

        const keyPair = await Secp256k1Keypair.import(storageInfo.signKey.slice(2));
        const signingKeyDid = keyPair.did();

        // 调用API
        await updateMetaTxHash({
            did: userDid,
            params: updateParams,
            signed_bytes: signedBytes,
            signing_key_did: signingKeyDid,
        });

        logger.log("✅ 交易哈希已成功更新到服务器");
        return { success: true };

    } catch (error) {
        logger.error("❌ 更新交易哈希失败:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
    }
}
