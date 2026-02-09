// ============================================
// 语义匹配库 - 画面匹配核心算法
// ============================================

import { textEmbedding } from './vectorizer';
import { topKMatches, cosineSimilarity, describeSimilarity } from './similarity';
import type { MatchRequest, MatchResponse, MatcherConfig, MatchResult, ShotEmbedding } from './types';
import { db } from '@/lib/db/client';
import { shots } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// ============================================
// 默认配置
// ============================================

const DEFAULT_CONFIG: MatcherConfig = {
  topK: 5,                              // 返回 Top-5 个候选
  minSimilarity: 0.6,                   // 最低相似度 0.6
  enableContinuity: true,               // 启用时间连续性保证
  fallbackStrategy: 'sequential',       // 回退策略：顺序选择
};

// ============================================
// 核心匹配算法
// ============================================

/**
 * 画面匹配主函数
 *
 * 工作流程：
 * 1. 将解说词向量化
 * 2. 从数据库获取候选镜头
 * 3. 计算相似度，找出 Top-K 匹配
 * 4. （可选）保证时间连续性
 * 5. （可选）应用回退策略
 *
 * @param request - 匹配请求
 * @returns 匹配结果
 *
 * @example
 * const result = await matchScenes({
 *   narrationText: "女主跪地痛哭，情感爆发",
 *   videoId: 1,
 *   excludedShotIds: [23, 45],
 *   config: { topK: 3 }
 * });
 */
export async function matchScenes(request: MatchRequest): Promise<MatchResponse> {
  // 1. 合并配置
  const config = { ...DEFAULT_CONFIG, ...request.config };

  // 2. 验证输入
  if (!request.narrationText || request.narrationText.trim().length === 0) {
    throw new Error('解说文本不能为空');
  }

  if (!request.videoId) {
    throw new Error('视频 ID 不能为空');
  }

  try {
    // 3. 将解说词向量化
    const { vector: narrationVec } = await textEmbedding(request.narrationText);

    // 4. 从数据库获取候选镜头
    const candidateShots = await getCandidateShots(
      request.videoId,
      request.excludedShotIds || []
    );

    if (candidateShots.length === 0) {
      return {
        matches: [],
        confidence: 0,
        fallback: true,
      };
    }

    // 5. 为镜头添加向量（如果有缓存的 embedding）
    const shotEmbeddings: Array<ShotEmbedding & { startMs: number; endMs: number }> =
      await enrichShotsWithEmbeddings(candidateShots);

    // 6. 计算 Top-K 相似度匹配
    const topK = topKMatches(narrationVec, shotEmbeddings, config.topK);

    // 7. 过滤低相似度结果
    const validMatches = topK.filter((m) => m.similarity >= config.minSimilarity);

    // 8. 如果没有有效匹配，应用回退策略
    if (validMatches.length === 0) {
      return applyFallbackStrategy(shotEmbeddings, config);
    }

    // 9. （可选）保证时间连续性
    let finalMatches = validMatches;
    if (config.enableContinuity) {
      finalMatches = ensureContinuity(validMatches, shotEmbeddings as any);
    }

    // 10. 转换为响应格式
    const matches: MatchResult[] = finalMatches.map((match) => ({
      shotId: match.shotId,
      similarity: match.similarity,
      reason: generateMatchReason(match, request.narrationText),
    }));

    // 11. 计算整体置信度
    const confidence = calculateConfidence(matches);

    return {
      matches,
      confidence,
      fallback: false,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`画面匹配失败: ${error.message}`);
    }
    throw new Error('画面匹配失败: 未知错误');
  }
}

// ============================================
// 辅助函数
// ============================================

/**
 * 从数据库获取候选镜头
 */
async function getCandidateShots(
  videoId: number,
  excludedShotIds: number[]
): Promise<Array<{ id: number; startMs: number; endMs: number; description: string; emotion: string; semanticTags: string | null; embeddings: string | null }>> {
  const conditions = [eq(shots.videoId, videoId)];

  // 排除已使用的镜头
  if (excludedShotIds.length > 0) {
    conditions.push(...excludedShotIds.map((id) => eq(shots.id, id))); // 注意：这里需要 NOT IN 逻辑
  }

  // 简化版：直接查询所有镜头，然后内存过滤
  const allShots = await db
    .select({
      id: shots.id,
      startMs: shots.startMs,
      endMs: shots.endMs,
      description: shots.description,
      emotion: shots.emotion,
      semanticTags: shots.semanticTags,
      embeddings: shots.embeddings,
    })
    .from(shots)
    .where(eq(shots.videoId, videoId));

  // 内存过滤排除的镜头
  const filtered = allShots.filter((shot: any) => !excludedShotIds.includes(shot.id));

  return filtered;
}

