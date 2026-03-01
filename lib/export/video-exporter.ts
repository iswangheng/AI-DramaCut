/**
 * 视频导出模块
 * 杭州雷鸣项目 - 视频导出核心
 *
 * 功能：
 * - 读取剪辑组合信息
 * - 提取视频片段
 * - 拼接视频
 * - 进度跟踪
 * - 临时文件清理
 */

import { mkdir, rm } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { db } from "@/lib/db/client";
import { hlExports, hlClipCombinations, hlVideos, hlProjects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { trimVideo } from "@/lib/ffmpeg";
import { concatVideos, type VideoSegment } from "@/lib/ffmpeg/concat";

/**
 * 导出任务配置
 */
export interface ExportJob {
  /** 项目 ID */
  projectId: number;
  /** 剪辑组合 ID */
  combinationId: number;
  /** 导出记录 ID（可选，如果已存在） */
  exportId?: number;
  /** 输出格式 */
  outputFormat?: "mp4" | "mov" | "avi";
  /** 输出目录（可选，默认使用项目导出目录） */
  outputDir?: string;
}

/**
 * 导出结果
 */
export interface ExportResult {
  /** 是否成功 */
  success: boolean;
  /** 输出文件路径 */
  outputPath?: string;
  /** 视频时长（毫秒） */
  durationMs?: number;
  /** 文件大小（字节） */
  fileSize?: number;
  /** 错误信息 */
  errorMessage?: string;
  /** 导出记录 ID */
  exportId?: number;
}

/**
 * 剪辑片段
 */
export interface ClipSegment {
  /** 视频 ID */
  videoId: number;
  /** 视频名称 */
  videoName: string;
  /** 开始时间（毫秒） */
  startMs: number;
  /** 结束时间（毫秒） */
  endMs: number;
  /** 标记类型 */
  type: string;
  /** 排序顺序 */
  order: number;
}

/**
 * 进度更新回调
 */
export type ProgressCallback = (progress: number, currentStep: string) => Promise<void> | void;

/**
 * 默认进度更新函数（更新数据库）
 */
async function defaultProgressUpdate(exportId: number, progress: number, currentStep: string): Promise<void> {
  await db
    .update(hlExports)
    .set({ progress, currentStep })
    .where(eq(hlExports.id, exportId));
}

/**
 * 创建进度更新回调
 */
function createProgressCallback(exportId: number): ProgressCallback {
  return async (progress: number, currentStep: string) => {
    await defaultProgressUpdate(exportId, progress, currentStep);
  };
}

/**
 * 解析剪辑片段数据
 */
function parseClips(clipsData: string | any[]): ClipSegment[] {
  try {
    const clips = typeof clipsData === "string" ? JSON.parse(clipsData) : clipsData;

    if (!Array.isArray(clips)) {
      throw new Error("clips 数据不是数组");
    }

    return clips.map((clip, index) => ({
      videoId: clip.video_id || clip.videoId,
      videoName: clip.video_name || clip.videoName || "",
      startMs: clip.start_ms || clip.startMs,
      endMs: clip.end_ms || clip.endMs,
      type: clip.type || "unknown",
      order: clip.order || index,
    }));
  } catch (error) {
    throw new Error(`解析剪辑片段失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 提取视频片段
 */
async function extractClipSegments(
  clips: ClipSegment[],
  tempDir: string,
  onProgress: ProgressCallback
): Promise<VideoSegment[]> {
  const segments: VideoSegment[] = [];

  console.log(`\n[视频导出] 开始提取 ${clips.length} 个片段`);

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const progress = 10 + Math.floor((i / clips.length) * 40);

    await onProgress(progress, `裁剪片段 ${i + 1}/${clips.length}`);

    // 查询视频信息
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
    const durationMs = clip.endMs - clip.startMs;

    console.log(`[视频导出] 裁剪片段 ${i + 1}: ${video.filePath}`);
    console.log(`   开始时间: ${clip.startMs}ms`);
    console.log(`   持续时间: ${durationMs}ms`);
    console.log(`   输出路径: ${segmentPath}`);

    try {
      trimVideo({
        inputPath: video.filePath,
        outputPath: segmentPath,
        startTimeMs: clip.startMs,
        durationMs,
        crf: 18,
        preset: "fast",
      });

      segments.push({ path: segmentPath });
      console.log(`[视频导出] ✅ 片段 ${i + 1} 裁剪完成`);
    } catch (error) {
      console.error(`[视频导出] ❌ 片段 ${i + 1} 裁剪失败:`, error);
      throw new Error(
        `片段 ${i + 1} 裁剪失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return segments;
}

/**
 * 拼接视频片段
 */
async function mergeVideoSegments(
  segments: VideoSegment[],
  outputPath: string,
  totalDurationSec: number,
  onProgress: ProgressCallback
): Promise<void> {
  console.log(`\n[视频导出] 开始拼接 ${segments.length} 个片段`);
  console.log(`   输出路径: ${outputPath}`);
  console.log(`   预计时长: ${totalDurationSec.toFixed(2)}秒`);

  await onProgress(60, "拼接视频片段");

  try {
    await concatVideos({
      segments,
      outputPath,
      totalDuration: totalDurationSec,
      onProgress: (progress) => {
        const overallProgress = 60 + Math.floor(progress * 0.35);
        onProgress(overallProgress, `拼接中... ${Math.floor(progress)}%`);
      },
    });

    console.log(`[视频导出] ✅ 拼接完成`);
  } catch (error) {
    console.error(`[视频导出] ❌ 拼接失败:`, error);
    throw error;
  }
}

/**
 * 清理临时文件
 */
export async function cleanupTempFiles(tempDir: string, keepOutput = false): Promise<void> {
  try {
    if (existsSync(tempDir)) {
      console.log(`[视频导出] 清理临时文件: ${tempDir}`);
      await rm(tempDir, { recursive: true, force: true });
      console.log(`[视频导出] ✅ 临时文件已清理`);
    }
  } catch (error) {
    console.error(`[视频导出] ⚠️ 清理临时文件失败:`, error);
    // 不抛出错误，因为清理失败不应影响导出结果
  }
}

/**
 * 执行导出任务
 */
export async function exportCombination(job: ExportJob): Promise<ExportResult> {
  const { projectId, combinationId, outputFormat = "mp4" } = job;

  console.log(`\n[视频导出] ========================================`);
  console.log(`[视频导出] 开始导出任务`);
  console.log(`[视频导出] 项目 ID: ${projectId}`);
  console.log(`[视频导出] 组合 ID: ${combinationId}`);
  console.log(`[视频导出] 输出格式: ${outputFormat}`);
  console.log(`[视频导出] ========================================\n`);

  // 1. 查询剪辑组合
  const [combination] = await db
    .select()
    .from(hlClipCombinations)
    .where(eq(hlClipCombinations.id, combinationId));

  if (!combination) {
    return {
      success: false,
      errorMessage: `剪辑组合不存在，ID: ${combinationId}`,
    };
  }

  // 2. 解析剪辑片段
  let clips: ClipSegment[];
  try {
    clips = parseClips(combination.clips);
    console.log(`[视频导出] 解析到 ${clips.length} 个片段`);
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  if (clips.length === 0) {
    return {
      success: false,
      errorMessage: "剪辑组合没有片段数据",
    };
  }

  // 3. 创建导出记录
  const [exportRecord] = await db
    .insert(hlExports)
    .values({
      projectId,
      combinationId,
      status: "processing",
      progress: 0,
      currentStep: "准备导出",
      outputFormat,
    })
    .returning();

  const exportId = exportRecord.id;
  const onProgress = createProgressCallback(exportId);

  // 临时目录
  const tempDir = join(process.cwd(), "data", "hangzhou-leiming", "temp", `export_${exportId}`);

  try {
    // 4. 准备临时目录
    await mkdir(tempDir, { recursive: true });
    await onProgress(5, "准备临时目录");

    // 5. 提取视频片段
    const segments = await extractClipSegments(clips, tempDir, onProgress);

    // 6. 准备输出路径
    const outputDir = job.outputDir || join(process.cwd(), "data", "hangzhou-leiming", "exports");
    await mkdir(outputDir, { recursive: true });

    const outputFileName = `${combination.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")}_${exportId}.${outputFormat}`;
    const outputPath = join(outputDir, outputFileName);

    // 7. 拼接视频
    const totalDurationSec = combination.totalDurationMs / 1000;
    await mergeVideoSegments(segments, outputPath, totalDurationSec, onProgress);

    // 8. 获取输出文件信息
    const { statSync } = await import("fs");
    const fileSize = statSync(outputPath).size;

    console.log(`\n[视频导出] ========================================`);
    console.log(`[视频导出] ✅ 导出完成！`);
    console.log(`[视频导出] 输出文件: ${outputPath}`);
    console.log(`[视频导出] 文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[视频导出] 视频时长: ${(totalDurationSec / 60).toFixed(2)} 分钟`);
    console.log(`[视频导出] ========================================\n`);

    // 9. 更新导出记录状态
    await db
      .update(hlExports)
      .set({
        status: "completed",
        progress: 100,
        currentStep: "导出完成",
        outputPath,
        fileSize,
        completedAt: new Date(),
        ffmpegCommand: `拼接 ${segments.length} 个片段`,
      })
      .where(eq(hlExports.id, exportId));

    // 10. 清理临时文件
    await cleanupTempFiles(tempDir, true);

    // 11. 更新项目状态
    await db
      .update(hlProjects)
      .set({ status: "ready" })
      .where(eq(hlProjects.id, projectId));

    return {
      success: true,
      outputPath,
      durationMs: combination.totalDurationMs,
      fileSize,
      exportId,
    };
  } catch (error) {
    console.error(`\n[视频导出] ❌ 导出失败:`, error);

    // 更新导出记录状态
    await db
      .update(hlExports)
      .set({
        status: "error",
        currentStep: "导出失败",
        errorMessage: error instanceof Error ? error.message : "未知错误",
      })
      .where(eq(hlExports.id, exportId));

    // 清理临时文件
    await cleanupTempFiles(tempDir, false);

    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "未知错误",
      exportId,
    };
  }
}

/**
 * 查询导出状态
 */
export async function getExportStatus(exportId: number): Promise<ExportResult | null> {
  const [exportRecord] = await db
    .select()
    .from(hlExports)
    .where(eq(hlExports.id, exportId));

  if (!exportRecord) {
    return null;
  }

  return {
    success: exportRecord.status === "completed",
    outputPath: exportRecord.outputPath || undefined,
    durationMs: undefined, // 需要从剪辑组合查询
    fileSize: exportRecord.fileSize || undefined,
    errorMessage: exportRecord.errorMessage || undefined,
    exportId: exportRecord.id,
  };
}
