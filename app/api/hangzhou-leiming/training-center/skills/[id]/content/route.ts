/**
 * 杭州雷鸣 - 技能文件内容查看 API
 *
 * 功能：
 * - GET /api/hangzhou-leiming/training-center/skills/[id]/content - 查看技能文件内容
 * - GET /api/hangzhou-leiming/training-center/skills/[id]/download - 下载技能文件
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlGlobalSkills } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { readFileSync, existsSync } from "fs";

/**
 * GET - 查看技能文件内容
 */
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

    // 读取文件内容
    if (!existsSync(skill.skillFilePath)) {
      return NextResponse.json(
        { success: false, message: "技能文件不存在" },
        { status: 404 }
      );
    }

    const content = readFileSync(skill.skillFilePath, "utf-8");

    return NextResponse.json({
      success: true,
      data: {
        ...skill,
        content,
      },
    });
  } catch (error) {
    console.error("查看技能文件失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "查看技能文件失败",
      },
      { status: 500 }
    );
  }
}
