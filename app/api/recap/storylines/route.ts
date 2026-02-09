// ============================================
// API 路由：提取故事线
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { videos, storylines, shots } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

/**
 * POST /api/recap/storylines
 *
 * 从视频中提取多条独立的故事线
 *
 * 请求体：
 * {
 *   "videoId": 1
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": 1,
 *       "name": "复仇主线",
 *       "description": "女主从被陷害到成功复仇的完整故事",
 *       "attractionScore": 9.5
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求
    const body = await request.json();
    const { videoId } = body as { videoId: number };

    if (!videoId) {
      return NextResponse.json(
        { success: false, message: '缺少必需参数: videoId' },
        { status: 400 }
      );
    }

    // 2. 检查视频是否存在
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
    });

    if (!video) {
      return NextResponse.json(
        { success: false, message: '视频不存在' },
        { status: 404 }
      );
    }

    // 3. 检查是否已有故事线
    const existingStorylines = await db.query.storylines.findMany({
      where: eq(storylines.videoId, videoId),
    });

    if (existingStorylines.length > 0) {
      return NextResponse.json({
        success: true,
        data: existingStorylines,
        message: '已存在故事线',
      });
    }

    // 4. 从 shots 表获取所有镜头（用于生成故事线）
    const allShots = await db
      .select()
      .from(shots)
      .where(eq(shots.videoId, videoId))
      .orderBy(asc(shots.startMs));

    if (allShots.length === 0) {
      return NextResponse.json(
        { success: false, message: '视频尚未进行镜头检测，请先上传并处理视频' },
        { status: 400 }
      );
    }

    // 5. 调用 Gemini 提取故事线（这里使用简化的模拟实现）
    // TODO: 实际应该调用 Gemini API
    const extractedStorylines = await extractStorylinesWithGemini(video, allShots);

    // 6. 保存到数据库
    const createdStorylines = [];
    for (const storyline of extractedStorylines) {
      const [created] = await db
        .insert(storylines)
        .values({
          videoId,
          name: storyline.name,
          description: storyline.description,
          attractionScore: storyline.attractionScore,
          shotIds: JSON.stringify(storyline.shotIds || []),
          category: 'other', // 默认类型
        })
        .returning();

      createdStorylines.push(created);
    }

    // 7. 返回结果
    return NextResponse.json({
      success: true,
      data: createdStorylines,
      message: `成功提取 ${createdStorylines.length} 条故事线`,
    });
  } catch (error) {
    console.error('[API] 提取故事线失败:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '提取故事线失败',
      },
      { status: 500 }
    );
  }
}

/**
 * 使用 Gemini 提取故事线（简化版）
 *
 * TODO: 实际实现应该调用 Gemini API，分析镜头内容，提取故事线
 * 这里先提供一个基于规则的基本实现
 */
// @ts-nocheck
async function extractStorylinesWithGemini(
  video: any,
  shots: any[]
): Promise<Array<{ name: string; description: string; attractionScore: number; shotIds: number[] }>> {
  // 简化实现：基于镜头的情绪和描述生成故事线
  // 实际应该调用 Gemini API 进行语义分析

  // 按情绪分组镜头
  const emotionGroups = shots.reduce((groups, shot) => {
    const emotion = shot.emotion || 'neutral';
    if (!groups[emotion]) {
      groups[emotion] = [];
    }
    groups[emotion].push(shot);
    return groups;
  }, {} as Record<string, any[]>);

  // 为每个主要情绪生成一条故事线
  const storylines = [];

  // 按镜头数量排序情绪组
  const sortedEmotions = Object.entries(emotionGroups)
    .sort((a: any, b: any) => b[1].length - a[1].length)
    .slice(0, 5); // 最多 5 条故事线

  const emotionNameMap: Record<string, string> = {
    sad: '情感线',
    anger: '冲突线',
    happy: '温馨线',
    suspense: '悬念线',
    neutral: '主线',
    悲伤: '情感线',
    愤怒: '冲突线',
    快乐: '温馨线',
    悬疑: '悬念线',
  };

  for (const [emotion, emotionShots] of sortedEmotions) {
    const storylineName = emotionNameMap[emotion] || `${emotion}线`;
    const attractionScore = 7 + Math.random() * 3; // 7-10 分

    storylines.push({
      name: storylineName,
      description: `基于${emotion}情绪的${(emotionShots as any[]).length}个镜头片段`,
      attractionScore: Number(attractionScore.toFixed(1)),
      shotIds: (emotionShots as any[]).map((s: any) => s.id),
    });
  }

  return storylines;
}

/**
 * GET /api/recap/storylines
 *
 * 获取视频的所有故事线
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { success: false, message: '缺少必需参数: videoId' },
        { status: 400 }
      );
    }

    const storylinesList = await db.query.storylines.findMany({
      where: eq(storylines.videoId, Number(videoId)),
    });

    return NextResponse.json({
      success: true,
      data: storylinesList,
    });
  } catch (error) {
    console.error('[API] 获取故事线失败:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '获取故事线失败',
      },
      { status: 500 }
    );
  }
}
