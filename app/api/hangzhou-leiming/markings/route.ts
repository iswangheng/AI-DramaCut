/**
 * 杭州雷鸣 - 标记数据查询 API
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlMarkings, hlVideos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: "缺少项目ID" },
        { status: 400 }
      );
    }

    // 联合查询获取视频名称
    const markings = await db
      .select({
        id: hlMarkings.id,
        projectId: hlMarkings.projectId,
        videoId: hlMarkings.videoId,
        timestamp: hlMarkings.timestamp,
        seconds: hlMarkings.seconds,
        type: hlMarkings.type,
        subType: hlMarkings.subType,
        description: hlMarkings.description,
        score: hlMarkings.score,
        reasoning: hlMarkings.reasoning,
        aiEnhanced: hlMarkings.aiEnhanced,
        emotion: hlMarkings.emotion,
        characters: hlMarkings.characters,
        createdAt: hlMarkings.createdAt,
        updatedAt: hlMarkings.updatedAt,
        videoName: hlVideos.filename,
      })
      .from(hlMarkings)
      .innerJoin(hlVideos, eq(hlMarkings.videoId, hlVideos.id))
      .where(eq(hlMarkings.projectId, parseInt(projectId)))
      .orderBy(hlMarkings.seconds);

    return NextResponse.json({
      success: true,
      data: markings,
    });
  } catch (error) {
    console.error("获取标记失败:", error);
    return NextResponse.json(
      { success: false, message: "获取标记失败" },
      { status: 500 }
    );
  }
}
