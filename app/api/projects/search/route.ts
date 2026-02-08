// ============================================
// 项目搜索 API
// GET /api/projects/search?q=keyword
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/db';

/**
 * GET /api/projects/search
 * 搜索项目
 *
 * 查询参数:
 * - q: 搜索关键词 (必填)
 * - limit: 返回数量限制 (默认 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '50');

    // 验证必填字段
    if (!keyword || keyword.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: '搜索关键词不能为空',
        },
        { status: 400 }
      );
    }

    // 搜索项目
    const projects = await queries.project.search(keyword.trim(), limit);

    return NextResponse.json({
      success: true,
      data: projects,
      meta: {
        keyword,
        count: projects.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '搜索项目失败',
      },
      { status: 500 }
    );
  }
}
