/**
 * 杭州雷鸣 - 下载导出视频
 *
 * 功能：
 * - GET /api/hangzhou-leiming/exports/[id]/download - 下载导出的视频文件
 */

import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const exportId = parseInt(id);

    // 构建文件路径
    const exportsDir = join(process.cwd(), "data", "hangzhou-leiming", "exports");

    // 查找匹配的导出文件
    const { readdirSync } = await import("fs");
    const files = readdirSync(exportsDir);

    const matchedFile = files.find((file) => file.includes(`_${exportId}.mp4`));

    if (!matchedFile) {
      return NextResponse.json(
        { success: false, message: "导出文件不存在" },
        { status: 404 }
      );
    }

    const filePath = join(exportsDir, matchedFile);

    // 验证文件存在
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, message: "导出文件不存在" },
        { status: 404 }
      );
    }

    // 获取文件信息
    const stats = statSync(filePath);
    const fileBuffer = readFileSync(filePath);

    // 设置响应头
    const headers = new Headers();
    headers.set("Content-Type", "video/mp4");
    headers.set("Content-Length", stats.size.toString());
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(matchedFile)}"`
    );

    // 返回文件
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
