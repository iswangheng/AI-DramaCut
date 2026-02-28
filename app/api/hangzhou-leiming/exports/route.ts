/**
 * 杭州雷鸣 - 导出 API
 *
 * 功能：
 * - POST /api/hangzhou-leiming/exports - 创建导出任务并执行视频导出
 * - GET /api/hangzhou-leiming/exports - 查询导出记录
 *
 * 导出流程：
 * 1. 读取剪辑组合的 clips 数据
 * 2. 对每个 clip 使用 FFmpeg 裁剪视频片段
 * 3. 使用 concat demuxer 拼接所有片段
 * 4. 更新导出进度和状态
 * 5. 返回导出结果
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlExports, hlClipCombinations, hlVideos, hlProjects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { join } from "path";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { trimVideo } from "@/lib/ffmpeg";
import { concatVideos, type VideoSegment } from "@/lib/ffmpeg/concat";

/**
 * POST - 创建导出任务
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { combinationId, projectId } = body;

    if (!combinationId || !projectId) {
      return NextResponse.json(
        { success: false, message: "缺少必要参数" },
        { status: 400 }
      );
    }

    console.log(`[杭州雷鸣] 开始导出，组合ID: ${combinationId}, 项目ID: ${projectId}`);

    // 1. 查询剪辑组合
    const [combination] = await db
      .select()
      .from(hlClipCombinations)
      .where(eq(hlClipCombinations.id, combinationId));

    if (!combination) {
      return NextResponse.json(
        { success: false, message: "剪辑组合不存在" },
        { status: 404 }
      );
    }

    // 解析 clips 数据
    let clips: any[];
    try {
      clips = typeof combination.clips === 'string'
        ? JSON.parse(combination.clips)
        : combination.clips;
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "剪辑组合数据格式错误" },
        { status: 400 }
      );
    }

    if (!clips || clips.length === 0) {
      return NextResponse.json(
        { success: false, message: "剪辑组合没有片段数据" },
        { status: 400 }
      );
    }

    // 2. 创建导出记录
    const [exportRecord] = await db
      .insert(hlExports)
      .values({
        projectId,
        combinationId,
        status: "processing",
        progress: 0,
        currentStep: "准备导出",
        outputFormat: "mp4",
      })
      .returning();

    console.log(`[杭州雷鸣] 导出记录创建成功，ID: ${exportRecord.id}`);

    // 3. 异步执行导出（不阻塞响应）
    executeExport(exportRecord.id, clips, combination)
      .then(() => {
        console.log(`[杭州雷鸣] 导出完成，ID: ${exportRecord.id}`);
      })
      .catch((error) => {
        console.error(`[杭州雷鸣] 导出失败，ID: ${exportRecord.id}`, error);
      });

    return NextResponse.json({
      success: true,
      message: "导出任务已创建",
      data: {
        exportId: exportRecord.id,
        status: "processing",
      },
    });
  } catch (error) {
    console.error("[杭州雷鸣] 创建导出任务失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "创建导出任务失败",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - 查询导出记录（保留原有功能）
 */
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

    const exports = await db
      .select()
      .from(hlExports)
      .where(eq(hlExports.projectId, parseInt(projectId)))
      .orderBy(desc(hlExports.createdAt));

    return NextResponse.json({
      success: true,
      data: exports,
    });
  } catch (error) {
    console.error("获取导出记录失败:", error);
    return NextResponse.json(
      { success: false, message: "获取导出记录失败" },
      { status: 500 }
    );
  }
}

/**
 * 执行导出任务（异步函数）
 */
