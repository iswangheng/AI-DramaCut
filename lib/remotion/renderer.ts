/**
 * Remotion 渲染客户端
 * Agent 3 - 视频处理核心
 *
 * 提供程序化渲染 Remotion 视频的功能
 * 支持实时进度监控和 WebSocket 集成
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { webpackOverride } from 'remotion/dev/webpack-override';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * 渲染进度回调函数类型
 */
export type RenderProgressCallback = (
  progress: number,        // 当前进度 (0-100)
  renderedFrames: number,  // 已渲染帧数
  totalFrames: number,     // 总帧数
  renderedDuration: number // 已渲染时长（秒）
) => void;

/**
 * Remotion 渲染选项
 */
export interface RemotionRenderOptions {
  /** Composition ID */
  compositionId: string;
  /** 输入 Props（传递给组件的 props） */
  inputProps: Record<string, any>;
  /** 输出文件路径 */
  outputPath: string;
  /** 输出分辨率宽度（默认 1080） */
  width?: number;
  /** 输出分辨率高度（默认 1920） */
  height?: number;
  /** 输出帧率（默认 30） */
  fps?: number;
  /** 输出格式（默认 mp4） */
  outputFormat?: 'mp4' | 'webm';
  /** 编码预设（默认 'ultrafast'） */
  codec?: 'h264' | 'h265' | 'vp8' | 'vp9';
  /** 编码预设速度（默认 'ultrafast'） */
  crf?: number;
  /** 预设速度（默认 'ultrafast'） */
  preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  /** JPEG 质量（默认 80） */
  jpegQuality?: number;
  /** 是否覆盖已存在的文件（默认 true） */
  overwrite?: boolean;
  /** 是否在浏览器中预览（默认 false） */
  browser?: boolean;
  /** 进度回调函数 */
  onProgress?: RenderProgressCallback;
  /** 并发渲染数（默认 1，即不并行） */
  concurrency?: number;
  /** 是否输出日志到控制台（默认 false） */
  verbose?: boolean;
}

/**
 * 渲染结果
 */
export interface RenderResult {
  /** 输出文件路径 */
  outputPath: string;
  /** 总时长（秒） */
  duration: number;
  /** 总帧数 */
  totalFrames: number;
  /** 渲染耗时（毫秒） */
  renderTime: number;
  /** 文件大小（字节） */
  size: number;
}

/**
 * 验证渲染选项
 */
function validateRenderOptions(options: RemotionRenderOptions): void {
  const { compositionId, inputProps, outputPath, width, height, fps } = options;

  if (!compositionId) {
    throw new Error('compositionId 是必需的');
  }

  if (!inputProps) {
    throw new Error('inputProps 是必需的');
  }

  if (!outputPath) {
    throw new Error('outputPath 是必需的');
  }

  if (width && width <= 0) {
    throw new Error('width 必须大于 0');
  }

  if (height && height <= 0) {
    throw new Error('height 必须大于 0');
  }

  if (fps && fps <= 0) {
    throw new Error('fps 必须大于 0');
  }

  // 验证输入 Props 中的必需字段
  if (compositionId === 'CaptionedVideo') {
    if (!inputProps.src) {
      throw new Error('CaptionedVideo 需要 src 属性');
    }
    if (!existsSync(inputProps.src)) {
      throw new Error(`视频文件不存在: ${inputProps.src}`);
    }
  }
}

/**
 * 渲染 Remotion 视频
 *
 * @param options 渲染选项
 * @returns 渲染结果
 *
 * @example
 * ```typescript
 * // 渲染带字幕的视频
 * const result = await renderRemotionVideo({
 *   compositionId: 'CaptionedVideo',
 *   inputProps: {
 *     src: './video.mp4',
 *     subtitles: subtitleData,
 *     fontSize: 60,
 *     highlightColor: '#FFE600'
 *   },
 *   outputPath: './output.mp4',
 *   width: 1080,
 *   height: 1920,
 *   fps: 30,
 *   onProgress: (progress, renderedFrames, totalFrames) => {
 *     console.log(`渲染进度: ${progress.toFixed(1)}%`);
 *   }
 * });
 * ```
 */
