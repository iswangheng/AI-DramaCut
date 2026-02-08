// ============================================
// 项目管理 API
// GET /api/projects - 获取项目列表
// POST /api/projects - 创建新项目
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/db';

/**
 * GET /api/projects
 * 获取项目列表
 *
 * 查询参数:
 * - limit: 返回数量限制 (默认 50)
 * - offset: 偏移量 (默认 0)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const projects = await queries.project.list(limit, offset);

    return NextResponse.json({
      success: true,
      data: projects,
      meta: {
        count: projects.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '获取项目列表失败',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * 创建新项目
 *
 * 请求体:
 * {
 *   "name": string,
 *   "description?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    // 验证必填字段
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
      {
        success: false,
        message: '项目名称不能为空',
      },
      { status: 400 }
      );
    }

    // 创建项目
    const project = await queries.project.create({
      name: name.trim(),
      description: description?.trim() || null,
      status: 'ready',
      progress: 0,
    });

    return NextResponse.json({
      success: true,
      data: project,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '创建项目失败',
      },
      { status: 500 }
    );
  }
}
