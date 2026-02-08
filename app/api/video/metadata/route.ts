/**
 * 视频元数据 API
 *
 * POST /api/video/metadata
 *
 * 用于 Agent UI 获取视频元数据
 * 符合 types/api-contracts.ts 接口契约
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMetadata, validateVideoMetadata } from '@/lib/video/metadata';
import type { VideoMetadata } from '@/types/api-contracts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoPath } = body;

    if (!videoPath) {
      return NextResponse.json(
        { error: '缺少 videoPath 参数' },
        { status: 400 }
      );
    }

    // 获取视频元数据
    const metadata = await getMetadata(videoPath);

    // 验证视频是否符合要求
    const validation = validateVideoMetadata(metadata);

    // 返回结果
    return NextResponse.json({
      success: true,
      metadata,
      validation,
    } as {
      success: true;
      metadata: VideoMetadata;
      validation: {
        valid: boolean;
        errors: string[];
      };
    });
  } catch (error) {
    console.error('获取视频元数据失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

/**
 * GET 请求示例（用于测试）
 *
 * GET /api/video/metadata?videoPath=/path/to/video.mp4
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoPath = searchParams.get('videoPath');

  if (!videoPath) {
    return NextResponse.json(
      { error: '缺少 videoPath 参数' },
      { status: 400 }
    );
  }

  try {
    const metadata = await getMetadata(videoPath);
    const validation = validateVideoMetadata(metadata);

    return NextResponse.json({
      success: true,
      metadata,
      validation,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
