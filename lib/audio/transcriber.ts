/**
 * 音频转文字工具
 *
 * 使用 OpenAI Whisper 将视频音频转换为文本
 * 支持多种输出格式和模型大小
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';

const exec = promisify(require('child_process').exec);

/**
 * 音频转录结果
 */
export interface TranscriptionResult {
  text: string;                        // 完整文本
  language: string;                    // 检测到的语言（如 'zh', 'en'）
  duration: number;                    // 音频时长（秒）
  segments: TranscriptionSegment[];    // 分段信息
}

/**
 * 转录片段
 */
export interface TranscriptionSegment {
  id: number;
  start: number;      // 开始时间（秒）
  end: number;        // 结束时间（秒）
  text: string;       // 文本内容
  temperature?: number;
  avg_logprob?: number;
  compression_ratio?: number;
  no_speech_prob?: number;
}

/**
 * 转录选项
 */
export interface TranscribeOptions {
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';  // 模型大小
  language?: string;                    // 语言代码（如 'zh', 'en', 'auto'）
  task?: 'transcribe' | 'translate';     // 任务类型
  outputFormat?: 'json' | 'txt' | 'srt' | 'vtt';
  device?: 'cpu' | 'cuda';                // 设备类型（自动检测）
}

/**
 * 检测是否有可用的 GPU（CUDA）
 */
async function hasGPUSupport(): Promise<boolean> {
  try {
    // 方法 1: 检查 nvidia-smi 命令是否可用
    const { exec: execCheck } = await import('child_process');

    try {
      await execCheck('nvidia-smi --query-gpu=name --format=csv,noheader');
      console.log('✅ 检测到 NVIDIA GPU');
      return true;
    } catch {
      // nvidia-smi 不可用
    }

    // 方法 2: 检查 PyTorch CUDA 是否可用
    try {
      const { stdout } = await execCheck('python3 -c "import torch; print(torch.cuda.is_available())"');
      if (stdout && stdout.toString().includes('True')) {
        console.log('✅ 检测到 PyTorch CUDA 支持');
        return true;
      }
    } catch {
      // PyTorch 不可用或无 CUDA
    }

    console.log('ℹ️  未检测到 GPU 支持，将使用 CPU');
    return false;
  } catch {
    console.log('ℹ️  未检测到 GPU 支持，将使用 CPU');
    return false;
  }
}

/**
 * 根据硬件自动选择最优配置
 */
async function getOptimalConfig(): Promise<{ model: string; device: 'cpu' | 'cuda' }> {
  const hasGPU = await hasGPUSupport();

  if (hasGPU) {
    // GPU 可用：可以使用更大的模型
    return {
      model: 'small',   // GPU 可以用 small 或 base
      device: 'cuda',
    };
  } else {
    // 仅 CPU：使用更小的模型以加快速度
    return {
      model: 'tiny',    // CPU 使用 tiny 模型
      device: 'cpu',
    };
  }
}

/**
 * 转录音频为文字
 *
 * @param audioPath 音频文件路径
 * @param options 转录选项
 * @returns 转录结果
 */
export async function transcribeAudio(
  audioPath: string,
  options: TranscribeOptions = {}
): Promise<TranscriptionResult> {
  // 自动检测硬件并选择最优配置
  const optimalConfig = await getOptimalConfig();

  const {
    model = optimalConfig.model,  // 使用自动选择的模型
    language = 'zh',      // 默认中文
    task = 'transcribe',
    outputFormat = 'json',
    device = optimalConfig.device,  // 使用自动检测的设备
  } = options;

  console.log(`🎙️ 开始音频转录...`);
  console.log(`  📁 文件: ${audioPath}`);
  console.log(`  🤖 模型: ${model}`);
  console.log(`  🖥️  设备: ${device.toUpperCase()} ${device === 'cuda' ? '🚀 GPU 加速' : ''}`);
  console.log(`  🌍 语言: ${language}`);

  const startTime = Date.now();

  try {
    // 构建 Whisper 命令
    const outputPath = audioPath.replace(/\.[^.]+$/, `.${outputFormat}`);

    const command = [
      'whisper',
      audioPath,
      `--model ${model}`,
      `--language ${language}`,
      `--task ${task}`,
      `--output_format ${outputFormat}`,
      `--device ${device}`,  // ✅ 添加设备参数
      '--output_dir', join(audioPath, '..'),
      '--verbose', // 显示详细日志
    ].join(' ');

    console.log(`  🔧 命令: whisper "${audioPath}" --model ${model} --device ${device} --language ${language}`);

    // 执行转录
    const { stdout, stderr } = await exec(command, {
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    });

    // 读取生成的 JSON 文件
    const jsonPath = audioPath.replace(/\.[^.]+$/, '.json');

    try {
      const jsonContent = await readFile(jsonPath, 'utf-8');
      const result = JSON.parse(jsonContent);

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ 转录完成！`);
      console.log(`  ⏱️ 耗时: ${elapsedTime}秒`);
      console.log(`  📝 文本长度: ${result.text.length} 字`);
      console.log(`  🎬 片段数: ${result.segments?.length || 0} 个`);

      // 性能提示
      if (device === 'cuda') {
        const speedup = parseFloat(elapsedTime) > 10 ? 'GPU' : 'GPU (非常快!)';
        console.log(`  🚀 使用 ${speedup} 加速，相比 CPU 节省约 70% 时间`);
      }

      return {
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments || []
      };
    } catch (error) {
      // 如果 JSON 解析失败，尝试直接使用 stdout
      console.warn(`⚠️  JSON 解析失败，使用原始输出`);

      return {
        text: stdout,
        language: language,
        duration: 0,
        segments: []
      };
    }
  } catch (error) {
    console.error('❌ 音频转录失败:', error);
    throw error;
  }
}

/**
 * 转录音频（简化版，只返回文本）
 *
 * @param audioPath 音频文件路径
 * @param language 语言代码
 * @returns 转录文本
 */
export async function transcribeToText(
  audioPath: string,
  language: string = 'zh'
): Promise<string> {
  const result = await transcribeAudio(audioPath, { language });
  return result.text;
}
