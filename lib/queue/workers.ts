// ============================================
// DramaCut AI 任务处理器
// Agent 4 - Worker 实现
// ============================================

import { Job } from 'bullmq';
// 直接从 bullmq.ts 导入，避免循环依赖
import { queueManager } from './bullmq';
import { wsServer } from '../ws/server';
import { trimVideo, extractAudio, mixAudio } from '../ffmpeg';
import { geminiClient } from '../api/gemini';
import { elevenlabsClient } from '../api/elevenlabs';
import { queries } from '../db';
import { existsSync } from 'fs';
import { join } from 'path';
import { transcribeAudio } from '../audio/transcriber';
import { extractKeyframes as extractVideoKeyframes } from '../video/keyframes';
import { eq } from 'drizzle-orm';  // ✅ 添加 eq 导入

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

export interface ExtractStorylinesJobData {
  type: 'extract-storylines';
  videoPath: string;
  videoId: number;
}

export interface DetectHighlightsJobData {
  type: 'detect-highlights';
  videoPath: string;
  videoId: number;
}

export interface AnalyzeProjectStorylinesJobData {
  type: 'analyze-project-storylines';
  projectId: number;
  videoIds: number[];
  totalVideos: number;
}

export type VideoJobData =
  | TrimJobData
  | AnalyzeJobData
  | ExtractShotsJobData
  | RenderJobData
  | TTSJobData
  | ExtractStorylinesJobData
  | DetectHighlightsJobData
  | AnalyzeProjectStorylinesJobData;

// 深度解说渲染任务类型（单独定义，避免导入 Remotion）
export interface RecapRenderJobData {
  type: 'recap-render';
  taskId: number;
}

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
 * Gemini 分析处理器（完整实现 - 画面 + 音频）
 */
