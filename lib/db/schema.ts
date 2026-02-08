// ============================================
// DramaGen AI 数据库 Schema 定义
// 使用 Drizzle ORM + SQLite
// ============================================

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ============================================
// 通用字段类型
// ============================================

/**
 * 创建时间戳字段
 */
const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
};

// ============================================
// 1. 项目表 (projects)
// ============================================
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),                           // 项目名称
  description: text('description'),                       // 项目描述

  // 处理状态
  status: text('status', {
    enum: ['ready', 'processing', 'error']
  }).notNull().default('ready'),                          // 处理状态

  // 进度信息（用于 UI 显示）
  progress: integer('progress').notNull().default(0),    // 整体进度 (0-100)
  currentStep: text('current_step'),                     // 当前处理步骤描述

  // 错误信息
  errorMessage: text('error_message'),                    // 错误消息

  ...timestamps,
});

// ============================================
// 2. 视频素材表 (videos)
// ============================================
export const videos = sqliteTable('videos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),  // 所属项目

  filename: text('filename').notNull(),                    // 原始文件名
  filePath: text('file_path').notNull(),                   // 存储路径
  fileSize: integer('file_size').notNull(),                // 文件大小（字节）

  // 视频元数据
  durationMs: integer('duration_ms').notNull(),            // 时长（毫秒）
  width: integer('width').notNull(),                       // 视频宽度
  height: integer('height').notNull(),                     // 视频高度
  fps: integer('fps').notNull(),                           // 帧率

  // 处理状态
  status: text('status', { enum: ['uploading', 'processing', 'analyzing', 'ready', 'error'] })
    .notNull()
    .default('uploading'),                                  // 处理状态

  // AI 分析结果
  summary: text('summary'),                                // 剧情梗概
  viralScore: real('viral_score'),                         // 爆款分数 (0-10)

  // 错误信息
  errorMessage: text('error_message'),                     // 错误消息

  ...timestamps,
});

// ============================================
// 2. 镜头切片表 (shots)
// ============================================
export const shots = sqliteTable('shots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  videoId: integer('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),

  // 时间信息
  startMs: integer('start_ms').notNull(),                  // 开始时间（毫秒）
  endMs: integer('end_ms').notNull(),                      // 结束时间（毫秒）

  // Gemini 分析结果
  description: text('description').notNull(),              // 场景描述
  emotion: text('emotion').notNull(),                      // 情绪标签
  dialogue: text('dialogue'),                              // 核心台词
  characters: text('characters'),                          // 角色（JSON 数组）
  viralScore: real('viral_score'),                         // 爆款分数 (0-10)

  // 帧信息（用于快速定位）
  startFrame: integer('start_frame').notNull(),            // 起始帧号
  endFrame: integer('end_frame').notNull(),                // 结束帧号

  // Agent 3 需求：缩略图和语义标签
  thumbnailPath: text('thumbnail_path'),                   // 缩略图路径（相对路径或完整路径）
  semanticTags: text('semantic_tags'),                      // 语义标签（JSON 数组，由 Agent 2 填充）
  embeddings: text('embeddings'),                          // 向量表示（JSON 数组，由 Agent 2 填充）

  ...timestamps,
});

// ============================================
// 3. 故事线表 (storylines)
// ============================================
export const storylines = sqliteTable('storylines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  videoId: integer('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),

  // 故事线信息
  name: text('name').notNull(),                            // 故事线名称
  description: text('description').notNull(),              // 详细描述
  attractionScore: real('attraction_score').notNull(),     // 吸引力分数 (0-10)

  // 关联的镜头（JSON 数组，存储 shot_id）
  shotIds: text('shot_ids').notNull(),                     // 关联的镜头 ID 列表

  // 故事线类型
  category: text('category', {
    enum: ['revenge', 'romance', 'identity', 'power', 'family', 'other']
  }).notNull().default('other'),

  ...timestamps,
});

// ============================================
// 4. 高光候选表 (highlights) - 模式 A
// ============================================
export const highlights = sqliteTable('highlights', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  videoId: integer('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),

  // 时间信息
  startMs: integer('start_ms').notNull(),                  // 开始时间（毫秒）
  endMs: integer('end_ms'),                                // 结束时间（毫秒，可选）
  durationMs: integer('duration_ms'),                      // 持续时间（毫秒）

  // AI 分析结果
  reason: text('reason').notNull(),                        // 推荐理由
  viralScore: real('viral_score').notNull(),               // 爆款分数 (0-10)
  category: text('category', {
    enum: ['conflict', 'emotional', 'reversal', 'climax', 'other']
  }).notNull().default('other'),

  // 用户操作
  isConfirmed: integer('is_confirmed', { mode: 'boolean' }).notNull().default(false),  // 用户是否确认
  customStartMs: integer('custom_start_ms'),               // 用户自定义开始时间
  customEndMs: integer('custom_end_ms'),                   // 用户自定义结束时间

  // 导出状态
  exportedPath: text('exported_path'),                     // 导出文件路径

  ...timestamps,
});

