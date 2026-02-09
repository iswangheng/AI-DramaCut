// ============================================
// 语义匹配库 - 相似度计算模块
// ============================================

import type { MatchResult } from './types';

// ============================================
// 余弦相似度计算
// ============================================

/**
 * 计算两个向量的余弦相似度
 *
 * 余弦相似度 = (A · B) / (|A| * |B|)
 * 取值范围：[-1, 1]，其中 1 表示完全相同，0 表示正交，-1 表示完全相反
 *
 * @param vecA - 向量 A
 * @param vecB - 向量 B
 * @returns 相似度分数（0-1）
 *
 * @example
 * cosineSimilarity(
 *   [0.123, -0.456, 0.789],
 *   [0.125, -0.458, 0.785]
 * ) // 返回: 0.999（非常相似）
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  // 1. 验证向量维度
  if (vecA.length !== vecB.length) {
    throw new Error(
      `向量维度不匹配: vecA 长度 ${vecA.length}, vecB 长度 ${vecB.length}`
    );
  }

  if (vecA.length === 0) {
    throw new Error('向量不能为空');
  }

  // 2. 计算点积 (A · B)
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }

  // 3. 计算向量范数（模长）
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  // 4. 避免除以零
  if (normA === 0 || normB === 0) {
    return 0;
  }

  // 5. 计算余弦相似度
  const similarity = dotProduct / (normA * normB);

  // 6. 归一化到 [0, 1] 区间（防止负值）
  return Math.max(0, similarity);
}

/**
 * 批量计算余弦相似度
 *
 * @param targetVec - 目标向量
 * @param candidateVecs - 候选向量数组
 * @returns 相似度数组
 *
 * @example
 * const similarities = batchCosineSimilarity(
 *   targetVec,
 *   [vec1, vec2, vec3]
 * ); // [0.89, 0.65, 0.23]
 */
export function batchCosineSimilarity(
  targetVec: number[],
  candidateVecs: number[][]
): number[] {
  return candidateVecs.map((vec) => cosineSimilarity(targetVec, vec));
}

// ============================================
// Top-K 检索
// ============================================

/**
 * 找出最相似的 Top-K 个结果
 *
 * @param targetVec - 目标向量
 * @param candidates - 候选项数组（包含向量）
 * @param k - 返回前 K 个结果
 * @returns Top-K 匹配结果（按相似度降序排列）
 *
 * @example
 * const topK = topKMatches(
 *   narrationVec,
 *   [
 *     { shotId: 1, vector: vec1 },
 *     { shotId: 2, vector: vec2 }
 *   ],
 *   3
 * ); // 返回相似度最高的 3 个
 */
export function topKMatches<T extends { vector: number[] }>(
  targetVec: number[],
  candidates: T[],
  k: number
): Array<T & { similarity: number }> {
  // 1. 计算所有候选项的相似度
  const withSimilarity = candidates.map((candidate) => ({
    ...candidate,
    similarity: cosineSimilarity(targetVec, candidate.vector),
  }));

  // 2. 按相似度降序排序
  withSimilarity.sort((a, b) => b.similarity - a.similarity);

  // 3. 返回 Top-K
  return withSimilarity.slice(0, k);
}

/**
 * 找出相似度超过阈值的所有结果
 *
 * @param targetVec - 目标向量
 * @param candidates - 候选项数组
 * @param threshold - 相似度阈值（0-1）
 * @returns 所有满足阈值的结果（按相似度降序）
 *
 * @example
 * const filtered = thresholdFilter(
 *   narrationVec,
 *   shotEmbeddings,
 *   0.7  // 只保留相似度 > 0.7 的
 * );
 */
export function thresholdFilter<T extends { vector: number[] }>(
  targetVec: number[],
  candidates: T[],
  threshold: number
): Array<T & { similarity: number }> {
  // 1. 计算所有候选项的相似度
  const withSimilarity = candidates.map((candidate) => ({
    ...candidate,
    similarity: cosineSimilarity(targetVec, candidate.vector),
  }));

  // 2. 过滤低于阈值的
  const filtered = withSimilarity.filter((item) => item.similarity >= threshold);

  // 3. 按相似度降序排序
  filtered.sort((a, b) => b.similarity - a.similarity);

  return filtered;
}

// ============================================
// 相似度解释工具
// ============================================

/**
 * 将相似度分数转换为人类可读的描述
 *
 * @param similarity - 相似度分数（0-1）
 * @returns 描述文本
 *
 * @example
 * describeSimilarity(0.95) // "完美匹配"
 * describeSimilarity(0.75) // "高度相似"
 * describeSimilarity(0.45) // "中等相似"
 * describeSimilarity(0.15) // "低相似度"
 */
export function describeSimilarity(similarity: number): string {
  if (similarity >= 0.9) return '完美匹配';
  if (similarity >= 0.8) return '高度相似';
  if (similarity >= 0.7) return '比较相似';
  if (similarity >= 0.5) return '中等相似';
  if (similarity >= 0.3) return '低相似度';
  return '不相关';
}

/**
 * 生成匹配结果的详细说明
 *
 * @param match - 匹配结果
 * @returns 详细说明文本
 *
 * @example
 * explainMatch({
 *   shotId: 23,
 *   similarity: 0.89,
 *   reason: '情感爆发场景'
 * }) // "镜头 #23（高度相似，89%）：情感爆发场景"
 */
export function explainMatch(match: MatchResult): string {
  const percentage = Math.round(match.similarity * 100);
  const level = describeSimilarity(match.similarity);

  let explanation = `镜头 #${match.shotId}（${level}，${percentage}%）`;

  if (match.reason) {
    explanation += `：${match.reason}`;
  }

  return explanation;
}

// ============================================
// 向量距离计算（补充工具）
// ============================================

/**
 * 计算欧氏距离（Euclidean Distance）
 *
 * @param vecA - 向量 A
 * @param vecB - 向量 B
 * @returns 欧氏距离（越小越相似）
 *
 * @example
 * euclideanDistance([1, 2, 3], [1, 2, 3]) // 0（完全相同）
 * euclideanDistance([1, 2, 3], [4, 5, 6]) // 5.196（有差异）
 */
export function euclideanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('向量维度不匹配');
  }

  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * 计算曼哈顿距离（Manhattan Distance）
 *
 * @param vecA - 向量 A
 * @param vecB - 向量 B
 * @returns 曼哈顿距离（越小越相似）
 */
export function manhattanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('向量维度不匹配');
  }

  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += Math.abs(vecA[i] - vecB[i]);
  }

  return sum;
}
