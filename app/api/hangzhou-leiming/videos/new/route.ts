/**
 * 杭州雷鸣 - 查询新视频 API
 * 用于智能剪辑，查询未分析的视频
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlVideos } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

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

    // 查询最新的视频（最近上传的）
    const videos = await db
      .select()
      .from(hlVideos)
      .where(eq(hlVideos.projectId, parseInt(projectId)))
      .orderBy(desc(hlVideos.createdAt))
      .limit(10);

    return NextResponse.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    console.error("获取视频失败:", error);
    return NextResponse.json(
      { success: false, message: "获取视频失败" },
      { status: 500 }
    );
  }
}
