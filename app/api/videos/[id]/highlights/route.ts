// ============================================
// 获取视频的高光片段
// GET /api/videos/[id]/highlights
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

    const highlights = await queries.highlight.getByVideoId(videoId);

    return NextResponse.json({
      success: true,
      data: highlights,
    });
  } catch (error) {
    console.error('获取高光片段失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '获取高光片段失败',
      },
      { status: 500 }
    );
  }
}
