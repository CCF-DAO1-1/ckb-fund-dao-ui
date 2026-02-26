// 由于找不到 'next-runtime-env'，改用 process.env 读取环境变量
import { logger } from '@/lib/logger';
export type NETWORK_ENUM = 'testnet' | 'mainnet'

export const NETWORK = ((process.env.NEXT_PUBLIC_CHAIN_NETWORK || '').trim() as NETWORK_ENUM) || 'testnet'
if (!NETWORK) {
  logger.error('env network not detected:', NETWORK);
}

export function withNetwork<T>(config: Record<NETWORK_ENUM, T>) {
  return config[NETWORK]
}

export const IS_TESTNET = NETWORK === 'testnet'

export const IS_MAINNET = NETWORK === 'mainnet'

export const PDS_API_URL = (process.env.NEXT_PUBLIC_PDS_SERVICE as string) || 'https://web5.ccfdao.dev/'

export const USER_DOMAIN = (process.env.NEXT_PUBLIC_USER_DOMAIN as string) || 'web5.ccfdao.dev'

export const DID_PREFIX = 'did:ckb:'

export const DID_INDEXER = (process.env.NEXT_PUBLIC_DID_INDEXER as string) || 'https://did-indexer.bbsfans.dev'
