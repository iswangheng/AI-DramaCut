import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { schema } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * 获取项目所有高光 API
 *
 * GET /api/projects/[id]/highlights
 *
 * 功能：获取项目的所有高光片段，按视频分组
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

    // 获取项目的所有视频
    const videos = await db
      .select({
        id: schema.videos.id,
        filename: schema.videos.filename,
        episodeNumber: schema.videos.episodeNumber,
        displayTitle: schema.videos.displayTitle,
      })
      .from(schema.videos)
      .where(eq(schema.videos.projectId, projectId))
      .orderBy(asc(schema.videos.sortOrder));

    if (videos.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          projectId,
          totalHighlights: 0,
          highlightsByVideo: [],
        },
      });
    }

    // 分别查询每个视频的高光
    const highlightsByVideo = [];
    let totalHighlights = 0;

    for (const video of videos) {
      const videoHighlights = await db
        .select()
        .from(schema.highlights)
        .where(eq(schema.highlights.videoId, video.id))
        .orderBy(asc(schema.highlights.startMs));

      if (videoHighlights.length > 0) {
        highlightsByVideo.push({
          videoId: video.id,
          filename: video.filename,
          episodeNumber: video.episodeNumber,
          displayTitle: video.displayTitle,
          highlights: videoHighlights,
        });
        totalHighlights += videoHighlights.length;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        totalHighlights,
        highlightsByVideo,
      },
    });
  } catch (error) {
    console.error("获取项目高光失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "获取项目高光失败",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
