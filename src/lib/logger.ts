/**
 * 统一的日志工具
 * 根据环境自动控制日志输出
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isClient = typeof window !== 'undefined';

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (context && Object.keys(context).length > 0) {
      return `${prefix} ${message}\n${JSON.stringify(context, null, 2)}`;
    }

    return `${prefix} ${message}`;
  }

  /**
   * 开发环境日志 - 仅在开发环境输出
   */
  log(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      if (context) {
        console.log(`[LOG] ${message}`, context);
      } else {
        console.log(`[LOG] ${message}`);
      }
    }
  }

  /**
   * 信息日志
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      if (context) {
        console.info(`[INFO] ${message}`, context);
      } else {
        console.info(`[INFO] ${message}`);
      }
    }
  }

  /**
   * 警告日志 - 开发和生产环境都输出
   */
  warn(message: string, context?: LogContext): void {
    if (context) {
      console.warn(`[WARN] ${message}`, context);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  }

  /**
   * 错误日志 - 开发和生产环境都输出
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    };

    console.error(`[ERROR] ${message}`, errorContext);

    // 生产环境可以在这里集成错误追踪服务（如 Sentry）
    if (!this.isDevelopment && this.isClient) {
      // TODO: 集成错误追踪服务
      // Sentry.captureException(error, { contexts: { custom: errorContext } });
    }
  }

  /**
   * 调试日志 - 仅在开发环境输出详细信息
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      if (context) {
        console.debug(`[DEBUG] ${message}`, context);
      } else {
        console.debug(`[DEBUG] ${message}`);
      }
    }
  }

  /**
   * API 请求日志
   */
  apiRequest(method: string, url: string, context?: LogContext): void {
    this.log(`API Request: ${method} ${url}`, context);
  }

  /**
   * API 响应日志
   */
  apiResponse(method: string, url: string, status: number, context?: LogContext): void {
    const logContext = { status, ...context };

    if (status >= 200 && status < 300) {
      this.log(`API Success: ${method} ${url}`, logContext);
    } else if (status >= 400) {
      this.warn(`API Error: ${method} ${url}`, logContext);
    }
  }

  /**
   * API 错误日志
   */
  apiError(method: string, url: string, error: Error | unknown, context?: LogContext): void {
    this.error(`API Failed: ${method} ${url}`, error, context);
  }
}

// 导出单例
export const logger = new Logger();

// 默认导出
export default logger;
