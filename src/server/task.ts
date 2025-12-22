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
  task_type: number; // 任务类型（数字枚举：1=CreateAMA, 3=InitiationVote等）
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