// ============================================
// 5. 解说任务表 (recap_tasks) - 模式 B
// ============================================
export const recapTasks = sqliteTable('recap_tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storylineId: integer('storyline_id').notNull().references(() => storylines.id, { onDelete: 'cascade' }),

  // 任务配置
  style: text('style', {
    enum: ['hook', 'roast', 'suspense', 'emotional', 'humorous']
  }).notNull(),                                            // 解说风格

  // AI 生成结果
  title: text('title').notNull(),                          // 黄金 3 秒钩子标题
  estimatedDurationMs: integer('estimated_duration_ms').notNull(),  // 预估时长

  // 处理状态
  status: text('status', {
    enum: ['pending', 'generating', 'tts', 'matching', 'ready', 'error']
  }).notNull().default('pending'),                          // 处理状态

  // 导出信息
  outputPath: text('output_path'),                         // 最终导出路径
  audioPath: text('audio_path'),                           // TTS 音频路径

  // 错误信息
  errorMessage: text('error_message'),                     // 错误消息

  ...timestamps,
});

// ============================================
// 6. 解说词片段表 (recap_segments)
// ============================================
export const recapSegments = sqliteTable('recap_segments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id').notNull().references(() => recapTasks.id, { onDelete: 'cascade' }),

  // 文案内容
  text: text('text').notNull(),                            // 解说文本
  order: integer('order').notNull(),                       // 段落顺序

  // 时间信息
  startMs: integer('start_ms').notNull(),                  // 开始时间（毫秒）
  endMs: integer('end_ms').notNull(),                      // 结束时间（毫秒）
  durationMs: integer('duration_ms').notNull(),            // 持续时间（毫秒）

  // TTS 信息
  audioOffsetMs: integer('audio_offset_ms').notNull(),     // 在音频中的偏移量
  wordTimestamps: text('word_timestamps').notNull(),       // 词级时间戳（JSON）

  // 画面匹配
  videoCues: text('video_cues'),                           // AI 建议的画面描述（JSON 数组）
  matchedShotId: integer('matched_shot_id'),               // 匹配的镜头 ID
  isManuallySet: integer('is_manually_set', { mode: 'boolean' }).notNull().default(false),  // 是否手动设置

  ...timestamps,
});

// ============================================
// 7. 任务队列表 (queue_jobs) - 用于跟踪 BullMQ 任务
// ============================================
export const queueJobs = sqliteTable('queue_jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: text('job_id').notNull().unique(),                // BullMQ Job ID

  // 任务信息
  queueName: text('queue_name').notNull(),                 // 队列名称
  jobType: text('job_type').notNull(),                     // 任务类型
  payload: text('payload').notNull(),                      // 任务参数（JSON）

  // 状态
  status: text('status', {
    enum: ['waiting', 'active', 'completed', 'failed', 'delayed']
  }).notNull().default('waiting'),                          // 任务状态

  // 进度和断点续传
  progress: integer('progress').default(0),                // 任务进度（0-100）
  checkpoint: text('checkpoint'),                          // 断点信息（JSON）
  retryCount: integer('retry_count').default(0),           // 重试次数

  // 结果
  result: text('result'),                                  // 执行结果（JSON）
  error: text('error'),                                    // 错误信息

  // 时间
  processedAt: integer('processed_at', { mode: 'timestamp' }),  // 处理时间
  completedAt: integer('completed_at', { mode: 'timestamp' }),  // 完成时间

  ...timestamps,
});

// ============================================
// 类型导出
// ============================================

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;

export type Shot = typeof shots.$inferSelect;
export type NewShot = typeof shots.$inferInsert;

export type Storyline = typeof storylines.$inferSelect;
export type NewStoryline = typeof storylines.$inferInsert;

export type Highlight = typeof highlights.$inferSelect;
export type NewHighlight = typeof highlights.$inferInsert;

export type RecapTask = typeof recapTasks.$inferSelect;
export type NewRecapTask = typeof recapTasks.$inferInsert;

export type RecapSegment = typeof recapSegments.$inferSelect;
export type NewRecapSegment = typeof recapSegments.$inferInsert;

export type QueueJob = typeof queueJobs.$inferSelect;
export type NewQueueJob = typeof queueJobs.$inferInsert;

// ============================================
// Schema 对象统一导出
// ============================================
export const schema = {
  projects,
  videos,
  shots,
  storylines,
  highlights,
  recapTasks,
  recapSegments,
  queueJobs,
};
