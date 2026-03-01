// ============================================
// 杭州雷鸣 - 训练工具模块
// 用于执行完整的训练流程
// ============================================

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { extractKeyframes } from '../video/keyframes';
import { transcribeAudioSegment } from '../audio/transcriber';
import { getGeminiClient } from '../api/gemini';
import { PromptLoader, PROMPTS } from '../prompts/loader';
import type { HLMarking, HLVideo } from '../db/schema';

// ============================================
// 类型定义
// ============================================

export interface MarkingAnalysisResult {
  marking: HLMarking;
  keyframes: {
    framePaths: string[];
    timestamps: number[];
  };
  asr: {
    text: string;
    segments: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  };
  analysis?: any;  // Gemini分析结果
}

export interface TrainingConfig {
  trainingId: number;
  projectId: number;
  markings: HLMarking[];
  concurrency?: number;  // 并发数，默认5
  onProgress?: (progress: number, step: string) => void;
}

// ============================================
// 训练执行类
// ============================================

export class TrainingExecutor {
  private geminiClient = getGeminiClient();
  private config: TrainingConfig;

  constructor(config: TrainingConfig) {
    this.config = config;
  }

  /**
   * 执行完整训练流程
   */
  async execute(): Promise<void> {
    const { trainingId, markings, onProgress } = this.config;

    console.log(`🚀 [训练中心] 开始训练，ID: ${trainingId}`);
    console.log(`📊 标记数量: ${markings.length}`);

    try {
      // ========================================
      // 阶段2: 提取视频特征（10% → 50%）
      // ========================================
      onProgress?.(10, '提取视频特征...');
      const markingsWithFeatures = await this.extractAllMarkingsFeatures(markings);

      // ========================================
      // 阶段3: AI深度分析（50% → 80%）
      // ========================================
      onProgress?.(50, 'AI深度分析标记点...');
      await this.analyzeAllMarkings(markingsWithFeatures);

      // ========================================
      // 阶段4: 生成技能文件（80% → 95%）
      // ========================================
      onProgress?.(80, '生成技能文件...');
      const skillContent = await this.generateSkillFile(markingsWithFeatures);

      // 保存技能文件
      const skillFileName = await this.saveSkillFile(skillContent);

      onProgress?.(95, '训练完成');

      console.log(`✅ [训练中心] 训练完成，技能文件: ${skillFileName}`);
    } catch (error) {
      console.error(`❌ [训练中心] 训练失败:`, error);
      throw error;
    }
  }

  /**
   * 阶段2: 批量提取视频特征
   */
  private async extractAllMarkingsFeatures(markings: HLMarking[]): Promise<MarkingAnalysisResult[]> {
    const { concurrency = 5, onProgress } = this.config;
    const results: MarkingAnalysisResult[] = [];
    let skippedCount = 0;

    // 分批并发处理
    for (let i = 0; i < markings.length; i += concurrency) {
      const batch = markings.slice(i, i + concurrency);
      const batchNumber = Math.floor(i / concurrency) + 1;
      const totalBatches = Math.ceil(markings.length / concurrency);

      console.log(`\n📦 处理批次 ${batchNumber}/${totalBatches} (${batch.length}个标记)...`);

      const batchResults = await Promise.all(
        batch.map(async (marking) => {
          try {
            return await this.extractMarkingFeatures(marking);
          } catch (error) {
            // 跳过无效的标记点，但继续处理其他标记
            console.warn(`  ⚠️  跳过标记 ID ${marking.id}: ${error instanceof Error ? error.message : error}`);
            skippedCount++;
            return null;
          }
        })
      );

      // 过滤掉 null 结果（跳过的标记）
      const validResults = batchResults.filter((r): r is MarkingAnalysisResult => r !== null);
      results.push(...validResults);

      // 更新进度（10% → 50%）
      const progress = 10 + Math.floor(((i + concurrency) / markings.length) * 40);
      onProgress?.(progress, `提取视频特征 (${results.length}/${markings.length})`);
    }

    console.log(`\n✅ 特征提取完成，成功 ${results.length} 个标记，跳过 ${skippedCount} 个`);
    return results;
  }

