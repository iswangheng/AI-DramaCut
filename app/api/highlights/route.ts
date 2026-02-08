/**
 * GET /api/highlights
 *
 * 查询视频的高光切片列表
 *
 * 查询参数：
 * - videoId: number          (必需) 视频 ID
 * - confirmed: boolean       (可选) 是否只查询已确认的高光
 *
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "videoId": number,
 *     "highlights": HighlightClip[],
 *     "count": number
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { highlightQueries } from '@/lib/db/queries';
import { highlightsToClips } from '@/lib/api/highlight-converter';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const confirmed = searchParams.get('confirmed');

    // 验证必需参数
    if (!videoId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必需参数: videoId',
        },
        { status: 400 }
      );
    }

    const videoIdNum = parseInt(videoId, 10);

    if (isNaN(videoIdNum)) {
      return NextResponse.json(
        {
          success: false,
          error: 'videoId 必须是有效的数字',
        },
        { status: 400 }
      );
    }

    // 根据查询参数选择查询方法
    let highlights;
    if (confirmed === 'true') {
      // 只查询已确认的高光
      highlights = await highlightQueries.getConfirmed(videoIdNum);
    } else {
      // 查询所有高光
      highlights = await highlightQueries.getByVideoId(videoIdNum);
    }

    // 转换为前端格式
    const highlightClips = highlightsToClips(highlights);

    return NextResponse.json({
      success: true,
      data: {
        videoId: videoIdNum,
        highlights: highlightClips,
        count: highlightClips.length,
      },
    });
  } catch (error) {
    console.error('❌ 查询高光列表失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
