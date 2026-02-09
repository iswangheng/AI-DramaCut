// ============================================
// DramaGen AI 任务队列统一导出
// ============================================

// 导出队列管理器
export { queueManager, QUEUE_NAMES } from './bullmq';

// 导出 WebSocket 服务器
export { wsServer } from '../ws/server';
export type { WSMessage, WSMessageHandler, WSMessageType } from '../ws/server';

// 导出基础任务处理器（不包含 Remotion 依赖）
export { processors } from './workers';
export type {
  VideoJobData,
  TrimJobData,
  AnalyzeJobData,
  ExtractShotsJobData,
  RenderJobData,
  TTSJobData,
  ExtractStorylinesJobData,
  DetectHighlightsJobData,
} from './workers';

// 导出 Worker 管理器
export { workerManager, WorkerManager, videoWorkerInstance } from './worker-manager';

// 深度解说渲染处理器需要单独导入（避免 Webpack 构建错误）
// 使用动态导入：const { processRecapRenderJob } = await import('./workers/recap-render');
