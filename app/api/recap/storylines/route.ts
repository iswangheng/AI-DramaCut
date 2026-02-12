// ============================================
// API 路由：提取故事线（已过时）
// ============================================
// TODO: 此 API 使用旧的 storylines schema（videoId 字段）
// 新的 schema 中 storylines 属于项目层级（projectId）
// 这个 API 已经被项目级分析（analyze-project-storylines）替代

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/recap/storylines
 * GET /api/recap/storylines
 *
 * 此 API 已过时，请使用项目级故事线分析
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      message: '此 API 已过时，请使用项目级故事线分析（POST /api/projects/[id]/analyze-storylines）',
      deprecated: true,
      replacement: '/api/projects/[id]/analyze-storylines'
    },
    { status: 410 }  // 410 Gone
  );
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      message: '此 API 已过时，请使用项目级故事线分析（GET /api/projects/[id]/analyze-storylines）',
      deprecated: true,
      replacement: '/api/projects/[id]/analyze-storylines'
    },
    { status: 410 }  // 410 Gone
  );
}
