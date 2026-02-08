/**
 * Gemini 3 API 路由
 *
 * POST /api/gemini/analyze - 分析视频
 * POST /api/gemini/highlights - 检测高光时刻
 * POST /api/gemini/storylines - 提取故事线
 */

import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/api/gemini';
import type { ViralMoment, Storyline } from '@/types/api-contracts';

/**
 * POST /api/gemini/detect-viral-moments
 * 检测视频中的病毒式传播时刻
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoPath, minConfidence, maxResults } = body;

    if (!videoPath) {
      return NextResponse.json(
        { error: '缺少 videoPath 参数' },
        { status: 400 }
      );
    }

    // 调用 Gemini API
    const client = new GeminiClient();
    const response = await client.detectViralMoments(videoPath, {
      minConfidence,
      maxResults,
    });

    if (!response.success || !response.data) {
      return NextResponse.json(
        {
          success: false,
          error: response.error || '视频分析失败',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: response.data,
      usage: response.usage,
    });
  } catch (error) {
    console.error('Gemini API 错误:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
