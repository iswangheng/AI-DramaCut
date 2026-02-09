// ============================================
// 语义匹配库 - 类型定义
// ============================================

/**
 * 向量维度（OpenAI text-embedding-3-small）
 */
export const EMBEDDING_DIM = 1536;

/**
 * 文本 Embedding 结果
 */
export interface TextEmbedding {
  vector: number[];        // 向量数组（1536 维）
  model: string;           // 使用的模型
}

/**
 * 镜头 Embedding 结果
 */
export interface ShotEmbedding {
  shotId: number;          // 镜头 ID
  vector: number[];        // 向量数组（1536 维）
  semanticTags: string[];  // 语义标签
}

/**
 * 相似度匹配结果
 */
export interface MatchResult {
  shotId: number;          // 匹配的镜头 ID
  similarity: number;      // 相似度分数（0-1）
  reason?: string;         // 匹配原因（可选）
}

/**
 * 画面匹配配置
 */
export interface MatcherConfig {
  topK: number;            // 返回 Top-K 个候选
  minSimilarity: number;   // 最低相似度阈值
  enableContinuity: boolean; // 是否启用时间连续性保证
  fallbackStrategy: 'sequential' | 'random' | 'none'; // 无匹配时的回退策略
}

/**
 * 画面匹配请求
 */
export interface MatchRequest {
  narrationText: string;   // 解说文本
  videoId: number;         // 视频 ID
  excludedShotIds?: number[]; // 排除的镜头 ID（已使用的）
  config?: Partial<MatcherConfig>; // 自定义配置
}

/**
 * 画面匹配响应
 */
export interface MatchResponse {
  matches: MatchResult[];  // 匹配结果列表
  confidence: number;      // 整体置信度
  fallback: boolean;       // 是否使用了回退策略
}
