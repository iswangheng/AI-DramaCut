/**
 * Gemini 3 API 路由
 *
 * POST /api/gemini/generate-narration-stream - 流式生成解说文案
 */

import { NextRequest } from 'next/server';
import { geminiClient } from '@/lib/api';
import { createStreamResponseHelper } from '@/lib/api/utils/streaming';

/**
 * POST /api/gemini/generate-narration-stream
 * 流式生成解说文案（Server-Sent Events）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyline, style } = body;

    if (!storyline) {
      return new Response(
        JSON.stringify({ error: '缺少 storyline 参数' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!style) {
      return new Response(
        JSON.stringify({ error: '缺少 style 参数' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证 style 参数
    const validStyles = ['hook', 'suspense', 'emotional', 'roast'];
    if (!validStyles.includes(style)) {
      return new Response(
        JSON.stringify({
          error: `无效的 style 参数。可选值: ${validStyles.join(', ')}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 创建流式响应
    return createStreamResponseHelper(
      async (onChunk) => {
        // 调用 Gemini API 流式方法
        const response = await geminiClient.generateNarrationStream(
          storyline,
          style,
          onChunk
        );

        if (!response.success) {
          onChunk({
            text: '',
            done: true,
            index: -1,
            error: response.error || '生成失败',
          });
        }
      },
      () => {
        console.log(`✅ 流式生成完成: ${style}`);
      }
    );
  } catch (error) {
    console.error('Gemini API 错误:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
