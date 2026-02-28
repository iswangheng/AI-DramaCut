/**
 * 杭州雷鸣 - 技能文件 API
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlSkills } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: "缺少项目ID" },
        { status: 400 }
      );
    }

    const skills = await db
      .select()
      .from(hlSkills)
      .where(eq(hlSkills.projectId, parseInt(projectId)))
      .orderBy(desc(hlSkills.createdAt));

    return NextResponse.json({
      success: true,
      data: skills,
    });
  } catch (error) {
    console.error("获取技能失败:", error);
    return NextResponse.json(
      { success: false, message: "获取技能失败" },
      { status: 500 }
    );
  }
}
