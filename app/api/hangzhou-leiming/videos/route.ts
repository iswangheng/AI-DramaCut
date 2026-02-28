/**
 * 杭州雷鸣 - 视频管理 API
 *
 * 功能：
 * - POST /api/hangzhou-leiming/videos - 上传视频
 * - GET  /api/hangzhou-leiming/videos?projectId=1 - 获取视频列表
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlVideos, hlProjects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// POST - 上传视频
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectIdStr = formData.get("projectId") as string;
    const episodeNumber = formData.get("episodeNumber") as string;
    const displayTitle = formData.get("displayTitle") as string;

    // 参数验证
    if (!file) {
      return NextResponse.json(
        { success: false, message: "未选择文件" },
        { status: 400 }
      );
    }

    if (!projectIdStr) {
      return NextResponse.json(
        { success: false, message: "缺少项目ID" },
        { status: 400 }
      );
    }

    const projectId = parseInt(projectIdStr);

    // 验证项目存在
    const [project] = await db
      .select()
      .from(hlProjects)
      .where(eq(hlProjects.id, projectId));

    if (!project) {
      return NextResponse.json(
        { success: false, message: "项目不存在" },
        { status: 404 }
      );
    }

    // 创建项目目录
    const projectDir = join(process.cwd(), "data", "hangzhou-leiming", String(projectId));
    const videosDir = join(projectDir, "videos");

    if (!existsSync(videosDir)) {
      await mkdir(videosDir, { recursive: true });
    }

    // 保存文件
    const filename = `${Date.now()}-${file.name}`;
    const filePath = join(videosDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 获取视频元数据（简化版，实际应该用 ffprobe）
    const fileSize = file.size;
    const durationMs = 0; // TODO: 使用 ffprobe 获取
    const width = 1920;
    const height = 1080;
    const fps = 30;

    // 插入数据库
    const [newVideo] = await db
      .insert(hlVideos)
      .values({
        projectId,
        filename: file.name,
        filePath,
        fileSize,
        episodeNumber: episodeNumber || `未命名`,
        displayTitle: displayTitle || file.name,
        sortOrder: 0,
        durationMs,
        width,
        height,
        fps,
        status: "ready",
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newVideo,
    });
  } catch (error) {
    console.error("上传视频失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "上传视频失败",
      },
      { status: 500 }
    );
  }
}

// GET - 获取视频列表
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

    const videos = await db
      .select()
      .from(hlVideos)
      .where(eq(hlVideos.projectId, parseInt(projectId)))
      .orderBy(hlVideos.sortOrder);

    return NextResponse.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    console.error("获取视频列表失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "获取视频列表失败",
      },
      { status: 500 }
    );
  }
}
