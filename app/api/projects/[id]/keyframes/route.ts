import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json({
        success: false,
        message: '无效的项目 ID'
      }, { status: 400 });
    }

    console.log(`[DEBUG] 查询项目 ${projectId} 的关键帧（使用原始 SQLite）`);

    // 获取原始 SQLite 实例
    const sqlite = dbClient.getSqlite();

    if (!sqlite) {
      return NextResponse.json({
        success: false,
        message: '数据库连接失败'
      }, { status: 500 });
    }

    // 查询项目的所有视频
    const videos = sqlite.prepare(`
      SELECT id, filename, episode_number, display_title
      FROM videos
      WHERE project_id = ?
      ORDER BY sort_order
    `).all(projectId);

    console.log(`[DEBUG] 找到 ${videos.length} 个视频`);

    if (videos.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // 获取每个视频的关键帧
    const keyframesByVideo = [];

    for (const video of videos as any[]) {
      const keyframes = sqlite.prepare(`
        SELECT id, video_id, frame_path, timestamp_ms, frame_number
        FROM keyframes
        WHERE video_id = ?
        ORDER BY timestamp_ms
      `).all(video.id);

      if (keyframes.length > 0) {
        keyframesByVideo.push({
          video: {
            id: video.id,
            filename: video.filename,
            episodeNumber: video.episode_number,
            displayTitle: video.display_title,
          },
          keyframes: keyframes.map((k: any) => ({
            id: k.id,
            videoId: k.video_id,
            // 将绝对路径转换为相对 URL 路径（从 public 目录开始）
            framePath: k.frame_path.split('/public/')[1],
            timestampMs: k.timestamp_ms,
            frameNumber: k.frame_number,
          }))
        });
      }

      console.log(`[DEBUG] 视频 ${video.id} 有 ${keyframes.length} 个关键帧`);
    }

    console.log(`[DEBUG] 总计 ${keyframesByVideo.length} 个视频有关键帧`);

    return NextResponse.json({
      success: true,
      data: keyframesByVideo
    });

  } catch (error) {
    console.error('========================================');
    console.error('获取关键帧失败:', error);

    if (error instanceof Error) {
      console.error('错误类型:', error.constructor.name);
      console.error('错误消息:', error.message);
      console.error('错误堆栈:', error.stack);
    } else {
      console.error('未知错误:', String(error));
    }

    if (error instanceof Error && 'cause' in error) {
      console.error('根本原因:', (error as any).cause);
    }

    // 尝试获取更多 Drizzle 错误信息
    if (error instanceof Error && 'code' in error) {
      console.error('错误代码:', (error as any).code);
    }

    console.error('========================================');

    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取关键帧失败',
      debug: error instanceof Error ? {
        type: error.constructor.name,
        code: (error as any).code,
        query: (error as any).query
      } : undefined
    }, { status: 500 });
  }
}
