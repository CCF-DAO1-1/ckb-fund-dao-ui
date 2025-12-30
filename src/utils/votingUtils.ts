import { VotingInfo, VoteOption, VotingStatus } from '../types/voting';
import { Proposal, ProposalStatus } from './proposalUtils';
import { VoteMetaItem, PrepareVoteResponse } from '@/server/proposal';
import enMessages from '../locales/en.json';
import zhMessages from '../locales/zh.json';

// 获取当前语言环境
function getCurrentLocale(): 'en' | 'zh' {
  if (typeof window === 'undefined') return 'en';
  
  try {
    const savedLocale = localStorage.getItem('locale') as 'en' | 'zh';
    if (savedLocale && ['en', 'zh'].includes(savedLocale)) {
      return savedLocale;
    }
    
    // 检测浏览器语言
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'zh') {
      return 'zh';
    }
  } catch (error) {
    // 如果localStorage不可用，使用默认语言
    console.warn('Failed to get locale:', error);
  }
  
  return 'en';
}

// 从国际化消息中获取翻译
function getTranslation(key: string, locale: 'en' | 'zh' = getCurrentLocale(), fallbackToEn: boolean = true): string {
  const messages = locale === 'zh' ? zhMessages : enMessages;
  const keys = key.split('.');
  let message: unknown = messages;
  
  for (const k of keys) {
    if (message && typeof message === 'object' && message !== null && k in message) {
      message = (message as Record<string, unknown>)[k];
    } else {
      // 如果找不到翻译，尝试使用英文（仅当当前是中文且允许回退时）
      if (locale === 'zh' && fallbackToEn) {
        return getTranslation(key, 'en', false);
      }
      return key;
    }
  }
  
  if (typeof message === 'string') {
    return message;
  }
  
  return key;
}

// 获取翻译的辅助函数
function getT(key: string, t?: (key: string) => string, values?: Record<string, string | number>): string {
  if (t) {
    const translated = t(key);
    // 如果翻译函数返回了键名本身（表示未找到），使用默认翻译
    if (translated === key) {
      return formatTranslation(getTranslation(key), values);
    }
    return formatTranslation(translated, values);
  }
  return formatTranslation(getTranslation(key), values);
}

// 格式化翻译字符串，替换占位符
function formatTranslation(text: string, values?: Record<string, string | number>): string {
  if (!values) return text;
  let result = text;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
  }
  return result;
}

// 计算最低投票权重总数（shannon单位）
// 根据提案类型：
// - 对于「资金申请」类提案，最低投票权重总数为：申请资金数量的3倍
// - 对于「元规则」类提案，则为固定的 1.85亿CKB
const calculateMinTotalVotes = (proposal: Proposal): number => {
  const proposalType = typeof proposal.type === 'string' ? proposal.type : proposal.category;
  
  // 元规则类提案：固定的 1.85亿CKB
  if (proposalType === 'governance') {
    // 1.85亿CKB = 185000000 CKB = 185000000 * 100000000 shannon
    return 185000000 ;
  }
  
  // 资金申请类提案：申请资金数量的3倍
  if (proposalType === 'funding' && proposal.budget) {
    const budgetAmount = typeof proposal.budget === 'string' ? parseFloat(proposal.budget) : proposal.budget;
    if (!isNaN(budgetAmount) && budgetAmount > 0) {
      // 转换为shannon单位后乘以3
      return budgetAmount  * 3;
    }
  }
  
  // 默认值：1500万CKB = 15000000 * 100000000 shannon
  return 15000000 ;
};

