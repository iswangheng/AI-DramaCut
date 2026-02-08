/**
 * Gemini 3 API 路由
 *
 * POST /api/gemini/generate-narration-stream - 流式生成解说文案
 */

import { NextRequest } from 'next/server';
import { GeminiClient } from '@/lib/api/gemini';

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
    const encoder = new TextEncoder();

    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            const client = new GeminiClient();

            // 调用 Gemini API 流式方法
            const response = await client.generateNarrationStream(
              storyline,
              style,
              async (chunk) => {
                // 发送 SSE 格式的数据
                const data = `data: ${JSON.stringify(chunk)}\n\n`;
                controller.enqueue(encoder.encode(data));

                if (chunk.error) {
                  controller.close();
                }
              }
            );

            if (!response.success) {
              const errorChunk = {
                text: '',
                done: true,
                index: -1,
                error: response.error || '生成失败',
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
            }

            // 发送完成信号
            controller.enqueue(encoder.encode('data: {"done":true}\n\n'));
            controller.close();

            console.log(`✅ 流式生成完成: ${style}`);
          } catch (error) {
            console.error('流式生成错误:', error);
            const errorChunk = {
              text: '',
              done: true,
              index: -1,
              error: error instanceof Error ? error.message : '未知错误',
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
            controller.close();
          }
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
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
