import copy from "copy-to-clipboard";
import { toast } from "react-hot-toast";

import { logger } from '@/lib/logger';
/**
 * 通用的复制到剪贴板方法
 * @param {string} text - 要复制的文本
 * @param {string} successMessage - 成功提示信息
 */
export const handleCopy = (text: string, successMessage: string) => {
  try {
    copy(text);
    toast.success(successMessage);
  } catch (error) {
    logger.error("Copy failed:");
    toast.error("Copy failed, please try again");
  }
};

/**
 * 复制地址到剪贴板（专门用于地址复制）
 * @param {string} address - 要复制的地址
 * @param {string} successMessage - 成功提示信息
 */
export const copyAddress = (address: string, successMessage: string) => {
  handleCopy(address, successMessage);
};

/**
 * 复制文本到剪贴板（通用文本复制）
 * @param {string} text - 要复制的文本
 * @param {string} successMessage - 成功提示信息
 */
export const copyText = (text: string, successMessage: string) => {
  handleCopy(text, successMessage);
};

/**
 * 格式化 handle 显示
 * 如果 handle 长度大于 9，显示为：前三个字符 + '...' + 最后三个字符
 * @param {string} handle - 要格式化的 handle
 * @returns {string} 格式化后的 handle
 */
export const formatHandleDisplay = (handle: string | undefined | null): string => {
  if (!handle) return '';
  
  // 提取 handle 第一个 . 前面的部分
  const handlePart = handle.split('.')[0];
  
  // 如果长度大于 9，则截取显示
  if (handlePart.length >9) {
    return `${handlePart.slice(0, 3)}...${handlePart.slice(-3)}`;
  }
  
  return handlePart;
};

/**
 * 验证 JSON 签名格式：必须且只能有 signature、identity 和 signType 这三个 key
 * @param {string} jsonString - 要验证的 JSON 字符串
 * @returns {{ valid: boolean; error?: string }} 验证结果，包含是否有效和错误信息
 */
export const validateJsonSignature = (jsonString: string): { valid: boolean; error?: string } => {
  try {
    const json = JSON.parse(jsonString);
    const keys = Object.keys(json);
    const requiredKeys = ['signature', 'identity', 'signType'];
    
    // 检查是否有额外的 key
    const extraKeys = keys.filter(key => !requiredKeys.includes(key));
    if (extraKeys.length > 0) {
      return {
        valid: false,
        error: `JSON 包含不允许的 key: ${extraKeys.join(', ')}`
      };
    }
    
    // 检查是否缺少必需的 key
    const missingKeys = requiredKeys.filter(key => !keys.includes(key));
    if (missingKeys.length > 0) {
      return {
        valid: false,
        error: `JSON 缺少必需的 key: ${missingKeys.join(', ')}`
      };
    }
    
    // 检查 key 的数量是否正好是 3
    if (keys.length !== 3) {
      return {
        valid: false,
        error: `JSON 必须且只能有 3 个 key，当前有 ${keys.length} 个`
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `JSON 解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
};
