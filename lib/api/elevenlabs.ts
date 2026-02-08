// ============================================
// ElevenLabs API 客户端
// 用于 TTS 语音合成和音频生成
// ============================================

import { elevenlabsConfig } from '../config';

// ============================================
// 类型定义
// ============================================

/**
 * ElevenLabs API 响应基础接口
 */
export interface ElevenLabsResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 词语级别的时间戳信息
 */
export interface WordTimestamp {
  word: string;
  startMs: number;
  endMs: number;
  confidence?: number;
}

/**
 * TTS 生成选项
 */
export interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  outputFormat?: string;
}

/**
 * TTS 生成结果
 */
export interface TTSResult {
  audioBuffer: Buffer; // 音频数据
  durationMs: number; // 音频时长（毫秒）
  wordTimestamps: WordTimestamp[]; // 词语级时间戳
  format: string; // 音频格式
  sampleRate: number; // 采样率
}

/**
 * 可用的语音列表
 */
export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

/**
 * 语音模型列表
 */
export interface Model {
  model_id: string;
  name: string;
}

// ============================================
// ElevenLabs 客户端类
// ============================================

export class ElevenLabsClient {
  private apiKey: string;
  private endpoint: string;
  private timeout: number;
  private defaultVoice: string;
  private defaultModel: string;

  constructor() {
    // 验证必需的配置
    if (!elevenlabsConfig.apiKey) {
      throw new Error('ElevenLabs API key is not configured. Please set ELEVENLABS_API_KEY in .env');
    }

    this.apiKey = elevenlabsConfig.apiKey;
    this.endpoint = elevenlabsConfig.endpoint;
    this.timeout = elevenlabsConfig.timeout;
    this.defaultVoice = elevenlabsConfig.defaultVoice;
    this.defaultModel = elevenlabsConfig.defaultModel;
  }

  /**
   * 通用 HTTP 请求方法
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<ElevenLabsResponse<T>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.endpoint}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: `ElevenLabs API timeout after ${this.timeout}ms`,
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: 'Unknown error occurred',
      };
    }
  }

  /**
   * 获取可用的语音列表
   */
  async getVoices(): Promise<ElevenLabsResponse<Voice[]>> {
    return this.request<Voice[]>('/voices');
  }

  /**
   * 获取可用的模型列表
   */
  async getModels(): Promise<ElevenLabsResponse<Model[]>> {
    return this.request<Model[]>('/models');
  }