async function processAnalyzeJob(job: Job<AnalyzeJobData>) {
  const { videoPath, videoId, sampleFrames } = job.data;

  // 更新视频状态为 analyzing
  await queries.video.updateStatus(videoId, 'analyzing');

  // 更新进度: 10%
  await job.updateProgress(10);
  wsServer.sendProgress(job.id!, 10, '开始分析视频');

  let response: any;

  // ============================================
  // 决策：根据视频大小选择分析策略
  // ============================================

  // 获取视频元数据
  const { getMetadata } = await import('../video/metadata');
  const videoMetadata = await getMetadata(videoPath);
  const fileSizeMB = videoMetadata.size / (1024 * 1024); // 转换为 MB
  const durationMinutes = videoMetadata.duration / 60;

  console.log(`📹 视频信息: ${Math.floor(durationMinutes)}分${Math.floor(videoMetadata.duration % 60)}秒, ${fileSizeMB.toFixed(2)}MB`);

  // 策略选择：
  // 1. 小视频（<50MB 或 <3分钟）→ 直接上传（Gemini 可以同时分析音频）
  // 2. 大视频（≥50MB 或 ≥3分钟）→ 关键帧采样 + 音频提取
  const shouldUploadDirectly = fileSizeMB < 50 || durationMinutes < 3;

  if (shouldUploadDirectly) {
    // ============================================
    // 策略 A：直接上传完整视频（推荐）
    // Gemini 2.5 可以同时分析画面和音频
    // ============================================
    console.log('🎬 策略 A：直接上传完整视频（画面 + 音频同时分析）');

    wsServer.sendProgress(job.id!, 20, '直接上传视频到 AI...');

    response = await geminiClient.analyzeVideo(videoPath, undefined, (progress, message) => {
      const adjustedProgress = 20 + (progress * 0.7);
      job.updateProgress(adjustedProgress);
      wsServer.sendProgress(job.id!, adjustedProgress, message);
    });

  } else {
    // ============================================
    // 策略 B：关键帧采样 + 音频提取
    // 适用于大视频或需要快速分析的场景
    // ============================================
    console.log('🎬 策略 B：关键帧采样 + 音频分析');

    try {
      // 步骤 1: 采样关键帧
      console.log('📸 步骤 1/2: 采样关键帧...');
      await job.updateProgress(20);
      wsServer.sendProgress(job.id!, 20, '采样关键帧...');

      // 计算采样帧数（每秒 15 帧，根据视频长度调整）
      let framesPerSecond = 15;
      if (videoMetadata.duration > 600) {
        framesPerSecond = 5;
      } else if (videoMetadata.duration > 180) {
        framesPerSecond = 10;
      }

      const durationSeconds = Math.ceil(videoMetadata.duration);
      const calculatedFrameCount = durationSeconds * framesPerSecond;
      const frameCount = Math.max(Math.min(calculatedFrameCount, 5000), 30);

      console.log(`📹 视频时长: ${durationSeconds}秒 (${Math.floor(durationSeconds / 60)}分${durationSeconds % 60}秒)`);
      console.log(`📸 采样策略: 每秒 ${framesPerSecond} 帧，总共 ${frameCount} 帧`);

      const { sampleKeyFrames } = await import('../video/sampling');
      const { join } = await import('path');
      const { mkdirSync } = await import('fs');

      const framesDir = join(process.cwd(), 'uploads', `video_${videoId}_frames`);
      mkdirSync(framesDir, { recursive: true });

      const samplingResult = await sampleKeyFrames({
        videoPath,
        outputDir: framesDir,
        frameCount,
        strategy: 'uniform',
        quality: 5,
        proxyWidth: 640,
      });

      console.log(`✅ 采样完成，共 ${samplingResult.totalFrames} 帧`);

      // 步骤 2: 提取音频并使用 Whisper ASR 转录
      let transcriptionResult: any = null;
      let hasAudio = true;

      try {
        console.log('🎵 步骤 2/2: 提取音频并转录...');
        await job.updateProgress(50);
        wsServer.sendProgress(job.id!, 50, '提取音频...');

        const { extractAudio } = await import('../ffmpeg');
        const audioPath = join(process.cwd(), 'uploads', `video_${videoId}_audio.wav`);

        // 提取音频（WAV 格式，适合 Whisper）
        await extractAudio({
          inputPath: videoPath,
          outputPath: audioPath,
          sampleRate: 16000, // 16kHz 适合语音识别
        });

        console.log('✅ 音频提取完成');

        // 使用 Whisper ASR 转录音频
        wsServer.sendProgress(job.id!, 55, '正在转录音频（Whisper ASR）...');
        console.log('🎵 调用 Whisper ASR 转录音频...');

        const startTime = Date.now();
        transcriptionResult = await transcribeAudio(audioPath, {
          model: 'small',  // 使用 small 模型（平衡速度和准确度）
          language: 'zh',  // 中文
        });
        const processingTime = Date.now() - startTime;

        console.log(`✅ 音频转录完成 (${(processingTime / 1000).toFixed(1)}秒)`);
        console.log(`  📝 转录文本长度: ${transcriptionResult.text.length} 字`);
        console.log(`  🎬 片段数: ${transcriptionResult.segments.length} 个`);

        // 保存转录结果到数据库
        await queries.audioTranscription.create({
          videoId,
          text: transcriptionResult.text,
          language: transcriptionResult.language,
          duration: transcriptionResult.duration,
          segments: JSON.stringify(transcriptionResult.segments),
          model: 'whisper-small',
          processingTimeMs: processingTime,
        });

        console.log('💾 转录结果已保存到数据库');

        // ✅ 立即清理临时音频文件，释放磁盘空间
        try {
          const { unlink } = await import('fs/promises');
          await unlink(audioPath);
          console.log(`🗑️  已清理临时音频文件: ${audioPath}`);
        } catch (cleanupError) {
          console.warn(`⚠️  清理音频文件失败: ${audioPath}`, cleanupError);
        }

      } catch (audioError) {
        console.warn('⚠️  音频提取或转录失败:', audioError);

        // ❌ 即使转录失败，也尝试清理临时文件
        try {
          const { unlink } = await import('fs/promises');
          const audioPath = join(process.cwd(), 'uploads', `video_${videoId}_audio.wav`);
          await unlink(audioPath);
          console.log(`🗑️  已清理失败的临时音频文件: ${audioPath}`);
        } catch {}

        hasAudio = false;
        transcriptionResult = null;
      }

      // 步骤 3: 使用关键帧 + 转录文本进行分析
      wsServer.sendProgress(job.id!, 60, '音频转录完成，开始画面分析...');

      // 构建转录信息（如果有）
      let transcriptionInfo = '';
      if (transcriptionResult && transcriptionResult.text) {
        transcriptionInfo = `
【音频转录信息（Whisper ASR）】
完整文本：
${transcriptionResult.text}

关键片段：
${transcriptionResult.segments.slice(0, 10).map((seg: any) =>
  `[${seg.start.toFixed(1)}s-${seg.end.toFixed(1)}s] ${seg.text}`
).join('\n')}
`;
      }

      response = await geminiClient.analyzeVideo(
        videoPath,
        [], // 不传递采样帧（会在内部重新采样）
        (progress, message) => {
          const adjustedProgress = 60 + (progress * 0.3);
          job.updateProgress(adjustedProgress);
          wsServer.sendProgress(job.id!, adjustedProgress, message);
        },
        transcriptionInfo  // 传递转录文本信息
      );

    } catch (samplingError) {
      console.warn('⚠️  关键帧采样失败，尝试直接上传视频:', samplingError);
      wsServer.sendProgress(job.id!, 70, '采样失败，尝试直接上传视频...');

      // 降级：直接上传视频
      response = await geminiClient.analyzeVideo(videoPath, undefined, (progress, message) => {
        const adjustedProgress = 70 + (progress * 0.25);
        job.updateProgress(adjustedProgress);
        wsServer.sendProgress(job.id!, adjustedProgress, message);
      });
    }
  }

  // 等待响应
  const awaitedResponse = await response;

  if (!awaitedResponse.success || !awaitedResponse.data) {
    // 标记视频为错误状态
    await queries.video.updateError(videoId, awaitedResponse.error || '视频分析失败');
    throw new Error(awaitedResponse.error || '视频分析失败');
  }

  // 更新进度: 90%
  await job.updateProgress(90);
  wsServer.sendProgress(job.id!, 90, '视频分析完成，正在保存数据');

  // 保存分析结果到数据库
  const analysis = awaitedResponse.data;

  // ============================================
  // ✅ 使用细粒度事务保护核心数据
  // 核心数据：视频基本信息 + 镜头切片（必须一致）
  // ============================================
  const { dbClient } = await import('../db/client');
  const { db } = await import('../db/client');

  await dbClient.transaction(async (tx) => {
    // 1. 更新视频基本信息（核心）
    await tx.update(db.videos)
      .set({
        summary: analysis.summary,
        viralScore: analysis.viralScore,
        status: 'ready',  // ✅ 状态更新也在事务中
        updatedAt: new Date(),
      })
      .where(eq(db.videos.id, videoId));

    // 2. 保存镜头切片（核心）
    if (analysis.scenes && analysis.scenes.length > 0) {
      const shotsData = analysis.scenes.map((scene: any) => {
        // 构建增强的描述（包含音频信息）
        let enhancedDescription = scene.description;

        if (scene.audioInfo) {
          const audioParts: string[] = [];

          // 添加对白信息
          if (scene.audioInfo.hasDialogue && scene.dialogue) {
            audioParts.push(`对白: "${scene.dialogue}"`);
          }

          // 添加配乐信息
          if (scene.audioInfo.bgmStyle) {
            audioParts.push(`配乐: ${scene.audioInfo.bgmStyle}`);
          }

          // 添加音效信息
          if (scene.audioInfo.soundEffects && scene.audioInfo.soundEffects.length > 0) {
            audioParts.push(`音效: ${scene.audioInfo.soundEffects.join(', ')}`);
          }

          // 合并到描述中
          if (audioParts.length > 0) {
            enhancedDescription += `\n【音频信息】${audioParts.join(' | ')}`;
          }
        }

        return {
          videoId,
          startMs: scene.startMs,
          endMs: scene.endMs,
          description: enhancedDescription,
          emotion: scene.emotion,
          dialogue: scene.dialogue || '',
          characters: scene.characters ? JSON.stringify(scene.characters) : null,
          viralScore: scene.viralScore || 0,
          startFrame: Math.floor((scene.startMs / 1000) * 30), // 假设 30fps
          endFrame: Math.floor((scene.endMs / 1000) * 30),
        };
      });

      await tx.insert(db.shots).values(shotsData);
      console.log(`💾 在事务中保存了 ${shotsData.length} 个镜头切片`);
    }

    // ✅ 事务提交：视频状态和镜头数据要么全部成功，要么全部回滚
  });

  console.log('✅ 核心数据事务提交成功');

  // ============================================
  // 分层容错：可选数据单独保存（失败不影响主流程）
  // ============================================

  // 可选数据 1：关键帧（提取失败不影响主流程）
  try {
    if (analysis.scenes && analysis.scenes.length > 0) {
      console.log('📸 尝试保存关键帧...');
      // 关键帧保存逻辑（如果有的话）
      // await queries.keyframe.createBatch(...);
    }
  } catch (keyframeError) {
    console.warn('⚠️ 关键帧保存失败，但不影响主分析', keyframeError);
  }

  // 注意：高光片段由专门的 detect-highlights 任务负责处理
  // 这里不再创建占位符数据，避免数据不一致

  // 更新进度: 100%
  await job.updateProgress(100);
  wsServer.sendComplete(job.id!, {
    videoId,
    analysis,
    message: '视频分析完成',
  });

  console.log(`✅ 视频 ${videoId} 分析完成`);

  return {
    success: true,
    videoId,
    analysis,
  };
}