export async function renderRemotionVideo(
  options: RemotionRenderOptions
): Promise<RenderResult> {
  const {
    compositionId,
    inputProps,
    outputPath,
    width = 1080,
    height = 1920,
    fps = 30,
    outputFormat = 'mp4',
    codec = 'h264',
    crf = 18,
    preset = 'ultrafast',
    jpegQuality = 80,
    overwrite = true,
    onProgress,
    concurrency = 1,
    verbose = false,
  } = options;

  console.log('🎬 开始 Remotion 渲染...');
  console.log(`   Composition: ${compositionId}`);
  console.log(`   输出路径: ${outputPath}`);
  console.log(`   分辨率: ${width}x${height}`);
  console.log(`   帧率: ${fps} fps`);
  console.log(`   格式: ${outputFormat}`);

  // 1. 验证选项
  validateRenderOptions(options);

  // 2. 创建临时 bundle
  console.log('\n   正在打包 Remotion 项目...');
  const bundleLocation = await bundle({
    entryPoint: join(process.cwd(), 'remotion/root.tsx'),
    webpackOverride: (config) => {
      // 禁用 TypeScript 类型检查以提高速度
      config.devtool = false;
      return config;
    },
    onProgress: (progress) => {
      if (verbose) {
        process.stdout.write(`\r   打包进度: ${(progress * 100).toFixed(1)}%`);
      }
    },
  });

  if (verbose) {
    console.log('\n   ✅ 打包完成');
  }

  // 3. 选择 Composition
  console.log('   正在获取 Composition 信息...');
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  });

  console.log(`   视频时长: ${composition.durationInFrames / composition.fps} 秒`);
  console.log(`   总帧数: ${composition.durationInFrames}`);

  // 4. 渲染视频
  console.log('\n   正在渲染...');
  const startTime = Date.now();

  let lastProgress = 0;
  const result = await renderMedia({
    serveUrl: bundleLocation,
    compositionId,
    inputProps,
    codec,
    outputLocation: outputPath,
    overwrite,
    onProgress: ({ progress, renderedFrames, encodedFrames, renderedDurationInMilliseconds }) => {
      const progressPercent = progress * 100;

      // 只在进度有明显变化时更新（每 1%）
      if (progressPercent - lastProgress >= 1 || progressPercent === 100) {
        lastProgress = progressPercent;

        if (verbose) {
          const bar = '█'.repeat(Math.floor(progressPercent / 2)) + '░'.repeat(50 - Math.floor(progressPercent / 2));
          process.stdout.write(`\r   [${bar}] ${progressPercent.toFixed(1)}% (${renderedFrames}/${composition.durationInFrames} 帧)`);
        }

        if (onProgress) {
          onProgress(
            progressPercent,
            renderedFrames,
            composition.durationInFrames,
            renderedDurationInMilliseconds / 1000
          );
        }
      }
    },
    // 并发渲染可以显著提高速度，但需要更多内存
    concurrency,
    // 输出配置
    fps,
    width,
    height,
    // JPEG 质量（用于预览）
    jpegQuality,
    // CRF 和预设（用于最终输出）
    crf,
    preset,
  });

  const renderTime = Date.now() - startTime;

  if (verbose) {
    console.log('\n   ✅ 渲染完成');
  }

  // 5. 获取输出文件信息
  const { statSync } = await import('fs');
  const size = statSync(outputPath).size;

  console.log('\n✅ 渲染成功！');
  console.log(`   输出文件: ${outputPath}`);
  console.log(`   文件大小: ${(size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   渲染耗时: ${(renderTime / 1000).toFixed(2)} 秒`);
  console.log(`   渲染速度: ${(result.size / 1024 / 1024 / (renderTime / 1000)).toFixed(2)} MB/s`);

  return {
    outputPath,
    duration: composition.durationInFrames / composition.fps,
    totalFrames: composition.durationInFrames,
    renderTime,
    size,
  };
}

/**
 * 渲染带字幕的视频（快捷方法）
 *
 * @param options 渲染选项
 * @returns 渲染结果
 *
 * @example
 * ```typescript
 * const result = await renderCaptionedVideo({
 *   videoPath: './video.mp4',
 *   subtitles: subtitleData,
 *   outputPath: './output.mp4',
 *   fontSize: 60,
 *   highlightColor: '#FFE600',
 *   onProgress: (progress) => console.log(`${progress.toFixed(1)}%`)
 * });
 * ```
 */
export async function renderCaptionedVideo(options: {
  videoPath: string;
  subtitles: Array<{
    startMs: number;
    endMs: number;
    text: string;
    words?: Array<{
      text: string;
      startMs: number;
      endMs: number;
    }>;
  }>;
  outputPath: string;
  width?: number;
  height?: number;
  fps?: number;
  fontSize?: number;
  fontColor?: string;
  highlightColor?: string;
  outlineColor?: string;
  outlineSize?: number;
  subtitleY?: number;
  watermarkUrl?: string | null;
  onProgress?: RenderProgressCallback;
}): Promise<RenderResult> {
  const {
    videoPath,
    subtitles,
    outputPath,
    width = 1080,
    height = 1920,
    fps = 30,
    fontSize = 60,
    fontColor = 'white',
    highlightColor = '#FFE600',
    outlineColor = 'black',
    outlineSize = 5,
    subtitleY = 80,
    watermarkUrl = null,
    onProgress,
  } = options;

  return renderRemotionVideo({
    compositionId: 'CaptionedVideo',
    inputProps: {
      src: videoPath,
      subtitles,
      fontSize,
      fontColor,
      highlightColor,
      outlineColor,
      outlineSize,
      subtitleY,
      watermarkUrl,
    },
    outputPath,
    width,
    height,
    fps,
    onProgress,
  });
}

/**
 * 批量渲染多个视频
 *
 * @param renders 渲染任务列表
 * @returns 所有渲染结果
 */
export async function batchRenderRemotionVideos(
  renders: Array<{
    compositionId: string;
    inputProps: Record<string, any>;
    outputPath: string;
    options?: Omit<RemotionRenderOptions, 'compositionId' | 'inputProps' | 'outputPath'>;
  }>
): Promise<Map<string, RenderResult>> {
  const results = new Map<string, RenderResult>();

  for (const render of renders) {
    const { compositionId, inputProps, outputPath, options = {} } = render;

    try {
      const result = await renderRemotionVideo({
        compositionId,
        inputProps,
        outputPath,
        ...options,
      });

      results.set(outputPath, result);
    } catch (error) {
      console.error(`❌ ${outputPath} 渲染失败:`, error);
      throw error;
    }
  }

  return results;
}
