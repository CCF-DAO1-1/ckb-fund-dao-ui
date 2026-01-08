/**
 * 任务相关API接口定义
 */
import defineAPI from "./defineAPI";

// 任务列表查询参数类型
export interface TaskListParams {
  did: string; // 用户 DID
  page?: number; // 页码，从1开始
  per_page?: number; // 每页数量
}

// 提案信息类型（从 target 字段中获取）
export interface ProposalTarget {
  cid: string;
  like_count: number;
  liked: boolean;
  receiver_addr: string | null;
  record: {
    $type: string;
    created: string;
    data: {
      background: string;
      budget: string;
      goals: string;
      milestones: unknown[];
      proposalType: string;
      releaseDate: string;
      team: string;
      title: string;
      [key: string]: unknown;
    };
  };
  repo: string;
  state: number;
  updated: string;
  uri: string;
}

// 任务项类型（根据实际后端返回数据结构）
export interface TaskItem {
  id: number; // 任务ID
  task_type: number; // 任务类型（数组下标：0=Default, 1=CreateAMA, 2=SubmitAMAReport, 3=InitiationVote等）
  message: string; // 任务消息描述
  state: number; // 任务状态
  created: string; // 创建时间 (ISO 8601)
  updated: string; // 更新时间 (ISO 8601)
  deadline: string; // 截止时间 (ISO 8601)
  target: ProposalTarget; // 提案信息
  operators: string[]; // 操作者 DID 列表
  processor: string | null; // 处理者
}

// 任务列表响应类型
export interface TaskListResponse {
  tasks: TaskItem[];
  total?: number; // 总数量
  page?: number; // 当前页码
  per_page?: number; // 每页数量
  total_pages?: number; // 总页数
}

/**
 * 获取任务列表
 * GET /api/task
 */
export const getTaskList = defineAPI<
  TaskListParams,
  TaskListResponse
>(
  "/task",
  "GET",
  {
    divider: {
      query: ["did", "page", "per_page"], // 作为查询参数
    },
  }
);

// 拨款参数类型
export interface SendFundsParams {
  did: string; // 用户DID
  params: {
    amount: string; // 拨款金额
    proposal_uri: string; // 提案URI
    timestamp: number; // 时间戳
  };
  signed_bytes: string; // 签名字节（顶层）
  signing_key_did: string; // 签名密钥DID（顶层）
}

// 拨款响应类型
export interface SendFundsResponse {
  success: boolean;
  [key: string]: unknown;
}

/**
 * 拨款
 * POST /api/task/send_funds
 */
export const sendFunds = defineAPI<
  SendFundsParams,
  SendFundsResponse
>(
  "/task/send_funds",
  "POST",
  {
    divider: {
      body: ["did", "params", "signed_bytes", "signing_key_did"],
    },
  }
);

// 创建会议参数类型
export interface CreateMeetingParams {
  did: string; // 用户DID
  params: {
    proposal_uri: string; // 提案URI
    start_time: string; // 会议开始时间（ISO 8601格式）
    url: string; // 会议链接
    title: string; // 会议标题
    description: string; // 会议描述
    timestamp: number; // 时间戳
  };
  signed_bytes: string; // 签名字节（顶层）
  signing_key_did: string; // 签名密钥DID（顶层）
}

// 创建会议响应类型
export interface CreateMeetingResponse {
  success: boolean;
  [key: string]: unknown;
}

/**
 * 创建会议（组织AMA）
 * POST /api/task/create_meeting
 */
export const createMeeting = defineAPI<
  CreateMeetingParams,
  CreateMeetingResponse
>(
  "/task/create_meeting",
  "POST",
  {
    divider: {
      body: ["did", "params", "signed_bytes", "signing_key_did"],
    },
  }
);

// 提交AMA报告参数类型
export interface SubmitMeetingReportParams {
  did: string; // 用户DID
  params: {
    proposal_uri: string; // 提案URI
    meeting_id?: number; // 会议ID（可选）
    report?: string; // 报告内容（可选）
    timestamp: number; // 时间戳
  };
  signed_bytes: string; // 签名字节（顶层）
  signing_key_did: string; // 签名密钥DID（顶层）
}

// 提交AMA报告响应类型
export interface SubmitMeetingReportResponse {
  success: boolean;
  [key: string]: unknown;
}

/**
 * 提交AMA报告
 * POST /api/task/submit_meeting_report
 */
export const submitMeetingReport = defineAPI<
  SubmitMeetingReportParams,
  SubmitMeetingReportResponse
>(
  "/task/submit_meeting_report",
  "POST",
  {
    divider: {
      body: ["did", "params", "signed_bytes", "signing_key_did"],
    },
  }
);

// 提交延期报告参数类型
export interface SubmitDelayReportParams {
  did: string; // 用户DID
  params: {
    proposal_uri: string; // 提案URI
    delay_reason?: string; // 延期原因（可选）
    delay_duration?: number; // 延期时长（天数，可选）
    timestamp: number; // 时间戳
  };
  signed_bytes: string; // 签名字节（顶层）
  signing_key_did: string; // 签名密钥DID（顶层）
}

// 提交延期报告响应类型
export interface SubmitDelayReportResponse {
  success: boolean;
  [key: string]: unknown;
}

/**
 * 提交延期报告
 * POST /api/task/submit_delay_report
 */
export const submitDelayReport = defineAPI<
  SubmitDelayReportParams,
  SubmitDelayReportResponse
>(
  "/task/submit_delay_report",
  "POST",
  {
    divider: {
      body: ["did", "params", "signed_bytes", "signing_key_did"],
    },
  }
);

// 会议项类型
export interface MeetingItem {
  id: string | number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  url: string;
  proposal_uri?: string;
  creater?: string;
  location?: string;
  report?: unknown;
  state?: number;
  created?: string;
  updated?: string;
  [key: string]: unknown;
}

// 会议列表响应类型（requestAPI 会自动解包 response.data.data）
export type MeetingListResponse = MeetingItem[];

// 获取会议列表参数类型
export interface GetMeetingListParams {
  proposal?: string; // 提案URI，可选，用于过滤特定提案的会议
}

/**
 * 获取会议列表
 * GET /api/meeting
 */
export const getMeetingList = defineAPI<
  GetMeetingListParams,
  MeetingListResponse
>(
  "/meeting",
  "GET",
  {
    divider: {
      query: ["proposal"],
    },
  }
);