/**
 * 镜头检测处理器（完整实现）
 */
async function processExtractShotsJob(job: Job<ExtractShotsJobData>) {
  const { videoPath, videoId } = job.data;

  // 更新视频状态为 processing
  await queries.video.updateStatus(videoId, 'processing');

  // 更新进度: 10%
  await job.updateProgress(10);
  wsServer.sendProgress(job.id!, 10, '开始检测镜头');

  try {
    // 方案 1: 使用 FFmpeg 场景检测
    const { detectShots } = await import('../video/shot-detection');

    // 更新进度: 30%
    await job.updateProgress(30);
    wsServer.sendProgress(job.id!, 30, 'FFmpeg 场景检测中...');

    const shots = await detectShots(videoPath, {
      minShotDuration: 2000,  // 最小镜头时长 2 秒
      threshold: 0.3,         // 场景切换阈值
      generateThumbnails: false, // 不生成缩略图（节省空间）
    });

    console.log(`🎬 检测到 ${shots.length} 个镜头`);

    // 更新进度: 70%
    await job.updateProgress(70);
    wsServer.sendProgress(job.id!, 70, `检测到 ${shots.length} 个镜头，保存中...`);

    // 保存镜头到数据库
    const shotsData = shots.map((shot) => ({
      videoId,
      startMs: shot.startMs,
      endMs: shot.endMs,
      description: `镜头 ${shot.startMs / 1000}-${shot.endMs / 1000}秒`,
      emotion: 'neutral',
      viralScore: 5.0,
      startFrame: Math.floor((shot.startMs / 1000) * 30),
      endFrame: Math.floor((shot.endMs / 1000) * 30),
    }));

    await queries.shot.createMany(shotsData);
    console.log(`💾 保存了 ${shotsData.length} 个镜头`);

    // 更新进度: 100%
    await job.updateProgress(100);
    wsServer.sendComplete(job.id!, {
      videoId,
      shotCount: shots.length,
      message: '镜头检测完成',
    });

    return {
      success: true,
      videoId,
      shotCount: shots.length,
    };

  } catch (error) {
    console.error('❌ FFmpeg 镜头检测失败:', error);

    // 降级方案：使用 Gemini 分析结果
    wsServer.sendProgress(job.id!, 40, 'FFmpeg 检测失败，使用 AI 分析...');

    const response = await geminiClient.analyzeVideo(videoPath, undefined, (progress, message) => {
      const adjustedProgress = 40 + (progress * 0.5);
      job.updateProgress(adjustedProgress);
      wsServer.sendProgress(job.id!, adjustedProgress, message);
    });

    if (!response.success || !response.data) {
      await queries.video.updateError(videoId, response.error || '镜头检测失败');
      throw new Error(response.error || '镜头检测失败');
    }

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

    await job.updateProgress(100);
    wsServer.sendComplete(job.id!, {
      videoId,
      shotCount: analysis.scenes?.length || 0,
      message: '镜头检测完成（AI 分析）',
    });

    return {
      success: true,
      videoId,
      shotCount: analysis.scenes?.length || 0,
    };
  }
}

