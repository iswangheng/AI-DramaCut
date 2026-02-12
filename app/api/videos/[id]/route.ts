// ============================================
// 视频管理 API
// GET /api/videos/:id - 获取视频详情
// PATCH /api/videos/:id - 更新视频信息
// DELETE /api/videos/:id - 删除视频
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import { join } from 'path';

/**
 * PATCH /api/videos/:id
 * 更新视频信息（集数、显示标题、排序顺序等）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);

    if (isNaN(videoId)) {
      return NextResponse.json(
        {
          success: false,
          message: '无效的视频 ID',
        },
        { status: 400 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { episodeNumber, displayTitle, sortOrder } = body;

    // 构建更新数据（只更新提供的字段）
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (episodeNumber !== undefined) {
      updateData.episodeNumber = episodeNumber;
    }

    if (displayTitle !== undefined) {
      updateData.displayTitle = displayTitle;
    }

    if (sortOrder !== undefined) {
      updateData.sortOrder = sortOrder;
    }

    // 检查视频是否存在
    const [existingVideo] = await db
      .select()
      .from(schema.videos)
      .where(eq(schema.videos.id, videoId));

    if (!existingVideo) {
      return NextResponse.json(
        {
          success: false,
          message: '视频不存在',
        },
        { status: 404 }
      );
    }

    // 更新视频信息
    const [updatedVideo] = await db
      .update(schema.videos)
      .set(updateData)
      .where(eq(schema.videos.id, videoId))
      .returning();

    return NextResponse.json({
      success: true,
      message: '视频信息已更新',
      data: updatedVideo,
    });
  } catch (error) {
    console.error('更新视频信息失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '更新视频信息失败',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/videos/:id
 * 获取单个视频的详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);

    if (isNaN(videoId)) {
      return NextResponse.json(
        {
          success: false,
          message: '无效的视频 ID',
        },
        { status: 400 }
      );
    }

    // 查询视频详情
    const [video] = await db
      .select()
      .from(schema.videos)
      .where(eq(schema.videos.id, videoId));

    if (!video) {
      return NextResponse.json(
        {
          success: false,
          message: '视频不存在',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: video,
    });
  } catch (error) {
    console.error('获取视频详情失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '获取视频详情失败',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/videos/:id
 * 删除视频（同时删除物理文件和数据库记录）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);

    if (isNaN(videoId)) {
      return NextResponse.json(
        {
          success: false,
          message: '无效的视频 ID',
        },
        { status: 400 }
      );
    }

    // 1. 先获取视频信息（需要文件路径）
    const [video] = await db
      .select()
      .from(schema.videos)
      .where(eq(schema.videos.id, videoId));

    if (!video) {
      return NextResponse.json(
        {
          success: false,
          message: '视频不存在',
        },
        { status: 404 }
      );
    }

    // 2. 删除物理文件
    if (video.filePath) {
      try {
        const fullPath = join(process.cwd(), video.filePath);
        await unlink(fullPath);
        console.log(`已删除物理文件: ${video.filePath}`);
      } catch (fileError) {
        // 文件删除失败记录警告，但继续删除数据库记录
        console.error(`删除物理文件失败: ${video.filePath}`, fileError);
        // 不抛出错误，继续删除数据库记录
      }
    }

    // 3. 删除数据库记录
    const [deletedVideo] = await db
      .delete(schema.videos)
      .where(eq(schema.videos.id, videoId))
      .returning();

    return NextResponse.json({
      success: true,
      message: '视频已删除',
      data: {
        id: videoId,
        fileDeleted: !!video.filePath,
      },
    });
  } catch (error) {
    console.error('删除视频失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '删除视频失败',
      },
      { status: 500 }
    );
  }
}
