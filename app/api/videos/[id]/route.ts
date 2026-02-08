// ============================================
// 视频管理 API
// DELETE /api/videos/:id - 删除视频
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

/**
 * DELETE /api/videos/:id
 * 删除视频
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

    // 删除视频
    const [deletedVideo] = await db
      .delete(schema.videos)
      .where(eq(schema.videos.id, videoId))
      .returning();

    if (!deletedVideo) {
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
      message: '视频已删除',
      data: { id: videoId },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '删除视频失败',
      },
      { status: 500 }
    );
  }
}
