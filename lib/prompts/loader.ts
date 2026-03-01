// ============================================
// Prompt 加载器
// 用于加载和管理所有AI API调用的提示词模板
// ============================================

import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Prompt 加载器类
 *
 * 功能：
 * - 加载Prompt文件（自动缓存）
 * - 填充Prompt变量
 * - 开发环境热更新（清除缓存）
 */
export class PromptLoader {
  // Prompt内容缓存
  private static promptsCache = new Map<string, string>();

  /**
   * 加载Prompt文件
   *
   * @param promptPath - Prompt文件相对路径（相对于prompts/目录）
   * @returns Promise<string> - Prompt内容
   *
   * @example
   * const prompt = await PromptLoader.load('hangzhou-leiming/training/analyze-marking.md');
   */
  static async load(promptPath: string): Promise<string> {
    // 检查缓存
    if (this.promptsCache.has(promptPath)) {
      return this.promptsCache.get(promptPath)!;
    }

    // 读取文件
    const fullPath = join(process.cwd(), 'prompts', promptPath);

    try {
      const content = await readFile(fullPath, 'utf-8');

      // 缓存内容
      this.promptsCache.set(promptPath, content);

      return content;
    } catch (error) {
      throw new Error(
        `加载Prompt文件失败: ${promptPath}\n` +
        `完整路径: ${fullPath}\n` +
        `错误: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 填充Prompt变量
   *
   * @param template - Prompt模板内容
   * @param variables - 变量对象
   * @returns string - 填充后的Prompt
   *
   * @example
   * const filled = PromptLoader.fill(prompt, {
   *   marking_type: '高光点',
   *   timestamp: '00:35',
   *   transcript: '...'
   * });
   */
  static fill(template: string, variables: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;

      // 处理undefined和null
      const safeValue = value === undefined || value === null ? '' : String(value);

      result = result.replaceAll(placeholder, safeValue);
    }

    return result;
  }

  /**
   * 加载并填充Prompt（便捷方法）
   *
   * @param promptPath - Prompt文件路径
   * @param variables - 变量对象
   * @returns Promise<string> - 填充后的Prompt
   *
   * @example
   * const prompt = await PromptLoader.loadAndFill(
   *   'hangzhou-leiming/training/analyze-marking.md',
   *   { marking_type: '高光点', timestamp: '00:35' }
   * );
   */
  static async loadAndFill(
    promptPath: string,
    variables: Record<string, any>
  ): Promise<string> {
    const template = await this.load(promptPath);
    return this.fill(template, variables);
  }

  /**
   * 清除缓存
   *
   * 用途：开发时热更新Prompt文件
   *
   * @example
   * // 开发环境自动清除缓存
   * if (process.env.NODE_ENV === 'development') {
   *   PromptLoader.clearCache();
   * }
   */
  static clearCache(): void {
    this.promptsCache.clear();
    console.log('✅ [PromptLoader] 缓存已清除');
  }

  /**
   * 预热缓存（批量加载多个Prompt）
   *
   * @param promptPaths - Prompt文件路径数组
   *
   * @example
   * await PromptLoader.warmup([
   *   'hangzhou-leiming/training/analyze-marking.md',
   *   'hangzhou-leiming/training/analyze-keyframes.md',
   *   'hangzhou-leiming/training/generate-skill.md'
   * ]);
   */
  static async warmup(promptPaths: string[]): Promise<void> {
    await Promise.all(
      promptPaths.map(path => this.load(path))
    );
    console.log(`✅ [PromptLoader] 预热完成，已加载 ${promptPaths.length} 个Prompt`);
  }

  /**
   * 获取缓存统计信息
   *
   * @returns 缓存的Prompt路径列表
   */
  static getCacheStats(): string[] {
    return Array.from(this.promptsCache.keys());
  }
}

/**
 * Prompt管理器（用于高级场景）
 */
export class PromptManager {
  private static promptVersions = new Map<string, string>();

  /**
   * 设置Prompt版本
   *
   * @param name - Prompt名称
   * @param version - 版本号
   */
  static setVersion(name: string, version: string): void {
    this.promptVersions.set(name, version);
  }

  /**
   * 获取Prompt版本路径
   *
   * @param name - Prompt名称
   * @param defaultPath - 默认路径
   * @returns Prompt路径
   */
  static getVersionedPath(name: string, defaultPath: string): string {
    const version = this.promptVersions.get(name);
    return version ? `${name}-${version}.md` : defaultPath;
  }
}

// ============================================
// 常用Prompt路径常量
// ============================================

export const PROMPTS = {
  // 训练相关
  TRAINING: {
    ANALYZE_MARKING: 'hangzhou-leiming/training/analyze-marking.md',
    ANALYZE_KEYFRAMES: 'hangzhou-leiming/training/analyze-keyframes.md',
    GENERATE_SKILL: 'hangzhou-leiming/training/generate-skill.md',
  },

  // 标记相关
  MARKING: {
    WITH_SKILL: 'hangzhou-leiming/marking/marking-with-skill.md',
  },

  // 学习相关（保留旧版）
  LEARNING: {
    HL_LEARNING: 'hl-learning.md',
  },
} as const;

// ============================================
// 类型定义
// ============================================

export type PromptPath = typeof PROMPTS[keyof typeof PROMPTS][keyof typeof PROMPTS[keyof typeof PROMPTS]];

/**
 * Prompt变量类型定义
 */
export interface PromptVariables {
  // 训练相关
  marking_type?: string;
  timestamp?: string;
  video_name?: string;
  transcript?: string;
  frame_analysis?: string;
  frame_count?: number;
  start_time?: string;
  end_time?: string;

  // 技能文件相关
  version?: string;
  project_names?: string;
  training_time?: string;
  total_markings?: number;
  highlight_count?: number;
  hook_count?: number;
  total_analyses?: number;
  existing_skill?: string | null;      // 现有技能文件内容
  existing_version?: string | null;    // 现有技能文件版本

  // 聚类数据
  cluster1_name?: string;
  cluster1_count?: number;
  cluster1_samples?: string;
  cluster2_name?: string;
  cluster2_count?: number;
  cluster2_samples?: string;

  // 视频分析
  start_ms?: number;
  end_ms?: number;
  duration_min?: string;
  frame_descriptions?: string;
}

/**
 * 填充Prompt的便捷函数
 *
 * @param promptPath - Prompt路径常量
 * @param variables - 变量对象
 * @returns Promise<string> - 填充后的Prompt
 *
 * @example
 * const prompt = await fillPrompt(PROMPTS.TRAINING.ANALYZE_MARKING, {
 *   marking_type: '高光点',
 *   timestamp: '00:35'
 * });
 */
export async function fillPrompt(
  promptPath: string,
  variables: PromptVariables
): Promise<string> {
  return PromptLoader.loadAndFill(promptPath, variables);
}

// ============================================
// 开发环境热更新
// ============================================

if (process.env.NODE_ENV === 'development') {
  // 监听文件变化（可选）
  if (process.env.ENABLE_PROMPT_HOT_RELOAD === 'true') {
    console.log('🔥 [PromptLoader] 热更新已启用');
    // TODO: 使用chokidar监听文件变化，自动清除缓存
  }
}
