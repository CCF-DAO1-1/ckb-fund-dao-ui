/**
 * API 错误类型定义
 */

import { AxiosError } from 'axios';

/**
 * 标准化的 API 错误类
 */
export class APIError extends Error {
  public statusCode: number;
  public errorCode?: string;
  public originalError?: unknown;
  public context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    originalError?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.originalError = originalError;
    this.context = context;

    // 保持正确的原型链
    Object.setPrototypeOf(this, APIError.prototype);
  }

  /**
   * 从 Axios 错误创建 APIError
   */
  static fromAxiosError(error: AxiosError): APIError {
    const response = error.response;
    const statusCode = response?.status || 500;
    const responseData = response?.data as Record<string, unknown> | undefined;

    // 尝试从响应中提取错误信息
    const message =
      (responseData?.message as string) ||
      (responseData?.error as string) ||
      error.message ||
      '请求失败';

    const errorCode =
      (responseData?.code as string) ||
      (responseData?.errorCode as string);

    return new APIError(
      message,
      statusCode,
      errorCode,
      error,
      {
        url: error.config?.url,
        method: error.config?.method,
        responseData,
      }
    );
  }

  /**
   * 从通用错误创建 APIError
   */
  static fromError(error: unknown, defaultMessage: string = '未知错误'): APIError {
    if (error instanceof APIError) {
      return error;
    }

    if (error instanceof Error) {
      return new APIError(
        error.message || defaultMessage,
        500,
        undefined,
        error
      );
    }

    return new APIError(
      defaultMessage,
      500,
      undefined,
      error
    );
  }

  /**
   * 判断是否是认证错误
   */
  isAuthError(): boolean {
    return this.statusCode === 401;
  }

  /**
   * 判断是否是权限错误
   */
  isPermissionError(): boolean {
    return this.statusCode === 403;
  }

  /**
   * 判断是否是未找到错误
   */
  isNotFoundError(): boolean {
    return this.statusCode === 404;
  }

  /**
   * 判断是否是服务器错误
   */
  isServerError(): boolean {
    return this.statusCode >= 500;
  }

  /**
   * 判断是否是客户端错误
   */
  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  AUTH = 'AUTH_ERROR',
  PERMISSION = 'PERMISSION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  SERVER = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

/**
 * 根据错误获取错误类型
 */
export function getErrorType(error: APIError): ErrorType {
  if (error.isAuthError()) return ErrorType.AUTH;
  if (error.isPermissionError()) return ErrorType.PERMISSION;
  if (error.isNotFoundError()) return ErrorType.NOT_FOUND;
  if (error.isServerError()) return ErrorType.SERVER;
  if (error.statusCode === 400) return ErrorType.VALIDATION;
  if (error.statusCode === 0) return ErrorType.NETWORK;
  return ErrorType.UNKNOWN;
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyErrorMessage(error: APIError, locale: 'zh' | 'en' = 'zh'): string {
  const errorType = getErrorType(error);

  const messages: Record<ErrorType, { zh: string; en: string }> = {
    [ErrorType.NETWORK]: {
      zh: '网络连接失败，请检查网络后重试',
      en: 'Network connection failed, please check your network',
    },
    [ErrorType.AUTH]: {
      zh: '登录已过期，请重新登录',
      en: 'Login expired, please login again',
    },
    [ErrorType.PERMISSION]: {
      zh: '没有权限执行此操作',
      en: 'Permission denied',
    },
    [ErrorType.NOT_FOUND]: {
      zh: '请求的资源不存在',
      en: 'Resource not found',
    },
    [ErrorType.VALIDATION]: {
      zh: '输入数据有误，请检查后重试',
      en: 'Invalid input data',
    },
    [ErrorType.SERVER]: {
      zh: '服务器错误，请稍后重试',
      en: 'Server error, please try again later',
    },
    [ErrorType.UNKNOWN]: {
      zh: '操作失败，请稍后重试',
      en: 'Operation failed, please try again later',
    },
  };

  // 优先使用 API 返回的错误消息
  if (error.message && error.message !== '请求失败') {
    return error.message;
  }

  return messages[errorType][locale];
}
