// ============================================
// 获取视频的镜头分析
// GET /api/videos/[id]/shots
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

    const shots = await queries.shot.getByVideoId(videoId);

    return NextResponse.json({
      success: true,
      data: shots,
    });
  } catch (error) {
    console.error('获取镜头列表失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '获取镜头列表失败',
      },
      { status: 500 }
    );
  }
}
