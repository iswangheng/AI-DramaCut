// ============================================
// 用户友好的错误提示
// 通过 WebSocket 推送错误到前端
// ============================================

import { wsServer } from '../ws/server';
import { classifyError, getRetryStrategy } from './retry-strategy';

// ============================================
// 错误提示级别
// ============================================

export enum ErrorLevel {
  INFO = 'info',         // 信息
  WARNING = 'warning',   // 警告
  ERROR = 'error',       // 错误
  CRITICAL = 'critical', // 严重错误
}

// ============================================
// 用户友好的错误消息映射
// ============================================

interface ErrorMessage {
  title: string;          // 错误标题
  description: string;    // 详细描述
  suggestion?: string;    // 解决建议
  level: ErrorLevel;      // 错误级别
  showToUser: boolean;    // 是否显示给用户
  technical?: string;     // 技术细节（用于调试）
}

/**
 * 获取用户友好的错误消息
 *
 * @param error - 错误对象
 * @param context - 错误上下文信息
 * @returns 用户友好的错误消息
 */
export function getUserFriendlyError(
  error: Error | string,
  context: {
    jobType?: string;
    operation?: string;
    retryCount?: number;
  } = {}
): ErrorMessage {
  const errorAnalysis = classifyError(error);
  const retryStrategy = getRetryStrategy(
    errorAnalysis.type,
    context.retryCount || 0
  );

  // 基于错误类型生成用户友好的消息
  switch (errorAnalysis.type) {
    case 'network':
      return {
        title: '网络连接失败',
        description: errorAnalysis.userMessage,
        suggestion: '请检查网络连接，系统将自动重试',
        level: retryStrategy.shouldRetry ? ErrorLevel.WARNING : ErrorLevel.ERROR,
        showToUser: true,
        technical: errorAnalysis.message,
      };

    case 'timeout':
      return {
        title: '处理超时',
        description: '文件处理时间过长，已超时',
        suggestion: retryStrategy.shouldRetry
          ? '系统将使用更优化的参数重试'
          : '请尝试上传较小的文件或分段处理',
        level: retryStrategy.shouldRetry ? ErrorLevel.WARNING : ErrorLevel.ERROR,
        showToUser: true,
        technical: errorAnalysis.message,
      };

    case 'quota':
      return {
        title: 'API 配额已达上限',
        description: 'AI 服务调用次数已达今日限制',
        suggestion: '请等待配额自动恢复（通常每24小时重置）',
        level: ErrorLevel.ERROR,
        showToUser: true,
        technical: errorAnalysis.message,
      };

    case 'rate_limit':
      return {
        title: '请求过于频繁',
        description: '短时间内请求次数过多',
        suggestion: '请稍后再试，系统将自动等待后重试',
        level: ErrorLevel.WARNING,
        showToUser: true,
        technical: errorAnalysis.message,
      };

    case 'server_error':
      return {
        title: '服务暂时不可用',
        description: 'AI 服务正在维护或过载',
        suggestion: '请稍后再试，系统将自动重试',
        level: ErrorLevel.WARNING,
        showToUser: true,
        technical: errorAnalysis.message,
      };

    case 'client_error':
      return {
        title: '请求参数有误',
        description: '提交的数据格式不正确',
        suggestion: '请检查文件格式和参数设置后重试',
        level: ErrorLevel.ERROR,
        showToUser: true,
        technical: errorAnalysis.message,
      };

    case 'file_error':
      return {
        title: '文件处理失败',
        description: '文件读取或处理过程中出错',
        suggestion: '请检查文件是否完整或损坏',
        level: ErrorLevel.ERROR,
        showToUser: true,
        technical: errorAnalysis.message,
      };

    default:
      return {
        title: '处理过程中出现错误',
        description: errorAnalysis.userMessage,
        suggestion: '系统将自动重试，如果问题持续存在请联系支持',
        level: ErrorLevel.WARNING,
        showToUser: true,
        technical: errorAnalysis.message,
      };
  }
}

// ============================================
// 错误通知
// ============================================

/**
 * 发送错误通知到前端
 *
 * @param jobId - BullMQ 任务 ID
 * @param error - 错误对象
 * @param context - 错误上下文
 */
