// 时间线事件类型（与后端接口一致，基于数组下标）
// 0: Default
// 1: CreateAMA
// 2: SubmitAMAReport
// 3: InitiationVote
// 4: UpdateReceiverAddr
// 5: SendInitialFund
// 6: SubmitMilestoneReport
// 7: SubmitDelayReport
// 8: SendMilestoneFund
// 9: SubmitAcceptanceReport
// 10: CreateReexamineMeeting
// 11: ReexamineVote
// 12: RectificationVote
// 13: SubmitRectificationReport
export enum TimelineEventType {
  DEFAULT = 0,                        // 默认
  PROPOSAL_CREATED = 1,               // 提案创建
  PROPOSAL_EDITED = 2,                // 提案编辑
  INITIATION_VOTE = 3,                // 立项投票
  UPDATE_RECEIVER_ADDR = 4,           // 更新收款地址
  VOTE_FINISHED = 5,                  // 投票结束
  SEND_INITIAL_FUND = 6,              // 发送启动资金
  SUBMIT_MILESTONE_REPORT = 7,        // 提交里程碑报告
  SUBMIT_DELAY_REPORT = 8,            // 提交延期报告
  MILESTONE_VOTE = 9,                 // 里程碑投票
  DELAY_VOTE = 10,                    // 延期投票
  SEND_MILESTONE_FUND = 11,           // 发送里程碑资金
  REVIEW_VOTE = 12,                   // 复审投票
  REEXAMINE_VOTE = 13,                // 复核投票 (原 CreateReexamineMeeting 对应位置似乎变了，根据用户列表 ReexamineVote 是 13)
  ACCEPTANCE_VOTE = 14,               // 验收投票
  RECTIFICATION_VOTE = 15,            // 整改投票
  SUBMIT_ACCEPTANCE_REPORT = 16,      // 提交验收报告
  CREATE_AMA = 17,                    // 创建 AMA
  SUBMIT_AMA_REPORT = 18              // 提交 AMA 报告
}

// 时间线事件状态
export enum TimelineEventStatus {
  PENDING = 'pending',     // 待处理
  IN_PROGRESS = 'in_progress', // 进行中
  COMPLETED = 'completed', // 已完成
  CANCELLED = 'cancelled'  // 已取消
}

// 时间线事件接口
export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  status: TimelineEventStatus;
  title: string;
  description?: string;
  date: string;
  icon?: string;
  isImportant?: boolean; // 是否为重要事件
  message?: string; // 事件消息
}

// 时间线组件 Props
export interface ProposalTimelineProps {
  proposalUri: string | null;
  className?: string;
}
