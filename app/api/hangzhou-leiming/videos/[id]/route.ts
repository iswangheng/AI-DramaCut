/**
 * 杭州雷鸣 - 单个视频管理 API
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlVideos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { unlink } from "fs/promises";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const videoId = parseInt(idStr);

    // 查询视频信息
    const [video] = await db
      .select()
      .from(hlVideos)
      .where(eq(hlVideos.id, videoId));

    if (!video) {
      return NextResponse.json(
        { success: false, message: "视频不存在" },
        { status: 404 }
      );
    }

    // 删除文件
    try {
      await unlink(video.filePath);
    } catch (error) {
      console.warn("删除文件失败:", error);
    }

    // 删除数据库记录
    await db.delete(hlVideos).where(eq(hlVideos.id, videoId));

    return NextResponse.json({
      success: true,
      message: "视频已删除",
    });
  } catch (error) {
    console.error("删除视频失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "删除视频失败",
      },
      { status: 500 }
    );
  }
}
