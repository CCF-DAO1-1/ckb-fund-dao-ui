import { withNetwork } from "./Network";
import { HashType, CellDepInfoLike } from "@ckb-ccc/core";

export type TokenConfig = {
  codeHash: `0x${string}`
  hashType: HashType
  cellDeps: (CellDepInfoLike | CellDepInfoLike[])
}

// 交易费率配置（shannons per byte）
// 默认值：1000 shannons per byte
// 可以根据网络拥堵情况调整，值越大交易确认越快，但费用也越高
export const DEFAULT_FEE_RATE = 4000; // shannons per byte


export const tokenConfig: TokenConfig = {
  ...(withNetwork({
    testnet: {
      codeHash:
        '0x510150477b10d6ab551a509b71265f3164e9fd4137fcb5a4322f49f03092c7c5',
      hashType: 'type',
      cellDeps: [
        {
          cellDep: {
            outPoint: {
              txHash:
                '0x1ecbf88d692a14d7cbc0bfd1a3d5019e4b613247ae438bad52f94148c6009559',
              index: 0,
            },
            depType: 'code',
          },
          type: {
            codeHash:
              '0x00000000000000000000000000000000000000000000000000545950455f4944',
            hashType: 'type',
            args: '0x3c27695173b888ed44ddf36f901789014384ad6c05a9137f3db9a0779c141c35',
          },
        },
      ],
    },
    mainnet: {
      codeHash:
        '0x510150477b10d6ab551a509b71265f3164e9fd4137fcb5a4322f49f03092c7c5',
      hashType: 'type',
      cellDeps: [
        {
          cellDep: {
            outPoint: {
              txHash:
                '0x1ecbf88d692a14d7cbc0bfd1a3d5019e4b613247ae438bad52f94148c6009559',
              index: 0,
            },
            depType: 'code',
          },
          type: {
            codeHash:
              '0x00000000000000000000000000000000000000000000000000545950455f4944',
            hashType: 'type',
            args: '0x3c27695173b888ed44ddf36f901789014384ad6c05a9137f3db9a0779c141c35',
          },
        },
      ],
    }
  }))
}

export const votingConfig = {
  ...withNetwork({
    testnet: {
      voteTypeCodeHash: '0xb140de2d7d1536cfdcb82da7520475edce5785dff90edae9073c1143d88f50c5',
      voteContractTxHash: '0x024ec56c1d2ad4940a96edfd5cfd736bdb0c7d7342da9e74d3033872bdb9cbc1',
      depGroupTxHash: '0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37',
    },
    mainnet: {
      voteTypeCodeHash: '0xd8cb3f3b109ab35e51cb0c849f2b66159e376e125c6b701d193a6a636eb3247d',
      voteContractTxHash: '0x024ec56c1d2ad4940a96edfd5cfd736bdb0c7d7342da9e74d3033872bdb9cbc1', // TODO: 待提供真主网 hash
      depGroupTxHash: '0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37', // TODO: 待提供真主网 hash
    }
  })
};