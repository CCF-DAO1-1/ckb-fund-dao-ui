/**
 * 统一的错误处理器
 * 处理所有 API 错误，提供统一的错误提示和日志记录
 */

import toast from 'react-hot-toast';
import { APIError, getUserFriendlyErrorMessage, ErrorType, getErrorType } from '@/types/errors';
import { logger } from '@/lib/logger';
import { AxiosError } from 'axios';

const isServer = typeof window === 'undefined';

/**
 * 错误处理选项
 */
export interface ErrorHandlerOptions {
  /** 是否显示 Toast 提示 */
  showToast?: boolean;
  /** 自定义错误消息 */
  customMessage?: string;
  /** 错误上下文信息 */
  context?: Record<string, unknown>;
  /** 是否静默处理（不显示任何提示） */
  silent?: boolean;
  /** 语言 */
  locale?: 'zh' | 'en';
  /** 错误回调 */
  onError?: (error: APIError) => void;
}

/**
 * 统一的错误处理函数
 */
export function handleAPIError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): APIError {
  const {
    showToast = true,
    customMessage,
    context,
    silent = false,
    locale = 'zh',
    onError,
  } = options;

  // 转换为标准 APIError
  let apiError: APIError;
  if (error instanceof APIError) {
    apiError = error;
  } else if ((error as AxiosError)?.isAxiosError) {
    apiError = APIError.fromAxiosError(error as AxiosError);
  } else {
    apiError = APIError.fromError(error);
  }

  // 添加上下文信息
  if (context) {
    apiError.context = { ...apiError.context, ...context };
  }

  // 记录错误日志
  const errorType = getErrorType(apiError);
  logger.error(
    `API Error [${errorType}]: ${apiError.message}`,
    apiError.originalError,
    apiError.context
  );

  // 客户端错误提示
  if (!isServer && !silent) {
    const errorMessage = customMessage || getUserFriendlyErrorMessage(apiError, locale);

    if (showToast) {
      // 根据错误类型使用不同的 toast 样式
      if (errorType === ErrorType.AUTH) {
        toast.error(errorMessage, { duration: 4000 });
      } else if (errorType === ErrorType.PERMISSION) {
        toast.error(errorMessage, { duration: 3000 });
      } else if (errorType === ErrorType.SERVER) {
        toast.error(errorMessage, { duration: 5000 });
      } else {
        toast.error(errorMessage);
      }
    }
  }

  // 执行错误回调
  if (onError) {
    onError(apiError);
  }

  return apiError;
}

/**
 * 处理认证错误（401）
 * 可以在这里触发登出逻辑
 */
export function handleAuthError(error: APIError): void {
  logger.warn('Authentication error detected', {
    statusCode: error.statusCode,
    errorCode: error.errorCode,
  });

  // TODO: 触发登出逻辑
  // 可以使用 Zustand store 或其他状态管理
  // const { logout } = useUserInfoStore.getState();
  // logout();

  // 可选：重定向到登录页
  if (!isServer && typeof window !== 'undefined') {
    // const locale = window.location.pathname.split('/')[1] || 'zh';
    // window.location.href = `/${locale}/login`;
  }
}

/**
 * 处理 404 错误
 */
export function handle404Error(): void {
  if (!isServer && typeof window !== 'undefined') {
    const locale = window.location.pathname.split('/')[1] || 'zh';
    window.location.href = `/${locale}/error/404`;
  }
}

/**
 * 创建一个带错误处理的异步函数包装器
 */
export function withErrorHandler<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: ErrorHandlerOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleAPIError(error, options);
    }
  }) as T;
}

/**
 * 用于 React Hooks 的错误处理辅助函数
 */
export function useErrorHandler() {
  const handleError = (error: unknown, options?: ErrorHandlerOptions) => {
    return handleAPIError(error, options);
  };

  return { handleError };
}