export function sendErrorNotification(
  jobId: string,
  error: Error | string,
  context: {
    jobType?: string;
    operation?: string;
    retryCount?: number;
  } = {}
): void {
  const errorMessage = getUserFriendlyError(error, context);

  // 通过 WebSocket 发送错误通知
  wsServer.broadcast(jobId, {
    type: 'error',
    data: {
      jobId,
      level: errorMessage.level,
      title: errorMessage.title,
      description: errorMessage.description,
      suggestion: errorMessage.suggestion,
      timestamp: new Date().toISOString(),
    },
  });

  // 同时记录到控制台
  console.error(`❌ [${errorMessage.level.toUpperCase()}] ${errorMessage.title}`);
  console.error(`   描述: ${errorMessage.description}`);
  if (errorMessage.suggestion) {
    console.error(`   建议: ${errorMessage.suggestion}`);
  }
}

/**
 * 发送进度通知到前端
 *
 * @param jobId - BullMQ 任务 ID
 * @param progress - 进度（0-100）
 * @param message - 进度消息
 */
export function sendProgressNotification(
  jobId: string,
  progress: number,
  message: string
): void {
  wsServer.broadcast(jobId, {
    type: 'progress',
    data: {
      jobId,
      progress,
      message,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * 发送警告通知到前端
 *
 * @param jobId - BullMQ 任务 ID
 * @param title - 警告标题
 * @param message - 警告消息
 */
export function sendWarningNotification(
  jobId: string,
  title: string,
  message: string
): void {
  wsServer.broadcast(jobId, {
    type: 'warning',
    data: {
      jobId,
      title,
      message,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * 发送成功通知到前端
 *
 * @param jobId - BullMQ 任务 ID
 * @param message - 成功消息
 * @param result - 结果数据
 */
export function sendSuccessNotification(
  jobId: string,
  message: string,
  result?: unknown
): void {
  wsServer.broadcast(jobId, {
    type: 'success',
    data: {
      jobId,
      message,
      result,
      timestamp: new Date().toISOString(),
    },
  });
}

// ============================================
// 前端友好的错误格式化器
// ============================================

/**
 * 格式化错误消息用于前端显示
 *
 * @param error - 错误对象
 * @returns 格式化的错误消息
 */
export function formatErrorForDisplay(error: Error | string): {
  title: string;
  message: string;
  canRetry: boolean;
  suggestion?: string;
} {
  const errorAnalysis = classifyError(error);
  const retryStrategy = getRetryStrategy(errorAnalysis.type, 0);

  return {
    title: errorAnalysis.userMessage.split('，')[0], // 取第一句话作为标题
    message: errorAnalysis.userMessage,
    canRetry: retryStrategy.shouldRetry,
    suggestion: retryStrategy.action === 'abort'
      ? '请检查上述问题后重试'
      : '系统将自动重试，请稍候',
  };
}

// ============================================
// 批量错误处理
// ============================================

/**
 * 处理批量任务的错误
 *
 * @param errors - 错误数组
 * @param jobId - BullMQ 任务 ID
 */
export function handleBatchErrors(
  errors: Array<{ item: unknown; error: Error }>,
  jobId: string
): void {
  const totalErrors = errors.length;
  const successCount = errors.length - totalErrors;

  if (totalErrors === 0) {
    sendSuccessNotification(jobId, `批量处理完成，全部成功 (${successCount} 项)`);
    return;
  }

  // 统计错误类型
  const errorTypes = new Map<string, number>();
  errors.forEach(({ error }) => {
    const { type } = classifyError(error);
    errorTypes.set(type, (errorTypes.get(type) || 0) + 1);
  });

  // 生成错误摘要
  const errorSummary = Array.from(errorTypes.entries())
    .map(([type, count]) => `${type}: ${count}次`)
    .join(', ');

  sendErrorNotification(jobId, `批量处理完成，${totalErrors}项失败`, {
    operation: 'batch',
  });

  // 发送详细的错误报告
  wsServer.broadcast(jobId, {
    type: 'batch_error',
    data: {
      jobId,
      total: errors.length,
      failed: totalErrors,
      success: successCount,
      errorSummary,
      timestamp: new Date().toISOString(),
    },
  });
}