async function executeExport(
  exportId: number,
  clips: any[],
  combination: any
): Promise<void> {
  const combinationName = combination.name;
  const tempDir = join(process.cwd(), "data", "hangzhou-leiming", "temp", `export_${exportId}`);
  const segments: VideoSegment[] = [];

  try {
    // 1. 准备临时目录
    await mkdir(tempDir, { recursive: true });

    // 2. 更新状态：开始裁剪
    await db
      .update(hlExports)
      .set({
        status: "processing",
        progress: 10,
        currentStep: "裁剪视频片段",
      })
      .where(eq(hlExports.id, exportId));

    // 3. 对每个 clip 进行裁剪
    console.log(`[杭州雷鸣] 开始裁剪 ${clips.length} 个片段`);

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const progress = 10 + Math.floor((i / clips.length) * 40);

      await db
        .update(hlExports)
        .set({
          progress,
          currentStep: `裁剪片段 ${i + 1}/${clips.length}`,
        })
        .where(eq(hlExports.id, exportId));

      // 查询视频文件路径
      const [video] = await db
        .select()
        .from(hlVideos)
        .where(eq(hlVideos.id, clip.videoId));

      if (!video) {
        throw new Error(`视频不存在，ID: ${clip.videoId}`);
      }

      // 验证视频文件存在
      if (!existsSync(video.filePath)) {
        throw new Error(`视频文件不存在: ${video.filePath}`);
      }

      // 裁剪片段
      const segmentPath = join(tempDir, `segment_${i}.mp4`);

      console.log(`[杭州雷鸣] 裁剪片段 ${i + 1}: ${video.filePath}`);
      console.log(`   开始时间: ${clip.startMs}ms, 持续时间: ${clip.endMs - clip.startMs}ms`);

      try {
        trimVideo({
          inputPath: video.filePath,
          outputPath: segmentPath,
          startTimeMs: clip.startMs,
          durationMs: clip.endMs - clip.startMs,
          crf: 18,
          preset: "fast",
        });

        segments.push({ path: segmentPath });
        console.log(`[杭州雷鸣] 片段 ${i + 1} 裁剪完成`);
      } catch (error) {
        console.error(`[杭州雷鸣] 片段 ${i + 1} 裁剪失败:`, error);
        throw new Error(`片段 ${i + 1} 裁剪失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 4. 更新状态：开始拼接
    await db
      .update(hlExports)
      .set({
        status: "processing",
        progress: 60,
        currentStep: "拼接视频片段",
      })
      .where(eq(hlExports.id, exportId));

    // 5. 准备输出路径
    const projectDir = join(process.cwd(), "data", "hangzhou-leiming", "exports");
    await mkdir(projectDir, { recursive: true });

    const outputFileName = `${combinationName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${exportId}.mp4`;
    const outputPath = join(projectDir, outputFileName);

    console.log(`[杭州雷鸣] 开始拼接 ${segments.length} 个片段`);
    console.log(`   输出路径: ${outputPath}`);

    // 6. 拼接视频
    const result = await concatVideos({
      segments,
      outputPath,
      totalDuration: combination.totalDurationMs / 1000,
      onProgress: (progress) => {
        const overallProgress = 60 + Math.floor(progress * 0.35);
        db.update(hlExports)
          .set({ progress: overallProgress })
          .where(eq(hlExports.id, exportId))
          .catch((err: Error) => console.error("更新进度失败:", err));
      },
    });

    console.log(`[杭州雷鸣] 拼接完成，文件大小: ${(result.size / 1024 / 1024).toFixed(2)} MB`);

    // 7. 更新状态：完成
    await db
      .update(hlExports)
      .set({
        status: "completed",
        progress: 100,
        currentStep: "导出完成",
        outputPath,
        fileSize: result.size,
        completedAt: new Date(),
        ffmpegCommand: `拼接 ${segments.length} 个片段`,
      })
      .where(eq(hlExports.id, exportId));

    // 8. 更新项目状态
    const [exportRecord] = await db
      .select()
      .from(hlExports)
      .where(eq(hlExports.id, exportId));

    if (exportRecord) {
      await db
        .update(hlProjects)
        .set({ status: "ready" })
        .where(eq(hlProjects.id, exportRecord.projectId));
    }

  } catch (error) {
    console.error(`[杭州雷鸣] 导出失败:`, error);

    // 更新状态：错误
    await db
      .update(hlExports)
      .set({
        status: "error",
        currentStep: "导出失败",
        errorMessage: error instanceof Error ? error.message : "未知错误",
      })
      .where(eq(hlExports.id, exportId));

    throw error;
  }
}
