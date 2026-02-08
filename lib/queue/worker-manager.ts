// ============================================
// BullMQ Worker 管理器
// Agent: 基础设施开发
// 功能: 创建和管理所有 Worker 实例
// ============================================

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { processors, VideoJobData } from './workers';
import { processRenderHighlightJob, RenderHighlightJobData } from './workers/highlight-render';

// 创建 Redis 连接（独立于 QueueManager）
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

interface WorkerInstance {
  name: string;
  worker: Worker<any, unknown, string> | null;
  create: () => Worker<any, unknown, string>;
  start: () => void;
  stop: () => Promise<void>;
}

/**
 * 创建视频处理 Worker
 * 处理所有视频相关任务（裁剪、分析、镜头检测等）
 */
function createVideoWorker(): Worker<VideoJobData, unknown, string> {
  const worker = new Worker<VideoJobData>(
    'video-processing',
    async (job: Job<VideoJobData>) => {
      return await processors.videoJobProcessor(job);
    },
    {
      connection: redisConnection,
      concurrency: 2, // 并发处理 2 个视频任务
      limiter: {
        max: 5, // 每 10 秒最多处理 5 个任务
        duration: 10000,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ 视频任务完成: ${job.id} (${job.data.type})`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ 视频任务失败: ${job?.id} (${job?.data.type})`, err.message);
  });

  worker.on('progress', (job, progress) => {
    console.log(`📊 视频任务进度: ${job?.id} - ${progress}%`);
  });

  return worker;
}

/**
 * 创建高光切片渲染 Worker
 * 处理高光切片的视频渲染任务
 */
function createHighlightRenderWorker(): Worker<RenderHighlightJobData> {
  const worker = new Worker<RenderHighlightJobData>(
    'highlight-clips',
    async (job: Job<RenderHighlightJobData>) => {
      return await processRenderHighlightJob(job);
    },
    {
      connection: redisConnection,
      concurrency: 1, // 高光渲染通常较重，并发设为1
      limiter: {
        max: 3, // 每 10 秒最多处理 3 个任务
        duration: 10000,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ 高光渲染完成: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ 高光渲染失败: ${job?.id}`, err.message);
  });

  worker.on('progress', (job, progress) => {
    console.log(`📊 高光渲染进度: ${job?.id} - ${progress}%`);
  });

  return worker;
}

/**
 * 视频处理 Worker 实例
 */
export const videoWorkerInstance: WorkerInstance = {
  name: 'video-processing',
  worker: null,
  create: createVideoWorker,
  start() {
    if (!this.worker) {
      console.log('🚀 启动视频处理 Worker...');
      this.worker = this.create();
      console.log('✅ 视频处理 Worker 已启动');
    }
  },
  async stop() {
    if (this.worker) {
      console.log('🛑 停止视频处理 Worker...');
      await this.worker.close();
      this.worker = null;
      console.log('✅ 视频处理 Worker 已停止');
    }
  },
};

/**
 * 高光渲染 Worker 实例
 */
export const highlightRenderWorkerInstance: WorkerInstance = {
  name: 'highlight-clips',
  worker: null,
  create: createHighlightRenderWorker,
  start() {
    if (!this.worker) {
      console.log('🚀 启动高光渲染 Worker...');
      this.worker = this.create();
      console.log('✅ 高光渲染 Worker 已启动');
    }
  },
  async stop() {
    if (this.worker) {
      console.log('🛑 停止高光渲染 Worker...');
      await this.worker.close();
      this.worker = null;
      console.log('✅ 高光渲染 Worker 已停止');
    }
  },
};

// ============================================
// Worker 管理器
// ============================================

interface WorkerManagerConfig {
  autoStart?: boolean;
}

interface IWorkerManager {
  workers: WorkerInstance[];
  start(): void;
  stop(): Promise<void>;
  getStatus(): { name: string; running: boolean }[];
}

/**
 * Worker 管理器
 * 统一管理所有 Worker 实例
 */
export class WorkerManager implements IWorkerManager {
  workers: WorkerInstance[] = [];
  private config: WorkerManagerConfig;

  constructor(config: WorkerManagerConfig = {}) {
    this.config = {
      autoStart: true,
      ...config,
    };

    // 注册所有 Worker
    this.workers = [
      videoWorkerInstance,
      highlightRenderWorkerInstance,
    ];

    // 自动启动
    if (this.config.autoStart && process.env.NODE_ENV !== 'test') {
      // 延迟启动，确保队列已初始化
      setTimeout(() => {
        try {
          this.start();
        } catch (error) {
          console.error('❌ Worker 自动启动失败:', error);
        }
      }, 2000);
    }
  }

  /**
   * 启动所有 Worker
   */
  start() {
    console.log('🚀 启动 BullMQ Workers...');

    for (const workerInstance of this.workers) {
      try {
        workerInstance.start();
      } catch (error) {
        console.error(`❌ ${workerInstance.name} 启动失败:`, error);
      }
    }

    console.log('🎉 所有 Workers 启动完成！');
  }

  /**
   * 停止所有 Worker
   */
  async stop() {
    console.log('🛑 停止 BullMQ Workers...');

    const stopPromises = this.workers.map(async (workerInstance) => {
      try {
        await workerInstance.stop();
      } catch (error) {
        console.error(`❌ ${workerInstance.name} 停止失败:`, error);
      }
    });

    await Promise.all(stopPromises);
    console.log('✅ 所有 Workers 已停止');
  }

  /**
   * 获取所有 Worker 状态
   */
  getStatus() {
    return this.workers.map((workerInstance) => ({
      name: workerInstance.name,
      running: workerInstance.worker !== null,
    }));
  }
}

// ============================================
// 全局 Worker 管理器实例
// ============================================

export const workerManager = new WorkerManager({
  autoStart: true, // 自动启动所有 Worker
});

// ============================================
// 优雅退出处理
// ============================================

if (typeof process !== 'undefined') {
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n收到 ${signal} 信号，正在优雅退出...`);

    try {
      await workerManager.stop();
      process.exit(0);
    } catch (error) {
      console.error('❌ 优雅退出失败:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}
