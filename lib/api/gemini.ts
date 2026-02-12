// ============================================
// Gemini 3 API 客户端
// 用于视频分析、场景理解、高光检测
// ============================================

import { geminiConfig } from '../config';
import { withRetry, type RetryOptions } from './utils/retry';
import { StreamChunk, StreamCallback } from './utils/streaming';

// ============================================
// 类型定义
// ============================================

/**
 * Gemini API 响应基础接口
 */
export interface GeminiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 音频信息
 */
export interface AudioInfo {
  hasDialogue: boolean;       // 是否有对白
  dialogue?: string;          // 对白内容（如果有）
  bgmStyle?: string;          // BGM 风格（紧张、悲伤、浪漫等）
  soundEffects?: string[];    // 音效列表（耳光、哭声等）
  musicCues?: string[];       // 音乐提示点（时间戳）
}

/**
 * 场景信息
 */
export interface Scene {
  startMs: number;
  endMs: number;
  description: string;
  emotion: string;
  dialogue?: string;
  characters?: string[];
  viralScore?: number; // 爆款潜力分数 (0-10)
  audioInfo?: AudioInfo;     // 音频信息（新增）
}

/**
 * 增强剧情摘要（用于跨集连贯性分析）
 */
export interface EnhancedSummary {
  /** 开头状态 */
  openingState: {
    connectionToPrevious: string;    // 与上一集的连接（如：承接上集结尾的XX场景）
    initialSituation: string;        // 初始情境（如：角色A在某地，准备做XX）
    charactersStatus: string[];      // 角色状态列表（如：["主角A：愤怒", "配角B：悲伤"]）
  };
  /** 核心事件 */
  coreEvents: Array<{
    timestampMs: number;             // 事件发生时间（毫秒）
    description: string;             // 事件描述
    importance: 'high' | 'medium' | 'low';  // 重要性等级
  }>;
  /** 结尾状态 */
  endingState: {
    cliffhanger: string;             // 悬念/钩子（如：角色C突然说出"我是你的父亲"）
    foreshadowing: string[];         // 伏笔列表（如：["暗示XX是关键证人", "埋下XX线索"]）
    unresolved: string[];            // 未解决的问题（如：["XX的真实身份", "XX物品的去向"]）
  };
  /** 角色弧光 */
  characterArcs: Array<{
    characterName: string;           // 角色名称
    emotionStart: string;            // 起始情绪
    emotionEnd: string;              // 结束情绪
    change: string;                  // 变化描述（如：从愤怒转为悲伤）
  }>;
  /** 关键元素 */
  keyElements: {
    props: string[];                 // 重要道具/物品（如：["血书", "信件", "匕首"]）
    locations: string[];             // 重要场景（如：["废弃工厂", "医院天台"]）
    symbols: string[];               // 象征/隐喻（如：["红玫瑰象征爱情", "暴雨象征危机"]）
  };
}

/**
 * 视频分析结果
 */
export interface VideoAnalysis {
  summary: string; // 一句话剧情梗概（旧版，50字以内）
  enhancedSummary?: EnhancedSummary; // 增强剧情梗概（JSON 格式，包含连贯性信息）
  scenes: Scene[];
  storylines: string[]; // 故事线列表
  viralScore: number; // 整体爆款分数 (0-10)
  highlights: number[]; // 高光时刻时间戳列表（毫秒）
  durationMs: number;
}

/**
 * 病毒式传播时刻（高光候选点）
 * 符合 types/api-contracts.ts 接口契约
 */
export interface HighlightMoment {
  timestampMs: number;     // 时间戳（毫秒）
  type: "plot_twist" | "reveal" | "conflict" | "emotional" | "climax"; // 匹配接口契约
  confidence: number;      // 置信度 (0-1)
  description: string;     // 描述（对应原来的 reason）
  suggestedStartMs: number; // 建议开始时间（毫秒）
  suggestedEndMs: number;   // 建议结束时间（毫秒）

  // 保留原有字段以兼容现有代码
  viralScore?: number;     // 爆款分数
  category?: 'conflict' | 'emotional' | 'reversal' | 'climax' | 'other'; // 原分类
  suggestedDuration?: number; // 原建议时长（秒），可转换计算 EndMs
}

/**
 * ViralMoment 类型别名
 * 完全符合 types/api-contracts.ts 接口契约
 */
export type ViralMoment = HighlightMoment;

/**
 * 故事线
 */
export interface Storyline {
  id: string;
  name: string;
  description: string;
  scenes: Scene[];
  attractionScore: number;
}

/**
 * 项目级故事线片段
 * 用于深度解说模式，表示跨集的故事线片段
 */
export interface StorylineSegment {
  videoId: number;
  startMs: number;
  endMs: number;
  description: string;
}

/**
 * 项目级故事线
 * 跨越多个集数的完整故事弧线
 */
export interface ProjectStoryline {
  name: string;
  description: string;
  attractionScore: number;
  category: 'revenge' | 'romance' | 'identity' | 'mystery' | 'power' | 'family' | 'suspense' | 'other';
  segments: StorylineSegment[];
}

/**
 * 人物关系图谱
 * 记录每个角色在不同集数中的状态和关系
 */
export interface CharacterRelationships {
  [episodeNumber: string]: {
    [characterName: string]: string[];
  };
}

/**
 * 伏笔设置与揭晓
 */
export interface Foreshadowing {
  set_up: string;      // "ep1-15:00" 表示第1集15秒处
  payoff: string;      // "ep5-10:00" 表示第5集10秒处
  description: string; // "骨血灯秘密"
}

/**
 * 跨集高光候选
 * 跨越多集的精彩片段
 */
export interface CrossEpisodeHighlight {
  start_ep: number;
  start_ms: number;
  end_ep: number;
  end_ms: number;
  description: string;
}

/**
 * 项目级故事线分析结果
 */
