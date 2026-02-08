// ============================================
// API 客户端统一导出
// ============================================

export { GeminiClient, geminiClient } from './gemini';
export { ElevenLabsClient, elevenlabsClient } from './elevenlabs';
export { projectsApi, videosApi } from './projects';

// 导出类型
export type {
  // Gemini 类型
  GeminiResponse,
  Scene,
  VideoAnalysis,
  HighlightMoment,
  ViralMoment,  // 添加 ViralMoment 别名
  Storyline,
  RecapScript,
  // ElevenLabs 类型
  ElevenLabsResponse,
  WordTimestamp,
  TTSOptions,
  TTSResult,
  Voice,
  Model,
  // 通用错误类型
  APIError,
  NetworkError,
  TimeoutError,
  AuthenticationError,
  RateLimitError,
} from './types';

// 项目管理 API 类型
export type { ProjectWithStats, ApiResponse } from './projects';
