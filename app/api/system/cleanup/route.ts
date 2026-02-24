// ============================================
// 系统清理 API
// 自动或手动清理过期的关键帧和临时文件
// ============================================

import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';

/**
 * GET /api/system/cleanup
 * 清理过期的关键帧
 *
 * 查询参数：
 * - days: 保留天数（默认 7）
 * - auto: 是否为自动清理（默认 true）
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    const auto = searchParams.get('auto') !== 'false';  // 默认为自动模式

    console.log(`🧹 开始清理关键帧（保留 ${days} 天，${auto ? '自动' : '手动'}模式）`);

    // 执行清理
    const result = await queries.keyframe.cleanupOldKeyframes(days);

    console.log(`✅ 清理完成:`, result);

    return NextResponse.json({
      success: true,
      data: result,
      message: `清理完成：删除了 ${result.cleanedKeyframes} 个关键帧，` +
               `释放了 ${result.freedSpaceMB}MB 空间`,
    });
  } catch (error) {
    console.error('❌ 清理失败:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '清理失败',
    }, { status: 500 });
  }
}
