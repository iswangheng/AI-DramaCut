/**
 * 获取项目的素材数据（关键帧 + ASR转录）
 *
 * GET /api/hangzhou-leiming/projects/[id]/media-data
 *
 * 返回项目中所有视频的关键帧和ASR转录状态
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlVideos, hlMarkings, hlKeyframes, hlAudioTranscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { queries } from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { success: false, message: "无效的项目ID" },
        { status: 400 }
      );
    }

    // 获取项目所有视频
    const videos = await db
      .select({
        id: hlVideos.id,
        filename: hlVideos.filename,
        episodeNumber: hlVideos.episodeNumber,
        displayTitle: hlVideos.displayTitle,
        durationMs: hlVideos.durationMs,
      })
      .from(hlVideos)
      .where(eq(hlVideos.projectId, projectId))
      .orderBy(hlVideos.sortOrder);

    // ========================================
    // ✅ 从数据库读取关键帧和ASR数据
    // ========================================
    const mediaData = await Promise.all(
      videos.map(async (video: any) => {
        // 从数据库读取该视频的关键帧
        const keyframesData = await queries.hlKeyframe.getByVideoId(video.id);

        // 从数据库读取该视频的ASR转录
        const asrRecord = await queries.hlAudioTranscription.getByVideoId(video.id);

        // 格式化关键帧数据（只返回前20个作为预览）
        const keyframesList = keyframesData.map((kf: any) => {
          // 将绝对路径转换为相对路径
          let framePath = kf.framePath;

          // 移除完整的系统路径前缀
          if (framePath.startsWith(process.cwd())) {
            framePath = framePath.substring(process.cwd().length);
          }

          // 移除 /public 前缀（Next.js的public目录映射到根路径）
          framePath = framePath.replace(/^\/public\//, '/');

          // 确保以 / 开头
          if (!framePath.startsWith('/')) {
            framePath = '/' + framePath;
          }

          return {
            id: kf.id,
            framePath,
            timestampMs: kf.timestampMs,
            frameNumber: kf.frameNumber,
            fileSize: kf.fileSize,
            exists: true, // 数据库中的记录都是存在的
          };
        });

        const keyframesPreview = keyframesList.slice(0, 20);

        // 格式化ASR数据
        let asrData: any = {
          hasData: false,
          textPreview: null,
          fullText: null,
          language: null,
          segments: null,
        };

        if (asrRecord) {
          // 解析segments JSON
          let segments = null;
          try {
            segments = JSON.parse(asrRecord.segments);
          } catch (error) {
            console.warn(`解析ASR segments失败:`, error);
          }

          asrData = {
            hasData: true,
            textPreview: asrRecord.text.slice(0, 200), // 前200字预览
            fullText: asrRecord.text,
            language: asrRecord.language,
            segments: segments,
          };
        }

        return {
          videoId: video.id,
          filename: video.filename,
          episodeNumber: video.episodeNumber,
          displayTitle: video.displayTitle || `视频${video.id}`,
          durationMs: video.durationMs,
          durationSeconds: Math.floor(video.durationMs / 1000),

          // 关键帧状态
          keyframes: {
            hasData: keyframesList.length > 0,
            count: keyframesList.length,
            preview: keyframesPreview,
          },

          // ASR状态
          asr: asrData,

          // 总体状态
          isReady: keyframesList.length > 0 && asrData.hasData,
        };
      })
    );

    // 统计信息
    const stats = {
      totalVideos: videos.length,
      videosWithKeyframes: mediaData.filter((v) => v.keyframes.hasData).length,
      videosWithAsr: mediaData.filter((v) => v.asr.hasData).length,
      videosReady: mediaData.filter((v) => v.isReady).length,
      totalKeyframes: mediaData.reduce((sum, v) => sum + v.keyframes.count, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        stats,
        videos: mediaData,
      },
    });
  } catch (error) {
    console.error("获取素材数据失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "获取素材数据失败",
      },
      { status: 500 }
    );
  }
}
