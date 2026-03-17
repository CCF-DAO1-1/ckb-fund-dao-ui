"use client";

import { ccc } from "@ckb-ccc/ccc";
import { ccc as cccReact } from "@ckb-ccc/connector-react";
import { JoyId } from "@ckb-ccc/joy-id";
import { CSSProperties } from "react";
import React, { useEffect, useMemo } from "react";
import { WalletProvider } from "@/provider/WalletProvider";
import useUserInfoStore from "@/store/userInfo";
import { IS_MAINNET } from "@/constant/Network";

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const { initialize, initialized } = useUserInfoStore();

  const defaultClient = React.useMemo(() => {
    return IS_MAINNET
      ? new ccc.ClientPublicMainnet()
      : new ccc.ClientPublicTestnet();
  }, []);

  const signersController = React.useMemo(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    return new ccc.SignersController(
      JoyId.getJoyIdSigners(
        defaultClient as unknown as ccc.Client,
        "CKB Fund DAO",
        undefined,
        IS_MAINNET ? ["mainnet"] : ["testnet"]
      )
    );
  }, [defaultClient]);

  // 初始化用户信息store（使用 useRef 避免依赖 initialize 函数引用变化）
  const initRef = React.useRef(false);

  useEffect(() => {
    if (!initialized && !initRef.current) {
      initRef.current = true;
      initialize();
    }
  }, [initialized]); // 只依赖 initialized，不依赖 initialize 函数

  return (
    <cccReact.Provider
      connectorProps={{
        style: {
          //   "--background": "#00CC9B",
          //   "--divider": "rgba(255, 255, 255, 0.1)",
          //   "--btn-primary": "#2D2F2F",
          //   "--btn-primary-hover": "#515151",
          //   "--btn-secondary": "#2D2F2F",
          //   "--btn-secondary-hover": "#515151",
          //   "--icon-primary": "#000000",
          //   "--icon-secondary": "rgba(255, 255, 255, 0.6)",
          //   color: "#000000",
          //   "--tip-color": "#666",
        } as CSSProperties,
      }}
      defaultClient={defaultClient}
      signersController={signersController}
      clientOptions={
        IS_MAINNET
          ? [
            {
              name: "CKB Mainnet",
              client: new ccc.ClientPublicMainnet(),
            },
          ]
          : [
            {
              name: "CKB Testnet",
              client: new ccc.ClientPublicTestnet(),
            },
          ]
      }
    >
      <WalletProvider>
        {children}
      </WalletProvider>
    </cccReact.Provider >
  );
}
