// ============================================
// 训练日志广播器
// 通过WebSocket实时推送训练日志到前端
// ============================================

import { wsServer } from '../ws/server';

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface TrainingLogMessage {
  trainingId: number;
  level: LogLevel;
  timestamp: Date;
  message: string;
  step?: string; // 当前步骤，如 "提取关键帧", "ASR转录", "AI分析"
  progress?: number; // 进度百分比
}

/**
 * 训练日志广播器单例
 */
class TrainingLogger {
  private subscribers: Map<number, Set<any>> = new Map();

  /**
   * 广播训练日志到所有订阅者
   */
  broadcast(log: TrainingLogMessage) {
    // 通过WebSocket广播
    wsServer.broadcast('training_log', {
      ...log,
      timestamp: log.timestamp.toISOString(),
    });

    // 同时记录到控制台
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };

    console.log(`${emoji[log.level]} [训练#${log.trainingId}] ${log.message}`);
  }

  /**
   * 便捷方法：发送信息日志
   */
  info(trainingId: number, message: string, step?: string) {
    this.broadcast({
      trainingId,
      level: 'info',
      timestamp: new Date(),
      message,
      step,
    });
  }

  /**
   * 便捷方法：发送成功日志
   */
  success(trainingId: number, message: string, step?: string) {
    this.broadcast({
      trainingId,
      level: 'success',
      timestamp: new Date(),
      message,
      step,
    });
  }

  /**
   * 便捷方法：发送警告日志
   */
  warning(trainingId: number, message: string, step?: string) {
    this.broadcast({
      trainingId,
      level: 'warning',
      timestamp: new Date(),
      message,
      step,
    });
  }

  /**
   * 便捷方法：发送错误日志
   */
  error(trainingId: number, message: string, step?: string) {
    this.broadcast({
      trainingId,
      level: 'error',
      timestamp: new Date(),
      message,
      step,
    });
  }

  /**
   * 发送进度更新
   */
  progress(trainingId: number, progress: number, step: string, message: string) {
    this.broadcast({
      trainingId,
      level: 'info',
      timestamp: new Date(),
      message,
      step,
      progress,
    });
  }
}

// 导出单例
export const trainingLogger = new TrainingLogger();
