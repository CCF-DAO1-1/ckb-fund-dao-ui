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
  DEFAULT = 0,                      // 默认
  CREATE_AMA = 1,                   // 创建 AMA 会议
  SUBMIT_AMA_REPORT = 2,            // 提交 AMA 报告
  INITIATION_VOTE = 3,              // 立项投票
  UPDATE_RECEIVER_ADDR = 4,         // 更新收款地址
  SEND_INITIAL_FUND = 5,            // 发送启动资金
  SUBMIT_MILESTONE_REPORT = 6,      // 提交里程碑报告
  SUBMIT_DELAY_REPORT = 7,          // 提交延期报告
  SEND_MILESTONE_FUND = 8,          // 发送里程碑资金
  SUBMIT_ACCEPTANCE_REPORT = 9,     // 提交验收报告
  CREATE_REEXAMINE_MEETING = 10,    // 创建复审会议
  REEXAMINE_VOTE = 11,              // 复审投票
  RECTIFICATION_VOTE = 12,          // 整改投票
  SUBMIT_RECTIFICATION_REPORT = 13, // 提交整改报告
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
}

// 时间线组件 Props
export interface ProposalTimelineProps {
  proposalUri: string | null;
  className?: string;
}
