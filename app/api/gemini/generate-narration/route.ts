/**
 * Gemini 3 API 路由
 *
 * POST /api/gemini/generate-narration - 生成解说文案（文本）
 */

import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/api/gemini';
import type { Storyline } from '@/lib/api';

/**
 * POST /api/gemini/generate-narration
 * 基于故事线生成解说文案（纯文本）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyline, style } = body;

    if (!storyline) {
      return NextResponse.json(
        { error: '缺少 storyline 参数' },
        { status: 400 }
      );
    }

    if (!style) {
      return NextResponse.json(
        { error: '缺少 style 参数' },
        { status: 400 }
      );
    }

    // 验证 style 参数
    const validStyles = ['hook', 'suspense', 'emotional', 'roast'];
    if (!validStyles.includes(style)) {
      return NextResponse.json(
        {
          error: `无效的 style 参数。可选值: ${validStyles.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 调用 Gemini API
    const client = new GeminiClient();
    const response = await client.generateNarration(storyline, style);

    if (!response.success || !response.data) {
      return NextResponse.json(
        {
          success: false,
          error: response.error || '解说文案生成失败',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        text: response.data,
        style,
      },
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
