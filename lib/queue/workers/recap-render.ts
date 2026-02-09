// ============================================
// 深度解说渲染 Worker 处理器
// 处理深度解说视频的渲染任务
// ============================================

import { Job } from 'bullmq';
import { renderMultiClipComposition } from '../../remotion/renderer';
import { matchScenes } from '../../semantic';
import { db } from '../../db/client';
import { recapTasks, recapSegments, storylines, videos, shots } from '../../db/schema';
import { eq, asc } from 'drizzle-orm';
import { wsServer } from '../../ws/server';
import { join } from 'path';
import { mkdir } from 'fs/promises';

// ============================================
// 类型定义
// ============================================

export interface RecapRenderJobData {
  taskId: number;
}

// ============================================
// 核心处理函数
// ============================================

/**
 * 处理深度解说渲染任务
 *
 * 工作流程：
 * 1. 获取任务信息和文案段落
 * 2. 为每个段落匹配画面
 * 3. 组合视频片段数据
 * 4. 使用 Remotion 渲染带字幕的视频
 * 5. 更新数据库记录
 * 6. 发送成功通知
 */
export async function processRecapRenderJob(
  job: Job<RecapRenderJobData>
) {
  const { taskId } = job.data;
  const jobId = job.id!;

  try {
    console.log(`🎬 开始处理深度解说渲染任务 #${taskId}`);

    // 1. 发送开始通知
    wsServer.broadcast(jobId, {
      type: 'progress',
      data: {
        jobId,
        progress: 0,
        message: '准备渲染深度解说视频...',
      },
    });

    // 2. 获取任务信息
    const task = await db.query.recapTasks.findFirst({
      where: eq(recapTasks.id, taskId),
    });

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    // 3. 检查是否已渲染
    if (task.outputPath && task.status === 'completed') {
      console.log(`✅ 视频已渲染: ${task.outputPath}`);
      return {
        success: true,
        outputPath: task.outputPath,
        cached: true,
      };
    }

    // 4. 获取文案段落
    wsServer.broadcast(jobId, {
      type: 'progress',
      data: {
        jobId,
        progress: 5,
        message: '加载文案段落...',
      },
    });

    const segments = await db
      .select()
      .from(recapSegments)
      .where(eq(recapSegments.taskId, taskId))
      .orderBy(asc(recapSegments.order));

    if (segments.length === 0) {
      throw new Error('未找到文案段落');
    }

    console.log(`✅ 找到 ${segments.length} 个文案段落`);

    // 5. 获取视频信息
    const storyline = await db.query.storylines.findFirst({
      where: eq(storylines.id, task.storylineId),
    });

    if (!storyline) {
      throw new Error('故事线不存在');
    }

    const video = await db.query.videos.findFirst({
      where: eq(videos.id, storyline.videoId),
    });

    if (!video) {
      throw new Error('视频不存在');
    }

    // 6. 为每个文案段落匹配画面
    wsServer.broadcast(jobId, {
      type: 'progress',
      data: {
        jobId,
        progress: 10,
        message: '匹配画面...',
      },
    });

    const usedShotIds: number[] = [];
    const clips = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const matchProgress = 10 + (i / segments.length) * 20;

      console.log(`📝 处理段落 ${i + 1}/${segments.length}: ${segment.text.substring(0, 20)}...`);

      wsServer.broadcast(jobId, {
        type: 'progress',
        data: {
          jobId,
          progress: matchProgress,
          message: `匹配段落 ${i + 1}/${segments.length} 的画面...`,
        },
      });

      // 调用画面匹配算法
      const matchResult = await matchScenes({
        narrationText: segment.text,
        videoId: video.id,
        excludedShotIds: usedShotIds,
        config: {
          topK: 3,
          minSimilarity: 0.6,
          enableContinuity: true,
        },
      });

      // 选择最佳匹配的镜头
      const bestMatch = matchResult.matches[0];
      if (!bestMatch) {
        console.warn(`⚠️  段落 ${i + 1} 未找到匹配的画面，使用默认镜头`);
        // 使用第一个镜头作为回退
        const firstShot = await db.query.shots.findFirst({
          where: eq(shots.videoId, video.id),
        });
        if (!firstShot) {
          throw new Error('视频没有可用的镜头');
        }
        usedShotIds.push(firstShot.id);
      } else {
        usedShotIds.push(bestMatch.shotId);
      }

      const shotId = bestMatch?.shotId || usedShotIds[usedShotIds.length - 1];

      // 获取镜头详细信息
      const shot = await db.query.shots.findFirst({
        where: eq(shots.id, shotId),
      });

      if (!shot) {
        throw new Error(`镜头 ${shotId} 不存在`);
      }

      console.log(`✅ 段落 ${i + 1} 匹配镜头: ${shot.semanticLabel || '无标签'} (相似度: ${bestMatch?.similarity.toFixed(2) || 'N/A'})`);

      // 构建字幕数据
      const wordTimings = JSON.parse(segment.wordTimestamps || '[]');
      const subtitles = [
        {
          startMs: 0,
          endMs: segment.durationMs,
          text: segment.text,
          words: wordTimings.map((word: any) => ({
            text: word.text,
            startMs: word.startMs,
            endMs: word.endMs,
          })),
        },
      ];

      // 返回片段数据
      clips.push({
        src: video.filePath,
        startMs: shot.startMs,
        durationMs: segment.durationMs,
        subtitles,
      });
    }

    console.log(`✅ 所有段落匹配完成，共 ${clips.length} 个片段`);

    // 7. 准备输出路径
    wsServer.broadcast(jobId, {
      type: 'progress',
      data: {
        jobId,
        progress: 35,
        message: '准备输出目录...',
      },
    });

    const outputDir = join(process.cwd(), 'public', 'outputs', 'recap');
    await mkdir(outputDir, { recursive: true });

    const timestamp = Date.now();
    const outputPath = join(outputDir, `recap_${taskId}_${timestamp}.mp4`);

    // 8. 调用 Remotion 渲染
    console.log(`🎬 开始 Remotion 渲染...`);
    console.log(`   片段数量: ${clips.length}`);
    console.log(`   输出路径: ${outputPath}`);

    wsServer.broadcast(jobId, {
      type: 'progress',
      data: {
        jobId,
        progress: 40,
        message: '开始渲染视频...',
      },
    });

    const renderResult = await renderMultiClipComposition({
      clips,
      outputPath,
      transition: 'fade',
      transitionDurationMs: 500,
      width: 1080,
      height: 1920,
      fps: 30,
      fontSize: 60,
      fontColor: 'white',
      highlightColor: '#FFE600',
      outlineColor: 'black',
      outlineSize: 5,
      subtitleY: 80,
      watermarkUrl: null,
      onProgress: (progress, renderedFrames, totalFrames, renderedDuration) => {
        // 调整进度范围：40% -> 95%
        const adjustedProgress = 40 + (progress * 0.55);
        wsServer.broadcast(jobId, {
          type: 'progress',
          data: {
            jobId,
            progress: adjustedProgress,
            message: `渲染中... (${renderedFrames}/${totalFrames} 帧)`,
          },
        });
        console.log(`   渲染进度: ${progress.toFixed(1)}% (${renderedFrames}/${totalFrames} 帧)`);
      },
    });

    console.log(`✅ 渲染完成: ${renderResult.outputPath}`);
    console.log(`   时长: ${renderResult.duration} 秒`);
    console.log(`   大小: ${(renderResult.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   耗时: ${(renderResult.renderTime / 1000).toFixed(2)} 秒`);

    // 9. 更新任务状态
    wsServer.broadcast(jobId, {
      type: 'progress',
      data: {
        jobId,
        progress: 95,
        message: '保存记录...',
      },
    });

    const publicOutputPath = `/outputs/recap/recap_${taskId}_${timestamp}.mp4`;

    await db
      .update(recapTasks)
      .set({
        outputPath: publicOutputPath,
        status: 'completed',
      })
      .where(eq(recapTasks.id, taskId));

    console.log(`✅ 已更新任务状态`);

    // 10. 发送成功通知
    wsServer.broadcast(jobId, {
      type: 'progress',
      data: {
        jobId,
        progress: 100,
        message: '渲染完成！',
      },
    });

    wsServer.broadcast(jobId, {
      type: 'complete',
      data: {
        jobId,
        taskId,
        outputPath: publicOutputPath,
        duration: renderResult.duration,
        size: renderResult.size,
      },
    });

    console.log(`🎉 深度解说渲染任务完成`);

    return {
      success: true,
      taskId,
      outputPath: publicOutputPath,
      duration: renderResult.duration,
      size: renderResult.size,
      renderTime: renderResult.renderTime,
    };

  } catch (error) {
    // 发送错误通知
    wsServer.broadcast(jobId, {
      type: 'error',
      data: {
        jobId,
        taskId,
        error: error instanceof Error ? error.message : '渲染失败',
      },
    });

    // 更新任务状态为失败
    try {
      await db
        .update(recapTasks)
        .set({
          status: 'failed',
        })
        .where(eq(recapTasks.id, taskId));
    } catch (dbError) {
      console.error('❌ 更新任务状态失败:', dbError);
    }

    console.error(`❌ 深度解说渲染任务失败:`, error);

    throw error;
  }
}

// ============================================
// 导出
// ============================================

export default processRecapRenderJob;