export interface ProjectStorylines {
  mainPlot: string;                                   // 主线剧情梗概
  subplotCount: number;                               // 支线数量
  characterRelationships: CharacterRelationships;      // 人物关系变化
  foreshadowings: Foreshadowing[];                    // 伏笔设置与揭晓
  crossEpisodeHighlights: CrossEpisodeHighlight[];    // 跨集高光
  storylines: ProjectStoryline[];                     // 主要故事线（3-5条）
}

/**
 * 视频对象（从数据库查询）
 */
export interface Video {
  id: number;
  projectId: number;
  filename: string;
  filePath: string;
  durationMs: number;
  episodeNumber?: number | null;
  displayTitle?: string | null;
  sortOrder: number;
  summary?: string | null;
  viralScore?: number | null;
}

/**
 * 解说文案
 */
export interface RecapScript {
  storylineId: string;
  style: 'hook' | 'roast' | 'suspense' | 'emotional' | 'humorous';
  title: string; // 标题（黄金 3 秒钩子）
  paragraphs: {
    text: string;
    videoCues: string[]; // 建议的画面描述
  }[];
  estimatedDurationMs: number;
}

// ============================================
// Gemini 客户端类
// ============================================

export class GeminiClient {
  private apiKey: string;
  private endpoint: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private timeout: number;
  private retryOptions: RetryOptions; // 添加重试配置

  constructor(retryOptions?: RetryOptions) {
    // 验证必需的配置
    if (!geminiConfig.apiKey) {
      throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY or YUNWU_API_KEY in .env');
    }

    this.apiKey = geminiConfig.apiKey;
    this.endpoint = geminiConfig.endpoint || 'https://generativelanguage.googleapis.com';
    this.model = geminiConfig.model;
    this.temperature = geminiConfig.temperature;
    this.maxTokens = geminiConfig.maxTokens;
    this.timeout = geminiConfig.timeout;

    // 检查是否使用 yunwu.ai 代理
    this.isYunwu = this.endpoint.includes('yunwu.ai');

    // 配置重试选项
    this.retryOptions = {
      maxRetries: retryOptions?.maxRetries || 3,
      initialDelay: retryOptions?.initialDelay || 1000,
      maxDelay: retryOptions?.maxDelay || 10000,
      backoffMultiplier: retryOptions?.backoffMultiplier || 2,
      onRetry: (attempt, error) => {
        console.warn(`⚠️  Gemini API 请求失败，第 ${attempt} 次重试...`, error.message);
      },
    };
  }

  // 添加私有属性标识是否使用 yunwu.ai
  private isYunwu: boolean;

  /**
   * 将 Gemini 格式转换为 OpenAI 格式（yunwu.ai 兼容）
   */
  private convertToOpenAIFormat(geminiRequest: Record<string, unknown>, systemInstruction?: string): Record<string, unknown> {
    // 提取用户消息（添加类型断言）
    const contents = geminiRequest.contents as Array<{ parts?: Array<{ text?: string }> }> | undefined;
    const userContent = contents?.[0]?.parts?.[0]?.text || '';

    // 构建 OpenAI 格式的消息数组
    const messages: Array<{ role: string; content: string }> = [];

    // 添加系统指令（如果提供）
    if (systemInstruction) {
      messages.push({
        role: 'system',
        content: systemInstruction,
      });
    }

    // 添加用户消息
    messages.push({
      role: 'user',
      content: userContent,
    });

    return {
      model: this.model,
      messages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    };
  }

  /**
   * 解析 OpenAI 格式的响应（yunwu.ai）
   */
  private parseOpenAIResponse(data: any): { text: string; usage?: any } {
    const text = data.choices?.[0]?.message?.content || '';
    const usage = data.usage
      ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        }
      : undefined;

