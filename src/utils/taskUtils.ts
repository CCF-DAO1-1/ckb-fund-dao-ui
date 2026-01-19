/**
 * 任务类型相关工具函数
 */

// 任务类型枚举（数组下标对应 task_type）
// 0: Default (默认)
// 1: CreateAMA (组织AMA)
// 2: SubmitAMAReport (提交AMA报告)
// 3: InitiationVote (立项投票)
// 4: UpdateReceiverAddr (更新接收地址)
// 5: SendInitialFund (发送启动资金)
// 6: SubmitMilestoneReport (提交里程碑报告)
// 7: SubmitDelayReport (提交延期报告)
// 8: SendMilestoneFund (发送里程碑资金)
// 9: SubmitAcceptanceReport (提交验收报告)
// 10: CreateReexamineMeeting (创建复核会议)
// 11: ReexamineVote (复核投票)
// 12: RectificationVote (整改投票)
// 13: SubmitRectificationReport (提交整改报告)
// 14: SubmitReexamineReport (提交复核报告)
export enum TaskType {
  DEFAULT = 0,                    // 默认
  CREATE_AMA = 1,                // 组织AMA
  SUBMIT_AMA_REPORT = 2,         // 提交AMA报告
  INITIATION_VOTE = 3,           // 立项投票
  UPDATE_RECEIVER_ADDR = 4,      // 更新接收地址
  SEND_INITIAL_FUND = 5,         // 发送启动资金
  SUBMIT_MILESTONE_REPORT = 6,   // 提交里程碑报告
  SUBMIT_DELAY_REPORT = 7,       // 提交延期报告
  SEND_MILESTONE_FUND = 8,       // 发送里程碑资金
  SUBMIT_ACCEPTANCE_REPORT = 9,  // 提交验收报告
  CREATE_REEXAMINE_MEETING = 10, // 创建复核会议
  REEXAMINE_VOTE = 11,           // 复核投票
  RECTIFICATION_VOTE = 12,       // 整改投票
  RECTIFICATION = 13,       // 整改
  SUBMIT_REEXAMINE_REPORT = 14,  // 提交复核报告
}

// 任务类型数字映射到翻译键
// task_type 数组下标 -> 翻译键
export const TASK_TYPE_MAP: Record<number, string> = {
  [TaskType.DEFAULT]: 'organizeMeeting',                    // Default -> 默认使用组织会议
  [TaskType.CREATE_AMA]: 'organizeAMA',                    // CreateAMA
  [TaskType.SUBMIT_AMA_REPORT]: 'publishMinutes',          // SubmitAMAReport
  [TaskType.INITIATION_VOTE]: 'initiationVote',             // InitiationVote
  [TaskType.UPDATE_RECEIVER_ADDR]: 'milestoneAllocation',  // UpdateReceiverAddr
  [TaskType.SEND_INITIAL_FUND]: 'milestoneAllocation',     // SendInitialFund
  [TaskType.SUBMIT_MILESTONE_REPORT]: 'publishReport',     // SubmitMilestoneReport
  [TaskType.SUBMIT_DELAY_REPORT]: 'publishReport',         // SubmitDelayReport
  [TaskType.SEND_MILESTONE_FUND]: 'milestoneAllocation',   // SendMilestoneFund
  [TaskType.SUBMIT_ACCEPTANCE_REPORT]: 'milestoneVerification', // SubmitAcceptanceReport
  [TaskType.CREATE_REEXAMINE_MEETING]: 'organizeMeeting',  // CreateReexamineMeeting
  [TaskType.REEXAMINE_VOTE]: 'reexamineVote',              // ReexamineVote
  [TaskType.RECTIFICATION_VOTE]: 'rectificationVote',      // RectificationVote
  [TaskType.RECTIFICATION]: 'submitRectificationReport', // Rectification -> use submit report key for now
  [TaskType.SUBMIT_REEXAMINE_REPORT]: 'submitReexamineReport',    // SubmitReexamineReport
};

/**
 * 根据 task_type 数字值获取任务类型翻译键
 * @param taskType task_type 数字值（数组下标）
 * @returns 翻译键
 */
export const getTaskTypeTranslationKey = (taskType: number): string => {
  const translationKey = TASK_TYPE_MAP[taskType];
  if (translationKey) {
    return `taskTypes.${translationKey}`;
  }
  // 如果找不到映射，返回默认值
  return 'taskTypes.organizeMeeting';
};

/**
 * 根据 task_type 数字值获取任务类型翻译文本
 * @param taskType task_type 数字值（数组下标）
 * @param t 翻译函数
 * @returns 翻译后的文本
 */
export const getTaskTypeText = (
  taskType: number,
  t: (key: string) => string
): string => {
  const translationKey = getTaskTypeTranslationKey(taskType);
  return t(translationKey);
};

