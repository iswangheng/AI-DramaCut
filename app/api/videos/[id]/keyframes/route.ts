// ============================================
// 获取视频关键帧 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);

    if (isNaN(videoId)) {
      return NextResponse.json({
        success: false,
        error: '无效的视频 ID',
      }, { status: 400 });
    }

    // 获取关键帧列表
    const keyframes = await queries.keyframe.getByVideoId(videoId);

    // 转换绝对路径为相对 URL（前端可以访问）
    const keyframesWithUrls = keyframes.map((keyframe: any) => ({
      ...keyframe,
      framePath: keyframe.framePath.split('/public/')[1] || keyframe.framePath,
    }));

    return NextResponse.json({
      success: true,
      data: keyframesWithUrls,
    });
  } catch (error) {
    console.error('获取关键帧失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取关键帧失败',
    }, { status: 500 });
  }
}
