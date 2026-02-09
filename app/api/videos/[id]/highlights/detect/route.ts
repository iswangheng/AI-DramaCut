// ============================================
// 触发高光检测 API 路由
// 功能：手动触发指定视频的高光检测任务
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queueManager, QUEUE_NAMES } from '@/lib/queue/bullmq';
import { videoQueries } from '@/lib/db/queries';

export async function POST(
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

    // 查询视频信息
    const video = await videoQueries.getById(videoId);

    if (!video) {
      return NextResponse.json(
        { success: false, error: '视频不存在' },
        { status: 404 }
      );
    }

    // 检查视频状态
    if (video.status !== 'ready') {
      return NextResponse.json(
        {
          success: false,
          error: `视频状态不正确，当前状态: ${video.status}，需要状态: ready`,
        },
        { status: 400 }
      );
    }

    // 添加高光检测任务到队列
    const job = await queueManager.addJob(
      QUEUE_NAMES.geminiAnalysis,
      `detect-highlights-${videoId}`,
      {
        type: 'detect-highlights',
        videoPath: video.filePath,
        videoId,
      }
    );

    console.log(`✅ 高光检测任务已添加: Job ID ${job?.id}, Video ID ${videoId}`);

    return NextResponse.json({
      success: true,
      message: '高光检测任务已添加到队列',
      data: {
        jobId: job?.id,
        videoId,
        videoPath: video.filePath,
        status: 'queued',
      },
    });

  } catch (error) {
    console.error('触发高光检测失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '触发高光检测失败',
      },
      { status: 500 }
    );
  }
}
