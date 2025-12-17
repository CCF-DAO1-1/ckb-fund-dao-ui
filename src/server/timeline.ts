/**
 * 时间线相关API接口定义
 */
import defineAPI from "./defineAPI";

// 获取时间线参数类型
export interface TimelineParams {
  uri: string; // 提案的URI
}

// API 返回的操作者信息
export interface TimelineOperator {
  $type: string;
  ckb_addr?: string;
  created?: string;
  did: string;
  displayName?: string;
  handle?: string;
}

// API 返回的原始时间线事件格式
export interface TimelineEventRaw {
  id: number;
  message: string; // 如 "created"
  operator: TimelineOperator;
  target: string; // 目标URI
  timeline_type: number; // 时间线类型
  timestamp: string; // ISO 8601 格式的时间戳
}

// 时间线响应类型（API 直接返回数组）
export type TimelineResponse = TimelineEventRaw[];

/**
 * 获取提案时间线
 * GET /api/timeline
 */
export const getTimeline = defineAPI<
  TimelineParams,
  TimelineResponse
>(
  "/timeline",
  "GET",
  {
    divider: {
      query: ["uri"], // uri作为查询参数
    },
  }
);

