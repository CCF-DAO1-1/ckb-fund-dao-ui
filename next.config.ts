import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
    ],
  },
  env: {
    // 配置API服务器地址，可以通过环境变量覆盖
    NEXT_PUBLIC_API_ADDRESS: process.env.NEXT_PUBLIC_API_ADDRESS || "https://app.ccfdao.org",
  },
};

export default nextConfig;
