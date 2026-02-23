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
  const {
    model = 'small',      // 使用 small 模型（平衡速度和准确度）
    language = 'zh',      // 默认中文
    task = 'transcribe',
    outputFormat = 'json'
  } = options;

  console.log(`🎙️ 开始音频转录...`);
  console.log(`  📁 文件: ${audioPath}`);
  console.log(`  🤖 模型: ${model}`);
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
      '--output_dir', join(audioPath, '..'),
      '--verbose', // 显示详细日志
    ].join(' ');

    console.log(`  🔧 命令: whisper "${audioPath}" --model ${model} --language ${language}`);

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
