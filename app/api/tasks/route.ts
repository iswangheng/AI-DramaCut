import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { queueJobs } from '@/lib/db/schema';
import { desc, or, eq } from 'drizzle-orm';

/**
 * GET /api/tasks
 *
 * 获取渲染任务列表（只返回最终成片的渲染任务）
 * - render-highlight: 高光切片渲染
 * - recap-render: 深度解说渲染
 */
export async function GET() {
  try {
    // 只获取渲染任务，按创建时间倒序
    const jobs = await db
      .select()
      .from(queueJobs)
      .where(
        or(
          eq(queueJobs.jobType, 'render-highlight'),
          eq(queueJobs.jobType, 'recap-render')
        )
      )
      .orderBy(desc(queueJobs.createdAt));

    // 转换日期字符串为 Date 对象（SQLite 返回的是字符串）
    const processedJobs = jobs.map((job: any) => ({
      ...job,
      createdAt: new Date(job.createdAt),
      updatedAt: new Date(job.updatedAt),
      processedAt: job.processedAt ? new Date(job.processedAt) : undefined,
      completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
    }));

    return NextResponse.json({
      success: true,
      data: processedJobs,
    });
  } catch (error) {
    console.error('[API] 获取任务列表错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取任务列表失败'
      },
      { status: 500 }
    );
  }
}

// 配置运行时为 Node.js
export const runtime = 'nodejs';
