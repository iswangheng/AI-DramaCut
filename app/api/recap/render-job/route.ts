// ============================================
// API 路由：创建深度解说渲染任务
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { recapTasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/recap/render-job
 *
 * 创建深度解说渲染任务并添加到队列
 *
 * 请求体：
 * {
 *   "taskId": 1
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "jobId": "job-uuid",
 *     "taskId": 1,
 *     "status": "waiting"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求
    const body = await request.json();
    const { taskId } = body as { taskId: number };

    // 2. 验证参数
    if (!taskId) {
      return NextResponse.json(
        { success: false, message: '缺少必需参数: taskId' },
        { status: 400 }
      );
    }

    // 3. 检查任务是否存在
    const task = await db.query.recapTasks.findFirst({
      where: eq(recapTasks.id, taskId),
    });

    if (!task) {
      return NextResponse.json(
        { success: false, message: '任务不存在' },
        { status: 404 }
      );
    }

    // 4. 检查是否已完成渲染
    if (task.outputPath && task.status === 'completed') {
      return NextResponse.json({
        success: true,
        data: {
          jobId: null,
          taskId,
          status: 'completed',
          outputPath: task.outputPath,
          cached: true,
        },
      });
    }

    // 5. 动态导入队列管理器（避免 Webpack 构建错误）
    const { queueManager } = await import('@/lib/queue/bullmq');

    // 6. 添加渲染任务到队列
    const job = await queueManager.addJob(
      'recap-render',
      'recap-render',
      { taskId }
    );

    // 7. 更新任务状态
    await db
      .update(recapTasks)
      .set({ status: 'rendering' })
      .where(eq(recapTasks.id, taskId));

    // 8. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        taskId,
        status: 'waiting',
      },
    });
  } catch (error) {
    console.error('[API] 创建渲染任务失败:', error);

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
 * GET /api/recap/render-job
 *
 * 健康检查接口
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: '深度解说渲染任务 API 运行正常',
    endpoints: {
      createJob: 'POST /api/recap/render-job',
    },
    docs: {
      description: '创建深度解说渲染任务并添加到 BullMQ 队列',
      workflow: [
        '1. 验证任务是否存在',
        '2. 检查是否已完成渲染（缓存）',
        '3. 添加渲染任务到队列',
        '4. Worker 异步处理渲染',
        '5. WebSocket 推送实时进度',
      ],
      features: [
        '异步渲染：不阻塞 API 请求',
        '实时进度：WebSocket 推送渲染进度',
        '断点续传：支持渲染中断恢复',
        '智能匹配：自动为解说词匹配画面',
      ],
    },
  });
}
