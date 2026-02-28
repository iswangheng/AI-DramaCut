import { NextRequest, NextResponse } from 'next/server';
import { db } from './lib/db/client';
import { schema } from './lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    // 直接使用原始 SQL 查询
    const result = await db.run(`
      SELECT 
        k.id, k.video_id, k.frame_path, k.timestamp_ms, k.frame_number,
        v.id as v_id, v.filename, v.episode_number, v.display_title
      FROM keyframes k
      INNER JOIN videos v ON k.video_id = v.id
      WHERE v.project_id = 2
      ORDER BY k.timestamp_ms
      LIMIT 10
    `);

    console.log('查询结果:', result);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
