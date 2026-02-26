import { NextRequest, NextResponse } from "next/server";
import { GeminiClient } from "@/lib/api/gemini";
import { queries } from "@/lib/db/queries";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { join } from "path";
import { queueManager } from "@/lib/queue/bullmq";

/**
 * GET /api/projects/[id]/analyze-storylines
 *
 * 功能：获取项目已有的分析结果
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { success: false, message: "无效的项目 ID" },
        { status: 400 }
      );
    }

    // 获取项目级分析结果
    const projectAnalysis = await db.query.projectAnalysis.findFirst({
      where: eq(schema.projectAnalysis.projectId, projectId),
    });

    if (!projectAnalysis) {
      return NextResponse.json({
        success: true,
        data: {
          projectId,
          mainPlot: null,
          subplotCount: 0,
          characterRelationships: {},
          foreshadowings: [],
          crossEpisodeHighlights: [],
          storylines: [],
        },
      });
    }

    // 获取故事线
    const storylines = await db
      .select()
      .from(schema.storylines)
      .where(eq(schema.storylines.projectId, projectId))
      .orderBy(desc(schema.storylines.attractionScore));

    // 为每条故事线获取 segments
    const storylinesWithSegments = await Promise.all(
      storylines.map(async (storyline: any) => {
        const segments = await db
          .select()
          .from(schema.storylineSegments)
          .where(eq(schema.storylineSegments.storylineId, storyline.id))
          .orderBy(asc(schema.storylineSegments.segmentOrder));

        return {
          ...storyline,
          segments,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        mainPlot: projectAnalysis.mainPlot || '',
        subplotCount: projectAnalysis.subplotCount || 0,
        characterRelationships: projectAnalysis.characterRelationships
          ? JSON.parse(projectAnalysis.characterRelationships)
          : {},
        foreshadowings: projectAnalysis.foreshadowings
          ? JSON.parse(projectAnalysis.foreshadowings)
          : [],
        crossEpisodeHighlights: projectAnalysis.crossEpisodeHighlights
          ? JSON.parse(projectAnalysis.crossEpisodeHighlights)
          : [],
        storylines: storylinesWithSegments,
      },
    });
  } catch (error) {
    console.error("获取项目分析结果错误:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "获取项目分析结果失败",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/analyze-storylines
 *
 * 功能：分析整个项目的所有视频，包括：
 * 1. 镜头分析（每个视频的镜头切片）
 * 2. 故事线分析（跨集的连贯性）
 * 3. 高光片段分析（单集和跨集的高光时刻）
 *
 * 增量分析：
 * - 自动跳过已分析的视频（镜头 + 高光 + 摘要）
 * - 补充缺失的关键帧和转录
 * - 跨集故事线支持增量（可选择覆盖或保留）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { success: false, message: "无效的项目 ID" },
        { status: 400 }
      );
    }

    // 读取请求体（获取 force 参数）
    const body = await request.json().catch(() => ({}));
    const force = body.force === true;  // 是否强制重新分析

    // 1. 获取项目的所有视频（按集数排序）
    const videos = await db
      .select()
      .from(schema.videos)
      .where(eq(schema.videos.projectId, projectId))
      .orderBy(asc(schema.videos.sortOrder));

    if (videos.length === 0) {
      return NextResponse.json(
        { success: false, message: "该项目没有视频" },
        { status: 400 }
      );
    }

    // 2. 检查是否所有视频都有集数
    const videosWithoutEpisode = videos.filter((v: any) => !v.episodeNumber);
    if (videosWithoutEpisode.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "部分视频缺少集数信息",
          data: {
            missingEpisode: videosWithoutEpisode.map((v: any) => ({
              id: v.id,
              filename: v.filename,
            })),
          },
        },
        { status: 400 }
      );
    }

    if (videos.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "至少需要 2 个视频才能进行项目级故事线分析",
        },
        { status: 400 }
      );
    }

    // 3. 检查是否已有项目级分析数据（增量支持）
    const existingAnalysis = await db.query.projectAnalysis.findFirst({
      where: eq(schema.projectAnalysis.projectId, projectId),
    });

    if (existingAnalysis && !force) {
      console.log(`⚠️ 项目 ${projectId} 已有分析数据，询问是否覆盖`);

      // 返回已有数据，让前端确认是否覆盖
      return NextResponse.json({
        success: true,
        data: {
          projectId,
          hasExistingData: true,
          message: '该项目已有分析数据',
          existingData: {
            analyzedAt: existingAnalysis.createdAt,
            mainPlot: existingAnalysis.mainPlot || '',
            subplotCount: existingAnalysis.subplotCount || 0,
          },
        },
      });
    }

    if (existingAnalysis && force) {
      console.log(`🔄 强制重新分析项目 ${projectId}（覆盖旧数据）`);
    }

    console.log(`🎬 [项目分析] 创建异步分析任务：项目 ${projectId}，共 ${videos.length} 集视频`);

    // 4. 创建后台分析任务
    const job = await queueManager.addJob(
      'gemini-analysis',
      'analyze-project-storylines',
      {
        type: 'analyze-project-storylines',
        projectId,
        videoIds: videos.map((v: any) => v.id),
        totalVideos: videos.length,
        force: force,  // 传递 force 标志
      }
    );

    // 5. 立即返回任务 ID 和结果页面 URL
    return NextResponse.json({
      success: true,
      data: {
        projectId,
        jobId: job.id,
        message: existingAnalysis && force
          ? '正在重新分析项目（覆盖旧数据）'
          : '项目级分析已开始，请查看结果页面',
        resultsUrl: `/projects/${projectId}/storylines`,
        statusUrl: `/api/projects/${projectId}/analysis-status?jobId=${job.id}`,
      },
    }, { status: 202 }); // 202 Accepted
  } catch (error) {
    console.error("创建分析任务错误:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "创建分析任务失败",
      },
      { status: 500 }
    );
  }
}

// 配置运行时为 Node.js
export const runtime = "nodejs";
