"use client";

import { useState } from "react";
import { useWallet } from "@/provider/WalletProvider";
import { ccc } from "@ckb-ccc/core";
import toast from "react-hot-toast";
import { logger } from "@/lib/logger";
import { updateVoteMetaTxHash } from "@/utils/updateMetaTxHash";
import useUserInfoStore from "@/store/userInfo";

export default function TransactionDebugTool() {
    const { signer, openSigner, isConnected } = useWallet();
    const { userInfo } = useUserInfoStore();
    const [outputsDataInput, setOutputsDataInput] = useState("");
    const [voteMetaId, setVoteMetaId] = useState("25");
    const [isSending, setIsSending] = useState(false);
    const [txHash, setTxHash] = useState("");
    const [updateStatus, setUpdateStatus] = useState<"idle" | "updating" | "success" | "error">("idle");
    const [updateMessage, setUpdateMessage] = useState("");

    const handleSendTransaction = async () => {
        if (!isConnected || !signer) {
            openSigner();
            return;
        }

        setIsSending(true);
        setTxHash("");

        try {
            // 解析 outputsData (支持多种格式)
            let outputsData: string[] = [];

            try {
                // 尝试作为 JSON 数组解析
                const parsed = JSON.parse(outputsDataInput);
                if (Array.isArray(parsed)) {
                    outputsData = parsed;
                } else if (typeof parsed === 'string') {
                    outputsData = [parsed];
                }
            } catch {
                // 如果不是 JSON，作为单个字符串处理
                outputsData = [outputsDataInput.trim()];
            }

            // 确保有 0x 前缀
            outputsData = outputsData.map(data =>
                data.startsWith('0x') ? data : `0x${data}`
            );

            logger.log('📦 OutputsData:', outputsData);

            // 获取地址
            const addresses = await signer.getAddresses();
            if (!addresses || addresses.length === 0) {
                throw new Error('无法获取钱包地址');
            }
            const fromAddress = addresses[0];
            logger.log('✅ 钱包地址:', fromAddress);

            // 获取 lock script
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cccClient = (signer as any).client_ || new ccc.ClientPublicTestnet();
            const { script: lock } = await ccc.Address.fromString(fromAddress, cccClient);

            // 创建交易
            const tx = ccc.Transaction.default();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await tx.completeInputsAtLeastOne(signer as any);

            // 创建 outputs
            const outputs = outputsData.map(() => ({ lock }));

            // 构建新交易
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const currentInputs = (tx as any).inputs || [];
            const newTx = ccc.Transaction.from({
                inputs: currentInputs,
                outputs: outputs,
                outputsData: outputsData,
            });

            logger.log('✅ 交易已构建');

            // 完成手续费
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await newTx.completeFeeBy(signer as any);
            logger.log('✅ 手续费已计算');

            // 签名交易
            await signer.signTransaction(newTx);
            logger.log('✅ 交易已签名');

            // 发送交易
            const hash = await signer.sendTransaction(newTx);

            setTxHash(hash);
            toast.success('交易发送成功！');
            logger.log('🎉 交易哈希:', { hash });
            logger.log('📋 vote_meta.id:', { voteMetaId });

            // 自动更新交易哈希到服务器
            if (userInfo?.did && voteMetaId) {
                setUpdateStatus("updating");
                setUpdateMessage("正在更新交易哈希到服务器...");

                const result = await updateVoteMetaTxHash(
                    parseInt(voteMetaId),
                    hash,
                    userInfo.did
                );

                if (result.success) {
                    setUpdateStatus("success");
                    setUpdateMessage("✅ 交易哈希已成功更新到服务器");
                    toast.success("交易哈希已更新到服务器");
                } else {
                    setUpdateStatus("error");
                    setUpdateMessage(`❌ 更新失败: ${result.error}`);
                    toast.error(`更新服务器失败: ${result.error}`);
                }
            } else {
                setUpdateStatus("error");
                setUpdateMessage("⚠️ 缺少用户信息，无法自动更新到服务器");
            }

        } catch (error) {
            logger.error('发送交易失败:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast.error(`发送失败: ${errorMessage}`);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div style={{
            maxWidth: '800px',
            margin: '40px auto',
            padding: '24px',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            color: '#fff'
        }}>
            <h1 style={{ marginBottom: '24px', color: '#00CC9B' }}>
                🔧 交易调试工具
            </h1>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Vote Meta ID:
                </label>
                <input
                    type="text"
                    value={voteMetaId}
                    onChange={(e) => setVoteMetaId(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#2a2a2a',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '14px'
                    }}
                    placeholder="25"
                />
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    OutputsData (JSON Array or single string):
                </label>
                <textarea
                    value={outputsDataInput}
                    onChange={(e) => setOutputsDataInput(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#2a2a2a',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        minHeight: '200px',
                        resize: 'vertical'
                    }}
                    placeholder='["0x9b000000..."] 或 9b000000...'
                />
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    支持格式: JSON数组 或 单个十六进制字符串 (可选 0x 前缀)
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={handleSendTransaction}
                    disabled={isSending || !outputsDataInput.trim()}
                    style={{
                        width: '100%',
                        padding: '14px',
                        backgroundColor: isConnected ? '#00CC9B' : '#666',
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: isSending || !outputsDataInput.trim() ? 'not-allowed' : 'pointer',
                        opacity: isSending || !outputsDataInput.trim() ? 0.6 : 1
                    }}
                >
                    {!isConnected ? '连接钱包' : isSending ? '发送中...' : '📤 发送交易'}
                </button>
            </div>

            {txHash && (
                <div style={{
                    padding: '16px',
                    backgroundColor: '#00CC9B20',
                    border: '1px solid #00CC9B',
                    borderRadius: '4px',
                    marginTop: '20px'
                }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#00CC9B' }}>
                        ✅ 交易发送成功！
                    </div>
                    <div style={{ fontSize: '14px', wordBreak: 'break-all', marginBottom: '8px' }}>
                        <strong>TxHash:</strong> {txHash}
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                        <strong>Vote Meta ID:</strong> {voteMetaId}
                    </div>

                    {/* 更新状态 */}
                    {updateStatus !== "idle" && (
                        <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            backgroundColor: updateStatus === "success" ? '#00CC9B20' : updateStatus === "error" ? '#ff4d4d20' : '#fff3',
                            border: `1px solid ${updateStatus === "success" ? '#00CC9B' : updateStatus === "error" ? '#ff4d4d' : '#888'}`,
                            borderRadius: '4px'
                        }}>
                            <div style={{ fontSize: '13px', color: updateStatus === "success" ? '#00CC9B' : updateStatus === "error" ? '#ff4d4d' : '#fff' }}>
                                {updateStatus === "updating" && "⏳ "}
                                {updateMessage}
                            </div>
                        </div>
                    )}

                    {updateStatus !== "success" && (
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '12px' }}>
                            ⚠️ 记得调用 update_meta_tx_hash API 更新到服务器
                        </div>
                    )}
                </div>
            )}

            <div style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#2a2a2a',
                borderRadius: '4px',
                fontSize: '13px',
                color: '#aaa'
            }}>
                <div style={{ fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
                    💡 使用说明:
                </div>
                <ol style={{ margin: 0, paddingLeft: '20px' }}>
                    <li>输入 vote_meta.id</li>
                    <li>粘贴 API 返回的 outputsData</li>
                    <li>点击"发送交易"按钮</li>
                    <li>确认钱包签名</li>
                    <li>复制返回的 txHash</li>
                </ol>
            </div>

            <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#333',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#0f0'
            }}>
                <div>✓ 控制台输出已启用</div>
                <div>✓ 打开浏览器控制台查看详细日志</div>
            </div>
        </div>
    );
}