// 生成投票信息（使用真实数据）
export const generateVotingInfo = (
  proposal: Proposal,
  voteMeta?: VoteMetaItem | null,
  userVotingPower: number = 0
): VotingInfo => {
  // 计算最低投票权重总数
  const minTotalVotes = calculateMinTotalVotes(proposal);
  
  // 如果有投票元数据，使用真实数据
  if (voteMeta) {
    // 确定投票状态（只根据时间和提案状态判断，不依赖 userVote）
    let status: VotingStatus;
    const now = new Date().getTime();
    const endTime = new Date(voteMeta.end_time).getTime();
    
    // 使用数值比较，因为枚举别名可能无法正确识别
    const stateValue = typeof proposal.state === 'number' ? proposal.state : Number(proposal.state);
    if (now > endTime || stateValue === ProposalStatus.COMPLETED) {
      status = VotingStatus.ENDED;
    } else {
      status = VotingStatus.PENDING;
    }

    // 暂时使用默认值，后续可以从其他接口获取实际投票数据
    const totalVotes = 0;
    const approveVotes = 0;
    const rejectVotes = 0;
    const approvalRate = 0;

    return {
      proposalId: proposal.id,
      title: proposal.title,
      endTime: voteMeta.end_time,
      totalVotes,
      approveVotes,
      rejectVotes,
      userVotingPower,
      status,
      conditions: {
        minTotalVotes, // 根据提案类型动态计算
        minApprovalRate: 51,     // 最低51%赞成率
        currentTotalVotes: totalVotes,
        currentApprovalRate: approvalRate
      }
    };
  }

  // 如果没有投票元数据，使用提案创建时间计算结束时间（7天后）
  const createdAt = new Date(proposal.createdAt);
  const endTime = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  // 使用提案中的投票数据，如果没有则使用默认值0
  const totalVotes = proposal.voting?.totalVotes || 0;
  const approveRate = proposal.voting?.approve || 0;
  const approveVotes = Math.floor(totalVotes * approveRate / 100);
  const rejectVotes = totalVotes - approveVotes;
  
  // 确定投票状态
  let status: VotingStatus;
  // 使用数值比较，因为枚举别名可能无法正确识别
  const stateValue = typeof proposal.state === 'number' ? proposal.state : Number(proposal.state);
  if (stateValue === ProposalStatus.INITIATION_VOTE) {
    status = VotingStatus.PENDING;
  } else if (stateValue === ProposalStatus.COMPLETED) {
    status = VotingStatus.ENDED;
  } else {
    status = VotingStatus.PENDING;
  }

  const approvalRate = totalVotes > 0 ? (approveVotes / totalVotes) * 100 : 0;

  return {
    proposalId: proposal.id,
    title: proposal.title,
    endTime: endTime.toISOString(),
    totalVotes,
    approveVotes,
    rejectVotes,
    userVotingPower,
    status,
    conditions: {
      minTotalVotes, // 根据提案类型动态计算
      minApprovalRate: 51,     // 最低51%赞成率
      currentTotalVotes: totalVotes,
      currentApprovalRate: approvalRate
    }
  };
};

// 处理投票的返回类型
export interface VoteResult {
  success: boolean;
  error?: string;
  data?: PrepareVoteResponse;
}

