// ============================================
// 渲染高光切片 API 路由
// 功能：将指定高光切片添加到渲染队列
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queueManager, QUEUE_NAMES } from '@/lib/queue/bullmq';
import { highlightQueries, videoQueries } from '@/lib/db/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const highlightId = parseInt(id);

    if (isNaN(highlightId)) {
      return NextResponse.json(
        { success: false, error: '无效的高光 ID' },
        { status: 400 }
      );
    }

    // 查询高光记录
    const highlight = await highlightQueries.getById(highlightId);

    if (!highlight) {
      return NextResponse.json(
        { success: false, error: '高光记录不存在' },
        { status: 404 }
      );
    }

    // 查询视频信息
    const video = await videoQueries.getById(highlight.videoId);

    if (!video) {
      return NextResponse.json(
        { success: false, error: '关联视频不存在' },
        { status: 404 }
      );
    }

    // 如果已经渲染过，直接返回
    if (highlight.exportedPath) {
      return NextResponse.json({
        success: true,
        message: '高光切片已存在',
        data: {
          highlightId,
          outputPath: highlight.exportedPath,
          alreadyExists: true,
        },
      });
    }

    // 添加渲染任务到队列
    const job = await queueManager.addJob(
      QUEUE_NAMES.videoRender,
      `render-highlight-${highlightId}`,
      {
        type: 'render-highlight',
        highlightId,
        videoPath: video.filePath,
        outputDir: 'outputs/highlights',
      }
    );

    console.log(`✅ 高光渲染任务已添加: Job ID ${job?.id}, Highlight ID ${highlightId}`);

    return NextResponse.json({
      success: true,
      message: '高光切片已添加到渲染队列',
      data: {
        jobId: job?.id,
        highlightId,
        videoPath: video.filePath,
        status: 'queued',
      },
    });

  } catch (error) {
    console.error('添加渲染任务失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '添加渲染任务失败',
      },
      { status: 500 }
    );
  }
}
