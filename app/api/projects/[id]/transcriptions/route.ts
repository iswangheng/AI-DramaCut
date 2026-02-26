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

    console.log(`[DEBUG] 查询项目 ${projectId} 的转录文本（使用原始 SQLite）`);

    // 获取原始 SQLite 实例
    const sqlite = dbClient.getSqlite();

    // 查询项目的所有视频
    const videos = sqlite.prepare(`
      SELECT id, filename, episode_number, display_title
      FROM videos
      WHERE project_id = ?
      ORDER BY sort_order
    `).all(projectId);

    console.log(`[DEBUG] 找到 ${videos.length} 个视频`);

    // 获取每个视频的转录文本
    const transcriptionsData = [];

    for (const video of videos as any[]) {
      const transcriptions = sqlite.prepare(`
        SELECT id, video_id, text, language, duration, segments, model, processing_time_ms
        FROM audio_transcriptions
        WHERE video_id = ?
      `).all(video.id);

      if (transcriptions.length > 0) {
        const t = transcriptions[0] as any;
        transcriptionsData.push({
          id: t.id,
          videoId: t.video_id,
          text: t.text,
          language: t.language,
          duration: t.duration,
          segments: t.segments ? JSON.parse(t.segments) : null,
          model: t.model,
          processingTimeMs: t.processing_time_ms,
          video: {
            id: video.id,
            filename: video.filename,
            episodeNumber: video.episode_number,
            displayTitle: video.display_title,
          }
        });
      }

      console.log(`[DEBUG] 视频 ${video.id} 有 ${transcriptions.length} 条转录`);
    }

    console.log(`[DEBUG] 总计 ${transcriptionsData.length} 个视频有转录`);

    return NextResponse.json({
      success: true,
      data: transcriptionsData
    });

  } catch (error) {
    console.error('========================================');
    console.error('获取转录文本失败:', error);
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);

    if (error.cause) {
      console.error('根本原因:', error.cause);
    }

    if (error.code) {
      console.error('错误代码:', error.code);
    }

    console.error('========================================');

    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取转录文本失败',
      debug: {
        type: error.constructor.name,
        code: error.code
      }
    }, { status: 500 });
  }
}
