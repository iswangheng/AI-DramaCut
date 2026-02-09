// ============================================
// 语义匹配库 - 统一导出入口
// ============================================

// 类型定义
export type {
  TextEmbedding,
  ShotEmbedding,
  MatchResult,
  MatcherConfig,
  MatchRequest,
  MatchResponse,
} from './types';

// 向量化模块
export {
  textEmbedding,
  batchTextEmbedding,
  shotEmbedding,
  batchShotEmbeddings,
  shotToText,
  resetOpenAIClient,
  getCachedVector,
  setCachedVector,
  clearVectorCache,
  getVectorCacheStats,
} from './vectorizer';

// 相似度计算模块
export {
  cosineSimilarity,
  batchCosineSimilarity,
  topKMatches,
  thresholdFilter,
  describeSimilarity,
  explainMatch,
  euclideanDistance,
  manhattanDistance,
} from './similarity';

// 画面匹配模块
export {
  matchScenes,
  batchMatchScenes,
} from './matcher';
