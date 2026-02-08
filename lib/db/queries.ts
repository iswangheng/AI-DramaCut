// ============================================
// DramaGen AI 数据库查询工具
// 封装常用的数据库操作
// ============================================

import { db } from './client';
import * as schema from './schema';
import { eq, desc, and, sql, like } from 'drizzle-orm';
import type { Project, Video, Shot, Storyline, Highlight, RecapTask, RecapSegment } from './schema';

// ============================================
// 项目相关查询 (projects)
// ============================================

export const projectQueries = {
  /**
   * 创建项目
   */
  async create(data: typeof schema.projects.$inferInsert) {
    const [project] = await db.insert(schema.projects).values(data).returning();
    return project;
  },

  /**
   * 根据 ID 获取项目
   */
  async getById(id: number) {
    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
    return project;
  },

  /**
   * 获取所有项目列表
   */
  async list(limit = 50, offset = 0) {
    const projects = await db
      .select()
      .from(schema.projects)
      .orderBy(desc(schema.projects.createdAt))
      .limit(limit)
      .offset(offset);
    return projects;
  },

  /**
   * 搜索项目（按名称）
   */
  async search(keyword: string, limit = 50) {
    const projects = await db
      .select()
      .from(schema.projects)
      .where(like(schema.projects.name, `%${keyword}%`))
      .orderBy(desc(schema.projects.createdAt))
      .limit(limit);
    return projects;
  },

  /**
   * 更新项目
   */
  async update(id: number, data: Partial<typeof schema.projects.$inferInsert>) {
    const [project] = await db
      .update(schema.projects)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, id))
      .returning();
    return project;
  },

  /**
   * 更新项目状态和进度
   */
  async updateProgress(id: number, progress: number, currentStep?: string) {
    const [project] = await db
      .update(schema.projects)
      .set({
        progress,
        currentStep,
        status: progress === 100 ? 'ready' : 'processing',
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, id))
      .returning();
    return project;
  },

  /**
   * 删除项目
   */
  async delete(id: number) {
    const [project] = await db
      .delete(schema.projects)
      .where(eq(schema.projects.id, id))
      .returning();
    return project;
  },

  /**
   * 获取项目及其视频统计信息
   */
  async getWithStats(id: number) {
    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
    if (!project) return null;

    const videos = await db
      .select()
      .from(schema.videos)
      .where(eq(schema.videos.projectId, id));

    const videoCount = videos.length;
    const totalDurationMs = videos.reduce((sum, v) => sum + v.durationMs, 0);
    const totalDuration = `${Math.floor(totalDurationMs / 60000)} 分钟`;

    return {
      ...project,
      videoCount,
      totalDuration,
    };
  },
};

// ============================================
// 视频相关查询 (videos)
// ============================================

export const videoQueries = {
  /**
   * 创建视频记录
   */
  async create(data: typeof schema.videos.$inferInsert) {
    const [video] = await db.insert(schema.videos).values(data).returning();
    return video;
  },

  /**
   * 根据项目 ID 获取所有视频
   */
  async getByProjectId(projectId: number) {
    const videos = await db
      .select()
      .from(schema.videos)
      .where(eq(schema.videos.projectId, projectId))
      .orderBy(desc(schema.videos.createdAt));
    return videos;
  },

  /**
   * 根据 ID 获取视频
   */
  async getById(id: number) {
    const [video] = await db.select().from(schema.videos).where(eq(schema.videos.id, id));
    return video;
  },

  /**
   * 更新视频状态
   */
  async updateStatus(id: number, status: Video['status'], errorMessage?: string) {
    const [video] = await db
      .update(schema.videos)
      .set({
        status,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(schema.videos.id, id))
      .returning();
    return video;
  },

  /**
   * 标记视频错误状态
   */
  async updateError(id: number, errorMessage: string) {
    return this.updateStatus(id, 'error', errorMessage);
  },

  /**
   * 更新视频 AI 分析结果
   */
  async updateAnalysis(id: number, data: { summary?: string; viralScore?: number }) {
    const [video] = await db
      .update(schema.videos)
      .set({
        ...data,
        status: 'ready',
        updatedAt: new Date(),
      })
      .where(eq(schema.videos.id, id))
      .returning();
    return video;
  },

  /**
   * 获取所有视频列表
   */
  async list(limit = 50, offset = 0) {
    const videos = await db
      .select()
      .from(schema.videos)
      .orderBy(desc(schema.videos.createdAt))
      .limit(limit)
      .offset(offset);
    return videos;
  },

  /**
   * 根据状态获取视频列表
   */
  async getByStatus(status: Video['status']) {
    const videos = await db
      .select()
      .from(schema.videos)
      .where(eq(schema.videos.status, status))
      .orderBy(desc(schema.videos.createdAt));
    return videos;
  },
};

// ============================================
// 镜头切片相关查询 (shots)
// ============================================

export const shotQueries = {
  /**
   * 批量创建镜头记录
   */
  async createMany(data: typeof schema.shots.$inferInsert[]) {
    return db.insert(schema.shots).values(data);
  },

  /**
   * 根据视频 ID 获取所有镜头
   */
  async getByVideoId(videoId: number) {
    const shots = await db
      .select()
      .from(schema.shots)
      .where(eq(schema.shots.videoId, videoId))
      .orderBy(schema.shots.startMs);
    return shots;
  },

  /**
   * 根据时间段获取镜头
   */
  async getByTimeRange(videoId: number, startMs: number, endMs: number) {
    const shots = await db
      .select()
      .from(schema.shots)
      .where(
        and(
          eq(schema.shots.videoId, videoId),
          sql`${schema.shots.startMs} <= ${endMs}`,
          sql`${schema.shots.endMs} >= ${startMs}`
        )
      )
      .orderBy(schema.shots.startMs);
    return shots;
  },

  /**
   * 获取高爆款分数的镜头
   */
  async getTopViral(videoId: number, limit = 10) {
    const shots = await db
      .select()
      .from(schema.shots)
      .where(eq(schema.shots.videoId, videoId))
      .orderBy(desc(schema.shots.viralScore))
      .limit(limit);
    return shots;
  },
};

// ============================================
// 故事线相关查询 (storylines)
// ============================================

export const storylineQueries = {
  /**
   * 创建故事线
   */
  async create(data: typeof schema.storylines.$inferInsert) {
    const [storyline] = await db.insert(schema.storylines).values(data).returning();
    return storyline;
  },

  /**
   * 根据 ID 获取故事线
   */
  async getById(id: number) {
    const [storyline] = await db
      .select()
      .from(schema.storylines)
      .where(eq(schema.storylines.id, id));
    return storyline;
  },

  /**
   * 根据视频 ID 获取所有故事线
   */
  async getByVideoId(videoId: number) {
    const storylines = await db
      .select()
      .from(schema.storylines)
      .where(eq(schema.storylines.videoId, videoId))
      .orderBy(desc(schema.storylines.attractionScore));
    return storylines;
  },

  /**
   * 更新故事线
   */
  async update(id: number, data: Partial<typeof schema.storylines.$inferInsert>) {
    const [storyline] = await db
      .update(schema.storylines)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.storylines.id, id))
      .returning();
    return storyline;
  },
};

