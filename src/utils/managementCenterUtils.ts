import { ProposalStatus } from "@/utils/proposalUtils";
import { TaskItem } from "@/server/task";
import { getTaskTypeText } from "@/utils/taskUtils";
import { logger } from '@/lib/logger';

export interface ProposalItem {
    id: string;
    name: string;
    type: string;
    status: ProposalStatus;
    taskType: string;
    task_type: number;
    deadline: string;
    isNew?: boolean;
    progress?: string;
    uri: string;
    budget?: number;
    message?: string;
}

/**
 * 格式化截止日期
 */
export const formatDeadline = (deadline: string, locale: 'en' | 'zh' = 'en'): string => {
    try {
        const deadlineDate = new Date(deadline);
        const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
        return deadlineDate.toLocaleString(dateLocale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Shanghai'
        }) + ' (UTC+8)';
    } catch (error) {
        logger.error('格式化截止日期失败:');
        return deadline;
    }
};

/**
 * 将任务数据转换为ProposalItem格式
 */
export const adaptTaskData = (
    task: TaskItem,
    t: (key: string) => string,
    locale: 'en' | 'zh' = 'en'
): ProposalItem => {
    const proposal = task.target;
    const proposalType = proposal.record.data.proposalType || '';
    const status = proposal.state as ProposalStatus;
    const title = proposal.record.data.title || '';
    const uri = proposal.uri || '';
    const budget = proposal.record.data.budget ? parseFloat(proposal.record.data.budget) : 0;
    const taskType = getTaskTypeText(task.task_type, t);
    const deadline = formatDeadline(task.deadline, locale);

    return {
        id: task.id.toString(),
        name: title,
        type: proposalType,
        status: status,
        taskType: taskType,
        task_type: task.task_type,
        deadline: deadline,
        isNew: false,
        uri: uri,
        budget: budget,
        message: task.message,
    };
};

/**
 * 标记新任务（创建时间在24小时内的）
 */
export const markNewTasks = (proposals: ProposalItem[], rawTasks: TaskItem[]): ProposalItem[] => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return proposals.map(proposal => {
        const task = rawTasks.find(t => t.id.toString() === proposal.id);
        if (task) {
            const createdDate = new Date(task.created);
            return { ...proposal, isNew: createdDate > oneDayAgo };
        }
        return proposal;
    });
};
