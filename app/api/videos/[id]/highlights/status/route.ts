// ============================================
// 高光检测任务状态 API 路由
// 功能：检查指定视频的高光检测任务状态
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { queueJobs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);

    if (isNaN(videoId)) {
      return NextResponse.json(
        { success: false, error: '无效的视频 ID' },
        { status: 400 }
      );
    }

    // 查询最新的高光检测任务
    const jobs = await db
      .select()
      .from(queueJobs)
      .where(eq(queueJobs.jobType, 'detect-highlights'))
      .orderBy(queueJobs.createdAt)
      .limit(10);

    // 过滤出与该视频相关的任务（从 payload 中提取 videoId）
    const videoJobs = jobs.filter(job => {
      try {
        const payload = JSON.parse(job.payload);
        return payload.videoId === videoId;
      } catch {
        return false;
      }
    });

    if (videoJobs.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          hasActiveTask: false,
          latestJob: null,
        },
      });
    }

    // 获取最新的任务
    const latestJob = videoJobs[videoJobs.length - 1];

    return NextResponse.json({
      success: true,
      data: {
        hasActiveTask: latestJob.status === 'waiting' || latestJob.status === 'active',
        latestJob: {
          id: latestJob.id,
          status: latestJob.status,
          progress: latestJob.progress,
          createdAt: latestJob.createdAt,
          processedAt: latestJob.processedAt,
          completedAt: latestJob.completedAt,
          error: latestJob.error,
        },
      },
    });

  } catch (error) {
    console.error('查询任务状态失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '查询任务状态失败',
      },
      { status: 500 }
    );
  }
}
