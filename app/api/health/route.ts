// ============================================
// 健康检查 API
// GET /api/health
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { dbClient, queries } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 数据库健康检查
    const isHealthy = dbClient.healthCheck();

    if (!isHealthy) {
      return NextResponse.json(
        {
          status: 'error',
          message: '数据库连接失败',
        },
        { status: 503 }
      );
    }

    // 获取统计信息
    const stats = await queries.stats.getOverview();

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        stats,
      },
    });
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
