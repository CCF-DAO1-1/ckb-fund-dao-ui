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