/**
 * 杭州雷鸣 - 下载导出视频
 *
 * 功能：
 * - GET /api/hangzhou-leiming/exports/[id]/download - 下载导出的视频文件
 *
 * 逻辑：
 * 1. 查询导出记录状态
 * 2. 如果已完成，返回文件流
 * 3. 如果未完成或失败，返回错误信息
 */

import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { db } from "@/lib/db/client";
import { hlExports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const exportId = parseInt(id);

    console.log(`[杭州雷鸣] 收到下载请求，导出 ID: ${exportId}`);

    // 1. 查询导出记录
    const [exportRecord] = await db
      .select()
      .from(hlExports)
      .where(eq(hlExports.id, exportId));

    if (!exportRecord) {
      return NextResponse.json(
        { success: false, message: "导出记录不存在" },
        { status: 404 }
      );
    }

    console.log(`[杭州雷鸣] 导出状态: ${exportRecord.status}`);

    // 2. 检查导出状态
    if (exportRecord.status === "pending" || exportRecord.status === "processing") {
      return NextResponse.json(
        {
          success: false,
          message: "导出尚未完成",
          data: {
            status: exportRecord.status,
            progress: exportRecord.progress,
            currentStep: exportRecord.currentStep,
          },
        },
        { status: 202 } // 202 Accepted
      );
    }

    if (exportRecord.status === "error") {
      return NextResponse.json(
        {
          success: false,
          message: "导出失败",
          error: exportRecord.errorMessage,
        },
        { status: 400 }
      );
    }

    // 3. 验证输出文件存在
    if (!exportRecord.outputPath) {
      return NextResponse.json(
        { success: false, message: "导出文件路径未记录" },
        { status: 500 }
      );
    }

    if (!existsSync(exportRecord.outputPath)) {
      return NextResponse.json(
        { success: false, message: "导出文件不存在，可能已被删除" },
        { status: 404 }
      );
    }

    // 4. 获取文件信息
    const stats = statSync(exportRecord.outputPath);
    const fileBuffer = readFileSync(exportRecord.outputPath);

    // 5. 设置响应头
    const headers = new Headers();
    headers.set("Content-Type", "video/mp4");
    headers.set("Content-Length", stats.size.toString());
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(exportRecord.outputPath.split("/").pop() || "video.mp4")}"`
    );

    // 6. 返回文件流
    console.log(`[杭州雷鸣] 开始下载文件: ${exportRecord.outputPath}`);
    console.log(`   文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[杭州雷鸣] 下载文件失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "下载文件失败",
      },
      { status: 500 }
    );
  }
}
