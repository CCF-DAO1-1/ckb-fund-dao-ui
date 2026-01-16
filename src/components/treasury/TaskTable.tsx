import React from 'react';
import TaskRow from './TaskRow';
import { ProposalItem } from '@/utils/managementCenterUtils';
import { useTranslation } from '@/utils/i18n';

interface TaskTableProps {
    proposals: ProposalItem[];
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    onAction: (action: string, proposal: ProposalItem) => void;
}

export default function TaskTable({
    proposals,
    loading,
    error,
    onRetry,
    onAction
}: TaskTableProps) {
    const { t } = useTranslation();

    if (loading) {
        return (
            <div className="proposals-table">
                <div className="loading-state">
                    <p>{t("managementCenter.loading")}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="proposals-table">
                <div className="error-state">
                    <p>
                        {t("managementCenter.loadFailed")}: {error}
                    </p>
                    <button onClick={onRetry}>
                        {t("managementCenter.retry")}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="proposals-table">
            <table>
                <thead>
                    <tr>
                        <th>{t("management.proposalTitle")}</th>
                        <th>{t("managementCenter.type")}</th>
                        <th>{t("management.status")}</th>
                        <th>{t("managementCenter.taskType")}</th>
                        <th>{t("management.deadline")}</th>
                        <th>{t("management.actions")}</th>
                    </tr>
                </thead>
                <tbody>
                    {proposals.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="no-data">
                                {t("management.noData")}
                            </td>
                        </tr>
                    ) : (
                        proposals.map((proposal) => (
                            <TaskRow
                                key={proposal.id}
                                proposal={proposal}
                                onAction={onAction}
                            />
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