    return { text, usage };
  }

  /**
   * 内部 API 调用方法（实际执行请求，用于重试）
   */
  private async executeApiCall(
    prompt: string,
    systemInstruction?: string,
    controller?: AbortController
  ): Promise<{ text: string; usage?: any }> {
    // 构建请求体
    const requestBody: Record<string, unknown> = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
      },
      // 安全过滤器设置：降低阈值，允许分析影视内容
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        }
      ]
    };

    // 添加系统指令（如果提供）
    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [
          {
            text: systemInstruction,
          },
        ],
      };
    }

    // 发送请求
    const apiUrl = this.isYunwu
      ? `${this.endpoint}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`
      : `${this.endpoint}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller?.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`Gemini API error: ${response.status} - ${errorText}`) as any;
      error.statusCode = response.status;
      throw error;
    }

    const data = await response.json();

    // 提取生成的文本
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usage = data.usageMetadata
      ? {
          promptTokens: data.usageMetadata.promptTokenCount || 0,
          completionTokens: data.usageMetadata.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata.totalTokenCount || 0,
        }
      : undefined;

    if (!generatedText) {
      throw new Error('Empty response from API');
    }

    return { text: generatedText, usage };
  }

  /**
   * 读取文件并转换为 Base64
   */
  private async fileToBase64(filePath: string): Promise<string> {
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(filePath);
    return buffer.toString('base64');
  }

  /**
   * 视频理解 API（支持直接上传视频文件）
   * 根据 yunwu.ai OpenAPI 规范实现
   *
   * @param videoPath 视频文件路径
   * @param prompt 分析提示词
   * @param systemInstruction 系统指令
   * @param onProgress 进度回调（可选）
   */
  async analyzeVideoWithUpload(
    videoPath: string,
    prompt: string,
    systemInstruction?: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<GeminiResponse<string>> {
    try {
      onProgress?.(10, '读取视频文件...');

      // 1. 读取视频文件并转换为 base64
      const videoBase64 = await this.fileToBase64(videoPath);

      onProgress?.(30, '上传视频到 AI...');

      // 2. 构建符合 OpenAPI 规范的请求体
      const requestBody: Record<string, unknown> = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inline_data: {
                  mime_type: 'video/mp4',
                  data: videoBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
      };

      // 添加系统指令（如果提供）
      if (systemInstruction) {
        (requestBody.contents as any)[0].parts.unshift({
          text: systemInstruction,
        });
      }

      // 3. 发送请求到 yunwu.ai
      const apiUrl = `${this.endpoint}/v1beta/models/gemini-2.5-pro:generateContent?key=${this.apiKey}`;

      onProgress?.(50, 'AI 分析中...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Gemini API error: ${response.status} - ${errorText}`) as any;
        error.statusCode = response.status;
        throw error;
      }

      onProgress?.(80, '解析分析结果...');

      const data = await response.json();

      // 提取生成的文本
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!generatedText) {
        throw new Error('Empty response from API');
      }

      onProgress?.(100, '分析完成');

      return {
        success: true,
        data: generatedText,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: `Gemini API timeout after ${this.timeout}ms`,
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
   * 通用 Gemini API 调用方法（带重试机制）
   */
  async callApi(prompt: string, systemInstruction?: string): Promise<GeminiResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // 使用 withRetry 包装 API 调用
      const result = await withRetry(
        async () => {
          return await this.executeApiCall(prompt, systemInstruction, controller);
        },
        {
          ...this.retryOptions,
          onRetry: (attempt, error) => {
            console.warn(
              `⚠️  Gemini API 请求失败，第 ${attempt} 次重试...`,
              error.message
            );
          },
        }
      );

      clearTimeout(timeoutId);

      return {
        success: true,
        data: result.text,
        usage: result.usage,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: `Gemini API timeout after ${this.timeout}ms`,
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
   * 解析 JSON 响应（带重试机制和更好的容错性）
   */
  private parseJsonResponse<T>(text: string, retries = 3): T | null {
    for (let i = 0; i < retries; i++) {
      try {
        // 尝试多种 JSON 提取模式
        let jsonText = text;

        // 模式 1: 标准的 markdown json 代码块
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        } else {
          // 模式 2: 普通的代码块
          const codeMatch = text.match(/```\n([\s\S]*?)\n```/);
          if (codeMatch) {
            jsonText = codeMatch[1];
          } else {
            // 模式 3: 查找第一个 { 和最后一个 } 之间的内容
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              jsonText = text.substring(firstBrace, lastBrace + 1);
            }
          }
        }

        // 清理可能的额外文本
        jsonText = jsonText.trim();

        const parsed = JSON.parse(jsonText) as T;
        console.log(`✅ JSON 解析成功 (尝试 ${i + 1}/${retries})`);
        return parsed;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️  JSON 解析失败 (尝试 ${i + 1}/${retries}): ${errorMsg}`);

        if (i === retries - 1) {
          console.error('❌ JSON 解析彻底失败，响应内容:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
          return null;
        }

        // 短暂延迟后重试
        if (i < retries - 1) {
          // 可以添加一些清理逻辑
        }
      }
    }
    return null;
  }

  /**
   * 音频理解 API
   *
   * @param audioPath 音频文件路径（MP3/WAV）
   * @param prompt 分析提示词
   * @param systemInstruction 系统指令
   */
  async analyzeAudio(
    audioPath: string,
    prompt: string,
    systemInstruction?: string
  ): Promise<GeminiResponse<string>> {
    try {
      // 1. 读取音频文件并转换为 Base64
      const audioBase64 = await this.fileToBase64(audioPath);

      // 2. 构建符合 OpenAPI 规范的请求体
      const requestBody: Record<string, unknown> = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inline_data: {
                  mime_type: 'audio/mp3',
                  data: audioBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
      };

      // 添加系统指令（如果提供）
      if (systemInstruction) {
        (requestBody.contents as any)[0].parts.unshift({
          text: systemInstruction,
        });
      }

      // 3. 发送请求到 yunwu.ai
      const apiUrl = `${this.endpoint}/v1beta/models/gemini-2.5-pro:generateContent?key=${this.apiKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Gemini API error: ${response.status} - ${errorText}`) as any;
        error.statusCode = response.status;
        throw error;
      }

      const data = await response.json();

      // 提取生成的文本
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!generatedText) {
        throw new Error('Empty response from API');
      }

      return {
        success: true,
        data: generatedText,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: `Gemini API timeout after ${this.timeout}ms`,
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
   * 图片理解 API
   *
   * @param imagePath 图片文件路径
   * @param prompt 分析提示词
   * @param systemInstruction 系统指令
   */
  async analyzeImage(
    imagePath: string,
    prompt: string,
    systemInstruction?: string
  ): Promise<GeminiResponse<string>> {
    try {
      // 1. 读取图片文件并转换为 base64
      const imageBase64 = await this.fileToBase64(imagePath);

      // 2. 构建符合 OpenAPI 规范的请求体
      const requestBody: Record<string, unknown> = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: imageBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      };

      // 添加系统指令（如果提供）
      if (systemInstruction) {
        (requestBody.contents as any)[0].parts.unshift({
          text: systemInstruction,
        });
      }

      // 3. 发送请求到 yunwu.ai
      const apiUrl = `${this.endpoint}/v1beta/models/gemini-2.5-pro:generateContent?key=${this.apiKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Gemini API error: ${response.status} - ${errorText}`) as any;
        error.statusCode = response.status;
        throw error;
      }

      const data = await response.json();

      // 提取生成的文本
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!generatedText) {
        throw new Error('Empty response from API');
      }

      return {
        success: true,
        data: generatedText,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: `Gemini API timeout after ${this.timeout}ms`,
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
   * 分析视频内容（智能模式：优先采样，必要时上传）
   * @param videoPath 视频文件路径
   * @param sampleFrames 采样的关键帧 Base64 数组（可选）
   * @param onProgress 进度回调
   */
  /**
   * 分析视频内容（智能模式：优先采样，必要时上传）
   * @param videoPath 视频文件路径
   * @param sampleFrames 采样的关键帧 Base64 数组（可选）
   * @param onProgress 进度回调
   * @param audioAnalysis 音频分析结果（可选，JSON 字符串）
   */
  async analyzeVideo(
    videoPath: string,
    sampleFrames?: string[],
    onProgress?: (progress: number, message: string) => void,
    audioAnalysis?: string
  ): Promise<GeminiResponse<VideoAnalysis>> {
    const systemInstruction = `你是一位资深的短剧导演和爆款内容分析师。
你的任务是对输入的短剧片段进行全维度拆解，输出结构化的 JSON 数据。

**重要**：请同时分析视觉内容（画面）和听觉内容（配音、配乐、音效）。
- 画面：人物表情、动作、场景、镜头切换
- 配音：对白、旁白、情绪表达
- 配乐：背景音乐的风格、节奏、情绪烘托
- 音效：关键音效（反转、冲突、高光时刻）

返回的 JSON 必须严格遵循指定的 schema，不要添加任何额外的注释或说明。`;

    const prompt = `请分析以下视频，返回结构化的 JSON 数据。

${sampleFrames && sampleFrames.length > 0 ? `已提供 ${sampleFrames.length} 个关键帧用于分析（高密度采样，能捕捉更多细节）。` : '已上传完整视频文件（包含画面和音频）。'}

${audioAnalysis ? `**音频分析结果**（已单独分析）：\n${audioAnalysis}\n\n请结合这些音频信息，将对话和音效准确地匹配到对应的镜头中。` : '**分析要求**：请同时分析画面和音频（配音、配乐、音效）。'}

**分析维度**：
1. **视觉分析**：人物动作、表情变化、场景切换、镜头运动
2. **听觉分析**：
   - 对白：角色台词（尽量准确提取）
   - 配音：情感表达（语气、语调）
   - 配乐：BGM 风格（紧张、浪漫、悲伤等）
   - 音效：关键音效（耳光、哭声、玻璃破碎等）

请返回以下 JSON 格式的分析结果：
\`\`\`json
{
  "summary": "一句话剧情梗概（50字以内）",
  "enhancedSummary": {
    "openingState": {
      "connectionToPrevious": "与上一集的连接（如：承接上集结尾的XX场景）",
      "initialSituation": "初始情境（如：角色A在某地，准备做XX）",
      "charactersStatus": ["主角A：愤怒", "配角B：悲伤"]
    },
    "coreEvents": [
      {
        "timestampMs": 15000,
        "description": "事件描述（如：角色A与角色B发生争执）",
        "importance": "high"
      }
    ],
    "endingState": {
      "cliffhanger": "悬念/钩子（如：角色C突然说出惊人真相）",
      "foreshadowing": ["伏笔1", "伏笔2"],
      "unresolved": ["未解决问题1", "未解决问题2"]
    },
    "characterArcs": [
      {
        "characterName": "角色A",
        "emotionStart": "愤怒",
        "emotionEnd": "悲伤",
        "change": "从愤怒转为悲伤，因为得知真相"
      }
    ],
    "keyElements": {
      "props": ["重要道具1", "重要道具2"],
      "locations": ["场景1", "场景2"],
      "symbols": ["象征1", "象征2"]
    }
  },
  "scenes": [
    {
      "startMs": 12340,
      "endMs": 45670,
      "description": "详细的动作描述",
      "emotion": "愤怒/反转/惊喜/恐惧",
      "dialogue": "核心台词内容（如果有）",
      "characters": ["角色1", "角色2"],
      "viralScore": 8.5,
      "audioInfo": {
        "hasDialogue": true,
        "bgmStyle": "紧张/悲伤/浪漫/欢快",
        "soundEffects": ["耳光声", "哭声"]
      }
    }
  ],
  "storylines": ["复仇线", "身份曝光线", "爱情线"],
  "viralScore": 9.2,
  "highlights": [15000, 45000, 78000],
  "durationMs": 120000
}
\`\`\`

**注意**：
1. summary 保持简短（50字以内），用于快速浏览
2. enhancedSummary 必须详细，用于跨集连贯性分析和深度解说模式
3. coreEvents 按 timestampMs 排序，记录剧情转折点
4. endingState 的 cliffhanger 对于短剧非常重要（下集预告的钩子）
5. characterArcs 记录角色情感变化轨迹
6. keyElements 中的 symbols 会用于深度解说的语义搜索

${sampleFrames && sampleFrames.length > 100 ? `注意：由于提供了高密度的关键帧采样（${sampleFrames.length} 帧），请仔细分析帧与帧之间的连贯性和变化，准确捕捉每个镜头的起止时间。` : ''}`;

    onProgress?.(20, '准备 AI 分析...');

    // 根据是否有采样帧选择不同的调用方式
    let response: GeminiResponse;

    if (sampleFrames && sampleFrames.length > 0) {
      // 使用关键帧采样（更快、更便宜）
      response = await this.callApi(prompt, systemInstruction);
    } else {
      // 直接上传视频（更准确，包含音频）
      response = await this.analyzeVideoWithUpload(videoPath, prompt, systemInstruction, onProgress);
    }

    if (!response.success || !response.data) {
      return response as GeminiResponse<VideoAnalysis>;
    }

    // 解析 JSON 响应
    const parsed = this.parseJsonResponse<VideoAnalysis>(response.data as string);

    if (!parsed) {
      return {
        success: false,
        error: 'Failed to parse video analysis response',
      };
    }

    return {
      ...response,
      data: parsed,
    };
  }

  /**
   * 检测高光时刻（模式 A）
   * @param videoPath 视频文件路径（必须提供，用于上传视频）
   * @param analysis 之前的视频分析结果
   * @param count 需要返回的高光数量
   */
  async findHighlights(videoPath: string, analysis: VideoAnalysis, count = 100): Promise<GeminiResponse<HighlightMoment[]>> {
    const systemInstruction = `你是一位专业的短视频内容分析师。
你的任务是在提供的视频数据中，找出最具观众吸引力的精彩瞬间。
重点关注：戏剧性冲突、情感转折、剧情反转、高潮时刻。

**重要**：你必须观看实际视频画面来检测高光时刻，不能仅基于文字描述编造内容。
每个高光时刻都必须对应真实存在的画面和情节。`;

    const prompt = `我已上传了完整的视频文件，请你观看视频并找出 ${count} 个最具爆款潜力的高光时刻。

参考信息（帮助你理解视频内容）：
**视频时长**: ${Math.floor((analysis.durationMs || 0) / 1000)} 秒
**剧情梗概**: ${analysis.summary || '暂无'}
${analysis.storylines ? `**故事线**: ${analysis.storylines.join('、')}` : ''}

**初步场景分析**（仅供参考，请以实际视频为准）:
${analysis.scenes?.slice(0, 10).map((s, i) => `${i + 1}. [${this.formatTime(s.startMs)} - ${this.formatTime(s.endMs)}] ${s.description} (${s.emotion}, 爆款分数: ${s.viralScore}/10)`).join('\n') || '暂无场景分析'}

请返回以下 JSON 格式：
\`\`\`json
{
  "highlights": [
    {
      "timestampMs": 15400,
      "reason": "推荐理由（30字以内，描述实际看到的画面）",
      "viralScore": 9.5,
      "category": "conflict|emotional|reversal|climax|other",
      "suggestedDuration": 90
    }
  ]
}
\`\`\`

**注意**：
1. 必须基于实际视频内容，不要编造不存在的情节
2. timestampMs 必须精确到毫秒
3. reason 必须描述真实看到的画面（如："角色A说出反转台词"，而不是可能的反转）`;

    // 使用视频上传方式调用 API（让 Gemini 能看到实际视频）
    const response = await this.analyzeVideoWithUpload(videoPath, prompt, systemInstruction);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Failed to analyze video',
      } as GeminiResponse<HighlightMoment[]>;
    }

    const parsed = this.parseJsonResponse<{ highlights: HighlightMoment[] }>(response.data as string);

    if (!parsed) {
      return {
        success: false,
        error: 'Failed to parse highlights response',
      };
    }

    return {
      ...response,
      data: parsed.highlights,
    };
  }

  /**
   * 检测病毒式传播时刻（模式 A - 高光智能切片）
   * 符合 types/api-contracts.ts 接口契约
   *
   * @param videoPath 视频文件路径
   * @param config 配置选项
   * @returns ViralMoment[] 完全符合接口契约
   */
  async detectViralMoments(
    videoPath: string,
    config?: {
      minConfidence?: number;
      maxResults?: number;
    }
  ): Promise<GeminiResponse<ViralMoment[]>> {
    const { minConfidence = 0.7, maxResults = 10 } = config || {};

    // 首先进行视频分析
    const analysisResponse = await this.analyzeVideo(videoPath);

    if (!analysisResponse.success || !analysisResponse.data) {
      return {
        success: false,
        error: analysisResponse.error || 'Failed to analyze video',
      };
    }

    const analysis = analysisResponse.data;

    // 然后检测高光时刻（传递 videoPath 让 Gemini 能看到实际视频）
    const highlightsResponse = await this.findHighlights(videoPath, analysis, maxResults);

    if (!highlightsResponse.success || !highlightsResponse.data) {
      return {
        success: false,
        error: highlightsResponse.error || 'Failed to find highlights',
      };
    }

    // 转换 HighlightMoment 为 ViralMoment（符合接口契约）
    const viralMoments: ViralMoment[] = highlightsResponse.data.map((highlight) => {
      const timestampMs = highlight.timestampMs;
      const suggestedDuration = highlight.suggestedDuration || 60; // 默认 60 秒
      const viralScore = highlight.viralScore || 5; // 默认 5

      return {
        timestampMs,
        type: this.mapCategoryToType(highlight.category || 'highlight'), // 映射 category 到 type
        confidence: viralScore / 10, // 转换 0-10 到 0-1
        description: highlight.description,
        suggestedStartMs: timestampMs, // 开始时间
        suggestedEndMs: timestampMs + (suggestedDuration * 1000), // 结束时间（毫秒）

        // 保留原有字段
        viralScore,
        category: highlight.category,
        suggestedDuration,
      };
    });

    // 过滤低于置信度的结果
    const filtered = viralMoments.filter(vm => vm.confidence >= minConfidence);

    return {
      ...highlightsResponse,
      data: filtered,
    };
  }

  /**
   * 映射 category 到 type
   */
  private mapCategoryToType(
    category: string
  ): 'plot_twist' | 'reveal' | 'conflict' | 'emotional' | 'climax' {
    const mapping: Record<string, 'plot_twist' | 'reveal' | 'conflict' | 'emotional' | 'climax'> = {
      'reversal': 'plot_twist',
      'climax': 'emotional',
      'conflict': 'conflict',
      'emotional': 'emotional',
      'other': 'climax',
    };

    return mapping[category] || 'climax';
  }

  /**
   * 提取故事线（符合 types/api-contracts.ts 接口契约）
   *
   * @param videoPath 视频文件路径
   * @param minCount 最少故事线数量（默认：3）
   * @returns Storyline[] 故事线数组
   */
  async extractStorylines(
    videoPath: string,
    minCount: number = 3
  ): Promise<GeminiResponse<Storyline[]>> {
    // 1. 分析视频
    const analysisResponse = await this.analyzeVideo(videoPath);

    if (!analysisResponse.success || !analysisResponse.data) {
      return {
        success: false,
        error: analysisResponse.error || 'Failed to analyze video',
      };
    }

    const analysis = analysisResponse.data;

    // 2. 提取故事线
    const storylinesResponse = await this.extractStorylinesFromAnalysis(analysis);

    if (!storylinesResponse.success || !storylinesResponse.data) {
      return storylinesResponse;
    }

    let storylines = storylinesResponse.data;

    // 3. 过滤：如果故事线数量不足，按吸引力分数排序后取前 N 个
    if (storylines.length < minCount) {
      console.warn(`⚠️  只提取到 ${storylines.length} 条故事线，少于要求的 ${minCount} 条`);
    }

    // 按吸引力分数降序排序
    storylines.sort((a, b) => b.attractionScore - a.attractionScore);

    return {
      ...storylinesResponse,
      data: storylines,
    };
  }

  /**
   * 生成解说文案（符合 types/api-contracts.ts 接口契约）
   *
   * @param storyline 故事线对象
   * @param style 文案风格：hook | suspense | emotional | roast
   * @returns string 纯文本文案
   */
  async generateNarration(
    storyline: Storyline,
    style: "hook" | "suspense" | "emotional" | "roast"
  ): Promise<GeminiResponse<string>> {
    // 1. 生成解说文案（调用现有方法）
    const scriptsResponse = await this.generateRecapScripts(storyline, [style]);

    if (!scriptsResponse.success || !scriptsResponse.data) {
      return {
        success: false,
        error: scriptsResponse.error || 'Failed to generate narration',
      };
    }

    const scripts = scriptsResponse.data;

    if (scripts.length === 0) {
      return {
        success: false,
        error: 'No scripts generated',
      };
    }

    // 2. 提取第一个脚本的文本内容
    const script = scripts[0];

    // 3. 组合标题 + 段落文本
    const fullText = `${script.title}\n\n${script.paragraphs.map(p => p.text).join('\n\n')}`;

    return {
      success: true,
      data: fullText,
    };
  }

  /**
   * 生成解说文案（流式响应版本）
   *
   * @param storyline 故事线对象
   * @param style 文案风格：hook | suspense | emotional | roast
   * @param onChunk 流式回调函数
   * @returns Promise<string> 完整文本
   */
  async generateNarrationStream(
    storyline: Storyline,
    style: "hook" | "suspense" | "emotional" | "roast",
    onChunk: (chunk: import('./utils/streaming').StreamChunk) => void | Promise<void>
  ): Promise<GeminiResponse<string>> {
    // 1. 先生成完整文本（使用非流式 API）
    const response = await this.generateNarration(storyline, style);

    if (!response.success || !response.data) {
      return response;
    }

    const fullText = response.data;

    // 2. 模拟流式输出（将文本分块推送）
    const chunkSize = 20; // 每次推送 20 个字符
    const chunks: string[] = [];

    for (let i = 0; i < fullText.length; i += chunkSize) {
      chunks.push(fullText.slice(i, i + chunkSize));
    }

    // 3. 逐块推送
    for (let i = 0; i < chunks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 30)); // 模拟延迟

      onChunk({
        text: chunks[i],
        done: i === chunks.length - 1,
        index: i,
      });
    }

    return response;
  }

  /**
   * 调用 Gemini API 并流式返回响应
   *
   * @param prompt 提示词
   * @param systemInstruction 系统指令
   * @param onChunk 流式回调
   * @returns Promise<string> 完整响应
   */
  async callApiStream(
    prompt: string,
    systemInstruction: string | undefined,
    onChunk: (chunk: import('./utils/streaming').StreamChunk) => void | Promise<void>
  ): Promise<GeminiResponse<string>> {
    // 注意：当前 Gemini API 可能不支持原生流式
    // 这里使用模拟流式（完整生成后分块推送）

    // 1. 先调用非流式 API 获取完整响应
    const response = await this.callApi(prompt, systemInstruction);

    if (!response.success || !response.data) {
      return response as GeminiResponse<string>;
    }

    const fullText = response.data as string;

    // 2. 模拟流式输出
    const chunkSize = 15;
    const chunks: string[] = [];

    for (let i = 0; i < fullText.length; i += chunkSize) {
      chunks.push(fullText.slice(i, i + chunkSize));
    }

    // 3. 逐块推送
    for (let i = 0; i < chunks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 20));

      onChunk({
        text: chunks[i],
        done: i === chunks.length - 1,
        index: i,
      });
    }

    return response as GeminiResponse<string>;
  }

  /**
   * 提取故事线（模式 B）
   * @deprecated 使用 extractStorylinesFromAnalysis 或公共方法 extractStorylines
   * @internal
   */
  async extractStorylinesFromAnalysis(analysis: VideoAnalysis): Promise<GeminiResponse<Storyline[]>> {
    const systemInstruction = `你是一位资深的故事架构师。
你的任务是从短剧中提取所有独立的故事线，并分析每条线的吸引力。`;

    const prompt = `基于以下视频分析结果，请提取所有独立的故事线：

**剧情梗概**：${analysis.summary}

**场景列表**：
${analysis.scenes.map((s, i) => `${i + 1}. [${this.formatTime(s.startMs)}] ${s.description}`).join('\n')}

请返回以下 JSON 格式：
\`\`\`json
{
  "storylines": [
    {
      "id": "storyline-1",
      "name": "复仇主线",
      "description": "女主从被陷害到成功复仇的完整故事",
      "scenes": [{"startMs": 10000, "endMs": 20000, "description": "场景描述"}],
      "attractionScore": 9.5
    }
  ]
}
\`\`\``;

    const response = await this.callApi(prompt, systemInstruction);

    if (!response.success || !response.data) {
      return response as GeminiResponse<Storyline[]>;
    }

    const parsed = this.parseJsonResponse<{ storylines: Storyline[] }>(response.data as string);

    if (!parsed) {
      return {
        success: false,
        error: 'Failed to parse storylines response',
      };
    }

    return {
      ...response,
      data: parsed.storylines,
    };
  }

  /**
   * 生成解说文案（模式 B）
   * @param storyline 选定的故事线
   * @param styles 需要生成的风格列表
   */
  async generateRecapScripts(storyline: Storyline, styles: RecapScript['style'][]): Promise<GeminiResponse<RecapScript[]>> {
    const systemInstruction = `你是一位专业的短视频解说文案作者。
你擅长创作具有高点击率的解说文案，特别是前 3 秒的黄金钩子。
文案中需要嵌入画面建议标记 [Video_Cue: 角色名称+动作描述]。`;

    const prompt = `基于以下故事线，请生成 ${styles.length} 种风格的解说文案：

**故事线**：${storyline.name}
**描述**：${storyline.description}
**场景**：${storyline.scenes.map(s => s.description).join(' → ')}

请生成以下风格的文案：${styles.join('、')}

请返回以下 JSON 格式：
\`\`\`json
{
  "scripts": [
    {
      "storylineId": "${storyline.id}",
      "style": "hook",
      "title": "你敢信？这个穷小子竟然是...",
      "paragraphs": [
        {
          "text": "解说文案内容",
          "videoCues": ["画面建议1", "画面建议2"]
        }
      ],
      "estimatedDurationMs": 90000
    }
  ]
}
\`\`\``;

    const response = await this.callApi(prompt, systemInstruction);

    if (!response.success || !response.data) {
      return response as GeminiResponse<RecapScript[]>;
    }

    const parsed = this.parseJsonResponse<{ scripts: RecapScript[] }>(response.data as string);

    if (!parsed) {
      return {
        success: false,
        error: 'Failed to parse recap scripts response',
      };
    }

    return {
      ...response,
      data: parsed.scripts,
    };
  }

  /**
   * 项目级全局分析（模式 B - 深度解说模式）
   *
   * 分析整个项目的所有集数，识别跨集的完整故事线
   * 这是实现连贯性分析的核心功能
   *
   * @param videos 视频对象数组（必须按集数排序，包含 episodeNumber 和 summary）
   * @param enhancedSummaries 增强摘要映射（videoId -> EnhancedSummary）
   * @param keyframesMap 关键帧路径映射（videoId -> keyframe paths）
   * @returns ProjectStorylines 项目级故事线分析结果
   */
  async analyzeProjectStorylines(
    videos: Video[],
    enhancedSummaries?: Map<number, EnhancedSummary>,
    keyframesMap?: Map<number, string[]>
  ): Promise<GeminiResponse<ProjectStorylines>> {
    if (videos.length === 0) {
      return {
        success: false,
        error: '没有提供视频数据',
      };
    }

    // 验证所有视频都有集数信息
    const videosWithoutEpisode = videos.filter(v => !v.episodeNumber);
    if (videosWithoutEpisode.length > 0) {
      return {
        success: false,
        error: `${videosWithoutEpisode.length} 个视频缺少集数信息，无法进行项目级分析`,
      };
    }

    const systemInstruction = `你是一位资深的电视剧编剧和故事架构师。
你的任务是分析一部连续剧的完整项目，识别跨越多集的主要故事线和人物关系变化。

你需要从整体角度理解剧情，而不是单集分析。${keyframesMap && keyframesMap.size > 0 ? '\n\n你可以使用提供的关键帧（16帧/集）来验证跨集的视觉连贯性，确保人物服装、场景、道具在不同集数中的一致性。' : ''}`;

    // 构建增强剧集列表信息
    const episodeList = videos
      .sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0))
      .map((v, index) => {
        const epNum = v.episodeNumber || index + 1;
        const summary = v.summary || '（暂无剧情梗概）';
        const durationMin = Math.floor(v.durationMs / 60000);
        let episodeInfo = `第${epNum}集：《${v.displayTitle || v.filename}》（${durationMin}分钟）\n剧情梗概：${summary}`;

        // 如果有增强摘要，添加连贯性信息
        if (enhancedSummaries && enhancedSummaries.has(v.id)) {
          const enhanced = enhancedSummaries.get(v.id)!;

          // 添加开头状态
          if (enhanced.openingState) {
            episodeInfo += `\n  📍 开头状态：${enhanced.openingState.initialSituation}`;
            if (enhanced.openingState.connectionToPrevious) {
              episodeInfo += `\n  🔗 连接上集：${enhanced.openingState.connectionToPrevious}`;
            }
          }

          // 添加核心事件（只显示 high 重要性）
          if (enhanced.coreEvents && enhanced.coreEvents.length > 0) {
            const highImportanceEvents = enhanced.coreEvents.filter(e => e.importance === 'high');
            if (highImportanceEvents.length > 0) {
              episodeInfo += `\n  🎬 关键事件：`;
              highImportanceEvents.forEach(e => {
                const timeSec = Math.floor(e.timestampMs / 1000);
                episodeInfo += `\n     - ${timeSec}秒: ${e.description}`;
              });
            }
          }

          // 添加结尾悬念
          if (enhanced.endingState && enhanced.endingState.cliffhanger) {
            episodeInfo += `\n  🎭 结尾悬念：${enhanced.endingState.cliffhanger}`;
          }

          // 添加角色弧光
          if (enhanced.characterArcs && enhanced.characterArcs.length > 0) {
            episodeInfo += `\n  👥 角色变化：`;
            enhanced.characterArcs.forEach(arc => {
              episodeInfo += `\n     - ${arc.characterName}: ${arc.emotionStart} → ${arc.emotionEnd} (${arc.change})`;
            });
          }
        }

        // 如果有关键帧，标注数量
        if (keyframesMap && keyframesMap.has(v.id)) {
          const keyframes = keyframesMap.get(v.id)!;
          episodeInfo += `\n  📸 关键帧：已提供 ${keyframes.length} 帧用于视觉连贯性验证`;
        }

        return episodeInfo;
      })
      .join('\n\n---\n\n');

    const prompt = `我有一部包含 ${videos.length} 集的连续剧项目，请进行项目级全局分析。

**剧集列表**：
${episodeList}

**分析任务**：
1. **主线剧情**：总结整个项目的主线剧情（100字以内）
2. **支线数量**：识别有多少条支线剧情
3. **人物关系**：分析主要角色在不同集数中的状态和关系变化
4. **伏笔设置**：识别伏笔的设置和揭晓（如：第1集15秒设置的骨血灯秘密，在第5集10秒揭晓）
5. **跨集高光**：找出跨越多集的精彩片段（如：从昏迷到逃生的完整情节，跨越第1集结尾到第2集开头）
6. **主要故事线**：提取3-5条最重要的故事线（如：复仇线、爱情线、身份谜团线），每条故事线跨越多个集数

请返回以下 JSON 格式：
\`\`\`json
{
  "mainPlot": "整个项目的主线剧情梗概（100字以内）",
  "subplotCount": 3,
  "characterRelationships": {
    "ep1": {
      "婉清": ["受欺负", "隐忍"],
      "男主": ["冷漠", "误会"]
    },
    "ep3": {
      "婉清": ["觉醒", "反击"],
      "男主": ["震惊", "愧疚"]
    },
    "ep5": {
      "婉清": ["成功复仇"],
      "男主": ["真心悔改"]
    }
  },
  "foreshadowings": [
    {
      "set_up": "ep1-15:00",
      "payoff": "ep5-10:00",
      "description": "骨血灯秘密：婉清身世之谜"
    },
    {
      "set_up": "ep2-20:00",
      "payoff": "ep8-05:00",
      "description": "男主的真实身份"
    }
  ],
  "crossEpisodeHighlights": [
    {
      "start_ep": 1,
      "start_ms": 85000,
      "end_ep": 2,
      "end_ms": 15000,
      "description": "从昏迷到逃生的完整情节（跨越第1集结尾到第2集开头）"
    }
  ],
  "storylines": [
    {
      "name": "复仇线",
      "description": "女主婉清从受辱到成功复仇的完整历程",
      "attractionScore": 9.5,
      "category": "revenge",
      "segments": [
        {
          "videoId": 1,
          "startMs": 10000,
          "endMs": 25000,
          "description": "婉清受辱，发誓复仇"
        },
        {
          "videoId": 3,
          "startMs": 50000,
          "endMs": 70000,
          "description": "婉清觉醒，开始反击"
        },
        {
          "videoId": 5,
          "startMs": 80000,
          "endMs": 95000,
          "description": "成功复仇，大仇得报"
        }
      ]
    },
    {
      "name": "爱情线",
      "description": "男主从冷漠误见到真心悔改的情感转变",
      "attractionScore": 8.5,
      "category": "romance",
      "segments": [
        {
          "videoId": 1,
          "startMs": 30000,
          "endMs": 45000,
          "description": "初次相遇，冷漠对待"
        },
        {
          "videoId": 4,
          "startMs": 60000,
          "endMs": 75000,
          "description": "逐渐了解，心生好感"
        },
        {
          "videoId": 6,
          "startMs": 40000,
          "endMs": 55000,
          "description": "真心悔改，挽回爱情"
        }
      ]
    },
    {
      "name": "身份谜团线",
      "description": "婉清身世之谜的揭开过程",
      "attractionScore": 8.8,
      "category": "mystery",
      "segments": [
        {
          "videoId": 1,
          "startMs": 15000,
          "endMs": 20000,
          "description": "骨血灯秘密的伏笔"
        },
        {
          "videoId": 3,
          "startMs": 30000,
          "endMs": 40000,
          "description": "发现线索，开始调查"
        },
        {
          "videoId": 5,
          "startMs": 10000,
          "endMs": 25000,
          "description": "身世真相大白"
        }
      ]
    }
  ]
}
\`\`\`

**重要说明**：
1. **videoId** 必须使用实际的数据库视频 ID（${videos.map(v => v.id).join(', ')}）
2. **集数引用** 使用 "epN" 格式（如 ep1, ep2, ep3）
3. **时间戳** 使用集数-秒数格式（如 ep1-15:00 表示第1集15秒处）
4. **category** 选项：revenge（复仇）、romance（爱情）、identity（身份）、mystery（谜团）、power（权力）、family（家庭）、suspense（悬疑）、other（其他）
5. **segments** 中的每个片段都必须真实存在于对应的视频中
6. **时间估算**：如果不知道精确时间戳，可以根据集数估算（如第1集25分钟的视频，15:00 表示中间位置）
7. **故事线质量**：只提取最重要的3-5条故事线，每条线跨越2-5集，有明确的起承转合`;

    console.log(`🎬 [项目分析] 开始分析 ${videos.length} 集视频的跨集故事线`);

    const response = await this.callApi(prompt, systemInstruction);

    if (!response.success || !response.data) {
      return response as GeminiResponse<ProjectStorylines>;
    }

    const parsed = this.parseJsonResponse<ProjectStorylines>(response.data as string);

    if (!parsed) {
      return {
        success: false,
        error: 'Failed to parse project storylines response',
      };
    }

    console.log(`✅ [项目分析] 识别到 ${parsed.storylines.length} 条跨集故事线`);
    console.log(`   - 主线剧情：${parsed.mainPlot}`);
    console.log(`   - 支线数量：${parsed.subplotCount}`);
    console.log(`   - 伏笔数量：${parsed.foreshadowings.length}`);
    console.log(`   - 跨集高光：${parsed.crossEpisodeHighlights.length}`);

    return {
      ...response,
      data: parsed,
    };
  }

  /**
   * 格式化时间（毫秒 -> HH:MM:SS.mmm）
   */
  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;

    const pad = (n: number, size: number) => n.toString().padStart(size, '0');

    return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(milliseconds, 3)}`;
  }
}

// ============================================
// 导出单例实例（懒加载）
// ============================================

let clientInstance: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!clientInstance) {
    clientInstance = new GeminiClient();
  }
  return clientInstance;
}

// 向后兼容：导出一个 getter
export const geminiClient = new Proxy({} as GeminiClient, {
  get(target, prop) {
    const client = getGeminiClient();
    return client[prop as keyof GeminiClient];
  }
});
