// ============================================
// API 类型定义统一导出
// ============================================

// ------------------------------------------
// Gemini 类型
// ------------------------------------------
export interface GeminiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface Scene {
  startMs: number;
  endMs: number;
  description: string;
  emotion: string;
  dialogue?: string;
  characters?: string[];
  viralScore?: number;
}

export interface VideoAnalysis {
  summary: string;
  scenes: Scene[];
  storylines: string[];
  viralScore: number;
  highlights: number[];
  durationMs: number;
}

export interface HighlightMoment {
  timestampMs: number;
  reason: string;
  viralScore: number;
  category: 'conflict' | 'emotional' | 'reversal' | 'climax' | 'other';
  suggestedDuration?: number;
}

export interface Storyline {
  id: string;
  name: string;
  description: string;
  scenes: Scene[];
  attractionScore: number;
}

export interface RecapScript {
  storylineId: string;
  style: 'hook' | 'roast' | 'suspense' | 'emotional' | 'humorous';
  title: string;
  paragraphs: {
    text: string;
    videoCues: string[];
  }[];
  estimatedDurationMs: number;
}

// ------------------------------------------
// ElevenLabs 类型
// ------------------------------------------
export interface ElevenLabsResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WordTimestamp {
  word: string;
  startMs: number;
  endMs: number;
  confidence?: number;
}

export interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  outputFormat?: string;
}

export interface TTSResult {
  audioBuffer: Buffer;
  durationMs: number;
  wordTimestamps: WordTimestamp[];
  format: string;
  sampleRate: number;
}

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

export interface Model {
  model_id: string;
  name: string;
}

// ------------------------------------------
// 通用 API 错误类型
// ------------------------------------------
export class APIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class NetworkError extends APIError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends APIError {
  constructor(message: string) {
    super(message, 'TIMEOUT');
    this.name = 'TimeoutError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends APIError {
  constructor(message: string) {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}
