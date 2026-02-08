// ============================================
// 项目视频管理 API
// GET /api/projects/:id/videos - 获取项目的视频列表
// POST /api/projects/:id/videos - 上传视频到项目
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { queueManager, QUEUE_NAMES } from '@/lib/queue/bullmq';

/**
 * GET /api/projects/:id/videos
 * 获取项目的所有视频
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        {
          success: false,
          message: '无效的项目 ID',
        },
        { status: 400 }
      );
    }

    // 获取项目的所有视频
    const videos = await queries.video.getByProjectId(projectId);

    return NextResponse.json({
      success: true,
      data: videos,
      meta: {
        projectId,
        count: videos.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '获取视频列表失败',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/:id/videos
 * 上传视频到项目
 *
 * 请求体:
 * {
 *   "filename": string,
 *   "filePath": string,
 *   "fileSize": number,
 *   "durationMs": number,
 *   "width": number,
 *   "height": number,
 *   "fps": number
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        {
          success: false,
          message: '无效的项目 ID',
        },
        { status: 400 }
      );
    }

    // 验证项目是否存在
    const project = await queries.project.getById(projectId);
    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: '项目不存在',
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      filename,
      filePath,
      fileSize,
      durationMs,
      width,
      height,
      fps,
    } = body;

    // 验证必填字段
    if (!filename || !filePath || !fileSize || !durationMs || !width || !height || !fps) {
      return NextResponse.json(
        {
          success: false,
          message: '缺少必填字段',
        },
        { status: 400 }
      );
    }

    // 创建视频记录
    const video = await queries.video.create({
      projectId,
      filename,
      filePath,
      fileSize,
      durationMs,
      width,
      height,
      fps,
      status: 'uploading',
    });

    // ============================================
    // 自动化处理流程：触发任务队列
    // ============================================

    try {
      console.log(`🚀 开始自动化处理流程: Video ID ${video.id}`);

      // 1. 触发镜头检测任务（FFmpeg 镜头切分）
      await queueManager.addJob(
        QUEUE_NAMES.videoProcessing,
        'extract-shots',
        {
          type: 'extract-shots',
          videoPath: filePath,
          videoId: video.id,
        }
      );

      console.log(`✅ 镜头检测任务已加入队列: Video ID ${video.id}`);

      // 2. 触发 Gemini 分析任务（深度理解 - 包含关键帧采样）
      await queueManager.addJob(
        QUEUE_NAMES.geminiAnalysis,
        'analyze',
        {
          type: 'analyze',
          videoPath: filePath,
          videoId: video.id,
        }
      );

      console.log(`✅ Gemini 分析任务已加入队列: Video ID ${video.id}`);

      // 3. 触发故事线提取任务（在分析完成后）
      await queueManager.addJob(
        QUEUE_NAMES.geminiAnalysis,
        'extract-storylines',
        {
          type: 'extract-storylines',
          videoPath: filePath,
          videoId: video.id,
        }
      );

      console.log(`✅ 故事线提取任务已加入队列: Video ID ${video.id}`);

      // 4. 触发高光检测任务（在分析完成后）
      await queueManager.addJob(
        QUEUE_NAMES.geminiAnalysis,
        'detect-highlights',
        {
          type: 'detect-highlights',
          videoPath: filePath,
          videoId: video.id,
        }
      );

      console.log(`✅ 高光检测任务已加入队列: Video ID ${video.id}`);

    } catch (queueError) {
      // 如果任务队列添加失败，记录错误但不影响上传
      console.error('❌ 添加任务到队列失败:', queueError);

      // 更新视频状态为错误
      await queries.video.updateStatus(video.id!, 'error');
    }

    return NextResponse.json({
      success: true,
      data: video,
      message: '视频上传成功，正在后台处理...',
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '创建视频记录失败',
      },
      { status: 500 }
    );
  }
}
