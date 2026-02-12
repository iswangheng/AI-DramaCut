// ============================================
// 项目视频管理 API
// GET /api/projects/:id/videos - 获取项目的视频列表
// POST /api/projects/:id/videos - 上传视频到项目
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/db';

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
    // 状态设置为 ready，等待项目级分析
    // 不再自动触发单个视频的分析任务
    const video = await queries.video.create({
      projectId,
      filename,
      filePath,
      fileSize,
      durationMs,
      width,
      height,
      fps,
      status: 'ready', // 直接设为 ready，等待项目级分析
      episodeNumber: body.episodeNumber || null,
      displayTitle: body.displayTitle || null,
      sortOrder: body.sortOrder || 0,
    });

    console.log(`✅ 视频上传成功: Video ID ${video.id}`);
    console.log(`📝 文件名: ${filename}`);
    console.log(`🔢 集数: ${body.episodeNumber || '未识别'}`);
    console.log(`📊 排序: ${body.sortOrder || 0}`);

    return NextResponse.json({
      success: true,
      data: video,
      message: '视频上传成功，等待项目级分析',
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