// ============================================
// 高光候选相关查询 (highlights)
// ============================================

export const highlightQueries = {
  /**
   * 批量创建高光候选
   */
  async createMany(data: typeof schema.highlights.$inferInsert[]) {
    const highlights = await db.insert(schema.highlights).values(data).returning();
    return highlights;
  },

  /**
   * 根据视频 ID 获取高光列表
   */
  async getByVideoId(videoId: number) {
    const highlights = await db
      .select()
      .from(schema.highlights)
      .where(eq(schema.highlights.videoId, videoId))
      .orderBy(desc(schema.highlights.viralScore));
    return highlights;
  },

  /**
   * 获取用户已确认的高光
   */
  async getConfirmed(videoId: number) {
    const highlights = await db
      .select()
      .from(schema.highlights)
      .where(and(eq(schema.highlights.videoId, videoId), eq(schema.highlights.isConfirmed, true)))
      .orderBy(desc(schema.highlights.viralScore));
    return highlights;
  },

  /**
   * 更新高光的时间范围（用户微调）
   */
  async updateTimeRange(id: number, customStartMs: number, customEndMs: number) {
    const [highlight] = await db
      .update(schema.highlights)
      .set({
        customStartMs,
        customEndMs,
        updatedAt: new Date(),
      })
      .where(eq(schema.highlights.id, id))
      .returning();
    return highlight;
  },

  /**
   * 确认高光（用户确认后导出）
   */
  async confirm(id: number, customStartMs?: number, customEndMs?: number) {
    const [highlight] = await db
      .update(schema.highlights)
      .set({
        isConfirmed: true,
        customStartMs: customStartMs ?? undefined,
        customEndMs: customEndMs ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.highlights.id, id))
      .returning();
    return highlight;
  },

  /**
   * 更新导出路径
   */
  async updateExportPath(id: number, exportedPath: string) {
    const [highlight] = await db
      .update(schema.highlights)
      .set({
        exportedPath,
        updatedAt: new Date(),
      })
      .where(eq(schema.highlights.id, id))
      .returning();
    return highlight;
  },
};

// ============================================
// 解说任务相关查询 (recap_tasks)
// ============================================

