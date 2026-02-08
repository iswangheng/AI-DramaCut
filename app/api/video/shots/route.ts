/**
 * 镜头检测 API
 *
 * POST /api/video/shots
 *
 * 用于 Agent 2 和 Agent 4 调用镜头检测功能
 * 符合 types/api-contracts.ts 接口契约
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectShots } from '@/lib/video/shot-detection';
import type { SceneShot } from '@/types/api-contracts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoPath,
      minShotDuration,
      generateThumbnails,
      thumbnailDir,
      threshold
    } = body;

    if (!videoPath) {
      return NextResponse.json(
        { error: '缺少 videoPath 参数' },
        { status: 400 }
      );
    }

    // 检测镜头
    const shots = await detectShots(videoPath, {
      minShotDuration,
      generateThumbnails,
      thumbnailDir,
      threshold
    });

    // 返回结果
    return NextResponse.json({
      success: true,
      shots,
      count: shots.length,
    } as {
      success: true;
      shots: SceneShot[];
      count: number;
    });
  } catch (error) {
    console.error('镜头检测失败:', error);

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
 * GET /api/video/shots?videoPath=/path/to/video.mp4&minShotDuration=2000
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoPath = searchParams.get('videoPath');
  const minShotDuration = searchParams.get('minShotDuration');
  const threshold = searchParams.get('threshold');
  const noThumbnails = searchParams.get('noThumbnails') === 'true';

  if (!videoPath) {
    return NextResponse.json(
      { error: '缺少 videoPath 参数' },
      { status: 400 }
    );
  }

  try {
    const shots = await detectShots(videoPath, {
      minShotDuration: minShotDuration ? Number(minShotDuration) : undefined,
      generateThumbnails: !noThumbnails,
      threshold: threshold ? Number(threshold) : undefined,
    });

    return NextResponse.json({
      success: true,
      shots,
      count: shots.length,
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
