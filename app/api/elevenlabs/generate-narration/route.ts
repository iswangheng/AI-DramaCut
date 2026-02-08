/**
 * ElevenLabs TTS API 路由
 *
 * POST /api/elevenlabs/generate - 生成语音解说
 */

import { NextRequest, NextResponse } from 'next/server';
import { elevenlabsClient } from '@/lib/api';

/**
 * POST /api/elevenlabs/generate-narration
 * 生成语音解说（符合接口契约）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice, model, stability, outputPath } = body;

    if (!text) {
      return NextResponse.json(
        { error: '缺少 text 参数' },
        { status: 400 }
      );
    }

    // 调用 ElevenLabs API
    const response = await elevenlabsClient.generateNarration(text, {
      voice,
      model,
      stability,
      outputPath,
    });

    if (!response.success || !response.data) {
      return NextResponse.json(
        {
          success: false,
          error: response.error || 'TTS 生成失败',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('ElevenLabs API 错误:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
