// ============================================
// 项目详情 API
// GET /api/projects/:id - 获取项目详情
// PUT /api/projects/:id - 更新项目
// DELETE /api/projects/:id - 删除项目
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/db';

/**
 * GET /api/projects/:id
 * 获取项目详情（包含视频统计）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        {
          success: false,
          message: '无效的项目 ID',
        },
        { status: 400 }
      );
    }

    // 获取项目及统计信息
    const project = await queries.project.getWithStats(projectId);

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: '项目不存在',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '获取项目详情失败',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/:id
 * 更新项目信息
 *
 * 请求体:
 * {
 *   "name?: string,
 *   "description?: string,
 *   "status?: 'ready' | 'processing' | 'error',
 *   "progress?: number,
 *   "currentStep?: string,
 *   "errorMessage?: string
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        {
          success: false,
          message: '无效的项目 ID',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, status, progress, currentStep, errorMessage } = body;

    // 构建更新数据
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (currentStep !== undefined) updateData.currentStep = currentStep;
    if (errorMessage !== undefined) updateData.errorMessage = errorMessage;

    // 更新项目
    const project = await queries.project.update(projectId, updateData);

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: '项目不存在',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '更新项目失败',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/:id
 * 删除项目（级联删除所有关联数据）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        {
          success: false,
          message: '无效的项目 ID',
        },
        { status: 400 }
      );
    }

    // 删除项目
    const project = await queries.project.delete(projectId);

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: '项目不存在',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '项目已删除',
      data: { id: projectId },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '删除项目失败',
      },
      { status: 500 }
    );
  }
}
