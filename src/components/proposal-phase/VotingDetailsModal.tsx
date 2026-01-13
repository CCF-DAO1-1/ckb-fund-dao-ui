'use client';

import React from 'react';
import { useTranslation } from "@/utils/i18n";
import Modal from "@/components/ui/modal/Modal";
import { formatNumber } from "@/utils/proposalUtils";

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
            color: "bg-[#00cc9b]",
            textColor: "text-[#00cc9b]"
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
            <div className="space-y-6 pt-2 pb-4">
                {/* Summary Section */}
                <div className="bg-[#141619] border border-[#2a2e35] p-5 rounded-xl">
                    <h4 className="font-bold mb-4 text-xs text-[#8a949e] uppercase tracking-wider">
                        {t("modal.voting.details.summary") || "Summary"}
                    </h4>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                        <div>
                            <span className="text-[#8a949e] text-sm block mb-1">
                                {t("modal.voting.details.totalVotes") || "Total Votes"}
                            </span>
                            <span className="font-bold text-xl text-white font-mono">
                                {data.vote_sum}
                            </span>
                        </div>
                        <div>
                            <span className="text-[#8a949e] text-sm block mb-1">
                                {t("modal.voting.details.validVotes") || "Valid Votes"}
                            </span>
                            <span className="font-bold text-xl text-[#00cc9b] font-mono">
                                {data.valid_vote_sum}
                            </span>
                        </div>
                        {data.weight_sum > 0 && (
                            <>
                                <div>
                                    <span className="text-[#8a949e] text-sm block mb-1">
                                        {t("modal.voting.details.totalWeight") || "Total Weight"}
                                    </span>
                                    <span className="font-bold text-xl text-white font-mono">
                                        {formatNumber(data.weight_sum)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[#8a949e] text-sm block mb-1">
                                        {t("modal.voting.details.validWeight") || "Valid Weight"}
                                    </span>
                                    <span className="font-bold text-xl text-[#00cc9b] font-mono">
                                        {formatNumber(data.valid_weight_sum)}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Breakdown Section */}
                {/* Breakdown Section */}
                <div>
                    <h4 className="font-bold mb-4 text-xs text-[#8a949e] uppercase tracking-wider px-1">
                        {t("modal.voting.details.breakdown") || "Breakdown"}
                    </h4>
                    <div className="bg-[#141619] border border-[#2a2e35] rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#2a2e35]">
                                    <th className="text-left py-3 px-4 text-[#8a949e] font-semibold w-1/4">
                                        {t("modal.voting.details.option") || "Option"}
                                    </th>
                                    <th className="text-right py-3 px-4 text-[#8a949e] font-semibold w-1/4">
                                        {t("modal.voting.details.votes") || "Votes"}
                                    </th>
                                    <th className="text-left py-3 px-4 text-[#8a949e] font-semibold w-1/2">
                                        {t("modal.voting.details.progress") || "Progress"}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2a2e35]">
                                {options.map((option, index) => (
                                    <tr key={index} className="hover:bg-[#1c1f26] transition-colors">
                                        <td className="py-3 px-4 text-white font-medium">
                                            {option.label}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-[#8a949e]">
                                            <div className="flex flex-col items-end">
                                                <span>
                                                    {option.value > 1000
                                                        ? formatNumber(option.value)
                                                        : option.value}
                                                </span>
                                                <span className={`text-xs ${option.textColor} mt-0.5 font-bold`}>
                                                    {option.percentage}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="w-full bg-[#2a2e35] rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${option.color} transition-all duration-500 ease-out`}
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
