// ============================================
// 断点续传工具
// 支持任务失败后从断点恢复
// ============================================

import { db } from '../db/client';
import { queueJobs } from '../db/schema';
import { eq } from 'drizzle-orm';

interface CheckpointData {
  progress: number;           // 当前进度（0-100）
  data: Record<string, unknown>; // 任意断点数据
  timestamp: number;          // 保存时间戳
}

/**
 * 保存任务断点
 *
 * @param jobId - BullMQ 任务 ID
 * @param progress - 当前进度（0-100）
 * @param data - 断点数据（可以是任意结构）
 */
export async function saveCheckpoint(
  jobId: string,
  progress: number,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const checkpointData: CheckpointData = {
      progress,
      data,
      timestamp: Date.now(),
    };

    await db
      .update(queueJobs)
      .set({
        checkpoint: JSON.stringify(checkpointData),
        progress,
        updatedAt: new Date(),
      })
      .where(eq(queueJobs.jobId, jobId));

    console.log(`💾 断点已保存: ${jobId} (${progress}%)`);
  } catch (error) {
    console.error(`保存断点失败 (${jobId}):`, error);
  }
}

/**
 * 加载任务断点
 *
 * @param jobId - BullMQ 任务 ID
 * @returns 断点数据，如果不存在则返回 null
 */
export async function loadCheckpoint(
  jobId: string
): Promise<{ progress: number; data: Record<string, unknown> } | null> {
  try {
    const [job] = await db
      .select()
      .from(queueJobs)
      .where(eq(queueJobs.jobId, jobId))
      .limit(1);

    if (!job || !job.checkpoint) {
      return null;
    }

    const checkpointData: CheckpointData = JSON.parse(job.checkpoint);

    // 检查断点是否过期（24小时）
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - checkpointData.timestamp > maxAge) {
      console.log(`⚠️  断点已过期 (${jobId})`);
      return null;
    }

    console.log(`📂 断点已加载: ${jobId} (${checkpointData.progress}%)`);

    return {
      progress: checkpointData.progress,
      data: checkpointData.data,
    };
  } catch (error) {
    console.error(`加载断点失败 (${jobId}):`, error);
    return null;
  }
}

/**
 * 清除任务断点
 *
 * @param jobId - BullMQ 任务 ID
 */
export async function clearCheckpoint(jobId: string): Promise<void> {
  try {
    await db
      .update(queueJobs)
      .set({
        checkpoint: null,
        updatedAt: new Date(),
      })
      .where(eq(queueJobs.jobId, jobId));

    console.log(`🗑️  断点已清除: ${jobId}`);
  } catch (error) {
    console.error(`清除断点失败 (${jobId}):`, error);
  }
}

/**
 * 更新任务进度
 *
 * @param jobId - BullMQ 任务 ID
 * @param progress - 进度（0-100）
 */
export async function updateJobProgress(
  jobId: string,
  progress: number
): Promise<void> {
  try {
    await db
      .update(queueJobs)
      .set({
        progress,
        updatedAt: new Date(),
      })
      .where(eq(queueJobs.jobId, jobId));

    console.log(`📊 进度已更新: ${jobId} (${progress}%)`);
  } catch (error) {
    console.error(`更新进度失败 (${jobId}):`, error);
  }
}

/**
 * 增加任务重试次数
 *
 * @param jobId - BullMQ 任务 ID
 */
export async function incrementRetryCount(jobId: string): Promise<number> {
  try {
    const [job] = await db
      .select()
      .from(queueJobs)
      .where(eq(queueJobs.jobId, jobId))
      .limit(1);

    if (!job) {
      return 0;
    }

    const newRetryCount = (job.retryCount || 0) + 1;

    await db
      .update(queueJobs)
      .set({
        retryCount: newRetryCount,
        updatedAt: new Date(),
      })
      .where(eq(queueJobs.jobId, jobId));

    console.log(`🔄 重试次数已更新: ${jobId} (${newRetryCount})`);

    return newRetryCount;
  } catch (error) {
    console.error(`更新重试次数失败 (${jobId}):`, error);
    return 0;
  }
}

/**
 * 检查是否可以从断点恢复
 *
 * @param jobId - BullMQ 任务 ID
 * @returns 是否可以恢复
 */
export async function canResumeFromCheckpoint(jobId: string): Promise<boolean> {
  const checkpoint = await loadCheckpoint(jobId);
  return checkpoint !== null && checkpoint.progress > 0;
}

// ============================================
// 辅助函数
// ============================================

/**
 * 创建断点保存器（定期保存断点）
 *
 * @param jobId - BullMQ 任务 ID
 * @param interval - 保存间隔（毫秒）
 * @returns 保存器对象
 */
export function createCheckpointSaver(
  jobId: string,
  interval: number = 5000
) {
  let timer: NodeJS.Timeout | null = null;
  let currentProgress = 0;
  let currentData: Record<string, unknown> = {};

  return {
    /**
     * 开始定期保存
     */
    start() {
      if (timer) return;

      timer = setInterval(async () => {
        if (currentProgress > 0) {
          await saveCheckpoint(jobId, currentProgress, currentData);
        }
      }, interval);
    },

    /**
     * 停止定期保存
     */
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },

    /**
     * 更新当前进度
     */
    update(progress: number, data: Record<string, unknown>) {
      currentProgress = progress;
      currentData = data;
    },

    /**
     * 立即保存一次
     */
    async saveNow() {
      await saveCheckpoint(jobId, currentProgress, currentData);
    },
  };
}
