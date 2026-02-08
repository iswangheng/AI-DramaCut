// ============================================
// Gemini 3 API 客户端
// 用于视频分析、场景理解、高光检测
// ============================================

import { geminiConfig } from '../config';

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
}

/**
 * 视频分析结果
 */
export interface VideoAnalysis {
  summary: string; // 一句话剧情梗概
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

  constructor() {
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
   * 通用 Gemini API 调用方法（公共方法，用于测试）
   */
  async callApi(prompt: string, systemInstruction?: string): Promise<GeminiResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

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
      // yunwu.ai 使用 Gemini 原生格式
      const apiUrl = this.isYunwu
        ? `${this.endpoint}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`  // 非流式端点
        : `${this.endpoint}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // 根据不同的 API 格式提取生成的文本
      let generatedText: string;
      let usage: any;

      // yunwu.ai 和标准 Gemini 都返回相同的原生格式
      generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      usage = data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0,
          }
        : undefined;

      if (!generatedText) {
        throw new Error('Empty response from API');
      }

      return {
        success: true,
        data: generatedText,
        usage,
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
   * 解析 JSON 响应（带重试机制）
   */
  private parseJsonResponse<T>(text: string, retries = 3): T | null {
    for (let i = 0; i < retries; i++) {
      try {
        // 尝试提取 JSON（处理 markdown 代码块）
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        const jsonText = jsonMatch ? jsonMatch[1] : text;
        return JSON.parse(jsonText) as T;
      } catch (error) {
        if (i === retries - 1) {
          console.error('Failed to parse JSON response after retries:', error);
          return null;
        }
      }
    }
    return null;
  }

  /**
   * 分析视频内容（预分析）
   * @param videoPath 视频文件路径
   * @param sampleFrames 采样的关键帧 Base64 数组
   */
  async analyzeVideo(videoPath: string, sampleFrames?: string[]): Promise<GeminiResponse<VideoAnalysis>> {
    const systemInstruction = `你是一位资深的短剧导演和爆款内容分析师。
你的任务是对输入的短剧片段进行全维度拆解，输出结构化的 JSON 数据。
返回的 JSON 必须严格遵循指定的 schema，不要添加任何额外的注释或说明。`;

    const prompt = `请分析以下视频文件：${videoPath}

${sampleFrames && sampleFrames.length > 0 ? `已提供 ${sampleFrames.length} 个关键帧用于分析。` : ''}

请返回以下 JSON 格式的分析结果：
\`\`\`json
{
  "summary": "一句话剧情梗概（50字以内）",
  "scenes": [
    {
      "startMs": 12340,
      "endMs": 45670,
      "description": "详细的动作描述",
      "emotion": "愤怒/反转/惊喜/恐惧",
      "dialogue": "核心台词内容（如果有）",
      "characters": ["角色1", "角色2"],
      "viralScore": 8.5
    }
  ],
  "storylines": ["复仇线", "身份曝光线", "爱情线"],
  "viralScore": 9.2,
  "highlights": [15000, 45000, 78000],
  "durationMs": 120000
}
\`\`\``;

    const response = await this.callApi(prompt, systemInstruction);

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
   * @param analysis 之前的视频分析结果
   * @param count 需要返回的高光数量
   */
  async findHighlights(analysis: VideoAnalysis, count = 100): Promise<GeminiResponse<HighlightMoment[]>> {
    const systemInstruction = `你是一位拥有上帝视角的爆款短视频制作人。
你的任务是在提供的视频数据中，找出具有"短视频钩子"潜力的瞬间。
重点关注：物理冲突（扇巴掌/推搡）、情感爆发（痛哭/狂笑）、身份反转（下跪/掏黑卡）、悬念高潮。`;

    const prompt = `基于以下视频分析结果，请找出 ${count} 个最具爆款潜力的高光时刻：

**剧情梗概**：${analysis.summary}

**故事线**：${analysis.storylines.join('、')}

**已有场景**：
${analysis.scenes.map((s, i) => `${i + 1}. [${this.formatTime(s.startMs)} - ${this.formatTime(s.endMs)}] ${s.description} (${s.emotion}, 分数: ${s.viralScore})`).join('\n')}

请返回以下 JSON 格式：
\`\`\`json
{
  "highlights": [
    {
      "timestampMs": 15400,
      "reason": "推荐理由（30字以内）",
      "viralScore": 9.5,
      "category": "conflict|emotional|reversal|climax|other",
      "suggestedDuration": 90
    }
  ]
}
\`\`\``;

    const response = await this.callApi(prompt, systemInstruction);

    if (!response.success || !response.data) {
      return response as GeminiResponse<HighlightMoment[]>;
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

    // 然后检测高光时刻
    const highlightsResponse = await this.findHighlights(analysis, maxResults);

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

      return {
        timestampMs,
        type: this.mapCategoryToType(highlight.category), // 映射 category 到 type
        confidence: highlight.viralScore / 10, // 转换 0-10 到 0-1
        description: highlight.reason,
        suggestedStartMs: timestampMs, // 开始时间
        suggestedEndMs: timestampMs + (suggestedDuration * 1000), // 结束时间（毫秒）

        // 保留原有字段
        viralScore: highlight.viralScore,
        category: highlight.category,
        suggestedDuration: highlight.suggestedDuration,
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
   * 提取故事线（模式 B）
   */
  async extractStorylines(analysis: VideoAnalysis): Promise<GeminiResponse<Storyline[]>> {
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
// 导出单例实例
// ============================================
export const geminiClient = new GeminiClient();
