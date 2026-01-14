"use client";

import { ccc } from "@ckb-ccc/core";
import { NETWORK } from "@/constant/Network";
import { logger } from "@/lib/logger";

const TESTNET_RPC_URL = "https://testnet.ckb.dev";
const MAINNET_RPC_URL = "https://mainnet.ckb.dev";

// 获取 RPC URL
export const getRpcUrl = () => {
    return NETWORK === 'mainnet' ? MAINNET_RPC_URL : TESTNET_RPC_URL;
};

// 获取 CKB Client
export const getCkbClient = () => {
    return new ccc.ClientPublicTestnet({ url: getRpcUrl() });
};

/**
 * 获取指定地址的余额 (单位: CKB)
 * @param address CKB 地址
 * @returns 余额 (CKB)
 */
export const getAddressBalance = async (address: string): Promise<number> => {
    if (!address) return 0;

    try {
        const client = getCkbClient();
        // 使用 ccc 获取余额
        // 注意: ccc.Client.getBalance 可能需要 Script，这里我们先尝试通过 client 获取
        // 如果 client.getBalance 不可用，我们可能需要构造 Script

        // ccc 的 getBalance 通常需要 script
        const { script } = await ccc.Address.fromString(address, client);

        // 获取 cells 并求和
        let totalCapacity = BigInt(0);

        for await (const cell of client.findCells({
            script,
            scriptType: "lock",
            scriptSearchMode: "exact"
        })) {
            totalCapacity += cell.cellOutput.capacity;
        }

        return Number(totalCapacity) / 10 ** 8;
    } catch (error) {
        logger.error(`Failed to get balance for address ${address}:`, error);
        return 0;
    }
};