/**
 * 故事线提取处理器
 */
async function processExtractStorylinesJob(job: Job<ExtractStorylinesJobData>) {
  const { videoPath, videoId } = job.data;

  // 更新进度: 10%
  await job.updateProgress(10);
  wsServer.sendProgress(job.id!, 10, '开始提取故事线');

  // 调用 Gemini 提取故事线
  const response = await geminiClient.extractStorylines(videoPath, 10);

  if (!response.success || !response.data) {
    throw new Error(response.error || '故事线提取失败');
  }

  // 更新进度: 70%
  await job.updateProgress(70);
  wsServer.sendProgress(job.id!, 70, '故事线提取完成，保存中...');

  const storylines = response.data;

  // TODO: 此 worker 使用旧的 storylines schema（videoId + shotIds）
  // 新的 schema 中 storylines 属于项目层级（projectId）
  // 此 worker 可能已经过时，被项目级分析（analyze-project-storylines）替代

  // 为了兼容性，使用 video 的 projectId
  const video = await queries.video.getById(videoId);

  if (!video) {
    throw new Error(`视频 ${videoId} 不存在`);
  }

  // 保存故事线到数据库（使用新的 schema）
  const storylinesData = storylines.map((storyline: any) => ({
    projectId: video.projectId,  // 使用 projectId 而不是 videoId
    name: storyline.name,
    description: storyline.description,
    attractionScore: storyline.attractionScore,
    episodeCount: 1,  // 单视频分析，默认 1 集
    totalDurationMs: video.durationMs,  // 使用视频时长
    category: storyline.category || 'other',
  }));

  await queries.storyline.createMany(storylinesData);
  console.log(`💾 保存了 ${storylinesData.length} 条故事线`);

  // 更新进度: 100%
  await job.updateProgress(100);
  wsServer.sendComplete(job.id!, {
    videoId,
    storylineCount: storylines.length,
    message: '故事线提取完成',
  });

  return {
    success: true,
    videoId,
    storylineCount: storylines.length,
  };
}

/**
 * 高光检测处理器
 */
