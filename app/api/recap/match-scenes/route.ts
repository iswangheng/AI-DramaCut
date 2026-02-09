// ============================================
// API 路由：画面匹配
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { matchScenes } from '@/lib/semantic';
import type { MatchRequest } from '@/lib/semantic/types';

/**
 * POST /api/recap/match-scenes
 *
 * 为解说词匹配合适的画面
 *
 * 请求体：
 * {
 *   "narrationText": "女主跪地痛哭，情感爆发",
 *   "videoId": 1,
 *   "excludedShotIds": [23, 45],
 *   "config": {
 *     "topK": 5,
 *     "minSimilarity": 0.6
 *   }
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "matches": [
 *       {
 *         "shotId": 67,
 *         "similarity": 0.89,
 *         "reason": "高度相似 - 匹配标签：悲伤、痛哭、情感"
 *       }
 *     ],
 *     "confidence": 0.89,
 *     "fallback": false
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求体
    const body = await request.json();

    const { narrationText, videoId, excludedShotIds, config } = body as Partial<MatchRequest>;

    // 2. 验证必需参数
    if (!narrationText) {
      return NextResponse.json(
        {
          success: false,
          message: '缺少必需参数: narrationText',
        },
        { status: 400 }
      );
    }

    if (!videoId) {
      return NextResponse.json(
        {
          success: false,
          message: '缺少必需参数: videoId',
        },
        { status: 400 }
      );
    }

    // 3. 调用匹配算法
    const result = await matchScenes({
      narrationText,
      videoId,
      excludedShotIds: excludedShotIds || [],
      config,
    });

    // 4. 返回结果
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API] 画面匹配失败:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '画面匹配失败',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recap/match-scenes
 *
 * 健康检查接口
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: '画面匹配 API 运行正常',
    endpoints: {
      match: 'POST /api/recap/match-scenes',
    },
    docs: {
      description: '为解说词智能匹配最合适的画面',
      algorithm: '基于 OpenAI Embeddings + 余弦相似度',
      features: [
        '语义理解：不只是关键词匹配',
        'Top-K 检索：返回多个候选画面',
        '时间连续性：避免画面跳跃',
        '回退策略：无匹配时的兜底方案',
      ],
    },
  });
}
