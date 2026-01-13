'use client';

import React from 'react';
import { useTranslation } from "@/utils/i18n";
import Modal from "@/components/ui/modal/Modal";
import { formatNumber } from "@/utils/proposalUtils";
import './VotingDetailsModal.css';

interface VotingDetailsData {
    candidate_votes: Array<number | number[]>;
    valid_vote_sum: number;
    valid_votes: Array<Array<string | number>>;
    valid_weight_sum: number;
    vote_sum: number;
    weight_sum: number;
}

interface VotingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: VotingDetailsData | null;
}

export default function VotingDetailsModal({
    isOpen,
    onClose,
    data,
}: VotingDetailsModalProps) {
    const { t } = useTranslation();

    if (!data) return null;

    // Helper to extract weight/votes from candidate_votes which might be number[] or [number, number][]
    const getVoteWeight = (index: number): number => {
        const item = data.candidate_votes[index];
        if (Array.isArray(item)) {
            // If it's an array, index 1 is usually the weight (as per ProposalVoting.tsx)
            return item[1] ?? 0;
        }
        return typeof item === "number" ? item : 0;
    };

    const abstainVotes = getVoteWeight(0);
    const agreeVotes = getVoteWeight(1);
    const rejectVotes = getVoteWeight(2);

    // Use valid_weight_sum as the total for percentages if available, otherwise sum of parts
    const totalWeight =
        data.valid_weight_sum > 0
            ? data.valid_weight_sum
            : abstainVotes + agreeVotes + rejectVotes;

    const getPercentage = (value: number) => {
        if (totalWeight <= 0) return "0.0";
        return ((value / totalWeight) * 100).toFixed(1);
    };

    const options = [
        {
            label: t("modal.voting.options.abstain") || "Abstain",
            value: abstainVotes,
            percentage: getPercentage(abstainVotes),
            color: "bg-yellow-500",
            textColor: "text-yellow-500"
        },
        {
            label: t("modal.voting.options.approve") || "Agree",
            value: agreeVotes,
            percentage: getPercentage(agreeVotes),
            color: "bg-green-brand",
            textColor: "text-green-brand"
        },
        {
            label: t("modal.voting.options.reject") || "Reject",
            value: rejectVotes,
            percentage: getPercentage(rejectVotes),
            color: "bg-red-500",
            textColor: "text-red-500"
        },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t("modal.voting.details.title") || "Voting Details"}
            size="medium"
            buttons={[
                {
                    text: t("common.close") || "Close",
                    onClick: onClose,
                    variant: "secondary",
                },
            ]}
        >
            <div className="voting-details-section">
                {/* Summary Section */}
                <div className="voting-summary-card">
                    <h4 className="section-title">
                        {t("modal.voting.details.summary") || "Summary"}
                    </h4>
                    <div className="voting-summary-grid">
                        <div>
                            <span className="summary-item-label">
                                {t("modal.voting.details.totalVotes") || "Total Votes"}
                            </span>
                            <span className="summary-item-value">
                                {data.vote_sum}
                            </span>
                        </div>
                        <div>
                            <span className="summary-item-label">
                                {t("modal.voting.details.validVotes") || "Valid Votes"}
                            </span>
                            <span className="summary-item-value highlight">
                                {data.valid_vote_sum}
                            </span>
                        </div>
                        {data.weight_sum > 0 && (
                            <>
                                <div>
                                    <span className="summary-item-label">
                                        {t("modal.voting.details.totalWeight") || "Total Weight"}
                                    </span>
                                    <span className="summary-item-value">
                                        {formatNumber(data.weight_sum / 100000000)}
                                    </span>
                                </div>
                                <div>
                                    <span className="summary-item-label">
                                        {t("modal.voting.details.validWeight") || "Valid Weight"}
                                    </span>
                                    <span className="summary-item-value highlight">
                                        {formatNumber(data.valid_weight_sum / 100000000)}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Breakdown Section */}
                <div>
                    <h4 className="section-title">
                        {t("modal.voting.details.breakdown") || "Breakdown"}
                    </h4>
                    <div className="voting-breakdown-card">
                        <table className="voting-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '25%' }}>
                                        {t("modal.voting.details.option") || "Option"}
                                    </th>
                                    <th className="text-right" style={{ width: '25%' }}>
                                        {t("modal.voting.details.votes") || "Votes"}
                                    </th>
                                    <th style={{ width: '50%' }}>
                                        {t("modal.voting.details.progress") || "Progress"}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {options.map((option, index) => (
                                    <tr key={index}>
                                        <td className="option-cell">
                                            {option.label}
                                        </td>
                                        <td className="text-right">
                                            <div className="votes-cell-content">
                                                <span>
                                                    {option.value > 1000
                                                        ? formatNumber(option.value)
                                                        : option.value}
                                                </span>
                                                <span className={`percentage-text ${option.textColor}`}>
                                                    {option.percentage}%
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="progress-track">
                                                <div
                                                    className={`progress-bar ${option.color}`}
                                                    style={{ width: `${option.percentage}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
