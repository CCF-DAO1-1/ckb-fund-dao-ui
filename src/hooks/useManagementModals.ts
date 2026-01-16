"use client";

import { useState, useCallback } from 'react';
import { ProposalItem } from '@/utils/managementCenterUtils';
import { TaskItem } from '@/server/task';

export interface ModalState {
    isOpen: boolean;
    selectedProposal?: ProposalItem;
    selectedTask?: TaskItem;
}

export function useManagementModals(refetch: () => void, rawTasks: TaskItem[]) {
    // 统一的模态框状态
    const [taskModal, setTaskModal] = useState<ModalState>({ isOpen: false });
    const [updateAddrModal, setUpdateAddrModal] = useState<ModalState>({ isOpen: false });
    const [sendFundsModal, setSendFundsModal] = useState<ModalState>({ isOpen: false });
    const [createMeetingModal, setCreateMeetingModal] = useState<ModalState>({ isOpen: false });
    const [submitMeetingReportModal, setSubmitMeetingReportModal] = useState<ModalState>({ isOpen: false });
    const [submitDelayReportModal, setSubmitDelayReportModal] = useState<ModalState>({ isOpen: false });
    const [submitMilestoneReportModal, setSubmitMilestoneReportModal] = useState<ModalState>({ isOpen: false });
    const [submitAcceptanceReportModal, setSubmitAcceptanceReportModal] = useState<ModalState>({ isOpen: false });

    // 查找对应的 TaskItem
    const findTask = useCallback((proposal: ProposalItem) => {
        return rawTasks.find(t => t.id.toString() === proposal.id);
    }, [rawTasks]);

    // 统一的打开函数
    const open = useCallback((action: string, proposal: ProposalItem) => {
        const task = findTask(proposal);

        switch (action) {
            case 'createVote':
                setTaskModal({ isOpen: true, selectedProposal: proposal });
                break;
            case 'updateReceiverAddr':
                setUpdateAddrModal({ isOpen: true, selectedProposal: proposal, selectedTask: task });
                break;
            case 'sendFunds':
                setSendFundsModal({ isOpen: true, selectedProposal: proposal, selectedTask: task });
                break;
            case 'createMeeting':
                setCreateMeetingModal({ isOpen: true, selectedProposal: proposal, selectedTask: task });
                break;
            case 'submitMeetingReport':
                setSubmitMeetingReportModal({ isOpen: true, selectedProposal: proposal, selectedTask: task });
                break;
            case 'submitDelayReport':
                setSubmitDelayReportModal({ isOpen: true, selectedProposal: proposal, selectedTask: task });
                break;
            case 'submitMilestoneReport':
                setSubmitMilestoneReportModal({ isOpen: true, selectedProposal: proposal, selectedTask: task });
                break;
            case 'submitAcceptanceReport':
                setSubmitAcceptanceReportModal({ isOpen: true, selectedProposal: proposal, selectedTask: task });
                break;
        }
    }, [findTask]);

    // 统一的关闭函数
    const close = useCallback((action: string) => {
        switch (action) {
            case 'createVote':
                setTaskModal({ isOpen: false });
                break;
            case 'updateReceiverAddr':
                setUpdateAddrModal({ isOpen: false });
                break;
            case 'sendFunds':
                setSendFundsModal({ isOpen: false });
                break;
            case 'createMeeting':
                setCreateMeetingModal({ isOpen: false });
                break;
            case 'submitMeetingReport':
                setSubmitMeetingReportModal({ isOpen: false });
                break;
            case 'submitDelayReport':
                setSubmitDelayReportModal({ isOpen: false });
                break;
            case 'submitMilestoneReport':
                setSubmitMilestoneReportModal({ isOpen: false });
                break;
            case 'submitAcceptanceReport':
                setSubmitAcceptanceReportModal({ isOpen: false });
                break;
        }
    }, []);

    // 统一的成功处理函数
    const onSuccess = useCallback((action: string) => {
        refetch();
        close(action);
    }, [refetch, close]);

    return {
        // 模态框状态
        taskModal,
        updateAddrModal,
        sendFundsModal,
        createMeetingModal,
        submitMeetingReportModal,
        submitDelayReportModal,
        submitMilestoneReportModal,
        submitAcceptanceReportModal,

        // 操作函数
        open,
        close,
        onSuccess,
    };
}
