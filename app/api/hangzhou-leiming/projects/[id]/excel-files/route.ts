/**
 * 获取项目已上传的Excel文件列表
 *
 * GET /api/hangzhou-leiming/projects/[id]/excel-files
 */

import { NextRequest, NextResponse } from "next/server";
import { existsSync, readdirSync, statSync } from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { success: false, message: "无效的项目ID" },
        { status: 400 }
      );
    }

    // 检查项目的Excel目录
    const projectDir = path.join(
      process.cwd(),
      "data",
      "hangzhou-leiming",
      String(projectId)
    );
    const excelDir = path.join(projectDir, "excel");

    if (!existsSync(excelDir)) {
      return NextResponse.json({
        success: true,
        data: {
          projectId,
          files: [],
        },
      });
    }

    // 读取目录中的所有Excel文件
    const files = readdirSync(excelDir)
      .filter((file) => file.endsWith(".xlsx") || file.endsWith(".xls"))
      .map((filename) => {
        const filePath = path.join(excelDir, filename);
        const stats = statSync(filePath);

        // 从文件名提取信息：{timestamp}_{originalName}.xlsx
        const nameMatch = filename.match(/^(\d+)_(.+)$/);
        const uploadTime = nameMatch ? parseInt(nameMatch[1]) : stats.birthtimeMs;
        const originalName = nameMatch ? nameMatch[2] : filename;

        return {
          filename,
          originalName, // 原文件名
          uploadTime,
          uploadTimeFormatted: new Date(uploadTime).toLocaleString("zh-CN"),
          fileSize: stats.size,
          fileSizeFormatted: formatFileSize(stats.size),
          downloadUrl: `/api/hangzhou-leiming/projects/${projectId}/excel-files/${filename}`,
          deleteUrl: `/api/hangzhou-leiming/projects/${projectId}/excel-files/${filename}`,
        };
      })
      .sort((a, b) => b.uploadTime - a.uploadTime); // 按上传时间倒序

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        files,
      },
    });
  } catch (error) {
    console.error("获取Excel文件列表失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "获取Excel文件列表失败",
      },
      { status: 500 }
    );
  }
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}
