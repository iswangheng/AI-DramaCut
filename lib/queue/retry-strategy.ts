// ============================================
// 智能重试策略
// 根据错误类型采用不同的重试策略
// ============================================

import { incrementRetryCount } from './checkpoint';

// ============================================
// 错误类型定义
// ============================================

export enum ErrorType {
  NETWORK = 'network',           // 网络错误
  TIMEOUT = 'timeout',           // 超时错误
  QUOTA = 'quota',               // API 配额用完
  RATE_LIMIT = 'rate_limit',     // 速率限制
  SERVER_ERROR = 'server_error', // 服务器错误 (5xx)
  CLIENT_ERROR = 'client_error', // 客户端错误 (4xx)
  FILE_ERROR = 'file_error',     // 文件错误
  UNKNOWN = 'unknown',           // 未知错误
}

export interface RetryStrategy {
  shouldRetry: boolean;          // 是否应该重试
  delay: number;                 // 重试延迟（毫秒）
  message: string;               // 用户友好的错误消息
  action?: 'retry' | 'fallback' | 'abort'; // 执行动作
}

// ============================================
// 错误分类
// ============================================

/**
 * 分析错误类型
 *
 * @param error - 错误对象
 * @returns 错误类型和详细信息
 */
export function classifyError(error: Error | string): {
  type: ErrorType;
  message: string;
  userMessage: string;
} {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerError = errorMessage.toLowerCase();

  // 网络错误
  if (
    lowerError.includes('network') ||
    lowerError.includes('connection') ||
    lowerError.includes('econnrefused') ||
    lowerError.includes('enotfound') ||
    lowerError.includes('etimedout') ||
    lowerError.includes('socket')
  ) {
    return {
      type: ErrorType.NETWORK,
      message: errorMessage,
      userMessage: '网络连接失败，正在尝试重新连接...',
    };
  }

  // 超时错误
  if (
    lowerError.includes('timeout') ||
    lowerError.includes('timed out') ||
    lowerError.includes('请求超时')
  ) {
    return {
      type: ErrorType.TIMEOUT,
      message: errorMessage,
      userMessage: '请求超时，正在使用更优化的参数重试...',
    };
  }

  // API 配额用完
  if (
    lowerError.includes('quota') ||
    lowerError.includes('limit') ||
    lowerError.includes('429') ||
    lowerError.includes('rate limit')
  ) {
    return {
      type: ErrorType.QUOTA,
      message: errorMessage,
      userMessage: 'API 配额已达上限，等待配额恢复后重试...',
    };
  }

  // 服务器错误 (5xx)
  if (
    lowerError.includes('500') ||
    lowerError.includes('502') ||
    lowerError.includes('503') ||
    lowerError.includes('504')
  ) {
    return {
      type: ErrorType.SERVER_ERROR,
      message: errorMessage,
      userMessage: '服务暂时不可用，正在等待恢复...',
    };
  }

  // 客户端错误 (4xx，除了 429)
  if (
    lowerError.includes('400') ||
    lowerError.includes('401') ||
    lowerError.includes('403') ||
    lowerError.includes('404')
  ) {
    return {
      type: ErrorType.CLIENT_ERROR,
      message: errorMessage,
      userMessage: '请求参数有误，请检查后重试',
    };
  }

  // 文件错误
  if (
    lowerError.includes('no such file') ||
    lowerError.includes('file not found') ||
    lowerError.includes('permission denied') ||
    lowerError.includes('eof')
  ) {
    return {
      type: ErrorType.FILE_ERROR,
      message: errorMessage,
      userMessage: '文件读取失败，请检查文件是否存在',
    };
  }

  // 未知错误
  return {
    type: ErrorType.UNKNOWN,
    message: errorMessage,
    userMessage: '处理过程中出现错误，正在重试...',
  };
}

// ============================================
// 重试策略
// ============================================

/**
 * 获取重试策略
 *
 * @param errorType - 错误类型
 * @param retryCount - 当前重试次数
 * @returns 重试策略
 */
