// ============================================
// 视频管理 API
// DELETE /api/videos/:id - 删除视频
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import { join } from 'path';

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
