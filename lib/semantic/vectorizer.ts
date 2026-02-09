// ============================================
// 语义匹配库 - 向量化模块
// ============================================

import OpenAI from 'openai';
import { config } from '@/lib/config';
import type { TextEmbedding, ShotEmbedding } from './types';
import type { Shot } from '@/lib/db/schema';

// ============================================
// OpenAI 客户端初始化
// ============================================

let openaiClient: OpenAI | null = null;

/**
 * 获取 OpenAI 客户端实例（懒加载）
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY 环境变量未配置');
    }

    openaiClient = new OpenAI({
      apiKey,
      timeout: 30000, // 30 秒超时
    });
  }

  return openaiClient;
}

/**
 * 重置 OpenAI 客户端（测试用）
 */
export function resetOpenAIClient(): void {
  openaiClient = null;
}

// ============================================
// 文本向量化
// ============================================

/**
 * 将文本转换为向量（Embedding）
 *
 * @param text - 输入文本
 * @returns 向量表示（1536 维）
 *
 * @example
 * const embedding = await textEmbedding('男主一巴掌扇了过去，全场震惊');
 * console.log(embedding.vector); // [0.123, -0.456, ...]
 */
export async function textEmbedding(text: string): Promise<TextEmbedding> {
  if (!text || text.trim().length === 0) {
    throw new Error('输入文本不能为空');
  }

  try {
    const client = getOpenAIClient();

    const response = await client.embeddings.create({
      model: 'text-embedding-3-small', // 1536 维，性价比最高
      input: text.trim(),
      encoding_format: 'float',
    });

    const embedding = response.data[0];

    return {
      vector: embedding.embedding,
      model: embedding.model,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`文本向量化失败: ${error.message}`);
    }
    throw new Error('文本向量化失败: 未知错误');
  }
}

/**
 * 批量文本向量化
 *
 * @param texts - 文本数组
 * @returns 向量数组
 *
 * @example
 * const embeddings = await batchTextEmbedding(['反转1', '反转2', '反转3']);
 */
export async function batchTextEmbedding(texts: string[]): Promise<TextEmbedding[]> {
  if (!texts || texts.length === 0) {
    throw new Error('输入文本数组不能为空');
  }

  // 过滤空文本
  const validTexts = texts.filter((t) => t && t.trim().length > 0);

  if (validTexts.length === 0) {
    throw new Error('所有文本均为空');
  }

  try {
    const client = getOpenAIClient();

    // OpenAI 支持批量请求（最多 2048 个）
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: validTexts.map((t) => t.trim()),
      encoding_format: 'float',
    });

    return response.data.map((item) => ({
      vector: item.embedding,
      model: item.model,
    }));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`批量文本向量化失败: ${error.message}`);
    }
    throw new Error('批量文本向量化失败: 未知错误');
  }
}

// ============================================
// 镜头向量化
// ============================================

/**
 * 从镜头数据生成用于向量化的文本描述
 *
 * @param shot - 镜头数据
 * @returns 组合的文本描述
 *
 * @example
 * const text = shotToText({
 *   description: '女主跪地痛哭',
 *   emotion: '悲伤',
 *   dialogue: '为什么'
 * });
 * // 返回: "女主跪地痛哭 悲伤 为什么"
 */
export function shotToText(shot: {
  description: string;
  emotion: string;
  dialogue?: string | null;
  characters?: string | null;
}): string {
  const parts: string[] = [];

  // 1. 场景描述（最重要）
  if (shot.description) {
    parts.push(shot.description);
  }

  // 2. 情绪标签
  if (shot.emotion) {
    parts.push(shot.emotion);
  }

  // 3. 核心台词（如果有）
  if (shot.dialogue && shot.dialogue.trim().length > 0) {
    parts.push(shot.dialogue);
  }

  // 4. 角色（如果有）
  if (shot.characters) {
    try {
      const characters = JSON.parse(shot.characters) as string[];
      if (characters.length > 0) {
        parts.push(characters.join(' '));
      }
    } catch {
      // 忽略 JSON 解析错误
    }
  }

  return parts.join(' ');
}

/**
 * 将镜头数据转换为向量
 *
 * @param shot - 镜头数据
 * @returns 镜头 Embedding
 *
 * @example
 * const embedding = await shotEmbedding({
 *   id: 1,
 *   description: '女主跪地痛哭',
 *   emotion: '悲伤',
 *   dialogue: '为什么'
 * });
 */
export async function shotEmbedding(shot: Shot): Promise<ShotEmbedding> {
  // 1. 生成文本描述
  const text = shotToText({
    description: shot.description,
    emotion: shot.emotion,
    dialogue: shot.dialogue,
    characters: shot.characters,
  });

  // 2. 文本向量化
  const { vector } = await textEmbedding(text);

  // 3. 提取语义标签
  const semanticTags = shot.semanticTags
    ? JSON.parse(shot.semanticTags)
    : [shot.emotion, shot.description.split(' ')[0]].filter(Boolean);

  return {
    shotId: shot.id,
    vector,
    semanticTags,
  };
}

/**
 * 批量镜头向量化
 *
 * @param shots - 镜头数组
 * @returns 镜头 Embedding 数组
 *
 * @example
 * const embeddings = await batchShotEmbeddings(shots);
 */
export async function batchShotEmbeddings(shots: Shot[]): Promise<ShotEmbedding[]> {
  if (!shots || shots.length === 0) {
    throw new Error('镜头数组不能为空');
  }

  // 1. 为每个镜头生成文本描述
  const texts = shots.map((shot) =>
    shotToText({
      description: shot.description,
      emotion: shot.emotion,
      dialogue: shot.dialogue,
      characters: shot.characters,
    })
  );

  // 2. 批量向量化
  const embeddings = await batchTextEmbedding(texts);

  // 3. 组装结果
  return shots.map((shot, index) => ({
    shotId: shot.id,
    vector: embeddings[index].vector,
    semanticTags: shot.semanticTags
      ? JSON.parse(shot.semanticTags)
      : [shot.emotion, shot.description.split(' ')[0]].filter(Boolean),
  }));
}

// ============================================
// 向量缓存管理
// ============================================

/**
 * 向量缓存（内存级别，生产环境可升级到 Redis）
 */
const vectorCache = new Map<string, number[]>();

/**
 * 生成缓存键
 */
function getCacheKey(type: 'text' | 'shot', id: string | number): string {
  return `${type}:${id}`;
}

/**
 * 获取缓存的向量
 */
export function getCachedVector(type: 'text' | 'shot', id: string | number): number[] | undefined {
  return vectorCache.get(getCacheKey(type, id));
}

/**
 * 缓存向量
 */
export function setCachedVector(type: 'text' | 'shot', id: string | number, vector: number[]): void {
  vectorCache.set(getCacheKey(type, id), vector);
}

/**
 * 清空向量缓存
 */
export function clearVectorCache(): void {
  vectorCache.clear();
}

/**
 * 获取缓存统计
 */
export function getVectorCacheStats(): { size: number; keys: string[] } {
  return {
    size: vectorCache.size,
    keys: Array.from(vectorCache.keys()),
  };
}
