import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/projects/[id]/analysis-status
 *
 * 功能：获取项目分析任务的状态
 *
 * 查询参数：
 * - jobId: 可选，任务 ID
 *
 * 返回：
 * - 任务状态（waiting, active, completed, failed）
 * - 进度百分比
 * - 当前正在处理的视频
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
        { success: false, error: "无效的项目 ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "缺少 jobId 参数" },
        { status: 400 }
      );
    }

    // 从数据库查询任务状态
    const queueJob = await db.query.queueJobs.findFirst({
      where: eq(schema.queueJobs.jobId, jobId),
    });

    if (!queueJob) {
      return NextResponse.json(
        { success: false, error: "任务不存在" },
        { status: 404 }
      );
    }

    // 查询项目级分析结果（如果已完成）
    let analysisData = null;
    if (queueJob.status === 'completed') {
      const projectAnalysis = await db.query.projectAnalysis.findFirst({
        where: eq(schema.projectAnalysis.projectId, projectId),
      });

      // 获取故事线
      const storylines = await db
        .select()
        .from(schema.storylines)
        .where(eq(schema.storylines.projectId, projectId))
        .orderBy(desc(schema.storylines.attractionScore));

      // 获取镜头和高光统计
      const videos = await db
        .select({ id: schema.videos.id })
        .from(schema.videos)
        .where(eq(schema.videos.projectId, projectId));

      let totalShots = 0;
      let totalHighlights = 0;

      for (const video of videos) {
        const shots = await db.query.shots.findMany({
          where: eq(schema.shots.videoId, video.id),
        });
        totalShots += shots.length;

        const highlights = await db.query.highlights.findMany({
          where: eq(schema.highlights.videoId, video.id),
        });
        totalHighlights += highlights.length;
      }

      analysisData = {
        mainPlot: projectAnalysis?.mainPlot || '',
        subplotCount: projectAnalysis?.subplotCount || 0,
        storylineCount: storylines.length,
        totalShots,
        totalHighlights,
        analyzedAt: projectAnalysis?.analyzedAt || null,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId: queueJob.jobId,
        status: queueJob.status,
        progress: queueJob.progress || 0,
        error: queueJob.error,
        result: queueJob.result ? JSON.parse(queueJob.result) : null,
        analysisData,
        createdAt: queueJob.createdAt,
        updatedAt: queueJob.updatedAt,
        completedAt: queueJob.completedAt,
      },
    });
  } catch (error) {
    console.error("获取分析状态错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "获取分析状态失败",
      },
      { status: 500 }
    );
  }
}

// 配置运行时为 Node.js
export const runtime = "nodejs";
