import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db/client';

/**
 * 测试 API：使用原始 SQLite 查询关键帧
 * 路由：/api/test-keyframes-raw?projectId=2
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: '缺少 projectId 参数'
      }, { status: 400 });
    }

    console.log(`[测试] 查询项目 ${projectId} 的关键帧（使用原始 SQLite）`);

    // 获取原始 SQLite 实例
    const sqlite = dbClient.getSqlite();

    if (!sqlite) {
      return NextResponse.json({
        success: false,
        error: '数据库连接失败'
      }, { status: 500 });
    }

    // 使用原始 SQL 查询
    const videos = sqlite.prepare(`
      SELECT id, filename, episode_number, display_title
      FROM videos
      WHERE project_id = ?
    `).all(projectId);

    console.log(`[测试] 找到 ${videos.length} 个视频`);

    const result = [];

    for (const video of videos as any[]) {
      const keyframes = sqlite.prepare(`
        SELECT id, video_id, frame_path, timestamp_ms, frame_number
        FROM keyframes
        WHERE video_id = ?
        ORDER BY timestamp_ms
      `).all(video.id);

      if (keyframes.length > 0) {
        result.push({
          video: {
            id: video.id,
            filename: video.filename,
            episodeNumber: video.episode_number,
            displayTitle: video.display_title,
          },
          keyframes: keyframes.map((k: any) => ({
            id: k.id,
            videoId: k.video_id,
            framePath: k.frame_path,
            timestampMs: k.timestamp_ms,
            frameNumber: k.frame_number,
          }))
        });
      }

      console.log(`[测试] 视频 ${video.id} 有 ${keyframes.length} 个关键帧`);
    }

    console.log(`[测试] 查询成功，总计 ${result.length} 个视频有关键帧`);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[测试] 错误:', error);

    if (error instanceof Error) {
      console.error('[测试] 错误类型:', error.constructor.name);
      console.error('[测试] 错误堆栈:', error.stack);
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      debug: error instanceof Error ? {
        type: error.constructor.name,
        code: (error as any).code
      } : undefined
    }, { status: 500 });
  }
}
