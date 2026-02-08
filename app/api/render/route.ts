// ============================================
// Remotion 渲染 API
// POST /api/render - 创建渲染任务
// GET /api/render?jobId=xxx - 查询渲染状态
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/queue';
import { nanoid } from 'nanoid';

/**
 * POST /api/render
 * 创建新的渲染任务
 *
 * 请求体:
 * {
 *   "compositionId": string,        // Remotion composition ID
 *   "inputProps": object,            // 输入 props
 *   "outputPath": string,            // 输出路径
 *   "metadata": {
 *     "projectId": number,           // 项目 ID（可选）
 *     "type": "highlight" | "recap"  // 渲染类型
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { compositionId, inputProps, outputPath, metadata } = body;

    // 验证必需参数
    if (!compositionId) {
      return NextResponse.json(
        {
          success: false,
          message: '缺少 compositionId 参数',
        },
        { status: 400 }
      );
    }

    if (!inputProps) {
      return NextResponse.json(
        {
          success: false,
          message: '缺少 inputProps 参数',
        },
        { status: 400 }
      );
    }

    if (!outputPath) {
      return NextResponse.json(
        {
          success: false,
          message: '缺少 outputPath 参数',
        },
        { status: 400 }
      );
    }

    // 生成唯一的任务 ID
    const jobId = nanoid();

    // 添加到渲染队列
    const queue = queueManager.getQueue('video-processing');
    const job = await queue.add(
      jobId,
      {
        type: 'render',
        compositionId,
        inputProps,
        outputPath,
        recapTaskId: metadata?.recapTaskId || null,
      },
      {
        jobId,
        // 设置任务选项
        attempts: 3, // 失败重试 3 次
        backoff: {
          type: 'exponential',
          delay: 2000, // 初始延迟 2 秒
        },
      }
    );

    // 返回任务信息
    return NextResponse.json(
      {
        success: true,
        data: {
          jobId: job.id!,
          compositionId,
          status: 'queued',
          queue: 'video-processing',
          metadata,
        },
        message: '渲染任务已创建',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建渲染任务失败:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '创建渲染任务失败',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/render?jobId=xxx
 * 查询渲染任务状态
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          message: '缺少 jobId 参数',
        },
        { status: 400 }
      );
    }

    // 获取任务队列
    const queue = queueManager.getQueue('video-processing');

    // 获取任务状态
    const job = await queue.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message: '任务不存在',
        },
        { status: 404 }
      );
    }

    // 获取任务状态和进度
    const state = await job.getState();
    const progress = job.progress;

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        status: state,
        progress: progress || 0,
        data: job.data,
        result: job.returnvalue,
        failedReason: job.failedReason,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      },
    });
  } catch (error) {
    console.error('查询渲染任务失败:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '查询渲染任务失败',
      },
      { status: 500 }
    );
  }
}