export function getRetryStrategy(
  errorType: ErrorType,
  retryCount: number
): RetryStrategy {
  switch (errorType) {
    case ErrorType.NETWORK:
      // 网络错误：立即重试，最多 5 次
      return {
        shouldRetry: retryCount < 5,
        delay: 1000, // 1 秒后重试
        message: '网络连接失败，正在重试...',
        action: 'retry',
      };

    case ErrorType.TIMEOUT:
      // 超时错误：指数退避，最多 3 次
      return {
        shouldRetry: retryCount < 3,
        delay: Math.min(2000 * Math.pow(2, retryCount), 10000), // 2s, 4s, 8s
        message: '请求超时，正在优化参数后重试...',
        action: 'retry',
      };

    case ErrorType.QUOTA:
      // 配额用完：等待 60 秒，最多 2 次
      return {
        shouldRetry: retryCount < 2,
        delay: 60000, // 60 秒后重试
        message: 'API 配额已达上限，等待配额恢复...',
        action: 'retry',
      };

    case ErrorType.RATE_LIMIT:
      // 速率限制：使用指数退避，最多 3 次
      return {
        shouldRetry: retryCount < 3,
        delay: Math.min(5000 * Math.pow(2, retryCount), 30000), // 5s, 10s, 20s
        message: '请求过于频繁，正在等待后重试...',
        action: 'retry',
      };

    case ErrorType.SERVER_ERROR:
      // 服务器错误：等待 5 秒，最多 3 次
      return {
        shouldRetry: retryCount < 3,
        delay: 5000,
        message: '服务暂时不可用，正在等待恢复...',
        action: 'retry',
      };

    case ErrorType.CLIENT_ERROR:
      // 客户端错误：不重试
      return {
        shouldRetry: false,
        delay: 0,
        message: '请求参数有误，请检查输入',
        action: 'abort',
      };

    case ErrorType.FILE_ERROR:
      // 文件错误：不重试
      return {
        shouldRetry: false,
        delay: 0,
        message: '文件读取失败，请检查文件是否存在',
        action: 'abort',
      };

    case ErrorType.UNKNOWN:
      // 未知错误：最多重试 2 次
      return {
        shouldRetry: retryCount < 2,
        delay: 3000,
        message: '处理过程中出现错误，正在重试...',
        action: 'retry',
      };

    default:
      return {
        shouldRetry: false,
        delay: 0,
        message: '未知错误类型',
        action: 'abort',
      };
  }
}

/**
 * 执行智能重试
 *
 * @param fn - 要执行的异步函数
 * @param jobId - BullMQ 任务 ID
 * @returns 函数执行结果
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  jobId: string
): Promise<T> {
  let retryCount = 0;
  const maxRetries = 5;

  while (retryCount < maxRetries) {
    try {
      // 执行函数
      const result = await fn();
      return result;

    } catch (error) {
      retryCount++;

      // 增加重试计数
      await incrementRetryCount(jobId);

      // 分析错误类型
      const { type, userMessage } = classifyError(
        error instanceof Error ? error : new Error(String(error))
      );

      // 获取重试策略
      const strategy = getRetryStrategy(type, retryCount);

      console.error(
        `❌ 任务失败 (${jobId} - 第 ${retryCount} 次): ${strategy.message}`
      );

      // 如果不应该重试，抛出错误
      if (!strategy.shouldRetry) {
        throw new Error(`${strategy.message} (错误类型: ${type})`);
      }

      // 等待后重试
      console.log(
        `⏳ ${strategy.message} (${strategy.delay / 1000}秒后重试...)`
      );

      await sleep(strategy.delay);
    }
  }

  throw new Error('重试次数已达上限');
}

/**
 * 睡眠函数
 *
 * @param ms - 睡眠时间（毫秒）
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// 降级策略
// ============================================

/**
 * 执行带降级的函数
 *
 * @param primary - 主函数
 * @param fallback - 降级函数
 * @param jobId - BullMQ 任务 ID
 * @returns 函数执行结果
 */
export async function executeWithFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  jobId: string
): Promise<T> {
  try {
    // 尝试主方案
    console.log(`🎯 尝试主方案: ${jobId}`);
    return await primary();
  } catch (primaryError) {
    console.error(`⚠️  主方案失败 (${jobId}):`, primaryError);

    // 判断是否可以降级
    const { type } = classifyError(
      primaryError instanceof Error ? primaryError : new Error(String(primaryError))
    );

    // 某些错误类型不应该降级
    if (type === ErrorType.CLIENT_ERROR || type === ErrorType.FILE_ERROR) {
      throw primaryError;
    }

    try {
      // 使用降级方案
      console.log(`🔄 使用降级方案: ${jobId}`);
      return await fallback();
    } catch (fallbackError) {
      console.error(`❌ 降级方案也失败 (${jobId}):`, fallbackError);
      throw new Error(`主方案和降级方案都失败了`);
    }
  }
}
