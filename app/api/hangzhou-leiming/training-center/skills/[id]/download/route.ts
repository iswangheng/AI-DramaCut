/**
 * 杭州雷鸣 - 技能文件下载 API
 *
 * 功能：
 * - GET /api/hangzhou-leiming/training-center/skills/[id]/download - 下载技能文件
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlGlobalSkills } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const skillId = parseInt(idStr);

    // 查询技能信息
    const [skill] = await db
      .select()
      .from(hlGlobalSkills)
      .where(eq(hlGlobalSkills.id, skillId));

    if (!skill) {
      return NextResponse.json(
        { success: false, message: "技能不存在" },
        { status: 404 }
      );
    }

    // 验证文件存在
    if (!existsSync(skill.skillFilePath)) {
      return NextResponse.json(
        { success: false, message: "技能文件不存在" },
        { status: 404 }
      );
    }

    // 读取文件
    const fileBuffer = readFileSync(skill.skillFilePath);
    const fileName = `skill_${skill.version}.md`;

    // 设置响应头
    const headers = new Headers();
    headers.set("Content-Type", "text/markdown; charset=utf-8");
    headers.set("Content-Length", fileBuffer.length.toString());
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );

    // 返回文件
    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("下载技能文件失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "下载技能文件失败",
      },
      { status: 500 }
    );
  }
}
