// ============================================
// 数据库初始化 API
// POST /api/db/init
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // 仅允许开发环境
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          status: 'error',
          message: '生产环境禁止手动初始化数据库',
        },
        { status: 403 }
      );
    }

    // 检查请求体
    const body = await request.json().catch(() => ({}));
    const { reset } = body;

    if (reset) {
      // 重置数据库（危险操作）
      await dbClient.reset();
      return NextResponse.json({
        status: 'ok',
        message: '数据库已重置',
        timestamp: new Date().toISOString(),
      });
    } else {
      // 初始化数据库表结构
      await dbClient.init();
      return NextResponse.json({
        status: 'ok',
        message: '数据库初始化完成',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
