/**
 * DramaGen AI - Agent 间接口契约
 *
 * 本文件定义所有 Agent 必须遵守的接口约定
 * 修改前请先与其他 Agent 确认
 */

// ============================================
// 共享类型定义
// ============================================

/**
 * 视频元数据
 */
export interface VideoMetadata {
  duration: number;        // 时长（秒）
  width: number;           // 宽度（像素）
  height: number;          // 高度（像素）
  fps: number;             // 帧率
  bitrate: number;         // 比特率
  codec: string;           // 编码格式
  size: number;            // 文件大小（字节）
}

/**
 * 字幕数据
 */
export interface Caption {
  startMs: number;         // 开始时间（毫秒）
  endMs: number;           // 结束时间（毫秒）
  timestampMs: number;     // 时间戳
  text: string;            // 字幕内容
  confidence?: number;     // 置信度
  words?: Word[];          // 词级信息（可选）
}

/**
 * 单词级时间戳
 */
export interface Word {
  text: string;            // 单词内容
  startMs: number;         // 开始时间（毫秒）
  endMs: number;           // 结束时间（毫秒）
  timestampMs?: number;    // 时间戳
}

// ============================================
// Agent 2: API 集成接口
// ============================================

/**
 * 病毒式传播时刻
 * 由 Gemini AI 检测的视频高光时刻
 */
export interface ViralMoment {
  timestampMs: number;     // 时间戳（毫秒）
  type: "plot_twist" | "reveal" | "conflict" | "emotional" | "climax";
  confidence: number;      // 置信度 (0-1)
  description: string;     // 描述
  suggestedStartMs: number; // 建议开始时间
  suggestedEndMs: number;   // 建议结束时间
}

/**
 * 故事线
 * 从视频中提取的独立故事线
 */
export interface Storyline {
  id: string;              // 故事线 ID
  title: string;           // 标题
  summary: string;         // 摘要
  keyMoments: number[];    // 关键时刻时间戳数组
  characters: string[];    // 涉及角色
  tags: string[];          // 标签
}

/**
 * TTS 生成结果
 */
export interface TTSResult {
  audioPath: string;       // 生成的音频文件路径
  durationMs: number;      // 音频时长（毫秒）
  wordTimings: Word[];     // 单词级时间戳
  format: string;          // 音频格式（mp3/wav）
}

/**
 * Gemini AI API 接口
 * Agent 2 必须实现
 */
export interface IGeminiAPI {
  /**
   * 检测视频中的病毒式传播时刻
   * @param videoPath 视频文件路径
   * @param config 配置选项
   */
  detectViralMoments(
    videoPath: string,
    config?: {
      minConfidence?: number;
      maxResults?: number;
    }
  ): Promise<ViralMoment[]>;

  /**
   * 提取故事线
   * @param videoPath 视频文件路径
   * @param minCount 最少故事线数量
   */
  extractStorylines(
    videoPath: string,
    minCount?: number
  ): Promise<Storyline[]>;

  /**
   * 生成解说文案
   * @param storyline 故事线
   * @param style 文案风格
   */
  generateNarration(
    storyline: Storyline,
    style: "hook" | "suspense" | "emotional" | "roast"
  ): Promise<string>;
}

/**
 * ElevenLabs TTS API 接口
 * Agent 2 必须实现
 */
export interface IElevenLabsAPI {
  /**
   * 生成语音解说
   * @param text 文案内容
   * @param options 选项
   */
  generateNarration(
    text: string,
    options?: {
      voice?: string;      // 默认: eleven_multilingual_v2
      model?: string;      // 默认: eleven_multilingual_v2
      stability?: number;  // 0-1
    }
  ): Promise<TTSResult>;
}

// ============================================
// Agent 3: 视频处理接口
// ============================================

/**
 * 场景镜头
 * 视频中的连续镜头片段
 */
export interface SceneShot {
  id: string;              // 镜头 ID
  startMs: number;         // 开始时间
  endMs: number;           // 结束时间
  thumbnailPath?: string;  // 缩略图路径
  semanticTags: string[];  // AI 生成的语义标签
  embeddings?: number[];   // 向量表示（用于语义搜索）
}

/**
 * 视频裁剪选项
 */
export interface TrimOptions {
  inputPath: string;
  outputPath: string;
  startTimeMs: number;
  durationMs?: number;
  crf?: number;
  preset?: string;
}

/**
 * 音频混合选项
 */
export interface AudioMixOptions {
  videoPath: string;
  audioPath: string;
  outputPath: string;
  videoVolume?: number;    // 默认 0.15
  audioVolume?: number;    // 默认 1.0
}

/**
 * 视频处理 API 接口
 * Agent 3 必须实现
 */
export interface IVideoProcessing {
  /**
   * 获取视频元数据
   * @param videoPath 视频文件路径
   */
  getMetadata(videoPath: string): Promise<VideoMetadata>;

  /**
   * 检测场景镜头
   * @param videoPath 视频文件路径
   * @param options 选项
   */
  detectShots(
    videoPath: string,
    options?: {
      minShotDuration?: number;  // 最小镜头时长（毫秒）
      generateThumbnails?: boolean;
    }
  ): Promise<SceneShot[]>;

  /**
   * 裁剪视频（毫秒级精度）
   * @param options 裁剪选项
   */
  trimVideo(options: TrimOptions): Promise<void>;

  /**
   * 提取音频
   * @param inputPath 输入路径
   * @param outputPath 输出路径
   * @param sampleRate 采样率（默认 16000）
   */
  extractAudio(
    inputPath: string,
    outputPath: string,
    sampleRate?: number
  ): Promise<void>;

