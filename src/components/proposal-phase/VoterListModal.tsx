'use client';

import React from 'react';
import { useTranslation } from "@/utils/i18n";
import Modal from "@/components/ui/modal/Modal";
import Avatar from "@/components/common/Avatar";
import { formatNumber } from "@/utils/proposalUtils";
import { Voter } from "@/types/voting";
import './VoterListModal.css';

interface VoterListModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    voters: Voter[];
    totalVotes?: number;
    percentage?: string;
    colorTheme?: 'green' | 'red';
}

export default function VoterListModal({
    isOpen,
    onClose,
    title,
    voters,
    totalVotes,
    percentage,
    colorTheme = 'green',
}: VoterListModalProps) {
    const { t } = useTranslation();

    const titleColorClass = colorTheme === 'green' ? 'text-green-brand' : 'text-red-500';
    // 用户名默认为白色，不使用主题色
    const userColorClass = '';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="medium"
            className="voter-list-modal"
            buttons={[
                {
                    text: t("common.close") || "关闭",
                    onClick: onClose,
                    variant: "secondary",
                },
            ]}
        >
            <div className="voter-list-modal-content">

                {/* 统计信息 */}
                {(totalVotes !== undefined && percentage !== undefined) && (
                    <div className="voter-stats">
                        <div className="voter-stats-votes">
                            {formatNumber(totalVotes / 100000000)} 票
                        </div>
                        <div className="voter-stats-percentage">
                            {percentage}%
                        </div>
                    </div>
                )}

                {/* 分割线 */}
                <div className="voter-divider"></div>

                {/* 投票者列表 */}
                <div className="voter-list-scroll">
                    {(!voters || voters.length === 0) ? (
                        <div className="voter-list-empty">
                            {t("modal.voting.details.noVoters") || "暂无投票者"}
                        </div>
                    ) : (
                        <div className="voter-list-items">
                            {voters.map((voter, idx) => {
                                const displayName = voter.author?.displayName || voter.author?.handle || `${voter.ckb_addr.slice(0, 6)}...${voter.ckb_addr.slice(-4)}`;
                                return (
                                    <div key={`${voter.ckb_addr}-${idx}`} className="voter-item">
                                        <div className="voter-item-left">
                                            <Avatar
                                                size={40}
                                                src={voter.author?.avatar}
                                                did={voter.author?.did}
                                                alt={displayName}
                                            />
                                            <span className={`voter-name ${userColorClass}`}>
                                                {displayName}
                                            </span>
                                        </div>
                                        <div className="voter-item-weight">
                                            {formatNumber(voter.weight / 100000000)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
