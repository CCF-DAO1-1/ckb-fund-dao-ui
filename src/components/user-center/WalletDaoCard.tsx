"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { IoMdInformationCircleOutline, IoMdRefresh } from "react-icons/io";
import { MdOutlineAccountBalanceWallet, MdClose } from "react-icons/md";
import { AiOutlineExport } from "react-icons/ai";
import toast from "react-hot-toast";

import { SignatureModal, SuccessModal, ConfirmModal } from "../ui/modal";
import { useWalletAddress } from "../../hooks/useWalletAddress";
import { useWalletBalance } from "../../hooks/useWalletBalance";
import { BindInfo, BindInfoWithSig } from "../../utils/molecules";
import { ccc, hexFrom } from "@ckb-ccc/core";
import { useWallet } from "@/provider/WalletProvider";
import { useTranslation } from "@/utils/i18n";
import { useVoteWeight } from "@/hooks/useVoteWeight";
import { getBindList } from "@/server/proposal";
import useUserInfoStore from "@/store/userInfo";
import { validateJsonSignature } from "@/utils/common";

import { logger } from '@/lib/logger';
interface WalletDaoCardProps {
  className?: string;
}

export default function WalletDaoCard({ className = "" }: WalletDaoCardProps) {
  const { t } = useTranslation();
  const { walletAddress, isLoadingAddress, isConnected } = useWalletAddress();
  const { walletBalance, isLoadingBalance, formatBalance } = useWalletBalance();
  const { signer } = useWallet();
  const { voteWeight, isLoading: isLoadingVoteWeight, formatVoteWeight, refreshVoteWeight } = useVoteWeight();
  const { userInfo } = useUserInfoStore();

  // 自定义地址格式化函数：前7个字符...后4个字符
  const formatWalletAddress = (address: string) => {
    if (!address) return t("wallet.gettingAddress");
    if (address.length <= 11) return address;
    return `${address.slice(0, 7)}...${address.slice(-4)}`;
  };

  // 格式化绑定钱包地址：前5个字符...后4个字符
  const formatNeuronWalletAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 9) return address;
    return `${address.slice(0, 5)}...${address.slice(-4)}`;
  };

  const [showNeuronDropdown, setShowNeuronDropdown] = useState(false);
  const [neuronWallets, setNeuronWallets] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingBindList, setIsLoadingBindList] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [showUnbindConfirmModal, setShowUnbindConfirmModal] = useState(false);
  const [walletToUnbind, setWalletToUnbind] = useState<string | null>(null);
  const [isUnbinding, setIsUnbinding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const generateBindInfo = useCallback(async () => {
    logger.log("Generating bind info");
    const timestamp = Date.now();
    const cccClient = new ccc.ClientPublicTestnet();
    const toAddr =
      (await ccc.Address.fromString(walletAddress, cccClient)) || "";
    const bindInfoLike = {
      to: toAddr.script,
      timestamp: BigInt(timestamp),
    };
    const bindInfo = BindInfo.from(bindInfoLike);

    const bindInfoBytes = bindInfo.toBytes();
    const bindInfoHex = ccc.hexFrom(bindInfoBytes);
    logger.log("Bind info generated");

    return { bindInfo, bindInfoHex };
  }, [walletAddress]);

  // 生成解绑信息
  // 把要解绑的 from 地址的 lockscript 放到 bindinfo 的 to 字段
  const generateUnbindInfo = useCallback(async (fromAddress: string) => {
    const timestamp = Date.now();
    const cccClient = new ccc.ClientPublicTestnet();
    const fromAddr = await ccc.Address.fromString(fromAddress, cccClient);
    
    // unbind: 把要解绑的 from 地址的 lockscript 放到 bindinfo 的 to 字段
    const unbindInfoLike = {
      to: fromAddr.script,
      timestamp: BigInt(timestamp),
    };
    const unbindInfo = BindInfo.from(unbindInfoLike);

    const unbindInfoBytes = unbindInfo.toBytes();
    const unbindInfoHex = ccc.hexFrom(unbindInfoBytes);
    logger.log("Unbind info generated");

    return { unbindInfo, unbindInfoHex };
  }, []);

  const [signatureMessage, setSignatureMessage] = useState<string>("");
  const [bindInfo, setBindInfo] = useState<BindInfo | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 将签名转换为十六进制（兼容base64和0x格式）
  const convertSignatureToHex = (signature: string): string => {
    if (!signature || !signature.trim()) {
      logger.error(t("wallet.signatureConversionFailed"), "签名为空");
      return '';
    }

    const trimmedSignature = signature.trim();

    try {
      // 检查是否为0x开头的十六进制字符串
      if (trimmedSignature.startsWith('0x') || trimmedSignature.startsWith('0X')) {
        // 移除0x前缀
        const hexString = trimmedSignature.slice(2);
        
        // 如果0x后面为空，尝试按base64处理
        if (!hexString) {
          throw new Error("0x前缀后没有内容，尝试base64解码");
        }
        
        // 验证是否为有效的十六进制（允许空字符串的情况已在上方处理）
        if (/^[0-9a-fA-F]+$/i.test(hexString)) {
          return hexString.toLowerCase();
        }
        
        // 如果不是有效的十六进制，尝试按base64处理
        logger.warn("0x格式的签名不是有效的十六进制，尝试base64解码");
      }
      
      // 检查是否为纯十六进制字符串（没有0x前缀）
      if (/^[0-9a-fA-F]+$/i.test(trimmedSignature)) {
        return trimmedSignature.toLowerCase();
      }
      
      // 尝试按base64处理
      // 移除可能的填充字符和空格
      const cleanBase64 = trimmedSignature.replace(/[\s\-_]/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
      
      if (!cleanBase64) {
        throw new Error("无法解析签名格式");
      }

      // 尝试解码 base64
      try {
        const bytes = atob(cleanBase64);
        // 转换为十六进制
        return Array.from(bytes)
          .map(byte => byte.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('');
      } catch (base64Error) {
        throw new Error(`Base64解码失败: ${base64Error instanceof Error ? base64Error.message : '未知错误'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(t('wallet.signatureConversionFailed'), errorMessage, {
        signatureLength: trimmedSignature.length,
        signaturePrefix: trimmedSignature.substring(0, 20)
      });
      // 不抛出错误，返回空字符串让上层处理
      return '';
    }
  };

  // 生成签名消息和绑定信息
  useEffect(() => {
    if (walletAddress && isConnected) {
      generateBindInfo().then(({ bindInfo, bindInfoHex }) => {
        setSignatureMessage(bindInfoHex);
        setBindInfo(bindInfo);
      });
    }
  }, [walletAddress, isConnected, generateBindInfo]);
  // 注意：generateBindInfo 使用 useCallback 且依赖 walletAddress，所以函数引用是稳定的
  // 只有当 walletAddress 改变时，generateBindInfo 才会重新创建，从而触发 effect
  // 函数执行完成后不会改变函数引用，因此不会导致无限循环

  // 获取绑定列表
  const fetchBindList = useCallback(async () => {
    if (!userInfo?.did) {
      setNeuronWallets([]);
      return;
    }

    try {
      setIsLoadingBindList(true);
      const response = await getBindList({ did: userInfo.did });
      
      // API 返回格式: {code: 200, data: [{from: "...", timestamp: ...}], message: "OK"}
      // requestAPI 会自动提取 data 字段，所以 response 应该是 BindItem[] 数组
      // 每个元素格式: {from: "ckt1...", timestamp: 1762155209433}
      let walletAddresses: string[] = [];
      
      if (Array.isArray(response)) {
        // 从绑定项中提取钱包地址（from 字段）
        walletAddresses = response
          .map((item) => item?.from || item?.to || item?.address || '')
          .filter((addr: string) => typeof addr === 'string' && addr.length > 0);
      }
      
      setNeuronWallets(walletAddresses);
    } catch {
      setNeuronWallets([]);
    } finally {
      setIsLoadingBindList(false);
    }
  }, [userInfo?.did]);

  useEffect(() => {
    fetchBindList();
  }, [fetchBindList]);

  const handleBindNeuron = () => {
    setShowNeuronDropdown(!showNeuronDropdown);
  };

  const handleBindNewWallet = () => {
    setShowNeuronDropdown(false);
    setShowSignatureModal(true);
  };

  const handleSignatureBind = async(signature: string) => {
    if (!signer) {
      toast.error(t("wallet.signerNotConnected"));
      return;
    }

    if (!bindInfo) {
      toast.error(t("wallet.bindInfoNotGenerated"));
      return;
    }

    const tx = ccc.Transaction.default();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    await tx.completeInputsAtLeastOne(signer as any);
    
    // 判断签名类型并处理
    let sigHex: string;
    
    // 统一使用 trim() 处理，避免空格影响判断
    const trimmedSignature = signature.trim();
   
    // 如果 signature 以 { 开头，说明是 JSON 字符串，先验证格式
    if (trimmedSignature.startsWith('{')) {
      const validation = validateJsonSignature(trimmedSignature);
      if (!validation.valid) {
        toast.error(validation.error || t("wallet.signatureConversionFailed"));
        return;
      }
      
      const encoder = new TextEncoder();
      const sigBytes = encoder.encode(signature); // 使用原始 signature，保留可能的格式
      sigHex = hexFrom(sigBytes);
      logger.log("Signature hex generated for JSON signature");
      
    } 
    // 如果 signature 以 0x 开头且长度是 132，说明是 neuron 签名
    // 使用 trim() 后的长度检查，确保一致性
  
    else if (trimmedSignature.startsWith('0x') && trimmedSignature.length === 132) {
      logger.log("Processing Neuron signature (0x prefix, 132 chars)");
      // 将签名转换为十六进制（兼容base64和0x格式）
      const signatureHex = convertSignatureToHex(trimmedSignature);
      if (!signatureHex) {
        toast.error(t("wallet.signatureConversionFailed"));
        return;
      }
      sigHex = signatureHex;
      logger.log("Signature hex generated for Neuron signature");
    }
    // 如果 signature 不是以 { 开头，且不是 0x 开头的 132 字符，尝试解析为 JSON
    else {
      toast.error(t("wallet.signatureConversionFailed"));
      return;
    }

    const bindInfoWithSig = BindInfoWithSig.from({
      bind_info: bindInfo,
      sig: sigHex.startsWith('0x') ? sigHex : `0x${sigHex}`
    })
  
    const bindInfoWithSigBytes = bindInfoWithSig.toBytes();
  
    // 修正: 确保 WitnessArgs 已正确定义且 imported，并使用 const
    const witnessArgs = ccc.WitnessArgs.from({
      inputType: bindInfoWithSigBytes,
    });
    tx.setWitnessArgsAt(0, witnessArgs);

    // 在设置 witness 之后重新计算费用，确保费用充足
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await tx.completeFeeBy(signer as any);

    await signer.signTransaction(tx);

    const txHash = await signer.sendTransaction(tx);
    logger.log("Bind transaction sent successfully");
    setShowSignatureModal(false);
    setSuccessMessage(t("wallet.bindSuccessMessage"));
    setShowSuccessModal(true);
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    // 刷新绑定列表
    fetchBindList();
  };

  // 刷新投票权重和绑定列表
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      
      // 同时刷新投票权重和绑定列表
      await Promise.all([
        refreshVoteWeight(),
        fetchBindList()
      ]);
      
      // 显示成功提示
      toast.success(t("wallet.refreshSuccessMessage"));
    } catch (error) {
      logger.error("刷新失败:");
      toast.error(t("wallet.refreshFailed") || "刷新失败");
    } finally {
      setIsRefreshing(false);
    }
  };

  // 处理解绑操作
  const handleUnbindClick = (wallet: string) => {
    setWalletToUnbind(wallet);
    setShowUnbindConfirmModal(true);
  };

  // 确认解绑
  const handleConfirmUnbind = async () => {
    if (!walletToUnbind || !signer) {
      toast.error(t("wallet.signerNotConnected"));
      return;
    }

    try {
      setIsUnbinding(true);
      
      // 生成解绑信息
      const { unbindInfo } = await generateUnbindInfo(walletToUnbind);

      // 创建交易
      const tx = ccc.Transaction.default();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tx.completeInputsAtLeastOne(signer as any);

      // unbind: sig 留空（"0x"）
      const unbindInfoWithSig = BindInfoWithSig.from({
        bind_info: unbindInfo,
        sig: "0x"
      });

      const unbindInfoWithSigBytes = unbindInfoWithSig.toBytes();

      // 设置 witness
      const witnessArgs = ccc.WitnessArgs.from({
        inputType: unbindInfoWithSigBytes,
      });
      tx.setWitnessArgsAt(0, witnessArgs);

      // 重新计算费用
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tx.completeFeeBy(signer as any);

      // 签名并发送交易
      await signer.signTransaction(tx);
      const txHash = await signer.sendTransaction(tx);
      logger.log("Unbind transaction sent successfully");

      // 关闭确认弹窗
      setShowUnbindConfirmModal(false);
      setWalletToUnbind(null);
      
      // 显示成功提示
      toast.success(t("wallet.unbindSuccessMessage"));
      setSuccessMessage(t("wallet.unbindSuccessMessage"));
      setShowSuccessModal(true);
    } catch (error) {
      logger.error("Unbind failed:");
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || t("wallet.unbindInfoNotGenerated"));
    } finally {
      setIsUnbinding(false);
    }
  };

  // const handleRemoveWallet = (walletToRemove: string) => {
  //   setNeuronWallets((prev: string[]) =>
  //     prev.filter((wallet: string) => wallet !== walletToRemove)
  //   );
  // };

  // 点击外部区域关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowNeuronDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`wallet-dao-card ${className}`}>
      <h3 className="card-title">{t("wallet.title")}</h3>

      <div className="voting-power-section">
        <div className="voting-power-header">
          <h4 className="voting-power-label">
            {t("wallet.myVotingPower")}
            <IoMdInformationCircleOutline
              data-tooltip-id="my-tooltip"
              data-tooltip-content={t("wallet.votingPowerExplanation")}
            />
            <button
            className={`refresh-button ${isRefreshing ? 'rotating' : ''}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
            title={t("wallet.refresh") || "刷新"}
            aria-label={t("wallet.refresh") || "刷新"}
          >
            <IoMdRefresh size={18} />
          </button>
          </h4>
          
        </div>
        <div className="voting-power-amount">
          {isLoadingVoteWeight ? t("wallet.loading") : formatVoteWeight(voteWeight)} CKB
        </div>
      </div>

      <div className="wallet-section">
        <div className="wallet-address-group">
          <label className="wallet-label">{t("wallet.currentConnectedWallet")}</label>
          <div className="wallet-address-row">
            <span className="wallet-address">
              {isLoadingAddress
                ? t("wallet.gettingAddress")
                : isConnected
                ? formatWalletAddress(walletAddress)
                : t("wallet.notConnected")}
            </span>
          </div>
        </div>

        <div className="wallet-balances">
          <div className="balance-item">
            <span className="balance-label">{t("wallet.walletBalance")}:</span>
            <span className="balance-value">
              {isLoadingBalance
                ? t("wallet.gettingBalance")
                : isConnected
                ? formatBalance(walletBalance, true)
                : t("wallet.notConnected")}
            </span>
          </div>
          {/* <div className="balance-item">
            <span className="balance-label">已存入Nervos DAO:</span>
            <span className="balance-value">{depositedInDao} CKB</span>
          </div>
          <div className="balance-item">
            <span className="balance-label">赎回中:</span>
            <span className="balance-value">{redeeming} CKB</span>
          </div> */}
        </div>
      </div>

      <div className="action-buttons">
        <a 
          href="https://www.nervdao.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="action-button stake-button"
        >
        
          {t("wallet.stakeCKB")}
          <AiOutlineExport />
           
        </a>

        <div className="neuron-dropdown-container" ref={dropdownRef}>
          <button
            className="action-button bind-button"
            onClick={handleBindNeuron}
          >
            <MdOutlineAccountBalanceWallet size={18} />
            {t("wallet.bindNeuronWallet")}
          </button>

          {showNeuronDropdown && (
            <div className="neuron-dropdown">
              <div
                className="neuron-dropdown-item"
                onClick={handleBindNewWallet}
              >
                {t("wallet.bindNewWallet")}
              </div>
              {neuronWallets.map((wallet, index) => (
                <div key={index} className="neuron-wallet-item">
                  <span className="wallet-address">{formatNeuronWalletAddress(wallet)}</span>
                  <div
                    className={`unbind-wallet-button ${isUnbinding ? 'disabled' : ''}`}
                    onClick={() => !isUnbinding && handleUnbindClick(wallet)}
                    title={t("wallet.unbindWallet")}
                    aria-label={t("wallet.unbindWallet")}
                  >
                    <MdClose size={18} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 签名信息弹窗 */}
      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onBind={handleSignatureBind}
        message={signatureMessage}
      />

      {/* 绑定/解绑成功弹窗 */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        message={successMessage || t("wallet.bindSuccessMessage")}
      />

      {/* 解绑确认弹窗 */}
      <ConfirmModal
        isOpen={showUnbindConfirmModal}
        onClose={() => {
          setShowUnbindConfirmModal(false);
          setWalletToUnbind(null);
        }}
        message={t("wallet.unbindConfirmMessage")}
        onConfirm={handleConfirmUnbind}
        confirmText={t("wallet.confirmUnbind")}
        variant="warning"
        title={t("wallet.unbindWallet")}
      />
    </div>
  );
}
