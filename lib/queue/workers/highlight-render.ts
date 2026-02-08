// ============================================
// 高光切片渲染 Worker 处理器
// 处理高光切片的视频渲染任务
// ============================================

import { Job } from 'bullmq';
import { trimVideo, generateOutputFilename } from '../../video/trim';
import { highlightQueries } from '../../db/queries';
import { wsServer } from '../../ws/server';
import {
  saveCheckpoint,
  loadCheckpoint,
  clearCheckpoint,
  createCheckpointSaver,
} from '../checkpoint';
import { executeWithRetry } from '../retry-strategy';
import {
  sendErrorNotification,
  sendProgressNotification,
  sendSuccessNotification,
} from '../error-handler';
import { join } from 'path';

// ============================================
// 类型定义
// ============================================

export interface RenderHighlightJobData {
  highlightId: number;
  videoPath: string;
  outputDir?: string;
}

// ============================================
// 核心处理函数
// ============================================

/**
 * 处理高光切片渲染任务
 *
 * 工作流程：
 * 1. 检查断点（支持断点续传）
 * 2. 从数据库查询高光记录
 * 3. 计算时间范围（使用自定义值或原始值）
 * 4. 执行FFmpeg切片
 * 5. 更新数据库中的导出路径
 * 6. 发送成功通知
 */
export async function processRenderHighlightJob(
  job: Job<RenderHighlightJobData>
) {
  const { highlightId, videoPath, outputDir = 'outputs/highlights' } = job.data;
  const jobId = job.id!;

  let saver: ReturnType<typeof createCheckpointSaver> | null = null;

  try {
    console.log(`🎬 开始处理高光渲染任务 #${highlightId}`);

    // 1. 检查是否有断点可以恢复
    const checkpoint = await loadCheckpoint(jobId);
    if (checkpoint) {
      console.log(`🔄 从断点恢复: ${checkpoint.progress}%`);
      // 如果有断点，可以根据保存的状态恢复
    }

    // 2. 创建断点保存器（每5秒保存一次）
    saver = createCheckpointSaver(jobId, 5000);
    saver.start();

    // 3. 从数据库查询高光记录
    sendProgressNotification(jobId, 10, '查询高光记录...');

    const highlight = await highlightQueries.getById(highlightId);

    if (!highlight) {
      throw new Error(`高光记录不存在: ${highlightId}`);
    }

    console.log(`✅ 找到高光记录: ${highlight.reason}`);

    // 4. 计算时间范围
    const startMs = highlight.customStartMs ?? highlight.startMs;
    const endMs = highlight.customEndMs ?? highlight.endMs ?? (highlight.startMs + (highlight.durationMs || 60000));
    const durationMs = endMs - startMs;

    console.log(`⏱️  时间范围: ${startMs}ms - ${endMs}ms (${durationMs}ms)`);

    sendProgressNotification(jobId, 20, '准备渲染...');

    // 5. 生成输出文件路径
    const outputFilename = generateOutputFilename(highlight.videoId, highlightId);
    const outputPath = join(outputDir, outputFilename);

    // 6. 执行视频切片（带智能重试）
    sendProgressNotification(jobId, 30, '开始渲染...');

    const trimResult = await executeWithRetry(
      async () => {
        return await trimVideo({
          inputPath: videoPath,
          outputPath,
          startMs,
          durationMs,
          crf: 18, // 高质量
          preset: 'fast', // 平衡速度和质量
          fps: 30, // 统一帧率
          onProgress: (progress, message) => {
            // 调整进度范围：30% -> 90%
            const adjustedProgress = 30 + (progress * 0.6);
            saver?.update(adjustedProgress, { outputPath });
            sendProgressNotification(jobId, adjustedProgress, message);
          },
        });
      },
      jobId
    );

    if (!trimResult.success || !trimResult.outputPath) {
      throw new Error(trimResult.error || '渲染失败');
    }

    console.log(`✅ 渲染完成: ${trimResult.outputPath}`);

    // 7. 更新数据库中的导出路径
    sendProgressNotification(jobId, 95, '保存记录...');

    await highlightQueries.updateExportPath(highlightId, trimResult.outputPath);

    console.log(`✅ 已更新导出路径`);

    // 8. 停止断点保存器并清除断点
    saver?.stop();
    await clearCheckpoint(jobId);

    // 9. 发送成功通知
    sendSuccessNotification(jobId, '高光切片渲染完成', {
      highlightId,
      outputPath: trimResult.outputPath,
      duration: trimResult.duration,
      size: trimResult.size,
    });

    console.log(`🎉 高光渲染任务完成`);

    return {
      success: true,
      highlightId,
      outputPath: trimResult.outputPath,
      duration: trimResult.duration,
      size: trimResult.size,
    };

  } catch (error) {
    // 保存最后的断点
    await saver?.saveNow();

    // 发送错误通知
    sendErrorNotification(jobId, error as Error, {
      jobType: 'render-highlight',
      operation: 'trim',
      retryCount: job.attemptsMade,
    });

    console.error(`❌ 高光渲染任务失败:`, error);

    throw error;
  }
}

// ============================================
// 导出
// ============================================

export default processRenderHighlightJob;
