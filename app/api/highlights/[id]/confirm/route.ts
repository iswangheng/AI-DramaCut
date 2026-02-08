/**
 * POST /api/highlights/[id]/confirm
 *
 * 确认高光切片（用户确认后可进行渲染导出）
 *
 * 请求体：
 * {
 *   "customStartMs": number,    (可选) 自定义开始时间（毫秒）
 *   "customEndMs": number       (可选) 自定义结束时间（毫秒）
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "highlight": HighlightClip,
 *     "readyForRender": boolean
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { highlightQueries } from '@/lib/db/queries';
import { highlightToClip } from '@/lib/api/highlight-converter';

export async function POST(
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

    // 验证时间参数（如果提供）
    if (customStartMs !== undefined && customEndMs !== undefined) {
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
    }

    // 确认高光
    const confirmedHighlight = await highlightQueries.confirm(
      highlightId,
      customStartMs,
      customEndMs
    );

    if (!confirmedHighlight) {
      return NextResponse.json(
        {
          success: false,
          error: '高光记录不存在',
        },
        { status: 404 }
      );
    }

    // 转换为前端格式
    const highlightClip = highlightToClip(confirmedHighlight);

    console.log(`✅ 高光 #${highlightId} 已确认`);

    return NextResponse.json({
      success: true,
      data: {
        highlight: highlightClip,
        readyForRender: true,
      },
    });
  } catch (error) {
    console.error('❌ 确认高光失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
