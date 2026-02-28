/**
 * 杭州雷鸣 - 训练中心技能管理 API
 *
 * 功能：
 * - GET - 获取当前全局技能
 * - POST - 创建新的技能版本
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlGlobalSkills } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

/**
 * GET - 获取所有技能版本
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");

    // 获取所有技能版本，按创建时间倒序
    const skills = await db
      .select()
      .from(hlGlobalSkills)
      .orderBy(desc(hlGlobalSkills.createdAt))
      .limit(limit);

    // 解析 trainingProjectIds JSON 字段
    const parsedSkills = skills.map((skill: any) => ({
      ...skill,
      trainingProjectIds: JSON.parse(skill.trainingProjectIds),
    }));

    return NextResponse.json({
      success: true,
      data: parsedSkills,
    });
  } catch (error) {
    console.error("获取全局技能失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "获取全局技能失败",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - 创建新的技能版本
 *
 * 用途：训练完成后调用此接口保存新的技能文件
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      version,
      skillFilePath,
      totalProjects,
      totalVideos,
      totalMarkings,
      trainingProjectIds,
      accuracy,
      precision,
      recall,
    } = body;

    // 验证必要参数
    if (!version || !skillFilePath) {
      return NextResponse.json(
        {
          success: false,
          message: "缺少必要参数",
        },
        { status: 400 }
      );
    }

    // 创建新技能版本
    const [newSkill] = await db
      .insert(hlGlobalSkills)
      .values({
        version,
        skillFilePath,
        totalProjects: totalProjects || 0,
        totalVideos: totalVideos || 0,
        totalMarkings: totalMarkings || 0,
        trainingProjectIds: JSON.stringify(trainingProjectIds || []),
        accuracy: accuracy || null,
        precision: precision || null,
        recall: recall || null,
        status: "ready",
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "技能创建成功",
      data: newSkill,
    });
  } catch (error) {
    console.error("创建技能失败:", error);

    // 检查是否是版本号重复的错误
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        {
          success: false,
          message: "版本号已存在，请使用新的版本号",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "创建技能失败",
      },
      { status: 500 }
    );
  }
}
