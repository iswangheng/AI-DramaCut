// ============================================
// DramaGen AI 任务队列统一导出
// ============================================

// 导出队列管理器
export { queueManager, QUEUE_NAMES } from './bullmq';

// 导出 WebSocket 服务器
export { wsServer } from '../ws/server';
export type { WSMessage, WSMessageHandler, WSMessageType } from '../ws/server';

// 导出任务处理器
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
