# Agent 4 - 数据层与任务队列开发指南

**职责**: 数据库、任务队列、实时通信
**优先级**: 🔥 高（其他 Agent 都依赖此层）
**预计工期**: 2-3 天

---

## 📋 任务清单

### 阶段 1: 数据库设计与配置（1 天）

#### 1.1 安装依赖 ⚙️
```bash
npm install drizzle-orm better-sqlite3
npm install -D @types/better-sqlite3 drizzle-kit
```

#### 1.2 配置 Drizzle ORM

创建 `lib/db/index.ts`:
```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

// 创建数据库连接
const sqlite = new Database(process.env.DATABASE_URL || './data/database.sqlite');

// 启用外键约束
sqlite.pragma('foreign_keys = ON');

// 创建 Drizzle 实例
export const db = drizzle(sqlite, { schema });
```

创建 `lib/db/schema.ts`:
```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ========== 项目表 ==========
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ========== 视频素材表 ==========
export const videoAssets = sqliteTable('video_assets', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  metadata: text('metadata', { mode: 'json' }).notNull(), // 存储为 JSON 字符串
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ========== 处理片段表 ==========
export const processedClips = sqliteTable('processed_clips', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  sourceAssetId: text('source_asset_id').references(() => videoAssets.id),
  type: text('type', { enum: ['highlight', 'recap'] }).notNull(),
  startMs: integer('start_ms').notNull(),
  endMs: integer('end_ms').notNull(),
  outputPath: text('output_path').notNull(),
  narrationId: text('narration_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ========== 解说任务表 ==========
export const narrationTasks = sqliteTable('narration_tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  storylineId: text('storyline_id').notNull(),
  style: text('style', { enum: ['hook', 'suspense', 'emotional', 'roast'] }).notNull(),
  text: text('text').notNull(),
  audioPath: text('audio_path'),
  wordTimings: text('word_timings', { mode: 'json' }), // 存储为 JSON 字符串
  status: text('status', { enum: ['pending', 'generating', 'completed', 'failed'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});
```

#### 1.3 创建数据库迁移脚本

创建 `drizzle.config.ts`:
```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  driver: 'better-sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './data/database.sqlite',
  },
} satisfies Config;
```

在 `package.json` 添加脚本:
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

执行迁移:
```bash
mkdir -p data
npm run db:push
```

---

### 阶段 2: 数据库查询封装（0.5 天）

创建 `lib/db/queries.ts`:

