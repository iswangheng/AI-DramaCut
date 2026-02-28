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

    // 读取Excel文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

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
      message: `导入完成！成功 ${successCount} 条，失败 ${errorCount} 条`,
      data: {
        successCount,
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
 * 解析时间戳字符串为秒数
 * 支持格式：
 * - "00:35" -> 35秒
 * - "01:20" -> 80秒
 * - "00:01:20" -> 80秒
 */
function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(":").map(Number);

  if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return NaN;
}
