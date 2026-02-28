/**
 * 杭州雷鸣 - 单个项目管理 API
 *
 * 功能：
 * - GET    /api/hangzhou-leiming/projects/:id - 获取项目详情
 * - PUT    /api/hangzhou-leiming/projects/:id - 更新项目信息
 * - DELETE /api/hangzhou-leiming/projects/:id - 删除项目
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlProjects, hlVideos, hlMarkings } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

// GET - 获取项目详情（包含统计信息）
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const projectId = parseInt(idStr);

    if (isNaN(projectId)) {
      return NextResponse.json(
        {
          success: false,
          message: "无效的项目 ID",
        },
        { status: 400 }
      );
    }

    // 查询项目
    const [project] = await db.select().from(hlProjects).where(eq(hlProjects.id, projectId));

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: "项目不存在",
        },
        { status: 404 }
      );
    }

    // 查询统计信息
    const [videoCountResult] = await db
      .select({ count: count() })
      .from(hlVideos)
      .where(eq(hlVideos.projectId, projectId));

    const [markingCountResult] = await db
      .select({ count: count() })
      .from(hlMarkings)
      .where(eq(hlMarkings.projectId, projectId));

    // 返回项目详情（包含统计信息）
    const projectWithStats = {
      ...project,
      videoCount: videoCountResult?.count || 0,
      markingCount: markingCountResult?.count || 0,
    };

    return NextResponse.json({
      success: true,
      data: projectWithStats,
    });
  } catch (error) {
    console.error("获取项目详情失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "获取项目详情失败",
      },
      { status: 500 }
    );
  }
}

// PUT - 更新项目信息
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const projectId = parseInt(idStr);

    if (isNaN(projectId)) {
      return NextResponse.json(
        {
          success: false,
          message: "无效的项目 ID",
        },
        { status: 400 }
      );
    }

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

    // 更新项目
    const [updatedProject] = await db
      .update(hlProjects)
      .set({
        name: name.trim(),
        description: description?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(hlProjects.id, projectId))
      .returning();

    if (!updatedProject) {
      return NextResponse.json(
        {
          success: false,
          message: "项目不存在",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedProject,
    });
  } catch (error) {
    console.error("更新项目失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "更新项目失败",
      },
      { status: 500 }
    );
  }
}

// DELETE - 删除项目（级联删除关联数据）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const projectId = parseInt(idStr);

    if (isNaN(projectId)) {
      return NextResponse.json(
        {
          success: false,
          message: "无效的项目 ID",
        },
        { status: 400 }
      );
    }

    // 删除项目（级联删除关联的视频、标记等）
    const [deletedProject] = await db
      .delete(hlProjects)
      .where(eq(hlProjects.id, projectId))
      .returning();

    if (!deletedProject) {
      return NextResponse.json(
        {
          success: false,
          message: "项目不存在",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "项目已删除",
      data: deletedProject,
    });
  } catch (error) {
    console.error("删除项目失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "删除项目失败",
      },
      { status: 500 }
    );
  }
}
