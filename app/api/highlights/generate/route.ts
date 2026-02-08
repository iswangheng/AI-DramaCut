/**
 * POST /api/highlights/generate
 *
 * 为视频生成AI高光切片并保存到数据库
 *
 * 请求体：
 * {
 *   "videoId": number,           // 视频 ID
 *   "videoPath": string,         // 视频文件路径
 *   "minConfidence": number,     // 最低置信度 (0-1, 默认 0.7)
 *   "maxResults": number         // 最多返回结果数 (默认 10)
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "videoId": number,
 *     "highlights": HighlightClip[],  // 生成的高光列表
 *     "count": number                 // 生成的高光数量
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/api/gemini';
import { highlightQueries } from '@/lib/db/queries';
import {
  viralMomentsToHighlightRecords,
  highlightsToClips,
  type HighlightClip,
} from '@/lib/api/highlight-converter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, videoPath, minConfidence = 0.7, maxResults = 10 } = body;

    // 验证必需参数
    if (!videoId || !videoPath) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必需参数: videoId 和 videoPath',
        },
        { status: 400 }
      );
    }

    // 1. 调用 Gemini API 检测病毒时刻
    console.log(`🎬 开始分析视频 #${videoId}...`);
    const client = new GeminiClient();
    const response = await client.detectViralMoments(videoPath, {
      minConfidence,
      maxResults,
    });

    if (!response.success || !response.data) {
      return NextResponse.json(
        {
          success: false,
          error: response.error || 'AI 分析失败',
        },
        { status: 500 }
      );
    }

    const viralMoments = response.data;
    console.log(`✅ 检测到 ${viralMoments.length} 个病毒时刻`);

    if (viralMoments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          videoId,
          highlights: [],
          count: 0,
          message: '未检测到高光时刻，请尝试降低 minConfidence 参数',
        },
      });
    }

    // 2. 转换为数据库记录格式
    const highlightRecords = viralMomentsToHighlightRecords(viralMoments, videoId);

    // 3. 批量保存到数据库
    console.log(`💾 保存 ${highlightRecords.length} 条高光记录到数据库...`);
    const savedHighlights = await highlightQueries.createMany(highlightRecords);

    // 4. 转换为前端格式
    const highlightClips = highlightsToClips(savedHighlights);

    console.log(`✅ 成功生成 ${highlightClips.length} 个高光切片`);

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        highlights: highlightClips,
        count: highlightClips.length,
      },
    });
  } catch (error) {
    console.error('❌ 生成高光失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