```typescript
import { eq, desc, and } from 'drizzle-orm';
import { db } from './index';
import * as schema from './schema';
import { projects, videoAssets, processedClips, narrationTasks } from './schema';
import { nanoid } from 'nanoid';

// ========== 项目管理 ==========

export async function createProject(name: string, description?: string) {
  const project = {
    id: nanoid(),
    name,
    description,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(projects).values(project);
  return project;
}

export async function getProject(projectId: string) {
  const result = await db.select().from(projects).where(eq(projects.id, projectId));
  return result[0] || null;
}

export async function listProjects() {
  return await db.select().from(projects).orderBy(desc(projects.updatedAt));
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<typeof schema.Project, 'name' | 'description'>>
) {
  await db.update(projects)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  return getProject(projectId);
}

export async function deleteProject(projectId: string) {
  await db.delete(projects).where(eq(projects.id, projectId));
}

// ========== 视频素材管理 ==========

export async function addVideoAsset(
  projectId: string,
  path: string,
  metadata: any
) {
  const asset = {
    id: nanoid(),
    projectId,
    path,
    metadata: JSON.stringify(metadata),
    createdAt: new Date(),
  };

  await db.insert(videoAssets).values(asset);
  return asset;
}

export async function getVideoAsset(assetId: string) {
  const result = await db.select().from(videoAssets).where(eq(videoAssets.id, assetId));
  const asset = result[0];

  if (!asset) return null;

  // 解析 JSON 字段
  return {
    ...asset,
    metadata: JSON.parse(asset.metadata as string),
  };
}

export async function updateVideoAsset(
  assetId: string,
  updates: Partial<typeof schema.videoAssets.$inferInsert>
) {
  // 如果包含 metadata，需要序列化
  const data: any = { ...updates };
  if (data.metadata) {
    data.metadata = JSON.stringify(data.metadata);
  }

  await db.update(videoAssets)
    .set(data)
    .where(eq(videoAssets.id, assetId));

  return getVideoAsset(assetId);
}

export async function getProjectVideoAssets(projectId: string) {
  const results = await db.select()
    .from(videoAssets)
    .where(eq(videoAssets.projectId, projectId));

  return results.map(asset => ({
    ...asset,
    metadata: JSON.parse(asset.metadata as string),
  }));
}

export async function deleteVideoAsset(assetId: string) {
  await db.delete(videoAssets).where(eq(videoAssets.id, assetId));
}

// ========== 处理片段管理 ==========

export async function saveProcessedClip(clip: Omit<typeof schema.processedClips.$inferInsert, 'id' | 'createdAt'>) {
  const newClip = {
    ...clip,
    id: nanoid(),
    createdAt: new Date(),
  };

  await db.insert(processedClips).values(newClip);
  return newClip;
}

export async function getProjectClips(projectId: string) {
  return await db.select()
    .from(processedClips)
    .where(eq(processedClips.projectId, projectId))
    .orderBy(desc(processedClips.createdAt));
}

export async function deleteClip(clipId: string) {
  await db.delete(processedClips).where(eq(processedClips.id, clipId));
}

// ========== 解说任务管理 ==========

export async function createNarrationTask(task: Omit<typeof schema.narrationTasks.$inferInsert, 'id' | 'createdAt' | 'status'>) {
  const newTask = {
    ...task,
    id: nanoid(),
    status: 'pending' as const,
    createdAt: new Date(),
  };

  await db.insert(narrationTasks).values(newTask);
  return newTask;
}

export async function getNarrationTask(taskId: string) {
  const result = await db.select().from(narrationTasks).where(eq(narrationTasks.id, taskId));
  const task = result[0];

  if (!task) return null;

  // 解析 wordTimings JSON
  return {
    ...task,
    wordTimings: task.wordTimings ? JSON.parse(task.wordTimings as string) : null,
  };
}

export async function updateNarrationTask(
  taskId: string,
  updates: Partial<typeof schema.narrationTasks.$inferInsert>
) {
  const data: any = { ...updates };
  if (data.wordTimings) {
    data.wordTimings = JSON.stringify(data.wordTimings);
  }

  await db.update(narrationTasks)
    .set(data)
    .where(eq(narrationTasks.id, taskId));

  return getNarrationTask(taskId);
}

export async function getPendingNarrationTasks() {
  return await db.select()
    .from(narrationTasks)
    .where(eq(narrationTasks.status, 'pending'));
}
```

---

### 阶段 3: 任务队列系统（1 天）

#### 3.1 安装依赖

```bash
npm install bullmq ioredis
npm install -D @types/bullmq
```

**注意**: 需要先安装 Redis:
```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt install redis-server
sudo systemctl start redis
```

#### 3.2 创建任务队列

创建 `lib/queue/worker.ts`:
```typescript
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

// Redis 连接配置
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
});

// 创建队列
export const videoQueue = new Queue('video-processing', { connection });

// 定义任务处理器类型
export interface VideoJobData {
  type: 'trim' | 'analyze' | 'render' | 'extract-shots';
  inputPath: string;
  outputPath?: string;
  options?: Record<string, any>;
}

// 创建 Worker
export const worker = new Worker<VideoJobData>(
  'video-processing',
  async (job: Job<VideoJobData>) => {
    const { type, inputPath, outputPath, options } = job.data;

    try {
      // 更新进度
      await job.updateProgress(10);

      // 根据任务类型调用相应的处理函数
      switch (type) {
        case 'trim':
          // TODO: 调用 Agent Video 的 trimVideo 函数
          break;

        case 'analyze':
          // TODO: 调用 Agent API 的分析函数
          break;

        case 'render':
          // TODO: 调用 Remotion 渲染
          break;

        case 'extract-shots':
          // TODO: 调用镜头检测
          break;

        default:
          throw new Error(`Unknown job type: ${type}`);
      }

      await job.updateProgress(100);
      return { success: true };
    } catch (error) {
      console.error('Job failed:', error);
      throw error;
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.MAX_CONCURRENT_JOBS || '3'),
  }
);

// Worker 事件监听
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
```

#### 3.3 创建队列客户端 API

创建 `lib/queue/client.ts`:
```typescript
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { videoQueue } from './worker';
import { nanoid } from 'nanoid';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

export async function submitJob(jobData: {
  type: 'trim' | 'analyze' | 'render' | 'extract-shots';
  inputPath: string;
  outputPath?: string;
  options?: Record<string, any>;
}) {
  const job = await videoQueue.add(jobData.type, jobData, {
    jobId: nanoid(),
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });

  return job.id;
}

export async function getJobStatus(jobId: string) {
  const job = await videoQueue.getJob(jobId);

  if (!job) {
    throw new Error('Job not found');
  }

  return {
    id: job.id,
    data: job.data,
    progress: job.progress,
    status: await job.getState(),
    result: job.returnvalue,
    failedReason: job.failedReason,
  };
}

export async function cancelJob(jobId: string) {
  const job = await videoQueue.getJob(jobId);
  if (job) {
    await job.remove();
  }
}
```

