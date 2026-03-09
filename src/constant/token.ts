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


export const tokenConfig: TokenConfig = withNetwork({
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
      '0x4a06164dc34dccade5afe3e847a97b6db743e79f5477fa3295acf02849c5984a',
    hashType: 'type',
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash:
              '0xe2f74c56cdc610d2b9fe898a96a80118845f5278605d7f9ad535dad69ae015bf',
            index: 0,
          },
          depType: 'code',
        },
        type: {
          codeHash:
            '0x00000000000000000000000000000000000000000000000000545950455f4944',
          hashType: 'type',
          args: '0x55573ef6d78e3ca75170ff476176732309a8b31efe94320a954ded3d75c2cb18',
        },
      },
    ],
  }
});

export const votingConfig = withNetwork({
  testnet: {
    voteTypeCodeHash: '0xb140de2d7d1536cfdcb82da7520475edce5785dff90edae9073c1143d88f50c5',
    voteContractTxHash: '0x024ec56c1d2ad4940a96edfd5cfd736bdb0c7d7342da9e74d3033872bdb9cbc1',
  },
  mainnet: {
    voteTypeCodeHash: '0x38716b429cb139405d32ff86a916827862b2fa819916894848d8460da8953afb',
    voteContractTxHash: '0xd8cb3f3b109ab35e51cb0c849f2b66159e376e125c6b701d193a6a636eb3247d',
  }
});