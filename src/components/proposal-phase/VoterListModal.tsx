'use client';

import React from 'react';
import { useTranslation } from "@/utils/i18n";
import { Tooltip } from 'react-tooltip';
import Modal from "@/components/ui/modal/Modal";
import Avatar from "@/components/common/Avatar";
import { formatNumber } from "@/utils/proposalUtils";
import { Voter } from "@/types/voting";

interface VoterListModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    voters: Voter[];
}

export default function VoterListModal({
    isOpen,
    onClose,
    title,
    voters,
}: VoterListModalProps) {
    const { t } = useTranslation();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="medium"
            buttons={[
                {
                    text: t("common.close") || "Close",
                    onClick: onClose,
                    variant: "secondary",
                },
            ]}
        >
            <div className="voter-list-container bg-gray-900 rounded-md p-4 max-h-[60vh] overflow-y-auto">
                {(!voters || voters.length === 0) ? (
                    <div className="text-center text-gray-500 py-8">
                        {t("modal.voting.details.noVoters") || "No voters yet"}
                    </div>
                ) : (
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-4">
                        {voters.map((voter, idx) => {
                            const displayName = voter.author?.displayName || voter.author?.handle || `${voter.ckb_addr.slice(0, 6)}...${voter.ckb_addr.slice(-4)}`;
                            return (
                                <div
                                    key={`${voter.ckb_addr}-${idx}`}
                                    className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer group relative"
                                    data-tooltip-id={`voter-tooltip-${idx}`}
                                >
                                    <Avatar
                                        size={48}
                                        src={voter.author?.avatar}
                                        did={voter.author?.did}
                                        alt={displayName}
                                    />
                                    <div className="mt-2 text-xs text-center text-gray-400 truncate w-full">
                                        {formatNumber(voter.weight / 100000000)}
                                    </div>

                                    <Tooltip
                                        id={`voter-tooltip-${idx}`}
                                        place="top"
                                        className="z-50 max-w-xs"
                                        style={{ backgroundColor: '#1f2937', color: '#fff', borderRadius: '0.5rem', padding: '0.75rem', zIndex: 9999 }}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <div className="font-bold text-sm">{displayName}</div>
                                            {voter.author?.handle && (
                                                <div className="text-xs text-gray-400">@{voter.author.handle}</div>
                                            )}
                                            <div className="text-xs text-green-brand font-mono">
                                                {t("modal.voting.details.weight") || "Weight"}: {formatNumber(voter.weight / 100000000)}
                                            </div>
                                        </div>
                                    </Tooltip>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}
