/**
 * 杭州雷鸣 - Excel标记数据导入 API
 *
 * 功能：
 * - POST /api/hangzhou-leuming/markings/import - 导入Excel标记数据
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlMarkings, hlVideos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// POST - 导入Excel标记数据
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectIdStr = formData.get("projectId") as string;

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

    // ✅ 保存原始Excel文件到磁盘（保持原文件名）
    const projectDir = join(process.cwd(), "data", "hangzhou-leiming", String(projectId));
    const excelDir = join(projectDir, "excel");
    await mkdir(excelDir, { recursive: true });

    // 使用原文件名（添加时间戳前缀避免覆盖）
    const timestamp = Date.now();
    // 只清理真正危险的特殊字符（Windows不允许的文件名字符），保留中文
    const originalName = file.name.replace(/[<>:"/\\|?*]/g, '_');
    const excelFilename = `${timestamp}_${originalName}`;
    const excelPath = join(excelDir, excelFilename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 保存Excel文件
    await writeFile(excelPath, buffer);
    console.log(`✅ 原始Excel文件已保存: ${excelPath}`);

    // 读取Excel数据
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false }); // ✅ 强制读取为字符串，保留原始格式

    console.log(`Excel数据解析成功，共 ${data.length} 行`);

    // 获取项目的所有视频
    const videos = await db
      .select()
      .from(hlVideos)
      .where(eq(hlVideos.projectId, projectId));

    const videoMap = new Map<string, any>(
      videos.map((v: any) => [v.episodeNumber, v])
    );

    // 解析并插入标记数据
    const markingsToInsert = [];
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    // ⚠️ 获取现有标记，用于去重
    const existingMarkings = await db
      .select()
      .from(hlMarkings)
      .where(eq(hlMarkings.projectId, projectId));

    // 构建去重集合：key = `${videoId}_${seconds}_${type}`
    const existingMarkingsSet = new Set(
      existingMarkings.map((m: any) => `${m.videoId}_${m.seconds}_${m.type}`)
    );

    for (const row of data as any[]) {
      try {
        const episode = row["集数"];
        const timestamp = row["时间点"];
        const type = row["标记类型"];
        const description = row["描述"] || "";

        // 验证必填字段
        if (!episode || !timestamp || !type) {
          console.warn("跳过无效行:", row);
          errorCount++;
          continue;
        }

        // 查找对应的视频
        const video = videoMap.get(episode);
        if (!video) {
          console.warn(`未找到集数 ${episode} 对应的视频`);
          errorCount++;
          continue;
        }

        // 解析时间点（支持格式：00:35, 01:20, 00:01:20）
        const seconds = parseTimestamp(timestamp);

        if (isNaN(seconds)) {
          console.warn(`无效的时间格式: ${timestamp}`);
          errorCount++;
          continue;
        }

        // ⚠️ 去重检查：跳过已存在的标记
        const markingKey = `${video.id}_${seconds}_${type}`;
        if (existingMarkingsSet.has(markingKey)) {
          console.log(`跳过重复标记: 第${episode}集 ${timestamp} (${type})`);
          duplicateCount++;
          continue;
        }

        markingsToInsert.push({
          projectId,
          videoId: video.id,
          timestamp,
          seconds,
          type,
          subType: description,
          description,
          score: null,
          reasoning: null,
          aiEnhanced: false,
        });

        successCount++;
      } catch (error) {
        console.error("解析行失败:", row, error);
        errorCount++;
      }
    }

    // 批量插入数据库
    if (markingsToInsert.length > 0) {
      await db.insert(hlMarkings).values(markingsToInsert);
    }

    return NextResponse.json({
      success: true,
      message: `导入完成！成功 ${successCount} 条，重复 ${duplicateCount} 条（已跳过），失败 ${errorCount} 条`,
      data: {
        successCount,
        duplicateCount,
        errorCount,
        total: data.length,
      },
    });
  } catch (error) {
    console.error("导入Excel失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "导入Excel失败",
      },
      { status: 500 }
    );
  }
}

/**
 * 解析时间戳为秒数
 *
 * ✅ 正确格式（杭州雷鸣项目）：MM:SS:ms（分钟:秒:毫秒）
 * - "0:05:00" -> 0分5秒 = 5秒
 * - "1:34:00" -> 1分34秒 = 94秒
 * - "0:25:00" -> 0分25秒 = 25秒
 *
 * 支持格式：
 * - "00:35" -> 35秒（MM:SS）
 * - "01:20" -> 80秒（MM:SS）
 * - "00:01:20" -> 80秒（MM:SS:ms，忽略毫秒）
 */
function parseTimestamp(timestamp: string | number): number {
  // 如果是数字格式（Excel 小数格式）
  if (typeof timestamp === "number") {
    // Excel 中的时间通常是天数
    return Math.round(timestamp * 24 * 60 * 60); // 转换为秒
  }

  // 如果是字符串格式
  if (typeof timestamp === "string") {
    const parts = timestamp.split(":").map(Number);

    if (parts.length === 2) {
      // MM:SS
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // ✅ MM:SS:ms 格式（杭州雷鸣项目专用）
      // 例如："0:05:00" → 0分5秒0毫秒 = 5秒
      // "1:34:00" → 1分34秒0毫秒 = 94秒
      const [minutes, seconds, milliseconds] = parts;
      return minutes * 60 + seconds; // 忽略毫秒
    }
  }

  return NaN;
}
