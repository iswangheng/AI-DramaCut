/**
 * 杭州雷鸣 - 项目管理 API
 *
 * 功能：
 * - GET  /api/hangzhou-leiming/projects - 获取项目列表
 * - POST /api/hangzhou-leiming/projects - 创建新项目
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlProjects, hlVideos, hlMarkings } from "@/lib/db/schema";
import { desc, eq, sql, count } from "drizzle-orm";
import type { HLProject } from "@/lib/db/schema";

// GET - 获取项目列表
export async function GET() {
  try {
    // 获取所有项目
    const projects = await db
      .select()
      .from(hlProjects)
      .orderBy(desc(hlProjects.createdAt));

    // 为每个项目统计视频和标记数量
    const projectsWithStats = await Promise.all(
      projects.map(async (project: HLProject) => {
        // 统计视频数量
        const [videoCountResult] = await db
          .select({ count: count() })
          .from(hlVideos)
          .where(eq(hlVideos.projectId, project.id));

        // 统计标记数量
        const [markingCountResult] = await db
          .select({ count: count() })
          .from(hlMarkings)
          .where(eq(hlMarkings.projectId, project.id));

        return {
          ...project,
          videoCount: videoCountResult?.count || 0,
          markingCount: markingCountResult?.count || 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: projectsWithStats,
    });
  } catch (error) {
    console.error("获取项目列表失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "获取项目列表失败",
      },
      { status: 500 }
    );
  }
}

// POST - 创建新项目
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description } = body;

    // 参数验证
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "项目名称不能为空",
        },
        { status: 400 }
      );
    }

    // 创建项目
    const [newProject] = await db
      .insert(hlProjects)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        status: "created",
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newProject,
    });
  } catch (error) {
    console.error("创建项目失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "创建项目失败",
      },
      { status: 500 }
    );
  }
}
