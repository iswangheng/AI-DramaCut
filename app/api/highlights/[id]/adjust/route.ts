/**
 * PATCH /api/highlights/[id]/adjust
 *
 * 调整高光切片的时间范围（用户毫秒级微调）
 *
 * 请求体：
 * {
 *   "customStartMs": number,    // 自定义开始时间（毫秒）
 *   "customEndMs": number       // 自定义结束时间（毫秒）
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "highlight": HighlightClip
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { highlightQueries } from '@/lib/db/queries';
import { highlightToClip } from '@/lib/api/highlight-converter';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const highlightId = parseInt(id, 10);

    // 验证 ID
    if (isNaN(highlightId)) {
      return NextResponse.json(
        {
          success: false,
          error: '无效的高光 ID',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { customStartMs, customEndMs } = body;

    // 验证必需参数
    if (customStartMs === undefined || customEndMs === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必需参数: customStartMs 和 customEndMs',
        },
        { status: 400 }
      );
    }

    // 验证时间范围
    if (customStartMs < 0 || customEndMs < 0) {
      return NextResponse.json(
        {
          success: false,
          error: '时间不能为负数',
        },
        { status: 400 }
      );
    }

    if (customStartMs >= customEndMs) {
      return NextResponse.json(
        {
          success: false,
          error: '开始时间必须小于结束时间',
        },
        { status: 400 }
      );
    }

    // 更新时间范围
    const updatedHighlight = await highlightQueries.updateTimeRange(
      highlightId,
      customStartMs,
      customEndMs
    );

    if (!updatedHighlight) {
      return NextResponse.json(
        {
          success: false,
          error: '高光记录不存在',
        },
        { status: 404 }
      );
    }

    // 转换为前端格式
    const highlightClip = highlightToClip(updatedHighlight);

    console.log(`✅ 高光 #${highlightId} 时间范围已调整: ${customStartMs}ms - ${customEndMs}ms`);

    return NextResponse.json({
      success: true,
      data: {
        highlight: highlightClip,
      },
    });
  } catch (error) {
    console.error('❌ 调整高光时间范围失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