// 处理投票
export const handleVote = async (
  did: string,
  voteMetaId: number,
  option: VoteOption,
  t?: (key: string) => string
): Promise<VoteResult> => {
  try {
    const { prepareVote } = await import('@/server/proposal');
    const response = await prepareVote({
      did,
      vote_meta_id: voteMetaId,
    });
    
    // 检查响应是否包含错误信息
    // 成功响应格式：{ did, proof, vote_addr, vote_meta }
    // 错误响应格式：{ code, message, error, ... }
    
    // 如果响应为 null 或 undefined，视为错误
    if (response === null || response === undefined) {
      const errorMsg = getT('modal.voting.errors.prepareFailed', t);
      console.error(errorMsg);
      return { success: false, error: getT('modal.voting.errors.submitFailedEmptyResponse', t) };
    }
    
    // 检查响应对象是否包含错误信息
    if (typeof response === 'object') {
      const responseData = response as unknown as Record<string, unknown>;
      
      // 检查是否有 code 字段（错误响应的标志）
      if ('code' in responseData) {
        const code = responseData.code;
        // 如果 code 存在且不是成功状态（0 或 200），则视为错误
        const codeNum = typeof code === 'number' ? code : (typeof code === 'string' ? parseInt(code, 10) : null);
        
        if (codeNum !== null && codeNum !== 0 && codeNum !== 200) {
          // 提取错误信息
          let errorMessage = getT('modal.voting.errors.submitFailedRetry', t);
          
          // 优先使用 message 字段
          if (typeof responseData.message === 'string' && responseData.message) {
            errorMessage = responseData.message;
          } else if (typeof responseData.error === 'string' && responseData.error) {
            errorMessage = responseData.error;
          } else if (Array.isArray(responseData.errorData) && responseData.errorData.length > 0) {
            const firstError = responseData.errorData[0] as { errorMessage?: string };
            if (firstError?.errorMessage) {
              errorMessage = firstError.errorMessage;
            }
          }
          
          const logMsg = getT('modal.voting.errors.prepareFailedWithCode', t, { code: String(codeNum), message: errorMessage });
          console.error(logMsg, responseData);
          return { success: false, error: errorMessage };
        }
      }
      
      // 验证成功响应是否包含必需的字段
      // 成功响应应该包含 did, vote_addr, vote_meta 等字段
      if (!('code' in responseData)) {
        // 如果没有 code 字段，检查是否包含成功响应的关键字段
        const hasRequiredFields = 
          typeof responseData.did === 'string' &&
          typeof responseData.vote_addr === 'string' &&
          responseData.vote_meta &&
          typeof responseData.vote_meta === 'object';
        
        if (!hasRequiredFields) {
          const errorMsg = getT('modal.voting.errors.prepareFailedInvalidFormat', t);
          console.error(errorMsg, responseData);
          return { success: false, error: getT('modal.voting.errors.submitFailedInvalidFormat', t) };
        }
      }
    }
    
    const approveText = getT('modal.voting.options.approve', t);
    const rejectText = getT('modal.voting.options.reject', t);
    const optionText = option === VoteOption.APPROVE ? approveText : rejectText;
    const logMsg = getT('modal.voting.logs.prepareSuccess', t);
    console.log(`${logMsg}: vote_meta_id=${voteMetaId}, option=${optionText}`, response);
    return { success: true, data: response as PrepareVoteResponse };
  } catch (error) {
    const errorLogMsg = getT('modal.voting.logs.prepareFailed', t);
    console.error(errorLogMsg + ':', error);
    // 提取错误信息
    let errorMessage = getT('modal.voting.errors.submitFailedRetry', t);
    
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      // 尝试从错误对象中提取消息
      // 检查 axios 错误格式
      if ('response' in error && error.response && typeof error.response === 'object') {
        const response = error.response as { data?: unknown };
        if (response.data && typeof response.data === 'object') {
          const data = response.data as Record<string, unknown>;
          // 优先使用 message 字段
          if (typeof data.message === 'string' && data.message) {
            errorMessage = data.message;
          } else if (typeof data.error === 'string' && data.error) {
            errorMessage = data.error;
          } else if (Array.isArray(data.errorData) && data.errorData.length > 0) {
            // 如果有详细错误数据，提取第一个错误消息
            const firstError = data.errorData[0] as { errorMessage?: string };
            if (firstError?.errorMessage) {
              errorMessage = firstError.errorMessage;
            }
          }
        }
      } else if ('message' in error) {
        errorMessage = String(error.message);
      } else if ('error' in error) {
        errorMessage = String(error.error);
      } else if ('detail' in error) {
        errorMessage = String(error.detail);
      }
    }
    
    return { success: false, error: errorMessage };
  }
};

// 检查投票是否通过
export const checkVotingPassed = (votingInfo: VotingInfo): boolean => {
  const totalVotesMet = votingInfo.totalVotes >= votingInfo.conditions.minTotalVotes;
  const approvalRateMet = votingInfo.conditions.currentApprovalRate >= votingInfo.conditions.minApprovalRate;
  
  return totalVotesMet && approvalRateMet;
};

