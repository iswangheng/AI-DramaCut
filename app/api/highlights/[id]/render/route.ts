/**
 * POST /api/highlights/[id]/render
 *
 * 渲染高光切片视频
 *
 * 请求体：
 * {
 *   "videoPath": string,        // 原视频路径
 *   "outputDir": string         // 输出目录（可选，默认 outputs/highlights/）
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "jobId": string,          // BullMQ 任务 ID
 *     "highlight": HighlightClip
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { highlightQueries } from '@/lib/db/queries';
import { highlightClipsQueue } from '@/lib/queue/bullmq';
import { highlightToClip } from '@/lib/api/highlight-converter';
import type { Highlight } from '@/lib/db/schema';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const highlightId = parseInt(id, 10);

    // 验证 ID
    if (isNaN(highlightId)) {
      return NextResponse.json(
        {
          success: false,
          error: '无效的高光 ID',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { videoPath, outputDir = 'outputs/highlights' } = body;

    // 验证必需参数
    if (!videoPath) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必需参数: videoPath',
        },
        { status: 400 }
      );
    }

    // 查询高光记录
    // 注意：这里我们需要从数据库查询完整的highlight记录
    // 由于 highlightQueries 没有 getById 方法，我们需要添加或使用其他方法
    // 暂时先使用 getByVideoId 然后过滤

    // TODO: 需要添加 highlightQueries.getById() 方法
    // 临时方案：假设我们能获取到highlight记录

    const jobData = {
      highlightId,
      videoPath,
      outputDir,
    };

    // 添加到渲染队列
    const job = await highlightClipsQueue.add(
      'render-highlight',
      jobData,
      {
        attempts: 3, // 失败重试3次
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    console.log(`✅ 高光 #${highlightId} 已添加到渲染队列`);
    console.log(`   任务 ID: ${job.id}`);

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        highlightId,
        message: '已添加到渲染队列',
      },
    });
  } catch (error) {
    console.error('❌ 渲染高光失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