export const recapTaskQueries = {
  /**
   * 创建解说任务
   */
  async create(data: typeof schema.recapTasks.$inferInsert) {
    const [task] = await db.insert(schema.recapTasks).values(data).returning();
    return task;
  },

  /**
   * 根据 ID 获取任务
   */
  async getById(id: number) {
    const [task] = await db.select().from(schema.recapTasks).where(eq(schema.recapTasks.id, id));
    return task;
  },

  /**
   * 根据故事线 ID 获取所有任务
   */
  async getByStorylineId(storylineId: number) {
    const tasks = await db
      .select()
      .from(schema.recapTasks)
      .where(eq(schema.recapTasks.storylineId, storylineId))
      .orderBy(desc(schema.recapTasks.createdAt));
    return tasks;
  },

  /**
   * 更新任务状态
   */
  async updateStatus(id: number, status: RecapTask['status'], errorMessage?: string) {
    const [task] = await db
      .update(schema.recapTasks)
      .set({
        status,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(schema.recapTasks.id, id))
      .returning();
    return task;
  },

  /**
   * 更新任务输出路径
   */
  async updateOutput(id: number, outputPath: string, audioPath?: string) {
    const [task] = await db
      .update(schema.recapTasks)
      .set({
        outputPath,
        audioPath,
        status: 'ready',
        updatedAt: new Date(),
      })
      .where(eq(schema.recapTasks.id, id))
      .returning();
    return task;
  },
};

// ============================================
// 解说词片段相关查询 (recap_segments)
// ============================================

export const recapSegmentQueries = {
  /**
   * 批量创建解说词片段
   */
  async createMany(data: typeof schema.recapSegments.$inferInsert[]) {
    return db.insert(schema.recapSegments).values(data);
  },

  /**
   * 根据任务 ID 获取所有片段
   */
  async getByTaskId(taskId: number) {
    const segments = await db
      .select()
      .from(schema.recapSegments)
      .where(eq(schema.recapSegments.taskId, taskId))
      .orderBy(schema.recapSegments.order);
    return segments;
  },

  /**
   * 更新片段的画面匹配
   */
  async updateMatch(id: number, matchedShotId: number, isManuallySet = true) {
    const [segment] = await db
      .update(schema.recapSegments)
      .set({
        matchedShotId,
        isManuallySet,
        updatedAt: new Date(),
      })
      .where(eq(schema.recapSegments.id, id))
      .returning();
    return segment;
  },
};

// ============================================
// 任务队列相关查询 (queue_jobs)
// ============================================

export const queueJobQueries = {
  /**
   * 创建任务记录
   */
  async create(data: typeof schema.queueJobs.$inferInsert) {
    const [job] = await db.insert(schema.queueJobs).values(data).returning();
    return job;
  },

  /**
   * 根据 Job ID 获取任务
   */
  async getByJobId(jobId: string) {
    const [job] = await db.select().from(schema.queueJobs).where(eq(schema.queueJobs.jobId, jobId));
    return job;
  },

  /**
   * 更新任务状态
   */
  async updateStatus(jobId: string, status: typeof schema.queueJobs.$inferInsert.status) {
    const [job] = await db
      .update(schema.queueJobs)
      .set({
        status,
        processedAt: status === 'active' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.queueJobs.jobId, jobId))
      .returning();
    return job;
  },

  /**
   * 标记任务完成
   */
  async markComplete(jobId: string, result?: Record<string, unknown>) {
    const [job] = await db
      .update(schema.queueJobs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        result: result ? JSON.stringify(result) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.queueJobs.jobId, jobId))
      .returning();
    return job;
  },

  /**
   * 标记任务失败
   */
  async markFailed(jobId: string, error: string) {
    const [job] = await db
      .update(schema.queueJobs)
      .set({
        status: 'failed',
        error,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.queueJobs.jobId, jobId))
      .returning();
    return job;
  },
};

// ============================================
// 统计相关查询
// ============================================

export const statsQueries = {
  /**
   * 获取数据库统计信息
   */
  async getOverview() {
    const [projectStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        ready: sql<number>`SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END)`,
        processing: sql<number>`SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END)`,
        error: sql<number>`SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END)`,
      })
      .from(schema.projects);

    const [videoStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        uploading: sql<number>`SUM(CASE WHEN status = 'uploading' THEN 1 ELSE 0 END)`,
        processing: sql<number>`SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END)`,
        analyzing: sql<number>`SUM(CASE WHEN status = 'analyzing' THEN 1 ELSE 0 END)`,
        ready: sql<number>`SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END)`,
        error: sql<number>`SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END)`,
      })
      .from(schema.videos);

    const [highlightStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        confirmed: sql<number>`SUM(CASE WHEN is_confirmed = 1 THEN 1 ELSE 0 END)`,
        exported: sql<number>`SUM(CASE WHEN exported_path IS NOT NULL THEN 1 ELSE 0 END)`,
      })
      .from(schema.highlights);

    const [recapStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
        generating: sql<number>`SUM(CASE WHEN status = 'generating' THEN 1 ELSE 0 END)`,
        ready: sql<number>`SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END)`,
      })
      .from(schema.recapTasks);

    return {
      projects: projectStats,
      videos: videoStats,
      highlights: highlightStats,
      recaps: recapStats,
    };
  },
};

// ============================================
// 导出所有查询
// ============================================

export const queries = {
  project: projectQueries,
  video: videoQueries,
  shot: shotQueries,
  storyline: storylineQueries,
  highlight: highlightQueries,
  recapTask: recapTaskQueries,
  recapSegment: recapSegmentQueries,
  queueJob: queueJobQueries,
  stats: statsQueries,
};

export default queries;