/**
 * 为镜头添加 embedding 向量
 * - 优先使用数据库缓存的向量
 * - 如果没有缓存，实时计算
 */
async function enrichShotsWithEmbeddings(
  shots: Array<{ id: number; startMs: number; endMs: number; description: string; emotion: string; semanticTags: string | null; embeddings: string | null }>
): Promise<Array<ShotEmbedding & { startMs: number; endMs: number }>> {
  const results: Array<ShotEmbedding & { startMs: number; endMs: number }> = [];

  for (const shot of shots) {
    let vector: number[];

    // 1. 尝试从数据库读取缓存的向量
    if (shot.embeddings) {
      try {
        vector = JSON.parse(shot.embeddings);
      } catch {
        // JSON 解析失败，重新计算
        vector = await calculateShotEmbedding(shot);
      }
    } else {
      // 2. 没有缓存，实时计算
      vector = await calculateShotEmbedding(shot);
    }

    // 3. 提取语义标签
    const semanticTags = shot.semanticTags ? JSON.parse(shot.semanticTags) : [shot.emotion];

    results.push({
      shotId: shot.id,
      vector,
      semanticTags,
      startMs: shot.startMs,
      endMs: shot.endMs,
    } as any);
  }

  return results;
}

/**
 * 计算单个镜头的 embedding
 */
async function calculateShotEmbedding(
  shot: { description: string; emotion: string }
): Promise<number[]> {
  const text = `${shot.description} ${shot.emotion}`;
  const { vector } = await textEmbedding(text);
  return vector;
}

/**
 * 保证时间连续性
 * 避免匹配的镜头在时间轴上跳跃太大
 */
function ensureContinuity<T extends { shotId: number; startMs: number; endMs: number }>(
  matches: T[],
  allShots: Array<T & { vector: number[] }>
): T[] {
  if (matches.length <= 1) {
    return matches;
  }

  // 简单策略：选择时间最接近 Top-1 的镜头
  const bestMatch = matches[0];
  const bestMatchTime = bestMatch.startMs;

  // 找出时间最接近的镜头（时间差 < 5 秒）
  const timeFiltered = matches.filter((m) => {
    const timeDiff = Math.abs(m.startMs - bestMatchTime);
    return timeDiff < 5000; // 5 秒以内
  });

  return timeFiltered.length > 0 ? timeFiltered : matches;
}

/**
 * 应用回退策略
 * 当没有匹配时，按规则选择默认镜头
 */
function applyFallbackStrategy<T extends { shotId: number; startMs: number; endMs: number }>(
  allShots: T[],
  config: MatcherConfig
): MatchResponse {
  if (allShots.length === 0) {
    return {
      matches: [],
      confidence: 0,
      fallback: true,
    };
  }

  let selectedShot: T;

  switch (config.fallbackStrategy) {
    case 'sequential':
      // 顺序选择：选择最早时间的镜头
      selectedShot = allShots.reduce((earliest, current) =>
        current.startMs < earliest.startMs ? current : earliest
      );
      break;

    case 'random':
      // 随机选择
      selectedShot = allShots[Math.floor(Math.random() * allShots.length)];
      break;

    case 'none':
    default:
      return {
        matches: [],
        confidence: 0,
        fallback: true,
      };
  }

  return {
    matches: [
      {
        shotId: selectedShot.shotId,
        similarity: 0, // 回退策略，相似度为 0
        reason: '回退策略：无合适匹配，使用默认镜头',
      },
    ],
    confidence: 0,
    fallback: true,
  };
}

/**
 * 生成匹配原因说明
 */
function generateMatchReason<T extends { similarity: number; semanticTags: string[] }>(
  match: T,
  narrationText: string
): string {
  const level = describeSimilarity(match.similarity);
  const tags = match.semanticTags.slice(0, 3).join('、');
  return `${level} - 匹配标签：${tags}`;
}

/**
 * 计算整体置信度
 * 基于所有匹配结果的平均相似度
 */
function calculateConfidence(matches: MatchResult[]): number {
  if (matches.length === 0) {
    return 0;
  }

  const avgSimilarity =
    matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length;

  return Math.round(avgSimilarity * 100) / 100; // 保留两位小数
}

// ============================================
// 批量匹配（优化性能）
// ============================================

/**
 * 批量匹配多个解说词片段
 *
 * @param requests - 匹配请求数组
 * @returns 匹配响应数组
 *
 * @example
 * const results = await batchMatchScenes([
 *   { narrationText: "反转1", videoId: 1 },
 *   { narrationText: "反转2", videoId: 1 }
 * ]);
 */
export async function batchMatchScenes(requests: MatchRequest[]): Promise<MatchResponse[]> {
  // 并行处理所有请求
  const results = await Promise.all(
    requests.map((request) => matchScenes(request))
  );

  return results;
}
