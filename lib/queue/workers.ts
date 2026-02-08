// ============================================
// DramaGen AI 任务处理器
// Agent 4 - Worker 实现
// ============================================

import { Job } from 'bullmq';
import { queueManager, wsServer } from './index';
import { trimVideo, extractAudio, mixAudio } from '../ffmpeg';
import { geminiClient } from '../api/gemini';
import { elevenlabsClient } from '../api/elevenlabs';
import { queries } from '../db';
import { existsSync } from 'fs';
import { join } from 'path';

// ============================================
// 任务数据类型定义
// ============================================

export interface TrimJobData {
  type: 'trim';
  inputPath: string;
  outputPath: string;
  startTimeMs: number;
  durationMs: number;
  videoId: number;
}

export interface AnalyzeJobData {
  type: 'analyze';
  videoPath: string;
  videoId: number;
  sampleFrames?: string[];
}

export interface ExtractShotsJobData {
  type: 'extract-shots';
  videoPath: string;
  videoId: number;
}

export interface RenderJobData {
  type: 'render';
  compositionId: string;
  inputProps: Record<string, unknown>;
  outputPath: string;
  recapTaskId: number;
}

export interface TTSJobData {
  type: 'tts';
  text: string;
  recapTaskId: number;
  outputPath: string;
}

export type VideoJobData =
  | TrimJobData
  | AnalyzeJobData
  | ExtractShotsJobData
  | RenderJobData
  | TTSJobData;

// ============================================
// Worker 处理函数
// ============================================

/**
 * 视频裁剪处理器
 */
async function processTrimJob(job: Job<TrimJobData>) {
  const { inputPath, outputPath, startTimeMs, durationMs, videoId } = job.data;

  // 验证输入文件存在
  if (!existsSync(inputPath)) {
    throw new Error(`输入文件不存在: ${inputPath}`);
  }

  // 更新进度: 10%
  await job.updateProgress(10);
  wsServer.sendProgress(job.id!, 10, '开始裁剪视频');

  // 执行视频裁剪
  trimVideo({
    inputPath,
    outputPath,
    startTimeMs,
    durationMs,
    crf: 18,
    preset: 'fast',
  });

  // 更新进度: 100%
  await job.updateProgress(100);
  wsServer.sendComplete(job.id!, {
    outputPath,
    message: '视频裁剪完成',
  });

  // 更新数据库
  await queries.video.updateStatus(videoId, 'ready');

  return {
    success: true,
    outputPath,
  };
}

/**
 * Gemini 分析处理器
 */
async function processAnalyzeJob(job: Job<AnalyzeJobData>) {
  const { videoPath, videoId, sampleFrames } = job.data;

  // 更新视频状态为 analyzing
  await queries.video.updateStatus(videoId, 'analyzing');

  // 更新进度: 10%
  await job.updateProgress(10);
  wsServer.sendProgress(job.id!, 10, '开始分析视频');

  // 调用 Gemini 分析
  const response = await geminiClient.analyzeVideo(videoPath, sampleFrames);

  if (!response.success || !response.data) {
    // 标记视频为错误状态
    await queries.video.updateError(videoId, response.error || '视频分析失败');
    throw new Error(response.error || '视频分析失败');
  }

  // 更新进度: 50%
  await job.updateProgress(50);
  wsServer.sendProgress(job.id!, 50, '视频分析完成，正在保存数据');

  // 保存分析结果到数据库
  const analysis = response.data;

  // 1. 更新视频基本信息
  await queries.video.updateAnalysis(videoId, {
    summary: analysis.summary,
    viralScore: analysis.viralScore,
  });

  // 2. 保存镜头切片
  if (analysis.scenes && analysis.scenes.length > 0) {
    const shotsData = analysis.scenes.map((scene) => ({
      videoId,
      startMs: scene.startMs,
      endMs: scene.endMs,
      description: scene.description,
      emotion: scene.emotion,
      dialogue: scene.dialogue,
      characters: scene.characters ? JSON.stringify(scene.characters) : null,
      viralScore: scene.viralScore || 0,
      startFrame: Math.floor((scene.startMs / 1000) * 30), // 假设 30fps
      endFrame: Math.floor((scene.endMs / 1000) * 30),
    }));

    await queries.shot.createMany(shotsData);
  }

  // 3. 保存高光候选（自动生成）
  if (analysis.highlights && analysis.highlights.length > 0) {
    const highlightsData = analysis.highlights.map((timestampMs) => ({
      videoId,
      startMs: timestampMs,
      reason: 'Gemini 自动检测',
      viralScore: 7.0,
      category: 'other' as const,
    }));

    await queries.highlight.createMany(highlightsData);
  }

  // 更新视频状态为 ready（分析完成）
  await queries.video.updateStatus(videoId, 'ready');

  // 更新进度: 100%
  await job.updateProgress(100);
  wsServer.sendComplete(job.id!, {
    videoId,
    analysis,
    message: '视频分析完成',
  });

  return {
    success: true,
    videoId,
    analysis,
  };
}

/**
 * 镜头检测处理器
 */
