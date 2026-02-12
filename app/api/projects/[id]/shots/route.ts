import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { schema } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * 获取项目所有镜头 API
 *
 * GET /api/projects/[id]/shots
 *
 * 功能：获取项目的所有镜头，按视频分组
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
          totalShots: 0,
          shotsByVideo: [],
        },
      });
    }

    // 获取所有视频的镜头
    const videoIds = videos.map((v: any) => v.id);
    const shots = await db
      .select()
      .from(schema.shots)
      .where(eq(schema.shots.videoId, videoIds[0])) // Drizzle 不支持 in 操作，需要多次查询
      .orderBy(asc(schema.shots.startMs));

    // 由于 Drizzle SQLite 的限制，需要分别查询每个视频的镜头
    const shotsByVideo = [];
    let totalShots = 0;

    for (const video of videos) {
      const videoShots = await db
        .select()
        .from(schema.shots)
        .where(eq(schema.shots.videoId, video.id))
        .orderBy(asc(schema.shots.startMs));

      if (videoShots.length > 0) {
        shotsByVideo.push({
          videoId: video.id,
          filename: video.filename,
          episodeNumber: video.episodeNumber,
          displayTitle: video.displayTitle,
          shots: videoShots,
        });
        totalShots += videoShots.length;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        totalShots,
        shotsByVideo,
      },
    });
  } catch (error) {
    console.error("获取项目镜头失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "获取项目镜头失败",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