---

### 阶段 4: WebSocket 实时进度（0.5 天）

#### 4.1 安装依赖

```bash
npm install ws @types/ws
```

#### 4.2 创建 WebSocket 服务器

创建 `lib/websocket/server.ts`:
```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface ProgressMessage {
  type: 'progress' | 'complete' | 'error';
  jobId: string;
  data: any;
}

export function createProgressServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/progress' });

  // 存储客户端连接
  const clients = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws: WebSocket, req) => {
    // 从 URL 获取 jobId
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      ws.close(1008, 'Missing jobId');
      return;
    }

    // 添加到客户端集合
    if (!clients.has(jobId)) {
      clients.set(jobId, new Set());
    }
    clients.get(jobId)!.add(ws);

    console.log(`Client connected for job: ${jobId}`);

    // 发送欢迎消息
    ws.send(JSON.stringify({
      type: 'connected',
      jobId,
    }));

    ws.on('close', () => {
      console.log(`Client disconnected for job: ${jobId}`);
      clients.get(jobId)?.delete(ws);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error:`, error);
    });
  });

  // 返回发送函数
  return {
    sendProgress: (jobId: string, progress: number, message?: string) => {
      const jobClients = clients.get(jobId);
      if (!jobClients) return;

      const data: ProgressMessage = {
        type: 'progress',
        jobId,
        data: { progress, message },
      };

      jobClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    },

    sendComplete: (jobId: string, result: any) => {
      const jobClients = clients.get(jobId);
      if (!jobClients) return;

      const data: ProgressMessage = {
        type: 'complete',
        jobId,
        data: result,
      };

      jobClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    },

    sendError: (jobId: string, error: string) => {
      const jobClients = clients.get(jobId);
      if (!jobClients) return;

      const data: ProgressMessage = {
        type: 'error',
        jobId,
        data: { error },
      };

      jobClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    },
  };
}
```

#### 4.3 集成到 Next.js

修改 `lib/websocket/index.ts`:
```typescript
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { createProgressServer } from './server';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // 创建 WebSocket 进度服务器
  const progressServer = createProgressServer(server);

  // 导出进度服务器供其他模块使用
  (global as any).progressServer = progressServer;

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});
```

---

### 阶段 5: 集成测试（0.5 天）

创建 `lib/db/__tests__/queries.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createProject, addVideoAsset, saveProcessedClip } from '../queries';
import { db } from '../index';

describe('Database Queries', () => {
  beforeAll(async () => {
    // 测试前准备
  });

  afterAll(async () => {
    // 清理
  });

  it('should create a project', async () => {
    const project = await createProject('Test Project');
    expect(project).toHaveProperty('id');
    expect(project.name).toBe('Test Project');
  });

  it('should add video asset to project', async () => {
    const project = await createProject('Test Project 2');
    const asset = await addVideoAsset(project.id, '/path/to/video.mp4', {
      duration: 120,
      width: 1920,
      height: 1080,
    });

    expect(asset).toHaveProperty('id');
    expect(asset.projectId).toBe(project.id);
  });
});
```

---

## 🎯 完成标准

- [x] 数据库 Schema 设计完成
- [ ] 所有查询函数实现并测试通过
- [ ] BullMQ 任务队列正常运行
- [ ] WebSocket 进度推送功能正常
- [ ] 与其他 Agent 的集成测试通过

---

## 📞 依赖关系

**依赖**:
- 需要其他 Agent 定义数据模型
- 需要 Redis 服务器运行

**被依赖**:
- Agent UI 需要数据库 API
- Agent Video 需要任务队列 API
- Agent API 需要数据库存储分析结果

---

## 🚀 下一步

完成本阶段后，通知其他 Agent：
```bash
git commit -m "feat(data): 完成数据库和任务队列系统

- 实现 Drizzle ORM + SQLite
- 实现 BullMQ 任务队列
- 实现 WebSocket 进度推送
- 提供完整的数据库查询 API

---
Agent: Agent 4
依赖: 无
阻塞: Agent UI, Agent Video, Agent API 现可使用数据层
"
```