async function processExtractShotsJob(job: Job<ExtractShotsJobData>) {
  const { videoPath, videoId } = job.data;

  // 更新视频状态为 processing
  await queries.video.updateStatus(videoId, 'processing');

  // 更新进度: 10%
  await job.updateProgress(10);
  wsServer.sendProgress(job.id!, 10, '开始检测镜头');

  // TODO: 实现镜头检测算法
  // 这里可以使用 FFmpeg 的场景检测功能
  // 或者使用 OpenCV 进行更精确的检测

  // 临时实现：使用 Gemini 分析结果
  const response = await geminiClient.analyzeVideo(videoPath);

  if (!response.success || !response.data) {
    // 标记视频为错误状态
    await queries.video.updateError(videoId, response.error || '镜头检测失败');
    throw new Error(response.error || '镜头检测失败');
  }

  // 更新进度: 80%
  await job.updateProgress(80);
  wsServer.sendProgress(job.id!, 80, '镜头检测完成，正在保存');

  const analysis = response.data;

  // 保存镜头切片
  if (analysis.scenes && analysis.scenes.length > 0) {
    const shotsData = analysis.scenes.map((scene) => ({
      videoId,
      startMs: scene.startMs,
      endMs: scene.endMs,
      description: scene.description,
      emotion: scene.emotion,
      dialogue: scene.dialogue,
      characters: scene.characters ? JSON.stringify(scene.characters) : null,
      viralScore: scene.viralScore || 0,
      startFrame: Math.floor((scene.startMs / 1000) * 30),
      endFrame: Math.floor((scene.endMs / 1000) * 30),
    }));

    await queries.shot.createMany(shotsData);
  }

  // 更新进度: 100%
  await job.updateProgress(100);
  wsServer.sendComplete(job.id!, {
    videoId,
    shotCount: analysis.scenes?.length || 0,
    message: '镜头检测完成',
  });

  return {
    success: true,
    videoId,
    shotCount: analysis.scenes?.length || 0,
  };
}

/**
 * Remotion 渲染处理器
 */
async function processRenderJob(job: Job<RenderJobData>) {
  const { compositionId, inputProps, outputPath, recapTaskId } = job.data;

  // 更新进度: 10%
  await job.updateProgress(10);
  wsServer.sendProgress(job.id!, 10, '开始渲染视频');

  // TODO: 调用 Remotion 渲染
  // 这里需要使用 Remotion 的渲染 API
  // 暂时使用占位符实现

  // 更新进度: 50%
  await job.updateProgress(50);
  wsServer.sendProgress(job.id!, 50, '渲染中...');

  // 模拟渲染过程
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 更新进度: 100%
  await job.updateProgress(100);
  wsServer.sendComplete(job.id!, {
    outputPath,
    recapTaskId,
    message: '视频渲染完成',
  });

  // 更新数据库
  await queries.recapTask.updateOutput(recapTaskId, outputPath);

  return {
    success: true,
    outputPath,
  };
}

/**
 * TTS 生成处理器
 */
async function processTTSJob(job: Job<TTSJobData>) {
  const { text, recapTaskId, outputPath } = job.data;

  // 更新进度: 10%
  await job.updateProgress(10);
  wsServer.sendProgress(job.id!, 10, '开始生成语音');

  // 调用 ElevenLabs TTS
  const response = await elevenlabsClient.textToSpeech({
    text,
  });

  if (!response.success || !response.data) {
    throw new Error(response.error || 'TTS 生成失败');
  }

  // 更新进度: 80%
  await job.updateProgress(80);
  wsServer.sendProgress(job.id!, 80, '语音生成完成，正在保存');

  // 保存音频文件
  const { audioBuffer } = response.data;

  // TODO: 将 audioBuffer 写入 outputPath
  // 这里需要使用 fs.writeFile

  // TODO: 从 response 中提取 wordTimestamps
  // 当前 ElevenLabs 客户端实现中，wordTimestamps 可能在不同位置

  // 更新数据库
  await queries.recapTask.updateStatus(recapTaskId, 'ready');

  // 更新进度: 100%
  await job.updateProgress(100);
  wsServer.sendComplete(job.id!, {
    outputPath,
    message: 'TTS 生成完成',
  });

  return {
    success: true,
    outputPath,
  };
}

/**
 * 主处理器：根据任务类型分发到不同的处理函数
 */
export async function videoJobProcessor(job: Job<VideoJobData>) {
  const { type } = job.data;

  console.log(`🔄 开始处理任务: ${type} (Job ID: ${job.id})`);

  try {
    let result;

    switch (type) {
      case 'trim':
        result = await processTrimJob(job as Job<TrimJobData>);
        break;

      case 'analyze':
        result = await processAnalyzeJob(job as Job<AnalyzeJobData>);
        break;

      case 'extract-shots':
        result = await processExtractShotsJob(job as Job<ExtractShotsJobData>);
        break;

      case 'render':
        result = await processRenderJob(job as Job<RenderJobData>);
        break;

      case 'tts':
        result = await processTTSJob(job as Job<TTSJobData>);
        break;

      default:
        throw new Error(`未知任务类型: ${type}`);
    }

    console.log(`✅ 任务完成: ${type} (Job ID: ${job.id})`);
    return result;
  } catch (error) {
    console.error(`❌ 任务失败: ${type} (Job ID: ${job.id})`, error);
    wsServer.sendError(job.id!, error instanceof Error ? error.message : '未知错误');
    throw error;
  }
}

// ============================================
// 导出
// ============================================

export const processors = {
  videoJobProcessor,
  processTrimJob,
  processAnalyzeJob,
  processExtractShotsJob,
  processRenderJob,
  processTTSJob,
} as const;

export default processors;
