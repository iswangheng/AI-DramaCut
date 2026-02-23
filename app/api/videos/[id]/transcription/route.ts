// ============================================
// 获取视频转录文本 API
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

    // 获取转录记录
    const transcription = await queries.audioTranscription.getByVideoId(videoId);

    if (!transcription) {
      return NextResponse.json({
        success: false,
        error: '未找到转录记录',
      }, { status: 404 });
    }

    // 解析 segments JSON
    const segments = JSON.parse(transcription.segments);

    return NextResponse.json({
      success: true,
      data: {
        ...transcription,
        segments,
      },
    });
  } catch (error) {
    console.error('获取转录失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取转录失败',
    }, { status: 500 });
  }
}