  /**
   * 提取单个标记点的视频特征
   */
  private async extractMarkingFeatures(marking: HLMarking): Promise<MarkingAnalysisResult> {
    console.log(`\n📌 处理标记: ${marking.timestamp} (${marking.type})`);

    // 获取视频信息
    const video = await this.getVideo(marking.videoId);

    // 🔧 验证标记点时间是否在视频时长范围内
    const markingMs = marking.seconds * 1000;
    if (markingMs > video.durationMs) {
      throw new Error(
        `标记点时间 ${marking.seconds}秒 超出视频时长 ${(video.durationMs/1000).toFixed(1)}秒`
      );
    }

    // 提取关键帧（前后15秒，1fps = 30帧）
    // 优化：减少时间窗口，提高帧率，平衡质量和性能
    const windowSeconds = 15;
    const startMs = Math.max(0, (marking.seconds - windowSeconds) * 1000);
    const endMs = Math.min((marking.seconds + windowSeconds) * 1000, video.durationMs);

    console.log(`  📸 提取关键帧: ${(startMs/1000).toFixed(1)}s - ${(endMs/1000).toFixed(1)}s`);

    const keyframes = await extractKeyframes({
      videoPath: video.filePath,
      fps: 1,  // 1秒1帧（优化后）
      startTimeMs: startMs,
      endTimeMs: endMs,
      filenamePrefix: `marking_${marking.id}`,
    });

    console.log(`  ✅ 提取了 ${keyframes.framePaths.length} 帧关键帧`);

    // 转录音频（标记点前后10秒）
    const asrWindowSeconds = 10;
    const asrStartMs = (marking.seconds - asrWindowSeconds) * 1000;
    const asrEndMs = (marking.seconds + asrWindowSeconds) * 1000;

    console.log(`  🎙️ 转录音频: ${(Math.max(0, asrStartMs)/1000).toFixed(1)}s - ${(asrEndMs/1000).toFixed(1)}s`);

    const asr = await transcribeAudioSegment(
      video.filePath,
      Math.max(0, asrStartMs),
      asrEndMs,
      { model: 'tiny', language: 'zh' }
    );

    console.log(`  ✅ 转录完成: ${asr.text.length}字, ${asr.segments.length}个片段`);

    return {
      marking,
      keyframes,
      asr,
    };
  }

  /**
   * 阶段3: AI深度分析所有标记点
   */
  private async analyzeAllMarkings(results: MarkingAnalysisResult[]): Promise<void> {
    const { concurrency = 5, onProgress } = this.config;

    // 分批并发分析
    for (let i = 0; i < results.length; i += concurrency) {
      const batch = results.slice(i, i + concurrency);
      const batchNumber = Math.floor(i / concurrency) + 1;
      const totalBatches = Math.ceil(results.length / concurrency);

      console.log(`\n🤖 AI分析批次 ${batchNumber}/${totalBatches} (${batch.length}个标记)...`);

      await Promise.all(
        batch.map(async (result) => {
          result.analysis = await this.analyzeMarking(result);
        })
      );

      // 更新进度（50% → 80%）
      const progress = 50 + Math.floor(((i + concurrency) / results.length) * 30);
      onProgress?.(progress, `AI分析 (${i + concurrency}/${results.length})`);
    }

    console.log(`\n✅ AI分析完成，共 ${results.length} 个标记`);
  }

  /**
   * AI分析单个标记点
   */
  private async analyzeMarking(result: MarkingAnalysisResult): Promise<any> {
    const { marking, keyframes, asr } = result;

    // 1. 提取标记点前后的ASR文本（提前提取，用于降级方案）
    const centerMs = marking.seconds * 1000;
    const relevantSegments = asr.segments.filter(s => {
      const startMs = s.start * 1000;
      return startMs >= centerMs - 10000 && startMs <= centerMs + 10000;
    });
    const relevantText = relevantSegments.map(s => s.text).join(' ');

    console.log(`  📝 相关文本: "${relevantText.substring(0, 50)}..."`);

    // 2. 分析关键帧（Gemini Vision），传入 ASR 文本用于降级
    console.log(`  📸 分析关键帧 (${keyframes.framePaths.length}帧)...`);
    const frameAnalysis = await this.analyzeKeyframesWithGemini(keyframes, relevantText);

    // 3. 调用Gemini综合分析
    console.log(`  🤖 Gemini综合分析...`);

    // 加载Prompt
    const promptTemplate = await PromptLoader.load(PROMPTS.TRAINING.ANALYZE_MARKING);

    // 填充变量
    const video = await this.getVideo(marking.videoId);
    const prompt = PromptLoader.fill(promptTemplate, {
      marking_type: marking.type,
      timestamp: marking.timestamp,
      video_name: video.filename,
      start_time: this.formatMs(centerMs - 30000),
      end_time: this.formatMs(centerMs + 30000),
      transcript: relevantText || '（无对白）',
      frame_analysis: frameAnalysis,
      frame_count: keyframes.framePaths.length,
    });

    // 调用Gemini
    const response = await this.geminiClient.callApi(prompt);

    if (!response.success || !response.data) {
      throw new Error(`Gemini分析失败: ${response.error}`);
    }

    // 解析JSON响应
    const analysis = this.parseJsonResponse(response.data as string);

    console.log(`  ✅ 分析完成`);

    return analysis;
  }