  /**
   * 混合音频（多轨道）
   * @param options 混音选项
   */
  mixAudio(options: AudioMixOptions): Promise<void>;

  /**
   * 生成视频字幕
   * @param videoPath 视频路径
   * @param captions 字幕数据
   * @param outputPath 输出路径
   */
  renderSubtitledVideo(
    videoPath: string,
    captions: Caption[],
    outputPath: string
  ): Promise<void>;
}

// ============================================
// Agent 4: 数据层接口
// ============================================

/**
 * 项目实体
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 视频素材
 */
export interface VideoAsset {
  id: string;
  projectId: string;
  path: string;             // 原始文件路径
  metadata: VideoMetadata;
  processedAt?: Date;       // 预处理完成时间
  shots?: SceneShot[];      // 镜头检测结果
  viralMoments?: ViralMoment[];  // 病毒式时刻
  storylines?: Storyline[]; // 故事线
}

/**
 * 处理后的片段
 */
export interface ProcessedClip {
  id: string;
  projectId: string;
  sourceAssetId: string;
  type: "highlight" | "recap";  // 高光切片 or 解说
  startMs: number;
  endMs: number;
  outputPath: string;
  narrationId?: string;     // 关联的解说 ID
  createdAt: Date;
}

/**
 * 解说任务
 */
export interface NarrationTask {
  id: string;
  projectId: string;
  storylineId: string;
  style: "hook" | "suspense" | "emotional" | "roast";
  text: string;
  audioPath?: string;
  status: "pending" | "generating" | "completed" | "failed";
  wordTimings?: Word[];
  createdAt: Date;
  completedAt?: Date;
}

/**
 * 数据库 API 接口
 * Agent 4 必须实现
 */
export interface IDatabase {
  // ========== 项目管理 ==========
  /**
   * 创建项目
   */
  createProject(name: string, description?: string): Promise<Project>;

  /**
   * 获取项目
   */
  getProject(projectId: string): Promise<Project | null>;

  /**
   * 列出所有项目
   */
  listProjects(): Promise<Project[]>;

  /**
   * 更新项目
   */
  updateProject(
    projectId: string,
    updates: Partial<Pick<Project, "name" | "description">>
  ): Promise<Project>;

  /**
   * 删除项目
   */
  deleteProject(projectId: string): Promise<void>;

  // ========== 视频素材管理 ==========
  /**
   * 添加视频素材
   */
  addVideoAsset(
    projectId: string,
    path: string,
    metadata: VideoMetadata
  ): Promise<VideoAsset>;

  /**
   * 获取视频素材
   */
  getVideoAsset(assetId: string): Promise<VideoAsset | null>;

  /**
   * 更新视频素材（预处理结果）
   */
  updateVideoAsset(
    assetId: string,
    updates: Partial<VideoAsset>
  ): Promise<VideoAsset>;

  /**
   * 删除视频素材
   */
  deleteVideoAsset(assetId: string): Promise<void>;

  // ========== 处理片段管理 ==========
  /**
   * 保存处理后的片段
   */
  saveProcessedClip(clip: Omit<ProcessedClip, "id" | "createdAt">): Promise<ProcessedClip>;

  /**
   * 获取项目的所有片段
   */
  getProjectClips(projectId: string): Promise<ProcessedClip[]>;

  /**
   * 删除片段
   */
  deleteClip(clipId: string): Promise<void>;

  // ========== 解说任务管理 ==========
  /**
   * 创建解说任务
   */
  createNarrationTask(
    task: Omit<NarrationTask, "id" | "createdAt" | "status">
  ): Promise<NarrationTask>;

  /**
   * 获取解说任务
   */
  getNarrationTask(taskId: string): Promise<NarrationTask | null>;

  /**
   * 更新解说任务
   */
  updateNarrationTask(
    taskId: string,
    updates: Partial<NarrationTask>
  ): Promise<NarrationTask>;
}

/**
 * 任务队列 API 接口
 * Agent 4 必须实现
 */
export interface ITaskQueue {
  /**
   * 提交视频处理任务
   * @param job 任务信息
   * @returns jobId
   */
  submitJob(
    job: Omit<VideoProcessingJob, "id" | "status" | "progress">
  ): Promise<string>;

  /**
   * 获取任务状态
   */
  getJobStatus(jobId: string): Promise<VideoProcessingJob>;

  /**
   * 取消任务
   */
  cancelJob(jobId: string): Promise<void>;

  /**
   * 订阅任务进度（通过 WebSocket）
   */
  subscribeToJobProgress(jobId: string, callback: (job: VideoProcessingJob) => void): void;
}

/**
 * 视频处理任务
 */
export interface VideoProcessingJob {
  id: string;
  type: "trim" | "analyze" | "render" | "extract-shots";
  inputPath: string;
  outputPath?: string;
  options: Record<string, any>;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;         // 0-100
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * WebSocket 进度推送接口
 * Agent 4 必须实现
 */
export interface IProgressWebSocket {
  /**
   * 发送进度更新
   */
  sendProgress(jobId: string, progress: number, message?: string): void;

  /**
   * 发送任务完成通知
   */
  sendComplete(jobId: string, result: any): void;

  /**
   * 发送错误通知
   */
  sendError(jobId: string, error: string): void;
}

// ============================================
// Agent 1: UI 组件所需的依赖
// ============================================

/**
 * UI 需要的所有 API 接口汇总
 */
export interface AppAPI {
  gemini: IGeminiAPI;
  elevenlabs: IElevenLabsAPI;
  video: IVideoProcessing;
  db: IDatabase;
  queue: ITaskQueue;
}
