import React, { useState } from 'react';
import { useTranslation } from "@/utils/i18n";
import Modal from "@/components/ui/modal/Modal";
import { formatNumber } from "@/utils/proposalUtils";
import { VotingDetailsData, Voter } from "@/types/voting";
import VoterListModal from './VoterListModal';
import './VotingDetailsModal.css';

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
    const [currentVoterList, setCurrentVoterList] = useState<{
        title: string,
        voters: Voter[],
        totalVotes: number,
        percentage: string,
        colorTheme: 'green' | 'red'
    } | null>(null);

    if (!data) return null;

    // 翻译投票结果
    const getVoteResultText = (result: string): string => {
        const resultMap: { [key: string]: string } = {
            'Voting': t("modal.voting.result.voting") || "投票进行中",
            'Agree': t("modal.voting.result.agree") || "赞成通过",
            'AgreeLessThan51PCT': t("modal.voting.result.agreeLessThan51PCT") || "赞成票未过半（低于51%）",
            'AgreeLessThan67PCT': t("modal.voting.result.agreeLessThan67PCT") || "赞成票未达到2/3（低于67%）",
            'TotalLessThan185000000CKB': t("modal.voting.result.totalLessThan185000000CKB") || "总投票权重不足（低于1.85亿CKB）",
            'TotalLessThan3X': t("modal.voting.result.totalLessThan3X") || "总投票数不足（低于预算的3倍）",
            'AgainstMoreThan51PCT': t("modal.voting.result.againstMoreThan51PCT") || "反对票过半（超过51%）",
            'AgainstMoreThan67PCT': t("modal.voting.result.againstMoreThan67PCT") || "反对票超过2/3（超过67%）",
            'Failed': t("modal.voting.result.failed") || "投票失败",
        };
        return resultMap[result] || result;
    };

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

    // Get voters list safely
    const agreeVoters = (data.valid_votes && data.valid_votes[1]) ? data.valid_votes[1] : [];
    const rejectVoters = (data.valid_votes && data.valid_votes[2]) ? data.valid_votes[2] : [];

    // Use valid_weight_sum as the total for percentages if available, otherwise sum of parts
    const totalWeight =
        data.valid_weight_sum > 0
            ? data.valid_weight_sum
            : abstainVotes + agreeVotes + rejectVotes;

    const getPercentage = (value: number) => {
        if (totalWeight <= 0) return "0.0";
        return ((value / totalWeight) * 100).toFixed(1);
    };

    const handleOptionClick = (title: string, voters: Voter[], totalVotes: number, percentage: string, colorTheme: 'green' | 'red') => {
        setCurrentVoterList({ title, voters, totalVotes, percentage, colorTheme });
    };

    const options = [
        {
            id: 1, // Index for Agree
            label: t("modal.voting.options.approve") || "赞成投票",
            value: agreeVotes,
            percentage: getPercentage(agreeVotes),
            color: "bg-green-brand",
            textColor: "text-green-brand",
            colorTheme: 'green' as const,
            voters: agreeVoters
        },
        {
            id: 2, // Index for Reject
            label: t("modal.voting.options.reject") || "反对投票",
            value: rejectVotes,
            percentage: getPercentage(rejectVotes),
            color: "bg-red-500",
            textColor: "text-red-500",
            colorTheme: 'red' as const,
            voters: rejectVoters
        },
    ];

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={t("modal.voting.details.title") || "Voting Details"}
                size="medium"
                className="voting-details-modal"
                buttons={[
                    {
                        text: t("common.close") || "Close",
                        onClick: onClose,
                        variant: "secondary",
                    },
                ]}
            >
                <div className="voting-details-section">

                    <h5>{getVoteResultText(data.result || "")}</h5>
                    {/* Summary Section */}
                    <div className="voting-summary-card mb-6">
                        <h4 className="section-title text-lg font-bold mb-4 text-white">
                            {t("modal.voting.details.summary") || "Summary"}
                        </h4>

                        <div className="voting-summary-grid">
                            <div className="voting-summary-item">
                                <span className="summary-item-label">
                                    {t("modal.voting.details.totalVotes") || "Total Votes"}
                                </span>
                                <span className="summary-item-value">
                                    {data.vote_sum}
                                </span>
                            </div>
                            <div className="voting-summary-item">
                                <span className="summary-item-label">
                                    {t("modal.voting.details.validVotes") || "Valid Votes"}
                                </span>
                                <span className="summary-item-value highlight">
                                    {data.valid_vote_sum}
                                </span>
                            </div>
                            {data.weight_sum > 0 && (
                                <>
                                    <div className="voting-summary-item">
                                        <span className="summary-item-label">
                                            {t("modal.voting.details.totalWeight") || "Total Weight"}
                                        </span>
                                        <span className="summary-item-value">
                                            {formatNumber(data.weight_sum / 100000000)}
                                        </span>
                                    </div>
                                    <div className="voting-summary-item">
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

                    {/* Breakdown Section with Voters */}
                    <div>
                        <h4 className="section-title">
                            {t("modal.voting.details.breakdown") || "Breakdown"}
                        </h4>
                        <div className="voting-breakdown-card">
                            {options.map((option) => (
                                <div key={option.id} className="option-group">
                                    <div
                                        className="option-header"
                                        onClick={() => handleOptionClick(option.label, option.voters, option.value, option.percentage, option.colorTheme)}
                                    >
                                        <div className="option-label-container">
                                            <div className={`option-color-dot ${option.color}`}></div>
                                            <span className="option-label">{option.label}</span>
                                        </div>
                                        <div className="option-values-container">
                                            <div className="option-values-wrapper">
                                                <div className="option-value-text">
                                                    {option.value > 1000
                                                        ? formatNumber(option.value / 100000000)
                                                        : option.value}
                                                </div>
                                                <div className={`option-percentage ${option.textColor}`}>
                                                    {option.percentage}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            {currentVoterList && (
                <VoterListModal
                    isOpen={!!currentVoterList}
                    onClose={() => setCurrentVoterList(null)}
                    title={currentVoterList.title}
                    voters={currentVoterList.voters}
                    totalVotes={currentVoterList.totalVotes}
                    percentage={currentVoterList.percentage}
                    colorTheme={currentVoterList.colorTheme}
                />
            )}
        </>
    );
}