/**
 * 构建并发送投票交易
 * 参照 https://github.com/web5fans/web5-components/blob/dev/vote/user-vote/src/index.ts
 */
export const buildAndSendVoteTransaction = async (
  voteData: PrepareVoteResponse,
  option: VoteOption,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signer: any, // ccc.Signer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,  // ccc.Client
  t?: (key: string) => string
): Promise<{ success: boolean; error?: string; txHash?: string }> => {
  try {
    const { ccc, hexFrom, Address, OutPoint, WitnessArgs, Transaction } = await import('@ckb-ccc/core');
    const { VoteProof } = await import('@/utils/molecules');

    // 1. 解析投票地址
    const voteAddr = await Address.fromString(voteData.vote_addr, client);
    
    // 2. 根据投票选项计算 vote data
    // candidates: ["Abstain", "Agree", "Against"]
    // 选项映射：APPROVE -> "Agree" (index 1), REJECT -> "Against" (index 2)
    const candidates = voteData.vote_meta.candidates || ["Abstain", "Agree", "Against"];
    let voteIndex: number;
    if (option === VoteOption.APPROVE) {
      voteIndex = candidates.indexOf("Agree");
      if (voteIndex === -1) voteIndex = 1; // 默认使用 index 1
    } else {
      voteIndex = candidates.indexOf("Against");
      if (voteIndex === -1) voteIndex = 2; // 默认使用 index 2
    }
    
    const voteNum = 1 << voteIndex;
    // voteData is 32 bit little endian (4 bytes)
    // 将数字转换为 4 字节的 little endian bytes
    const voteDataBytes = new Uint8Array(4);
    const view = new DataView(voteDataBytes.buffer);
    view.setUint32(0, voteNum, true); // true 表示 little endian
    
    console.log("vote index:", voteIndex, "vote num:", voteNum, "vote data bytes:", voteDataBytes);

    // 3. 构建 VoteProof
    // proof 格式: [76, 79, 255, ...] (一维数字数组)
    if (!voteData.proof || !Array.isArray(voteData.proof)) {
      throw new Error(getT('modal.voting.errors.missingProof', t));
    }
    
    // proof 是一个一维数字数组，直接转换为字节数组
    const userSmtProofBytes = Uint8Array.from(voteData.proof);
    
    // 转换为 hex 字符串
    const userSmtProofHex = hexFrom(userSmtProofBytes);
    
    // 构建 VoteProof
    // vote_script_hash 应该是 voteAddr.script.hash()（32 字节的 hash）
    const voteScriptHash = voteAddr.script.hash();
    console.log("vote script hash:", voteScriptHash, "length:", voteScriptHash.length);
    console.log("user smt proof bytes length:", userSmtProofBytes.length);
    console.log("user smt proof hex:", userSmtProofHex);
    
    const voteProof = VoteProof.from({
      vote_script_hash: voteScriptHash,
      user_smt_proof: userSmtProofHex,
    });
    
    const voteProofBytes = voteProof.toBytes();
    const voteProofHex = hexFrom(voteProofBytes);
    console.log("vote proof bytes length:", voteProofBytes.length);
    console.log("vote proof hex:", voteProofHex);

    // 4. 构建投票交易的 cell deps
    // vote meta cell dep
    if (!voteData.vote_meta.tx_hash) {
      throw new Error(getT('modal.voting.errors.missingTxHash', t));
    }
    
    // vote meta outpoint
    // 注意：index 可能需要从 API 返回的数据中获取，如果 API 没有返回，默认使用 0
    // 但根据实际交易，可能需要检查正确的 index
    const voteMetaOutpoint = OutPoint.from({
      txHash: voteData.vote_meta.tx_hash,
      index: 0, // 默认使用 0，如果 API 返回了 index 应该使用返回的值
    });
    
    console.log("vote meta outpoint:", {
      txHash: voteData.vote_meta.tx_hash,
      index: 0,
      outpoint: voteMetaOutpoint
    });
    
    // vote meta cell dep
    // vote meta cell 使用 "code" depType
    const voteMetaCellDep = {
      outPoint: voteMetaOutpoint,
      depType: "code" as const,
    };
    
    console.log("vote meta cell dep:", voteMetaCellDep);

    // vote contract cell dep (需要从配置或 API 获取)
    // 这里使用示例中的值，实际应该从配置或 API 获取
    const voteContractOutpoint = {
      txHash: "0x024ec56c1d2ad4940a96edfd5cfd736bdb0c7d7342da9e74d3033872bdb9cbc1",
      index: 0,
    };
    const voteContractCellDep = {
      outPoint: voteContractOutpoint,
      depType: "code" as const,
    };

    // depGroup cell dep（如果需要）
    // 根据实际交易数据，可能需要添加这个 depGroup
    const depGroupOutpoint = {
      txHash: "0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37",
      index: 0,
    };
    const depGroupCellDep = {
      outPoint: depGroupOutpoint,
      depType: "depGroup" as const,
    };

    // 构建 cell deps 数组，避免重复
    // 检查 vote meta tx_hash 是否与其他 cell deps 重复
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cellDeps: any[] = [voteContractCellDep];
    
    // 只有当 vote meta tx_hash 与 vote contract 不同时才添加 vote meta cell dep
    if (voteData.vote_meta.tx_hash.toLowerCase() !== voteContractOutpoint.txHash.toLowerCase()) {
      cellDeps.push(voteMetaCellDep);
    }
    
    // 添加 depGroup cell dep
    cellDeps.push(depGroupCellDep);

    // 5. 构建 vote type script
    // vote type args 应该是 vote meta outpoint 的 hash 的前 20 字节（blake160）
    // OutPoint.hash() 返回的是完整的 32 字节 hash（blake2b-256），我们需要前 20 字节（blake160）
    const voteMetaOutpointHash = voteMetaOutpoint.hash();
    
    // 确保 hash 格式正确，取前 20 字节（blake160）
    // hash() 返回的是带 0x 前缀的 66 字符字符串（0x + 64个hex字符 = 32字节）
    // 我们需要前 20 字节，即前 42 个字符（0x + 40个hex字符）
    let voteTypeArgs: string;
    if (voteMetaOutpointHash.startsWith('0x')) {
      // 如果包含 0x 前缀，取前 42 个字符（0x + 40个hex字符 = 20字节）
      voteTypeArgs = voteMetaOutpointHash.slice(0, 42);
    } else {
      // 如果不包含 0x 前缀，添加前缀并取前 42 个字符
      voteTypeArgs = `0x${voteMetaOutpointHash.slice(0, 40)}`;
    }
    
    // 验证长度：应该是 42 个字符（0x + 40个hex字符 = 20字节）
    if (voteTypeArgs.length !== 42) {
      const errorMsg = getT('modal.voting.errors.voteTypeArgsLengthError', t, { length: String(voteTypeArgs.length) });
      throw new Error(errorMsg);
    }
    
 
    
    const voteTypeScript = {
      codeHash: "0xb140de2d7d1536cfdcb82da7520475edce5785dff90edae9073c1143d88f50c5",
      args: voteTypeArgs,
      hashType: "type" as const,
    };

    // 6. 创建投票交易
    const tx = Transaction.from({
      cellDeps: cellDeps,
      outputs: [
        {
          lock: voteAddr.script,
          type: voteTypeScript,
        }
      ],
      // outputsData 应该是 bytes 格式，使用 hexFrom 将 bytes 转换为 hex 字符串
      outputsData: [hexFrom(voteDataBytes)],
    });

    // 7. 完成输入和费用
    await tx.completeInputsByCapacity(signer);
    await tx.completeFeeBy(signer);

    // 8. 设置 vote proof 到 witness
    // 检查 inputs 数量，确保 witnesses 数组有足够的元素
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inputs = (tx as any).inputs || [];
    const inputsCount = inputs.length;
    
  
    
    // 如果 witnesses 为空或数量不足，需要初始化
    if (!tx.witnesses || tx.witnesses.length < inputsCount) {
      // 初始化 witnesses 数组，每个 input 需要一个 witness
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tx as any).witnesses = new Array(inputsCount).fill('0x');
    }
    
    // 获取第一个 witness（对应第一个 input）
    const firstWitness = tx.witnesses[0];
    
    // 创建或更新 witness
    // 根据示例代码，vote proof 应该放在 witness 的 outputType 字段中
    let witness: InstanceType<typeof WitnessArgs>;
    if (!firstWitness || firstWitness === '0x') {
      // 如果第一个 witness 为空，创建一个新的 WitnessArgs，只设置 outputType
      witness = WitnessArgs.from({
        outputType: hexFrom(voteProofBytes),
      });
    } else {
      // 如果第一个 witness 已存在，解析它并更新 outputType
      let witnessBytes: Uint8Array;
      if (typeof firstWitness === 'string') {
        // 如果是 hex 字符串，需要转换为 bytes
        const { bytesFrom } = await import('@ckb-ccc/core');
        witnessBytes = bytesFrom(firstWitness);
      } else {
        // 假设是 Uint8Array 或其他可转换为 bytes 的类型
        try {
          witnessBytes = new Uint8Array(firstWitness as ArrayLike<number>);
        } catch (e) {
          const errorMsg = getT('modal.voting.errors.witnessFormatError', t, { error: String(e) });
          throw new Error(errorMsg);
        }
      }
      
      witness = WitnessArgs.fromBytes(witnessBytes);
      // 更新 outputType，保留其他字段（如 inputType）
      witness.outputType = hexFrom(voteProofBytes);
      console.log("更新现有 witness 的 outputType");
    }
    

    
    // 设置 witness 到交易中
    // 使用 setWitnessArgsAt 方法（如果存在）或直接设置
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (tx as any).setWitnessArgsAt === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tx as any).setWitnessArgsAt(0, witness);
    } else {
      tx.witnesses[0] = hexFrom(witness.toBytes());
    }
    
   

    // 在设置 witness 之后重新计算费用，确保费用充足
    // 因为 witness 的大小会影响交易费用
    // 注意：completeFeeBy 可能会添加找零输出，需要确保 outputsData 数组长度匹配
    await tx.completeFeeBy(signer);
    
    // 确保 outputsData 数组长度与 outputs 数组长度匹配
    // completeFeeBy 可能会添加找零输出，需要为这些输出添加空的 outputsData
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentOutputs = (tx as any).outputs || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentOutputsData = (tx as any).outputsData || [];
    
    // 如果 outputs 数量大于 outputsData 数量，为新增的输出添加空的 outputsData
    if (currentOutputs.length > currentOutputsData.length) {
      const additionalOutputsData = new Array(currentOutputs.length - currentOutputsData.length).fill('0x');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tx as any).outputsData = [...currentOutputsData, ...additionalOutputsData];
    }
    


    // 9. 签名并发送交易
    const signedTx = await signer.signTransaction(tx);
    console.log("signed tx:", ccc.stringify(signedTx));

    const txHash = await client.sendTransaction(signedTx);
    const txHashLogMsg = getT('modal.voting.logs.txHash', t);
    console.log(`${txHashLogMsg}:`, txHash);

    return { success: true, txHash };
  } catch (error) {
    const errorLogMsg = getT('modal.voting.logs.buildTransactionFailed', t);
    console.error(errorLogMsg + ':', error);
    const defaultErrorMsg = getT('modal.voting.errors.buildTransactionFailed', t);
    const errorMessage = error instanceof Error ? error.message : defaultErrorMsg;
    return { success: false, error: errorMessage };
  }
};
