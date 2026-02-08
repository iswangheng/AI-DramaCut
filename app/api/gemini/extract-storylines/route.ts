/**
 * Gemini 3 API 路由
 *
 * POST /api/gemini/extract-storylines - 提取故事线
 */

import { NextRequest, NextResponse } from 'next/server';
import { geminiClient } from '@/lib/api';

/**
 * POST /api/gemini/extract-storylines
 * 提取视频中的故事线
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoPath, minCount } = body;

    if (!videoPath) {
      return NextResponse.json(
        { error: '缺少 videoPath 参数' },
        { status: 400 }
      );
    }

    // 调用 Gemini API
    const response = await geminiClient.extractStorylines(videoPath, minCount);

    if (!response.success || !response.data) {
      return NextResponse.json(
        {
          success: false,
          error: response.error || '故事线提取失败',
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
