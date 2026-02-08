/**
 * POST /api/highlights/batch-render
 *
 * 批量渲染高光切片视频
 *
 * 请求体：
 * {
 *   "highlightIds": number[],    // 高光 ID 数组
 *   "videoPath": string,         // 原视频路径
 *   "outputDir": string          // 输出目录（可选）
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "jobs": Array<{ jobId: string; highlightId: number }>,
 *     "count": number,
 *     "message": string
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { highlightClipsQueue } from '@/lib/queue/bullmq';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { highlightIds, videoPath, outputDir = 'outputs/highlights' } = body;

    // 验证必需参数
    if (!highlightIds || !Array.isArray(highlightIds)) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必需参数: highlightIds (数组)',
        },
        { status: 400 }
      );
    }

    if (!videoPath) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必需参数: videoPath',
        },
        { status: 400 }
      );
    }

    if (highlightIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'highlightIds 不能为空',
        },
        { status: 400 }
      );
    }

    // 批量添加到渲染队列
    const jobs = [];
    for (const highlightId of highlightIds) {
      try {
        const job = await highlightClipsQueue.add(
          'render-highlight',
          {
            highlightId,
            videoPath,
            outputDir,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          }
        );

        jobs.push({
          jobId: job.id,
          highlightId,
        });

        console.log(`✅ 高光 #${highlightId} 已添加到渲染队列 (Job ID: ${job.id})`);
      } catch (error) {
        console.error(`❌ 添加高光 #${highlightId} 到队列失败:`, error);
      }
    }

    console.log(`✅ 批量添加 ${jobs.length} 个高光到渲染队列`);

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        count: jobs.length,
        message: `已添加 ${jobs.length} 个高光到渲染队列`,
      },
    });
  } catch (error) {
    console.error('❌ 批量渲染失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
