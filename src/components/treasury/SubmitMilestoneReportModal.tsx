"use client";

import React, { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/modal/Modal";
import { useTranslation } from "@/utils/i18n";
import toast from "react-hot-toast";
import useUserInfoStore from "@/store/userInfo";
import { submitMilestoneReport, SubmitMilestoneReportResponse } from "@/server/task";
import { generateSignature } from "@/lib/signature";
import VditorRichTextEditor from "@/components/common/VditorRichTextEditor";
import { logger } from "@/lib/logger";
import { useWallet } from "@/provider/WalletProvider";
import { ccc } from "@ckb-ccc/core";
import { updateMetaTxHash } from "@/server/proposal";
import storage from "@/lib/storage";
import { Secp256k1Keypair } from "@atproto/crypto";
import { uint8ArrayToHex } from "@/lib/dag-cbor";
import * as cbor from '@ipld/dag-cbor';

export interface SubmitMilestoneReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    proposalUri?: string;
    milestoneIndex?: number; // 里程碑索引
}

export default function SubmitMilestoneReportModal({
    isOpen,
    onClose,
    onSuccess,
    proposalUri,
    milestoneIndex,
}: SubmitMilestoneReportModalProps) {
    const { t } = useTranslation();
    const { userInfo } = useUserInfoStore();
    const { signer, openSigner } = useWallet();
    const [report, setReport] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 重置表单
    useEffect(() => {
        if (!isOpen) {
            setReport("");
        }
    }, [isOpen]);

    // 为 update_meta_tx_hash 生成 signed_bytes
    const generateUpdateMetaTxHashSignedBytes = useCallback(async (params: {
        id: number;
        tx_hash: string;
        timestamp: number;
    }) => {
        try {
            const unsignedCommit = cbor.encode(params);
            const storageInfo = storage.getToken();
            if (!storageInfo?.signKey) {
                throw new Error(t("taskModal.errors.userNotLoggedIn"));
            }
            const keyPair = await Secp256k1Keypair.import(storageInfo?.signKey?.slice(2));
            const signature = await keyPair.sign(unsignedCommit);
            return uint8ArrayToHex(signature);
        } catch (error) {
            logger.error("生成更新交易哈希签名字节失败:", error);
            throw new Error(t("taskModal.errors.signatureFailed"));
        }
    }, [t]);

    // 构建并发送交易
    const buildAndSendTransaction = useCallback(async (
        response: SubmitMilestoneReportResponse,
        signer: ccc.Signer
    ) => {
        try {
            const addresses = await signer.getAddresses();
            if (!addresses || addresses.length === 0) {
                throw new Error(t("wallet.cannotGetAddress"));
            }
            const fromAddress = addresses[0];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cccClient = (signer as any).client_ || new ccc.ClientPublicTestnet();
            const { script: lock } = await ccc.Address.fromString(fromAddress, cccClient);

            if (!response.outputsData || response.outputsData.length === 0) {
                throw new Error("响应中缺少 outputsData");
            }
            const outputsData = response.outputsData.map((hexStr: string) => {
                return hexStr.startsWith('0x') ? hexStr : `0x${hexStr}`;
            });

            const tx = ccc.Transaction.default();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await tx.completeInputsAtLeastOne(signer as any);

            if (outputsData.length > 0) {
                const outputs = outputsData.map(() => ({
                    lock,
                }));

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const currentInputs = (tx as any).inputs || [];

                const newTx = ccc.Transaction.from({
                    inputs: currentInputs,
                    outputs: outputs,
                    outputsData: outputsData,
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await newTx.completeFeeBy(signer as any);

                await signer.signTransaction(newTx);
                const txHash = await signer.sendTransaction(newTx);

                logger.log("里程碑报告交易已发送:", { txHash });

                // 更新交易哈希
                if (response.vote_meta?.id && userInfo?.did) {
                    try {
                        const updateParams = {
                            id: response.vote_meta.id,
                            tx_hash: txHash,
                            timestamp: Math.floor(Date.now() / 1000),
                        };

                        const signedBytes = await generateUpdateMetaTxHashSignedBytes(updateParams);
                        const storageInfo = storage.getToken();
                        if (!storageInfo?.signKey) throw new Error("Missing signKey");
                        const keyPair = await Secp256k1Keypair.import(storageInfo.signKey.slice(2));
                        const signingKeyDid = keyPair.did();

                        await updateMetaTxHash({
                            did: userInfo.did,
                            params: updateParams,
                            signed_bytes: signedBytes,
                            signing_key_did: signingKeyDid,
                        });
                        logger.log("交易哈希已更新到服务器");
                    } catch (updateError) {
                        logger.error("更新交易哈希失败:", updateError);
                    }
                }
                return { success: true, txHash };
            }
            return { success: false, error: "No outputs to process" };

        } catch (error) {
            logger.error("构建或发送交易失败:", error);
            throw error;
        }
    }, [t, userInfo?.did, generateUpdateMetaTxHashSignedBytes]);


    const handleSubmit = async () => {
        if (!userInfo?.did) {
            toast.error(t("submitMilestoneReport.errors.userNotLoggedIn") || "请先登录");
            return;
        }

        if (!proposalUri) {
            toast.error(t("submitMilestoneReport.errors.missingProposalUri") || "提案信息缺失");
            return;
        }

        if (!report.trim()) {
            toast.error(t("submitMilestoneReport.errors.missingReport") || "请输入报告内容");
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. 构建参数对象（用于签名）
            const params = {
                proposal_uri: proposalUri,
                // index: milestoneIndex || 0, // 已被移除，改为 report
                report: report,
                timestamp: Math.floor(Date.now() / 1000), // UTC 时间戳（秒）
            };

            // 2. 生成签名
            const { signed_bytes: signedBytes, signing_key_did: signingKeyDid } = await generateSignature(params);

            // 3. 调用 API
            const response = await submitMilestoneReport({
                did: userInfo.did,
                params: params,
                signed_bytes: signedBytes,
                signing_key_did: signingKeyDid,
            });

            if (response && response.success) {
                // 检查是否有 outputsData 需要签名交易
                if (response.outputsData && response.outputsData.length > 0) {
                    if (!signer) {
                        openSigner();
                        setIsSubmitting(false);
                        return;
                    }
                    // 发送交易
                    await buildAndSendTransaction(response, signer as unknown as ccc.Signer);
                }

                toast.success(t("submitMilestoneReport.success") || "里程碑报告提交成功");
                onSuccess?.();
                onClose();
            } else {
                throw new Error(t("submitMilestoneReport.errors.submitFailed") || "提交失败");
            }
        } catch (error) {
            logger.error("提交里程碑报告失败:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast.error(errorMessage || t("submitMilestoneReport.errors.submitFailed") || "提交失败，请重试");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setReport("");
            onClose();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t("submitMilestoneReport.title") || "提交里程碑报告"}
            size="large"
            buttons={[
                {
                    text: t("common.cancel") || "取消",
                    onClick: handleClose,
                    variant: "secondary",
                    disabled: isSubmitting,
                },
                {
                    text: t("submitMilestoneReport.submit") || "提交",
                    onClick: handleSubmit,
                    variant: "primary",
                    disabled: isSubmitting,
                },
            ]}
        >
            <div style={{ padding: "20px 0" }}>
                {/* 报告内容 */}
                <div style={{ marginBottom: "16px" }}>
                    <label
                        htmlFor="milestone-report"
                        style={{
                            display: "block",
                            marginBottom: "8px",
                            color: "#FFFFFF",
                            fontSize: "14px",
                            fontWeight: 500,
                        }}
                    >
                        {t("submitMilestoneReport.reportLabel") || "报告内容"}
                        {milestoneIndex !== undefined && (
                            <span style={{ color: "#8A949E", marginLeft: "8px", fontWeight: "normal" }}>
                                {t("submitMilestoneReport.milestoneIndex").replace("{index}", (milestoneIndex + 1).toString())}
                            </span>
                        )}
                    </label>
                    <div style={{ minHeight: "300px" }}>
                        <VditorRichTextEditor
                            value={report}
                            onChange={setReport}
                            mode="ir"
                            toolbarPreset="simple"
                            placeholder={t("submitMilestoneReport.reportPlaceholder") || "请输入详细的里程碑完成情况、交付物链接等信息..."}
                        />
                    </div>
                </div>

                {proposalUri && (
                    <div style={{
                        marginTop: "12px",
                        fontSize: "12px",
                        color: "#8A949E",
                        wordBreak: "break-all",
                        overflowWrap: "break-word",
                        lineHeight: "1.5"
                    }}>
                        <div style={{ marginBottom: "4px", fontWeight: 500 }}>
                            {t("submitMilestoneReport.proposalUri") || "提案 URI"}:
                        </div>
                        <div style={{
                            wordBreak: "break-all",
                            overflowWrap: "break-word",
                            color: "#CCCCCC"
                        }}>
                            {proposalUri}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
