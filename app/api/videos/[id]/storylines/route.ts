// ============================================
// 获取视频的剧情树
// GET /api/videos/[id]/storylines
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);

    if (isNaN(videoId)) {
      return NextResponse.json(
        { success: false, message: '无效的视频 ID' },
        { status: 400 }
      );
    }

    const storylines = await queries.storyline.getByVideoId(videoId);

    return NextResponse.json({
      success: true,
      data: storylines,
    });
  } catch (error) {
    console.error('获取剧情树失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '获取剧情树失败',
      },
      { status: 500 }
    );
  }
}
