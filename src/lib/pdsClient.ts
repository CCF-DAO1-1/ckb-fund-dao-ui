import { AtpAgent } from "web5-api";
import { PDS_API_URL } from "@/constant/Network";

let agent: AtpAgent

export default function getPDSClient() {
  if (!agent) {
    agent = new AtpAgent({ service: PDS_API_URL });
  }
  return agent;
}

/**
 * 动态设置 PDS 客户端服务地址
 * 用于跨 PDS 登录场景
 * @param service PDS 服务地址
 */
export function setPDSClient(service: string) {
  agent = new AtpAgent({ service });
}