import React from 'react';
import Tag from '@/components/ui/tag/Tag';
import ActionButton from './ActionButton';
import { ProposalItem } from '@/utils/managementCenterUtils';
import { TaskType as TaskTypeEnum } from '@/utils/taskUtils';
import { useTranslation } from '@/utils/i18n';

interface TaskRowProps {
    proposal: ProposalItem;
    onAction: (action: string, proposal: ProposalItem) => void;
}

export default function TaskRow({ proposal, onAction }: TaskRowProps) {
    const { t } = useTranslation();
    const taskType = proposal.task_type;

    // 任务类型判断
    const isUpdateReceiverAddr = taskType === TaskTypeEnum.UPDATE_RECEIVER_ADDR;
    const isSendInitialFund = taskType === TaskTypeEnum.SEND_INITIAL_FUND;
    const isSendMilestoneFund = taskType === TaskTypeEnum.SEND_MILESTONE_FUND;
    const isCreateAMA = taskType === TaskTypeEnum.CREATE_AMA;
    const isSubmitAMAReport = taskType === TaskTypeEnum.SUBMIT_AMA_REPORT;
    const isSubmitMilestoneReport = taskType === TaskTypeEnum.SUBMIT_MILESTONE_REPORT;
    const isSubmitDelayReport = taskType === TaskTypeEnum.SUBMIT_DELAY_REPORT;
    const isSubmitAcceptanceReport = taskType === TaskTypeEnum.SUBMIT_ACCEPTANCE_REPORT;
    const isRectificationVote = taskType === TaskTypeEnum.RECTIFICATION_VOTE;
    const isCreateReexamineMeeting = taskType === TaskTypeEnum.CREATE_REEXAMINE_MEETING;
    const isSubmitReexamineReport = taskType === TaskTypeEnum.SUBMIT_REEXAMINE_REPORT;
    const isSubmitRectificationReport = taskType === TaskTypeEnum.SUBMIT_RECTIFICATION_REPORT;

    return (
        <tr>
            <td>
                <div className="proposal-name" title={proposal.name}>
                    <span className="proposal-name-text">{proposal.name}</span>
                    {proposal.isNew && <span className="new-tag">NEW</span>}
                </div>
            </td>
            <td>{proposal.type}</td>
            <td>
                <Tag status={proposal.status} size="sm" />
            </td>
            <td>{proposal.taskType}</td>
            <td>{proposal.deadline}</td>
            <td>
                <div className="action-buttons">
                    {isRectificationVote && (
                        <ActionButton
                            onClick={() => onAction('createVote', proposal)}
                            label={t("taskTypes.rectificationVote")}
                            className="vote-action-button"
                        />
                    )}

                    {isSubmitRectificationReport && (
                        <ActionButton
                            onClick={() => onAction('submitRectificationReport', proposal)}
                            label={t("taskTypes.submitRectificationReport") || "提交整改报告"}
                            className="submit-rectification-report-button"
                        />
                    )}

                    {isUpdateReceiverAddr && (
                        <ActionButton
                            onClick={() => onAction('updateReceiverAddr', proposal)}
                            label={t("updateReceiverAddr.addButton") || "添加钱包地址"}
                            className="add-addr-button"
                        />
                    )}

                    {(isSendInitialFund || isSendMilestoneFund) && (
                        <ActionButton
                            onClick={() => onAction('sendFunds', proposal)}
                            label={t("sendFunds.button") || "拨款"}
                            className="send-funds-button"
                        />
                    )}

                    {(isCreateAMA || isCreateReexamineMeeting) && (
                        <ActionButton
                            onClick={() => onAction('createMeeting', proposal)}
                            label={t("createMeeting.button") || "组织会议"}
                            className="create-meeting-button"
                        />
                    )}

                    {(isSubmitAMAReport || isSubmitReexamineReport) && (
                        <ActionButton
                            onClick={() => onAction('submitMeetingReport', proposal)}
                            label={t("submitMeetingReport.button") || "提交AMA报告"}
                            className="submit-meeting-report-button"
                        />
                    )}

                    {isSubmitMilestoneReport && (
                        <ActionButton
                            onClick={() => onAction('submitMilestoneReport', proposal)}
                            label={t("submitMilestoneReport.button") || "提交里程碑报告"}
                            className="submit-milestone-report-button"
                        />
                    )}

                    {isSubmitDelayReport && (
                        <ActionButton
                            onClick={() => onAction('submitDelayReport', proposal)}
                            label={t("submitDelayReport.button") || "提交延期报告"}
                            className="submit-delay-report-button"
                        />
                    )}

                    {isSubmitAcceptanceReport && (
                        <ActionButton
                            onClick={() => onAction('submitAcceptanceReport', proposal)}
                            label={t("taskModal.submitAcceptanceReport.title") || "提交验收报告"}
                            className="submit-acceptance-report-button"
                        />
                    )}
                </div>
            </td>
        </tr>
    );
}