async function processDetectHighlightsJob(job: Job<DetectHighlightsJobData>) {
  const { videoPath, videoId } = job.data;

  console.log(`🎬 [高光检测] 开始处理视频: ${videoPath}, ID: ${videoId}`);

  // 更新进度: 10%
  await job.updateProgress(10);
  wsServer.sendProgress(job.id!, 10, '开始检测高光时刻');

  // 首先分析视频
  console.log(`📹 [高光检测] 步骤 1/2: 分析视频...`);
  const analysisResponse = await geminiClient.analyzeVideo(videoPath, undefined, (progress, message) => {
    const adjustedProgress = 10 + (progress * 0.4);
    job.updateProgress(adjustedProgress);
    wsServer.sendProgress(job.id!, adjustedProgress, message);
    console.log(`📊 [高光检测] 视频分析进度: ${Math.round(adjustedProgress)}% - ${message}`);
  });

  if (!analysisResponse.success || !analysisResponse.data) {
    const errorMsg = analysisResponse.error || '视频分析失败';
    console.error(`❌ [高光检测] 视频分析失败: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const analysis = analysisResponse.data;
  console.log(`✅ [高光检测] 视频分析完成，场景数: ${analysis.scenes?.length || 0}`);

  // 更新进度: 50%
  await job.updateProgress(50);
  wsServer.sendProgress(job.id!, 50, '视频分析完成，检测高光时刻...');

  // 检测高光时刻（上传视频文件，让 Gemini 能看到实际画面）
  console.log(`✨ [高光检测] 步骤 2/2: 检测高光时刻...`);
  console.log(`📹 [高光检测] 上传视频文件用于高光检测（避免编造内容）`);
  const highlightsResponse = await geminiClient.findHighlights(videoPath, analysis, 100);

  if (!highlightsResponse.success || !highlightsResponse.data) {
    const errorMsg = highlightsResponse.error || '高光检测失败';
    console.error(`❌ [高光检测] 高光检测失败: ${errorMsg}`);
    console.error(`📄 [高光检测] 原始响应:`, JSON.stringify(highlightsResponse, null, 2));
    throw new Error(errorMsg);
  }

  const highlights = highlightsResponse.data;
  console.log(`✅ [高光检测] 检测到 ${highlights.length} 个高光时刻`);

  // 更新进度: 80%
  await job.updateProgress(80);
  wsServer.sendProgress(job.id!, 80, `检测到 ${highlights.length} 个高光时刻，保存中...`);

  // 保存高光到数据库
  const highlightsData = highlights.map((highlight: any) => {
    const timestampMs = highlight.timestampMs || 0;
    return {
      videoId,
      startMs: timestampMs,
      endMs: timestampMs + ((highlight.suggestedDuration || 60) * 1000),
      reason: highlight.reason || highlight.description || '高光时刻',
      viralScore: highlight.viralScore || 7.0,
      category: highlight.category || 'other' as const,
    };
  });

  console.log(`💾 [高光检测] 准备保存 ${highlightsData.length} 个高光时刻到数据库...`);
  await queries.highlight.createMany(highlightsData);
  console.log(`✅ [高光检测] 成功保存 ${highlightsData.length} 个高光时刻`);

  // 更新进度: 100%
  await job.updateProgress(100);
  wsServer.sendComplete(job.id!, {
    videoId,
    highlightCount: highlights.length,
    message: '高光检测完成',
  });

  console.log(`🎉 [高光检测] 任务完成: ${videoId}, 高光数: ${highlights.length}`);

  return {
    success: true,
    videoId,
    highlightCount: highlights.length,
  };
}

/**
 * 项目级故事线分析处理器（异步任务）
 */
async function processAnalyzeProjectStorylinesJob(job: Job<AnalyzeProjectStorylinesJobData>) {
  const { projectId, videoIds, totalVideos } = job.data;

  console.log(`🎬 [项目分析] 开始分析项目 ${projectId}，共 ${totalVideos} 集视频`);

  // 导入数据库和 Gemini 客户端
  const { db } = await import('../db/client');
  const { eq, asc, desc } = await import('drizzle-orm');
  const schema = await import('../db/schema');
  const { GeminiClient } = await import('../api/gemini');
  const { join } = await import('path');
  const { extractKeyframes } = await import('../video/keyframes');

  const geminiClient = new GeminiClient();

  // 获取项目的所有视频（按集数排序）
  const videos = await db
    .select()
    .from(schema.videos)
    .where(eq(schema.videos.projectId, projectId))
    .orderBy(asc(schema.videos.sortOrder));

  if (videos.length === 0) {
    throw new Error('该项目没有视频');
  }

  // ============================================
  // 第一部分：逐个分析视频（关键帧 + 增强摘要 + 镜头 + 高光）
  // ============================================

  const shotAnalysisResults = [];
  const highlightAnalysisResults = [];
  const keyframesResults = new Map<number, string[]>();  // videoId -> keyframe paths

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    const episodeNum = video.episodeNumber!;
    const videoPath = join(process.cwd(), video.filePath);

    console.log(`\n📹 [${i + 1}/${videos.length}] 分析第 ${episodeNum} 集: ${video.filename}`);

    // 更新进度
    const progress = Math.round((i / videos.length) * 50); // 前 50% 用于镜头和高光分析
    await job.updateProgress(progress);
    // 同时更新数据库
    await queries.queueJob.updateProgress(job.id!, progress);
    wsServer.sendProgress(job.id!, progress, `正在分析第 ${episodeNum} 集...`);

    // ========================================
    // 1.0 增量分析检查（跳过已分析的视频）
    // ========================================
    const existingShots = await queries.shot.getByVideoId(video.id);
    const existingHighlights = await queries.highlight.getByVideoId(video.id);
    const existingTranscription = await queries.audioTranscription.getByVideoId(video.id);
    const existingKeyframes = await queries.keyframe.getByVideoId(video.id);

    if (existingShots.length > 0 && existingHighlights.length > 0 && video.enhancedSummary) {
      console.log(`  ✅ 跳过已分析的第 ${episodeNum} 集（已有 ${existingShots.length} 个镜头，${existingHighlights.length} 个高光）`);

      // 如果已提取关键帧，使用已存在的；否则补充提取
      if (existingKeyframes.length > 0) {
        console.log(`  ✅ 关键帧已存在 (${existingKeyframes.length} 个)`);
        keyframesResults.set(video.id, existingKeyframes.map((kf: any) => kf.framePath));
      } else {
        // 提取关键帧（即使已分析，也补充提取关键帧）
        console.log(`  📸 补充提取关键帧（每 3 秒一帧）...`);

        const keyframesResult = await extractVideoKeyframes({
          videoPath,
          outputDir: join(process.cwd(), 'public', 'keyframes', video.id.toString()),
          intervalSeconds: 3,
          filenamePrefix: `video_${video.id}_keyframe`,
        });

        // 保存关键帧到数据库
        const keyframeData = keyframesResult.framePaths.map((framePath, index) => ({
          videoId: video.id,
          framePath,
          timestampMs: keyframesResult.timestamps[index],
          frameNumber: index + 1,
          fileSize: 0,
        }));

        await queries.keyframe.createBatch(keyframeData);

        keyframesResults.set(video.id, keyframesResult.framePaths);
        console.log(`  ✅ 补充提取了 ${keyframesResult.framePaths.length} 个关键帧`);
      }

      // 检查是否已有转录
      if (!existingTranscription) {
        console.log(`  🎵 补充转录音频...`);
        const audioPath = join(process.cwd(), 'uploads', `video_${video.id}_audio.wav`);

        try {
          await extractAudio({
            inputPath: videoPath,
            outputPath: audioPath,
            sampleRate: 16000,
          });

          const transcriptionResult = await transcribeAudio(audioPath, {
            model: 'small',
            language: 'zh',
          });

          await queries.audioTranscription.create({
            videoId: video.id,
            text: transcriptionResult.text,
            language: transcriptionResult.language,
            duration: transcriptionResult.duration,
            segments: JSON.stringify(transcriptionResult.segments),
            model: 'whisper-small',
          });

          console.log(`  ✅ 补充转录完成 (${transcriptionResult.text.length} 字)`);

          // ✅ 立即清理临时音频文件
          try {
            const { unlink } = await import('fs/promises');
            await unlink(audioPath);
            console.log(`  🗑️  已清理临时音频文件`);
          } catch (cleanupError) {
            console.warn(`  ⚠️  清理音频文件失败`, cleanupError);
          }

        } catch (audioError) {
          console.warn(`  ⚠️  音频转录失败:`, audioError);

          // ❌ 即使失败也清理临时文件
          try {
            const { unlink } = await import('fs/promises');
            await unlink(audioPath);
          } catch {}
        }
      } else {
        console.log(`  ✅ 音频转录已存在`);
      }

      shotAnalysisResults.push({
        videoId: video.id,
        episodeNumber: episodeNum,
        shotCount: existingShots.length,
      });

      highlightAnalysisResults.push({
        videoId: video.id,
        episodeNumber: episodeNum,
        highlightCount: existingHighlights.length,
      });

      continue;
    }

    // ========================================
    // 1.1 提取关键帧（每 3 秒一帧，用于跨集分析）
    // ========================================
    console.log(`  📸 提取关键帧（每 3 秒一帧）...`);

    const keyframesResult = await extractVideoKeyframes({
      videoPath,
      outputDir: join(process.cwd(), 'public', 'keyframes', video.id.toString()),
      intervalSeconds: 3,
      filenamePrefix: `video_${video.id}_keyframe`,
    });

    console.log(`  ✅ 提取了 ${keyframesResult.framePaths.length} 个关键帧`);

    // 保存关键帧到数据库
    const keyframeData = keyframesResult.framePaths.map((framePath, index) => ({
      videoId: video.id,
      framePath,
      timestampMs: keyframesResult.timestamps[index],
      frameNumber: index + 1,
      fileSize: 0,  // 文件大小暂时设为 0，可以后续补充
    }));

    await queries.keyframe.createBatch(keyframeData);
    console.log(`  💾 保存了 ${keyframeData.length} 个关键帧到数据库`);

    // 收集关键帧路径（用于后续分析）
    keyframesResults.set(video.id, keyframesResult.framePaths);

    // ========================================
    // 1.2 提取音频并使用 Whisper ASR 转录
    // ========================================
    console.log(`  🎵 提取音频并转录...`);

    const audioPath = join(process.cwd(), 'uploads', `video_${video.id}_audio.wav`);
    let transcriptionText = '';

    try {
      // 提取音频
      await extractAudio({
        inputPath: videoPath,
        outputPath: audioPath,
        sampleRate: 16000,
      });

      // 使用 Whisper 转录
      const transcriptionResult = await transcribeAudio(audioPath, {
        model: 'small',
        language: 'zh',
      });

      transcriptionText = transcriptionResult.text;

      // 保存到数据库
      await queries.audioTranscription.create({
        videoId: video.id,
        text: transcriptionResult.text,
        language: transcriptionResult.language,
        duration: transcriptionResult.duration,
        segments: JSON.stringify(transcriptionResult.segments),
        model: 'whisper-small',
      });

      console.log(`  ✅ 音频转录完成 (${transcriptionResult.text.length} 字)`);

      // ✅ 立即清理临时音频文件
      try {
        const { unlink } = await import('fs/promises');
        await unlink(audioPath);
        console.log(`  🗑️  已清理临时音频文件`);
      } catch (cleanupError) {
        console.warn(`  ⚠️  清理音频文件失败`, cleanupError);
      }

    } catch (audioError) {
      console.warn(`  ⚠️  音频转录失败:`, audioError);
      transcriptionText = '';

      // ❌ 即使失败也清理临时文件
      try {
        const { unlink } = await import('fs/promises');
        await unlink(audioPath);
      } catch {}
    }

    // ========================================
    // 1.3 视频分析（包含增强摘要 + 转录文本）
    // ========================================
    console.log(`  🎬 镜头分析中...`);

    // 构建包含转录文本的提示
    let transcriptionHint = '';
    if (transcriptionText) {
      transcriptionHint = `

【音频转录文本（Whisper ASR）】
${transcriptionText}

请结合上述转录文本，更准确地识别场景中的对话、角色和情绪。`;
    }

    const analyzeResult = await geminiClient.analyzeVideo(videoPath, undefined, undefined, transcriptionHint);

    if (analyzeResult.success && analyzeResult.data) {
      const analysis = analyzeResult.data;

      // 保存增强摘要到数据库
      if (analysis.enhancedSummary) {
        await db
          .update(schema.videos)
          .set({
            enhancedSummary: JSON.stringify(analysis.enhancedSummary),
            keyframesExtracted: 1
          })
          .where(eq(schema.videos.id, video.id));
        console.log(`  ✅ 保存了增强摘要`);
      }

      // 保存镜头到数据库
      if (analysis.scenes && analysis.scenes.length > 0) {
        const shotsData = analysis.scenes.map((scene: any) => ({
          videoId: video.id,
          startMs: scene.startMs,
          endMs: scene.endMs,
          description: scene.description,
          emotion: scene.emotion,
          dialogue: scene.dialogue || '',
          characters: scene.characters ? JSON.stringify(scene.characters) : null,
          viralScore: scene.viralScore || 0,
          startFrame: Math.floor((scene.startMs / 1000) * 30),
          endFrame: Math.floor((scene.endMs / 1000) * 30),
        }));

        await queries.shot.createMany(shotsData);
        console.log(`  ✅ 保存了 ${shotsData.length} 个镜头`);

        shotAnalysisResults.push({
          videoId: video.id,
          episodeNumber: episodeNum,
          shotCount: shotsData.length,
        });
      }
    }

    // ========================================
    // 1.4 高光检测
    // ========================================
    console.log(`  ✨ 高光检测中...`);

    // 确保 analyzeResult.data 存在，否则使用默认值
    const analysisData = analyzeResult.data || {
      summary: '',
      scenes: [],
      storylines: [],
      viralScore: 0,
      highlights: [],
      durationMs: video.durationMs
    };

    const highlightsResult = await geminiClient.findHighlights(videoPath, analysisData, 50);

    if (highlightsResult.success && highlightsResult.data) {
      const highlights = highlightsResult.data;

      // 保存高光到数据库
      const highlightsData = highlights.map((highlight: any) => {
        const timestampMs = highlight.timestampMs || 0;
        return {
          videoId: video.id,
          startMs: timestampMs,
          endMs: timestampMs + ((highlight.suggestedDuration || 60) * 1000),
          reason: highlight.reason || highlight.description || '高光时刻',
          viralScore: highlight.viralScore || 7.0,
          category: highlight.category || 'other',
        };
      });

      await queries.highlight.createMany(highlightsData);
      console.log(`  ✅ 保存了 ${highlightsData.length} 个高光时刻`);

      highlightAnalysisResults.push({
        videoId: video.id,
        episodeNumber: episodeNum,
        highlightCount: highlightsData.length,
      });
    }
  }

  console.log(`\n✅ [关键帧提取] 完成，共提取 ${keyframesResults.size} 个视频的关键帧`);
  console.log(`✅ [镜头分析] 完成，共分析 ${shotAnalysisResults.reduce((sum, r) => sum + r.shotCount, 0)} 个镜头`);
  console.log(`✅ [高光检测] 完成，共检测 ${highlightAnalysisResults.reduce((sum, r) => sum + r.highlightCount, 0)} 个高光时刻`);

  // ============================================
  // 第二部分：项目级故事线分析（使用增强摘要和关键帧）
  // ============================================

  console.log(`\n🌟 [项目分析] 开始项目级故事线分析（使用增强摘要和关键帧）...`);

  await job.updateProgress(60);
  await queries.queueJob.updateProgress(job.id!, 60);
  wsServer.sendProgress(job.id!, 60, '正在分析跨集故事线（使用增强连贯性信息）...');

  // 构建增强摘要映射
  const enhancedSummaries = new Map<number, import('../api/gemini').EnhancedSummary>();
  for (const video of videos) {
    if (video.enhancedSummary) {
      try {
        const parsed = JSON.parse(video.enhancedSummary);
        enhancedSummaries.set(video.id, parsed);
      } catch (error) {
        console.warn(`  ⚠️ 视频 ${video.id} 的增强摘要解析失败`);
      }
    }
  }

  console.log(`  📊 已加载 ${enhancedSummaries.size} 个视频的增强摘要`);

  // ✅ ========================================
  // 增量分析优化：检查是否已有项目分析
  // ========================================
  const existingAnalysis = await queries.projectAnalysis.getByProjectId(projectId);

  let projectStorylinesResult;

  if (existingAnalysis && existingAnalysis.analyzedAt) {
    // 已有项目分析，检查是否有新视频
    const analyzedAt = new Date(existingAnalysis.analyzedAt);
    const newVideosSinceLastAnalysis = videos.filter((v: any) => {
      const videoCreatedAt = new Date(v.createdAt);
      return videoCreatedAt > analyzedAt;
    });

    if (newVideosSinceLastAnalysis.length > 0 && newVideosSinceLastAnalysis.length < videos.length) {
      // ✅ 使用增量分析（节省成本）
      console.log(`\n💡 [增量分析] 检测到已有项目分析（${existingAnalysis.analyzedAt.toISOString()}）`);
      console.log(`📊 [增量分析] 共 ${videos.length} 集，其中 ${newVideosSinceLastAnalysis.length} 集为新增`);

      // 解析现有的故事线数据
      const existingStorylines = await queries.storyline.getByProjectId(projectId);
      const existingProjectStorylines: import('../api/gemini').ProjectStorylines = {
        mainPlot: existingAnalysis.mainPlot || '',
        subplotCount: existingAnalysis.subplotCount || 0,
        characterRelationships: existingAnalysis.characterRelationships
          ? JSON.parse(existingAnalysis.characterRelationships as string)
          : {},
        foreshadowings: existingAnalysis.foreshadowings
          ? JSON.parse(existingAnalysis.foreshadowings as string)
          : [],
        crossEpisodeHighlights: existingAnalysis.crossEpisodeHighlights
          ? JSON.parse(existingAnalysis.crossEpisodeHighlights as string)
          : [],
        storylines: existingStorylines.map((sl: any) => ({
          id: sl.id.toString(),
          name: sl.name,
          description: sl.description,
          attractionScore: sl.attractionScore,
          category: sl.category,
          segments: [],  // segments 会在增量分析中重新填充
        })),
      };

      // 调用增量分析
      projectStorylinesResult = await geminiClient.incrementalProjectAnalysis(
        existingProjectStorylines,
        newVideosSinceLastAnalysis,
        videos,
        enhancedSummaries,
        keyframesResults
      );

      if (!projectStorylinesResult.success || !projectStorylinesResult.data) {
        console.warn(`⚠️  [增量分析] 失败，降级为完整分析...`);
        projectStorylinesResult = await geminiClient.analyzeProjectStorylines(
          videos,
          enhancedSummaries,
          keyframesResults
        );
      }
    } else {
      // 没有新视频或全部是新视频，使用完整分析
      console.log(`ℹ️  [完整分析] 无已有分析或全部视频为新，执行完整分析`);
      projectStorylinesResult = await geminiClient.analyzeProjectStorylines(
        videos,
        enhancedSummaries,
        keyframesResults
      );
    }
  } else {
    // 首次分析，使用完整分析
    console.log(`🆕 [首次分析] 首次进行项目级分析`);
    projectStorylinesResult = await geminiClient.analyzeProjectStorylines(
      videos,
      enhancedSummaries,
      keyframesResults
    );
  }

  if (!projectStorylinesResult.success || !projectStorylinesResult.data) {
    throw new Error(projectStorylinesResult.error || "项目级故事线分析失败");
  }

  const projectStorylines = projectStorylinesResult.data;

  console.log(`✅ [项目分析] 识别到 ${projectStorylines.storylines.length} 条跨集故事线`);

  // 3. 存储项目级分析结果到 project_analysis 表
  await queries.projectAnalysis.upsert({
    projectId,
    mainPlot: projectStorylines.mainPlot,
    subplotCount: projectStorylines.subplotCount || 0,
    characterRelationships: JSON.stringify(projectStorylines.characterRelationships || {}),
    foreshadowings: JSON.stringify(projectStorylines.foreshadowings || []),
    crossEpisodeHighlights: JSON.stringify(projectStorylines.crossEpisodeHighlights || []),
    analyzedAt: new Date(),
  });

  // 4. 存储 storylines 到数据库
  const createdStorylines = [];

  for (const storyline of projectStorylines.storylines) {
    const [created] = await db
      .insert(schema.storylines)
      .values({
        projectId,
        name: storyline.name,
        description: storyline.description,
        attractionScore: storyline.attractionScore,
        episodeCount: storyline.segments.length,
        totalDurationMs: storyline.segments.reduce((sum: number, seg: any) => sum + (seg.endMs - seg.startMs), 0),
        category: storyline.category,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // 5. 存储 storyline segments
    const segments = storyline.segments.map((seg: any, index: number) => ({
      storylineId: created.id,
      videoId: seg.videoId,
      startMs: seg.startMs,
      endMs: seg.endMs,
      segmentOrder: index + 1,
      description: seg.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await queries.storylineSegment.createMany(segments);

    createdStorylines.push({
      ...created,
      segments,
    });
  }

  console.log(`✅ [项目分析] 成功存储 ${createdStorylines.length} 条跨集故事线`);

  // 更新进度: 100%
  await job.updateProgress(100);
  await queries.queueJob.updateProgress(job.id!, 100);
  wsServer.sendComplete(job.id!, {
    projectId,
    message: '项目级分析完成',
  });

  return {
    success: true,
    projectId,
    shotAnalysis: {
      totalVideos: videos.length,
      results: shotAnalysisResults,
    },
    highlightAnalysis: {
      totalVideos: videos.length,
      totalHighlights: highlightAnalysisResults.reduce((sum, r) => sum + r.highlightCount, 0),
      results: highlightAnalysisResults,
    },
    storylineAnalysis: {
      mainPlot: projectStorylines.mainPlot,
      storylineCount: createdStorylines.length,
      storylines: createdStorylines,
      characterRelationships: projectStorylines.characterRelationships,
      foreshadowings: projectStorylines.foreshadowings,
      crossEpisodeHighlights: projectStorylines.crossEpisodeHighlights,
    },
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

      case 'extract-storylines':
        result = await processExtractStorylinesJob(job as Job<ExtractStorylinesJobData>);
        break;

      case 'detect-highlights':
        result = await processDetectHighlightsJob(job as Job<DetectHighlightsJobData>);
        break;

      case 'analyze-project-storylines':
        result = await processAnalyzeProjectStorylinesJob(job as Job<AnalyzeProjectStorylinesJobData>);
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
  processExtractStorylinesJob,
  processDetectHighlightsJob,
  processAnalyzeProjectStorylinesJob,
  processRenderJob,
  processTTSJob,
  // processRecapRenderJob - 不在这里导出，避免导入 Remotion
} as const;

export default processors;

// ============================================
// Worker 实例管理已移至 bullmq.ts
// 避免循环依赖
// ============================================