  /**
   * Gemini Vision分析关键帧（批量分析所有帧）
   */
  private async analyzeKeyframesWithGemini(
    keyframes: { framePaths: string[]; timestamps: number[] },
    transcript?: string  // 可选：ASR转录文本
  ): Promise<string> {
    const { framePaths, timestamps } = keyframes;

    console.log(`  📸 Gemini Vision 分析 ${framePaths.length} 帧关键帧...`);

    if (framePaths.length === 0) {
      return '无关键帧';
    }

    try {
      // 1. 批量读取图片并转换为 base64
      const imagesData = await Promise.all(
        framePaths.map(async (framePath, index) => {
          const fs = await import('fs/promises');
          const base64 = await fs.readFile(framePath, 'base64');

          return {
            base64,
            timestamp: timestamps[index],
            index,
          };
        })
      );

      // 2. 构建分析提示词
      const prompt = `请分析这 ${imagesData.length} 帧连续的视频关键帧，按顺序描述每一帧的内容。

**分析要求**：
1. 按时间顺序逐帧描述（帧1、帧2、帧3...）
2. 每帧包含以下信息：
   - 画面内容（人物、场景、动作）
   - 表情和情绪
   - 镜头类型（特写、中景、远景等）
   - 光线和色调

**返回格式**：
帧1 [时间]: 画面描述（人物、动作、表情）
帧2 [时间]: 画面描述
...

**注意**：
- 这是短视频片段，帧与帧之间可能有情节连续性
- 关注情绪变化和视觉冲突点
- 识别可能吸引观众的视觉元素`;

      // 3. 构建 Gemini 请求（多模态）
      const parts: any[] = imagesData.map((img, index) => ({
        inline_data: {
          mime_type: 'image/jpeg',
          data: img.base64,
        },
      }));

      // 添加文本提示
      parts.push({
        text: prompt,
      });

      const requestBody = {
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT'],
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      };

      // 4. 调用 Gemini API
      const geminiConfig = await import('../config').then(m => m.geminiConfig);
      const apiKey = geminiConfig.apiKey;
      const endpoint = geminiConfig.endpoint || 'https://yunwu.ai';

      const apiUrl = `${endpoint}/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

      console.log(`  🚀 调用 Gemini Vision API (批量分析 ${imagesData.length} 帧)...`);

      // 设置超时（2分钟）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

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
        throw new Error(`Gemini Vision API 错误: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // 5. 解析响应
      const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!analysisText) {
        throw new Error('Gemini Vision 返回空响应');
      }

      console.log(`  ✅ Gemini Vision 分析完成 (${analysisText.length} 字)`);

      return analysisText;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // 检测是否为超时错误
      const isTimeout = errorMsg.includes('abort') || errorMsg.includes('timeout') || errorMsg.includes('AbortError');

      if (isTimeout) {
        console.error(`  ❌ Gemini Vision 分析超时（>2分钟），使用降级方案`);
      } else {
        console.error(`  ❌ Gemini Vision 分析失败: ${errorMsg}`);
      }

      // 降级方案：基于 ASR 进行简化分析
      console.log(`  ⚠️ 使用降级方案：基于 ASR 文本分析`);

      const fallbackAnalysis = await this.generateFallbackAnalysis(transcript, framePaths.length, timestamps);

      return fallbackAnalysis;
    }
  }

  /**
   * 生成基于 ASR 的降级分析（使用 DeepSeek）
   */
  private async generateFallbackAnalysis(
    transcript: string | undefined,
    frameCount: number,
    timestamps: number[]
  ): Promise<string> {
    const timeRange = `${this.formatMs(timestamps[0])} - ${this.formatMs(timestamps[timestamps.length - 1])}`;

    if (!transcript || transcript.trim() === '（无对白）' || transcript.trim() === '') {
      // 没有ASR文本，返回最小信息
      return `⚠️ [视觉分析超时] 无法提取画面特征

分析状态:
- 画面分析: 超时（>2分钟）
- 音频转录: 无对白
- 帧数: ${frameCount}帧
- 时间范围: ${timeRange}

建议:
- 该标记点缺少视觉和文本特征
- 技能生成时标记为"低置信度"
- 建议人工复核`;
    }

    // 使用 DeepSeek 分析 ASR 文本
    try {
      console.log(`  🤖 使用 DeepSeek 分析 ASR 文本...`);

      const geminiConfig = await import('../config').then(m => m.geminiConfig);
      const apiKey = geminiConfig.apiKey;
      const endpoint = geminiConfig.endpoint || 'https://yunwu.ai';

      // DeepSeek API（通过 yunwu.ai 代理，使用 Authorization header）
      const apiUrl = `${endpoint}/v1/chat/completions`;

      const prompt = `你是短剧剪辑分析师。请分析以下对白文本，提取情绪和特征。

**对白内容**：
${transcript}

**请分析并返回 JSON**：
\`\`\`json
{
  "emotion": "情绪类型（愤怒/激动/悲伤/疑惑/平静）",
  "intensity": 情绪强度（0-10的数字）,
  "dialogue_type": "台词类型（指责/告白/威胁/解释/质疑/命令）",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "tone": "语气描述",
  "reasoning": "简短分析（50字以内）"
}
\`\`\``;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`, // 使用 Authorization header
        },
        body: JSON.stringify({
          model: 'deepseek-chat', // 使用 deepseek-chat（更通用）
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`DeepSeek API 错误: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      if (!content) {
        throw new Error('DeepSeek 返回空响应');
      }

      // 解析 JSON
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : content;
      const analysis = JSON.parse(jsonText);

      return `⚠️ [视觉分析超时] 使用 DeepSeek 分析音频转录

分析状态:
- 画面分析: 超时（>2分钟）
- 音频转录: 已完成（${transcript.length}字）
- 帧数: ${frameCount}帧
- 时间范围: ${timeRange}

DeepSeek 分析结果:
- 情绪: ${analysis.emotion} (强度: ${analysis.intensity}/10)
- 台词类型: ${analysis.dialogue_type}
- 关键词: ${analysis.keywords.join('、')}
- 语气: ${analysis.tone}
- 分析: ${analysis.reasoning}

视觉特征（缺失）:
- ⚠️ 画面分析超时，无法提取表情、动作、镜头信息

建议:
- 该标记点主要依赖台词特征
- 技能生成时降低视觉权重，提高台词权重
- 人工复核时重点关注台词内容`;
    } catch (error) {
      // DeepSeek 也失败了，使用规则降级
      console.warn(`  ⚠️ DeepSeek 分析失败: ${error}，使用规则降级`);
      return this.ruleBasedFallbackAnalysis(transcript, frameCount, timestamps);
    }
  }

  /**
   * 规则降级分析（当 DeepSeek 也失败时）
   */
  private ruleBasedFallbackAnalysis(
    transcript: string,
    frameCount: number,
    timestamps: number[]
  ): string {
    const timeRange = `${this.formatMs(timestamps[0])} - ${this.formatMs(timestamps[timestamps.length - 1])}`;

    // 基于ASR文本进行简单规则分析
    const textLength = transcript.length;
    const hasExclamation = transcript.includes('！') || transcript.includes('!');
    const hasQuestion = transcript.includes('？') || transcript.includes('?');
    const hasNegativeWords = /不|没|别|无|非|未/.test(transcript);

    // 推断情绪
    let inferredEmotion = '平静';
    let emotionIntensity = 5;

    if (hasExclamation) {
      inferredEmotion = '激动/愤怒';
      emotionIntensity = 7;
    }
    if (hasNegativeWords) {
      inferredEmotion = '否定/拒绝';
      emotionIntensity = 6;
    }
    if (hasQuestion) {
      inferredEmotion = '疑惑/质疑';
      emotionIntensity = 6;
    }

    return `⚠️ [视觉分析超时] 基于规则的简化分析

分析状态:
- 画面分析: 超时（>2分钟）
- DeepSeek: 调用失败
- 音频转录: 已完成（${textLength}字）
- 帧数: ${frameCount}帧
- 时间范围: ${timeRange}

基于台词规则推断:
- 台词内容: "${transcript.substring(0, 100)}${textLength > 100 ? '...' : ''}"
- 推断情绪: ${inferredEmotion} (强度: ${emotionIntensity}/10)
- 台词特征: ${hasExclamation ? '感叹句结尾' : ''}${hasQuestion ? '疑问句' : ''}${hasNegativeWords ? '包含否定词' : ''}

视觉特征（缺失）:
- ⚠️ 画面分析超时，无法提取表情、动作、镜头信息

建议:
- 该标记点缺少视觉和AI分析
- 技能生成时标记为"低置信度"
- 建议人工复核`;
  }

  /**
   * 阶段4: 生成技能文件
   */
  private async generateSkillFile(results: MarkingAnalysisResult[]): Promise<string> {
    console.log(`\n📝 生成技能文件...`);

    // 按台词类型聚类
    const clusters = this.clusterMarkingsByDialogueType(results);

    // 生成版本号
    const version = `v1.${Date.now()}`;

    // 加载Prompt
    const promptTemplate = await PromptLoader.load(PROMPTS.TRAINING.GENERATE_SKILL);

    // 准备聚类数据
    const clusterData = this.prepareClusterData(clusters);

    // 填充变量
    const prompt = PromptLoader.fill(promptTemplate, {
      version,
      project_names: '训练项目',
      training_time: new Date().toLocaleString('zh-CN'),
      total_markings: results.length,
      highlight_count: results.filter(r => r.marking.type === '高光点').length,
      hook_count: results.filter(r => r.marking.type === '钩子点').length,
      total_analyses: results.length,
      ...clusterData,
    });

    // 调用Gemini生成技能文件
    console.log(`  🤖 调用Gemini生成技能文件...`);
    const response = await this.geminiClient.callApi(prompt);

    if (!response.success || !response.data) {
      throw new Error(`生成技能文件失败: ${response.error}`);
    }

    const skillContent = response.data as string;

    console.log(`  ✅ 技能文件生成完成 (${skillContent.length}字)`);

    return skillContent;
  }

  /**
   * 保存技能文件到磁盘
   */
  private async saveSkillFile(content: string): Promise<string> {
    const { mkdir } = await import('fs/promises');

    // 创建技能文件目录
    const skillsDir = join(process.cwd(), 'data', 'hangzhou-leiming', 'skills');
    await mkdir(skillsDir, { recursive: true });

    // 生成文件名
    const version = `v1.${Date.now()}`;
    const fileName = `skill_${version}_${Date.now()}.md`;
    const filePath = join(skillsDir, fileName);

    // 保存文件
    await writeFile(filePath, content, 'utf-8');

    console.log(`💾 技能文件已保存: ${filePath}`);

    return fileName;
  }

  /**
   * 按台词类型聚类
   */
  private clusterMarkingsByDialogueType(results: MarkingAnalysisResult[]): Map<string, MarkingAnalysisResult[]> {
    const clusters = new Map<string, MarkingAnalysisResult[]>();

    for (const result of results) {
      if (!result.analysis) continue;

      // 提取台词类型
      const dialogueType = result.analysis.dialogue?.type || '未分类';

      if (!clusters.has(dialogueType)) {
        clusters.set(dialogueType, []);
      }

      clusters.get(dialogueType)!.push(result);
    }

    console.log(`\n📊 聚类结果: ${clusters.size}个类别`);
    for (const [type, items] of clusters.entries()) {
      console.log(`  - ${type}: ${items.length}个`);
    }

    return clusters;
  }

  /**
   * 准备聚类数据用于Prompt填充
   */
  private prepareClusterData(clusters: Map<string, MarkingAnalysisResult[]>): Record<string, any> {
    const data: Record<string, any> = {};
    const clusterEntries = Array.from(clusters.entries()).slice(0, 5); // 最多5个聚类

    clusterEntries.forEach(([name, items], index) => {
      const i = index + 1;
      data[`cluster${i}_name`] = name;
      data[`cluster${i}_count`] = items.length;
      data[`cluster${i}_samples`] = JSON.stringify(items.slice(0, 3).map(item => item.analysis), null, 2);
    });

    return data;
  }

  /**
   * 获取视频信息
   */
  private async getVideo(videoId: number): Promise<HLVideo> {
    const { db } = await import('../db/client');
    const { hlVideos } = await import('../db/schema');
    const { eq } = await import('drizzle-orm');

    const [video] = await db.select().from(hlVideos).where(eq(hlVideos.id, videoId));

    if (!video) {
      throw new Error(`视频不存在: ${videoId}`);
    }

    return video;
  }

  /**
   * 解析JSON响应（带容错）
   */
  private parseJsonResponse(text: string): any {
    // 尝试提取JSON
    let jsonText = text;

    // 模式1: markdown json代码块
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      // 模式2: 普通代码块
      const codeMatch = text.match(/```\n([\s\S]*?)\n```/);
      if (codeMatch) {
        jsonText = codeMatch[1];
      } else {
        // 模式3: 查找第一个{和最后一个}
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonText = text.substring(firstBrace, lastBrace + 1);
        }
      }
    }

    try {
      return JSON.parse(jsonText);
    } catch (error) {
      console.error(`❌ JSON解析失败: ${error}`);
      console.error(`响应内容（前500字符）: ${text.substring(0, 500)}...`);
      throw new Error('JSON解析失败');
    }
  }

  /**
   * 格式化毫秒为时间字符串
   */
  private formatMs(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}
