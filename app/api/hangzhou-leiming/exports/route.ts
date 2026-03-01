/**
 * 杭州雷鸣 - 导出 API
 *
 * 功能：
 * - POST /api/hangzhou-leiming/exports - 创建导出任务并执行视频导出
 * - GET /api/hangzhou-leiming/exports - 查询导出记录
 * - GET /api/hangzhou-leiming/exports/:id - 查询单个导出记录状态
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
import { hlExports } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { exportCombination, getExportStatus } from "@/lib/export/video-exporter";

/**
 * POST - 创建导出任务
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { combinationId, projectId, outputFormat = "mp4" } = body;

    if (!combinationId || !projectId) {
      return NextResponse.json(
        { success: false, message: "缺少必要参数：combinationId 和 projectId" },
        { status: 400 }
      );
    }

    console.log(`[杭州雷鸣] 收到导出请求`);
    console.log(`   项目 ID: ${projectId}`);
    console.log(`   组合 ID: ${combinationId}`);
    console.log(`   输出格式: ${outputFormat}`);

    // 异步执行导出（不阻塞响应）
    // 注意：导出是异步的，立即返回 exportId 供前端轮询状态
    executeExportAsync({ projectId, combinationId, outputFormat });

    return NextResponse.json({
      success: true,
      message: "导出任务已创建，正在处理中",
      data: {
        projectId,
        combinationId,
        status: "pending",
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
 * 异步执行导出任务
 */
async function executeExportAsync(params: {
  projectId: number;
  combinationId: number;
  outputFormat?: "mp4" | "mov" | "avi";
}): Promise<void> {
  const { projectId, combinationId, outputFormat } = params;

  try {
    console.log(`[杭州雷鸣] 开始执行导出任务`);

    const result = await exportCombination({
      projectId,
      combinationId,
      outputFormat,
    });

    if (result.success) {
      console.log(`[杭州雷鸣] ✅ 导出任务完成，ID: ${result.exportId}`);
      console.log(`   输出文件: ${result.outputPath}`);
      console.log(`   文件大小: ${result.fileSize ? (result.fileSize / 1024 / 1024).toFixed(2) + " MB" : "未知"}`);
    } else {
      console.error(`[杭州雷鸣] ❌ 导出任务失败: ${result.errorMessage}`);
    }
  } catch (error) {
    console.error(`[杭州雷鸣] ❌ 导出任务异常:`, error);
  }
}

/**
 * GET - 查询导出记录
 *
 * 支持两种查询方式：
 * 1. ?projectId=1 - 查询项目的所有导出记录
 * 2. ?id=10 - 查询单个导出记录的详细状态
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");
    const exportId = searchParams.get("id");

    // 查询单个导出记录的状态
    if (exportId) {
      const result = await getExportStatus(parseInt(exportId));

      if (!result) {
        return NextResponse.json(
          { success: false, message: "导出记录不存在" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // 查询项目的所有导出记录
    if (projectId) {
      const exports = await db
        .select()
        .from(hlExports)
        .where(eq(hlExports.projectId, parseInt(projectId)))
        .orderBy(desc(hlExports.createdAt));

      return NextResponse.json({
        success: true,
        data: exports,
      });
    }

    return NextResponse.json(
      { success: false, message: "缺少参数：需要 projectId 或 id" },
      { status: 400 }
    );
  } catch (error) {
    console.error("获取导出记录失败:", error);
    return NextResponse.json(
      { success: false, message: "获取导出记录失败" },
      { status: 500 }
    );
  }
}

