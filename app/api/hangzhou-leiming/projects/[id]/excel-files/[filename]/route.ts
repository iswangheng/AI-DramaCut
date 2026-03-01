/**
 * 删除已上传的Excel文件
 *
 * DELETE /api/hangzhou-leiming/projects/[id]/excel-files/[filename]
 */

import { NextRequest, NextResponse } from "next/server";
import { existsSync, unlinkSync } from "fs";
import path from "path";

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const { id, filename } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { success: false, message: "无效的项目ID" },
        { status: 400 }
      );
    }

    // 安全检查：防止路径穿越攻击
    if (filename.includes("..") || filename.includes("/")) {
      return NextResponse.json(
        { success: false, message: "无效的文件名" },
        { status: 400 }
      );
    }

    // 构建文件路径
    const filePath = path.join(
      process.cwd(),
      "data",
      "hangzhou-leiming",
      String(projectId),
      "excel",
      filename
    );

    // 检查文件是否存在
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, message: "文件不存在" },
        { status: 404 }
      );
    }

    // 删除文件
    unlinkSync(filePath);

    return NextResponse.json({
      success: true,
      message: "文件已删除",
    });
  } catch (error) {
    console.error("删除Excel文件失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "删除Excel文件失败",
      },
      { status: 500 }
    );
  }
}
