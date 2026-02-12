// ============================================
// 关键帧提取工具
// ============================================

import { spawn } from 'child_process';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * 关键帧提取选项
 */
export interface ExtractKeyframesOptions {
  /** 视频文件路径 */
  videoPath: string;
  /** 输出目录（默认：public/keyframes/{videoId}） */
  outputDir?: string;
  /** 提取帧数（默认：根据时长自动计算） */
  frameCount?: number;
  /** 采样间隔（秒，默认：3 秒） */
  intervalSeconds?: number;
  /** 输出文件名前缀（默认：keyframe） */
  filenamePrefix?: string;
}

/**
 * 关键帧提取结果
 */
export interface KeyframesResult {
  /** 关键帧文件路径列表 */
  framePaths: string[];
  /** 每帧对应的时间戳（毫秒） */
  timestamps: number[];
  /** 输出目录 */
  outputDir: string;
}

/**
 * 从视频中均匀提取关键帧
 *
 * @param options - 提取选项
 * @returns 关键帧文件路径和时间戳
 */
export async function extractKeyframes(
  options: ExtractKeyframesOptions
): Promise<KeyframesResult> {
  const {
    videoPath,
    outputDir,
    frameCount,
    intervalSeconds = 3,  // 默认每 3 秒一帧
    filenamePrefix = 'keyframe'
  } = options;

  // 验证视频文件存在
  if (!existsSync(videoPath)) {
    throw new Error(`视频文件不存在: ${videoPath}`);
  }

  // 创建输出目录
  const actualOutputDir = outputDir || join(process.cwd(), 'public', 'keyframes', Date.now().toString());
  await mkdir(actualOutputDir, { recursive: true });

  // 使用 FFmpeg 获取视频时长
  const duration = await getVideoDuration(videoPath);

  // 如果指定了 frameCount，使用它；否则根据间隔计算
  const actualFrameCount = frameCount || Math.floor(duration / (intervalSeconds * 1000));

  // 计算每帧的时间间隔（毫秒）
  const intervalMs = Math.floor(intervalSeconds * 1000);

  console.log(`📹 [关键帧提取] 视频时长: ${duration}ms, 提取帧数: ${actualFrameCount}, 间隔: ${intervalSeconds}秒 (${intervalMs}ms)`);

  // 提取关键帧
  const framePaths: string[] = [];
  const timestamps: number[] = [];

  for (let i = 0; i < actualFrameCount; i++) {
    // 计算当前帧的时间戳（毫秒）
    const timestampMs = intervalMs * (i + 1);  // 从第 1 个间隔开始，避免从 0 开始

    // 确保不超过视频时长
    if (timestampMs >= duration) {
      break;
    }

    // 转换为 HH:MM:SS.mmm 格式
    const timeFormat = formatTimestamp(timestampMs);

    // 输出文件路径
    const filename = `${filenamePrefix}_${String(i + 1).padStart(3, '0')}.jpg`;
    const outputPath = join(actualOutputDir, filename);

    // FFmpeg 命令：提取单帧
    const ffmpegArgs = [
      '-ss', timeFormat,              // 跳转到指定时间
      '-i', videoPath,                // 输入文件
      '-vframes', '1',                // 只提取 1 帧
      '-q:v', '2',                    // 高质量 JPEG (1-31，越小越好)
      '-y',                           // 覆盖已存在文件
      outputPath
    ];

    await runFFmpeg(ffmpegArgs);

    framePaths.push(outputPath);
    timestamps.push(timestampMs);

    console.log(`✅ 提取第 ${i + 1}/${actualFrameCount} 帧: ${timestampMs}ms -> ${filename}`);
  }

  return {
    framePaths,
    timestamps,
    outputDir: actualOutputDir
  };
}

/**
 * 获取视频时长（毫秒）
 */
async function getVideoDuration(videoPath: string): Promise<number> {
  const ffprobeArgs = [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    videoPath
  ];

  const output = await runFFprobe(ffprobeArgs);
  const durationSeconds = parseFloat(output.trim());

  if (isNaN(durationSeconds)) {
    throw new Error(`无法获取视频时长: ${videoPath}`);
  }

  return Math.floor(durationSeconds * 1000);  // 转换为毫秒
}

/**
 * 格式化时间戳为 HH:MM:SS.mmm
 */
function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

/**
 * 运行 FFmpeg 命令
 */
function runFFmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);
    let stdout = '';
    let stderr = '';

    ffmpeg.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(stderr);  // FFmpeg 输出到 stderr
      } else {
        reject(new Error(`FFmpeg 错误: ${stderr}`));
      }
    });
  });
}

/**
 * 运行 FFprobe 命令
 */
function runFFprobe(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', args);
    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`FFprobe 错误: ${stderr}`));
      }
    });
  });
}

/**
 * 批量提取多个视频的关键帧
 *
 * @param videos - 视频路径列表
 * @param intervalSeconds - 采样间隔（秒，默认：3 秒）
 * @returns 所有视频的关键帧结果
 */
export async function extractKeyframesBatch(
  videos: Array<{ videoPath: string; videoId: number }>,
  intervalSeconds: number = 3
): Promise<Map<number, KeyframesResult>> {
  const results = new Map<number, KeyframesResult>();

  for (const { videoPath, videoId } of videos) {
    try {
      const result = await extractKeyframes({
        videoPath,
        outputDir: join(process.cwd(), 'public', 'keyframes', videoId.toString()),
        intervalSeconds,
        filenamePrefix: `video_${videoId}_keyframe`
      });

      results.set(videoId, result);
      console.log(`✅ 视频 ${videoId} 关键帧提取完成: ${result.framePaths.length} 帧`);
    } catch (error) {
      console.error(`❌ 视频 ${videoId} 关键帧提取失败:`, error);
      throw error;
    }
  }

  return results;
}
