// ============================================
// DramaGen AI 任务队列配置
// 使用 BullMQ + Redis
// ============================================

import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { queueConfig } from '../config';
import { queries } from '../db';
import { wsServer } from '../ws/server';
// 移除循环依赖：不直接导入处理器，改为动态导入
// import { videoJobProcessor } from './workers';

// ============================================
// Redis 连接配置
// ============================================

const createRedisConnection = () => {
  const { redis } = queueConfig;
  const connection = new Redis({
    host: redis.host,
    port: redis.port,
    password: redis.password,
    db: redis.db,
    maxRetriesPerRequest: null,
  });

  connection.on('error', (err) => {
    console.error('❌ Redis 连接错误:', err);
  });

  connection.on('connect', () => {
    console.log('✅ Redis 连接成功');
  });

  return connection;
};

// ============================================
// 队列管理器
// ============================================

export class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private redis: Redis;

  constructor() {
    this.redis = createRedisConnection();
  }

  /**
   * 获取或创建队列
   */
  getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.redis,
        defaultJobOptions: {
          attempts: queueConfig.retryAttempts,
          backoff: {
            type: 'exponential',
            delay: queueConfig.retryDelay,
          },
        },
      });

      this.queues.set(name, queue);
      console.log(`✅ 队列已创建: ${name}`);
    }

    return this.queues.get(name)!;
  }

  /**
   * 添加任务到队列
   */
  async addJob(queueName: string, jobType: string, data: Record<string, unknown>, options?: { delay?: number }) {
    const queue = this.getQueue(queueName);

    // 生成唯一的 job ID，避免 BullMQ 自动生成的 ID 冲突
    const uniqueJobId = `${queueName}-${jobType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // 记录到数据库
    const job = await queue.add(jobType, data, {
      jobId: uniqueJobId,
      delay: options?.delay,
    });

    // 保存任务记录到数据库
    await queries.queueJob.create({
      jobId: uniqueJobId,
      queueName,
      jobType,
      payload: JSON.stringify(data),
      status: 'waiting',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`📝 任务已添加: ${queueName}/${jobType} (Job ID: ${uniqueJobId})`);

    return job;
  }

  /**
   * 创建 Worker
   */
  createWorker(queueName: string, processor: (job: any) => Promise<any>) {
    if (this.workers.has(queueName)) {
      console.warn(`⚠️  Worker 已存在: ${queueName}`);
      return;
    }

    const worker = new Worker(
      queueName,
      async (job) => {
        console.log(`🔄 开始处理任务: ${queueName}/${job.name} (Job ID: ${job.id})`);

        // 更新任务状态为 active
        await queries.queueJob.updateStatus(job.id!, 'active');

        try {
          const result = await processor(job);

          // 标记任务完成
          await queries.queueJob.markComplete(job.id!, result);

          console.log(`✅ 任务完成: ${queueName}/${job.name} (Job ID: ${job.id})`);

          return result;
        } catch (error) {
          // 标记任务失败
          await queries.queueJob.markFailed(job.id!, error instanceof Error ? error.message : 'Unknown error');

          console.error(`❌ 任务失败: ${queueName}/${job.name} (Job ID: ${job.id})`, error);

          throw error;
        }
      },
      {
        connection: this.redis,
        concurrency: queueConfig.maxConcurrentJobs,
      }
    );

    worker.on('completed', (job) => {
      console.log(`✅ Worker 完成任务: ${job.id}`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ Worker 任务失败: ${job?.id}`, err);
    });

    this.workers.set(queueName, worker);
    console.log(`✅ Worker 已创建: ${queueName}`);
  }

  /**
   * 创建视频处理 Worker（使用预定义的处理器）
   */
  async createVideoWorker(queueName = queueConfig.queues.videoProcessing) {
    // 动态导入处理器，避免循环依赖
    const { videoJobProcessor } = await import('./workers');
    this.createWorker(queueName, videoJobProcessor);
  }

  /**
   * 监听队列事件
   */
  listenQueueEvents(queueName: string, callbacks?: {
    onWaiting?: (jobId: string) => void;
    onActive?: (jobId: string) => void;
    onCompleted?: (jobId: string) => void;
    onFailed?: (jobId: string, error: string) => void;
  }) {
    if (this.queueEvents.has(queueName)) {
      return;
    }

    const queueEvents = new QueueEvents(queueName, { connection: this.redis });

    queueEvents.on('waiting', ({ jobId }) => {
      console.log(`⏳ 任务等待中: ${jobId}`);
      callbacks?.onWaiting?.(jobId);
    });

    queueEvents.on('active', ({ jobId }) => {
      console.log(`🔄 任务进行中: ${jobId}`);
      callbacks?.onActive?.(jobId);
    });

    queueEvents.on('completed', ({ jobId }) => {
      console.log(`✅ 任务完成: ${jobId}`);
      callbacks?.onCompleted?.(jobId);
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`❌ 任务失败: ${jobId}`, failedReason);
      callbacks?.onFailed?.(jobId, failedReason);
    });

    this.queueEvents.set(queueName, queueEvents);
  }

  /**
   * 获取队列状态
   */
  async getQueueStats(queueName: string) {
    const queue = this.getQueue(queueName);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  /**
   * 清空队列
   */
  async clearQueue(queueName: string) {
    const queue = this.getQueue(queueName);
    await queue.drain();
    console.log(`🗑️  队列已清空: ${queueName}`);
  }

  /**
   * 关闭所有连接
   */
  async close() {
    // 关闭所有 Workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      console.log(`🔌 Worker 已关闭: ${name}`);
    }

    // 关闭所有 Queue Events
    for (const [name, event] of this.queueEvents) {
      await event.close();
      console.log(`🔌 Queue Events 已关闭: ${name}`);
    }

    // 关闭所有 Queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      console.log(`🔌 队列已关闭: ${name}`);
    }

    // 关闭 Redis 连接
    await this.redis.quit();
    console.log('🔌 Redis 连接已关闭');
  }
}

// ============================================
// 导出单例实例和队列
// ============================================

export const queueManager = new QueueManager();

// 导出常用队列
export const videoJobsQueue = queueManager.getQueue(queueConfig.queues.videoProcessing);

/**
 * 高光切片渲染队列
 * 专门用于处理高光切片的视频渲染任务
 */
export const highlightClipsQueue = queueManager.getQueue('highlight-clips');

/**
 * 深度解说渲染队列
 * 专门用于处理深度解说视频的渲染任务
 */
export const recapRenderQueue = queueManager.getQueue('recap-render');

// 导出队列名称常量
export const QUEUE_NAMES = queueConfig.queues;

export default queueManager;