  /**
   * 文本转语音（TTS）
   * 支持获取词语级时间戳
   */
  async textToSpeech(options: TTSOptions): Promise<ElevenLabsResponse<TTSResult>> {
    try {
      const {
        text,
        voiceId = this.defaultVoice,
        modelId = this.defaultModel,
        stability = elevenlabsConfig.stability,
        similarityBoost = elevenlabsConfig.similarityBoost,
        outputFormat = elevenlabsConfig.outputFormat,
      } = options;

      // 验证输入
      if (!text || text.trim().length === 0) {
        return {
          success: false,
          error: 'Text is required for TTS generation',
        };
      }

      // 文本长度限制（ElevenLabs 限制）
      if (text.length > 5000) {
        return {
          success: false,
          error: 'Text is too long. Maximum length is 5000 characters.',
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // 发送 TTS 请求（启用时间戳）
      const response = await fetch(`${this.endpoint}/text-to-speech/${voiceId}/with-timestamps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
          pronunciation_dictionary_locators: [],
          output_format: outputFormat,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS generation failed: ${response.status} - ${errorText}`);
      }

      // 解析响应（包含音频和时间戳）
      const data = await response.json();

      // 提取音频数据（Base64）
      const audioBase64 = data.audio_base64 || data.audio;
      if (!audioBase64) {
        return {
          success: false,
          error: 'No audio data in response',
        };
      }

      const audioBuffer = Buffer.from(audioBase64, 'base64');

      // 提取词语时间戳
      const wordTimestamps: WordTimestamp[] = [];
      if (data.alignment && Array.isArray(data.alignment)) {
        let cumulativeTime = 0;
        for (const item of data.alignment) {
          wordTimestamps.push({
            word: item.char || item.word || '',
            startMs: cumulativeTime,
            endMs: cumulativeTime + (item.duration || 0),
            confidence: item.confidence,
          });
          cumulativeTime += item.duration || 0;
        }
      }

      // 解析音频格式和采样率
      const format = this.parseAudioFormat(outputFormat);
      const sampleRate = this.parseSampleRate(outputFormat);

      // 估算音频时长（如果没有时间戳）
      const durationMs = wordTimestamps.length > 0
        ? wordTimestamps[wordTimestamps.length - 1].endMs
        : this.estimateAudioDuration(audioBuffer, sampleRate);

      return {
        success: true,
        data: {
          audioBuffer,
          durationMs,
          wordTimestamps,
          format,
          sampleRate,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: 'Unknown error occurred during TTS generation',
      };
    }
  }

  /**
   * 批量文本转语音（将长文本分割成多个段落）
   */
  async batchTextToSpeech(
    paragraphs: string[],
    options?: Omit<TTSOptions, 'text'>
  ): Promise<ElevenLabsResponse<TTSResult[]>> {
    const results: TTSResult[] = [];
    let cumulativeOffset = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      if (!paragraph) continue;

      const response = await this.textToSpeech({
        ...options,
        text: paragraph,
      });

      if (!response.success || !response.data) {
        return {
          success: false,
          error: `Failed to generate audio for paragraph ${i + 1}: ${response.error}`,
        };
      }

      // 调整时间戳偏移（基于之前的段落时长）
      const adjustedTimestamps = response.data.wordTimestamps.map((ts) => ({
        ...ts,
        startMs: ts.startMs + cumulativeOffset,
        endMs: ts.endMs + cumulativeOffset,
      }));

      results.push({
        ...response.data,
        wordTimestamps: adjustedTimestamps,
      });

      cumulativeOffset += response.data.durationMs;
    }

    return {
      success: true,
      data: results,
    };
  }

  /**
   * 获取语音预览音频
   */
  async getVoicePreview(voiceId: string): Promise<ElevenLabsResponse<Buffer>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.endpoint}/voices/${voiceId}/preview`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch voice preview: ${response.status}`,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return {
        success: true,
        data: buffer,
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: 'Unknown error occurred',
      };
    }
  }

  /**
   * 解析音频格式
   */
  private parseAudioFormat(outputFormat: string): string {
    // mp3_44100_128 -> mp3
    // pcm_16000 -> wav
    const match = outputFormat.match(/^(mp3|pcm|wav)/);
    return match ? match[1] : 'mp3';
  }

  /**
   * 解析采样率
   */
  private parseSampleRate(outputFormat: string): number {
    // mp3_44100_128 -> 44100
    // pcm_16000 -> 16000
    const match = outputFormat.match(/_(\d+)/);
    return match ? parseInt(match[1], 10) : 44100;
  }

  /**
   * 估算音频时长（基于音频数据大小）
   */
  private estimateAudioDuration(audioBuffer: Buffer, sampleRate: number): number {
    // 简单估算：假设平均比特率为 128 kbps
    const estimatedBitrate = 128000; // bits per second
    const durationSeconds = (audioBuffer.length * 8) / estimatedBitrate;
    return Math.round(durationSeconds * 1000); // 转换为毫秒
  }

  /**
   * 将词语时间戳转换为 Remotion 字幕格式
   */
  static convertToRemotionSubtitles(wordTimestamps: WordTimestamp[]): Array<{
    startMs: number;
    endMs: number;
    text: string;
    words: WordTimestamp[];
  }> {
    // 将连续的词语合并成句子
    const sentences: Array<{
      startMs: number;
      endMs: number;
      text: string;
      words: WordTimestamp[];
    }> = [];

    let currentSentence: WordTimestamp[] = [];
    let sentenceStartMs = 0;

    for (let i = 0; i < wordTimestamps.length; i++) {
      const word = wordTimestamps[i];

      if (currentSentence.length === 0) {
        sentenceStartMs = word.startMs;
        currentSentence.push(word);
      } else {
        const lastWord = currentSentence[currentSentence.length - 1];
        const gap = word.startMs - lastWord.endMs;

        // 如果间隔超过 500ms，认为是新句子
        if (gap > 500) {
          // 保存当前句子
          sentences.push({
            startMs: sentenceStartMs,
            endMs: lastWord.endMs,
            text: currentSentence.map((w) => w.word).join(''),
            words: [...currentSentence],
          });

          // 开始新句子
          currentSentence = [word];
          sentenceStartMs = word.startMs;
        } else {
          currentSentence.push(word);
        }
      }
    }

    // 保存最后一个句子
    if (currentSentence.length > 0) {
      const lastWord = currentSentence[currentSentence.length - 1];
      sentences.push({
        startMs: sentenceStartMs,
        endMs: lastWord.endMs,
        text: currentSentence.map((w) => w.word).join(''),
        words: currentSentence,
      });
    }

    return sentences;
  }
}

// ============================================
// 导出单例实例
// ============================================
export const elevenlabsClient = new ElevenLabsClient();
