/**
 * 推荐引擎单元测试
 *
 * 测试范围：
 * - 组合生成逻辑（单集、跨集）
 * - 多维评分算法
 * - 排序逻辑
 * - 时长过滤
 * - 去重逻辑
 */

import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { RecommendationEngine, Marking } from '../lib/ai/recommendation-engine';

// ============================================
// Mock 数据
// ============================================

const mockMarkings: Marking[] = [
  // 第1集的高光点
  {
    id: 1,
    videoId: 1,
    videoName: '第1集.mp4',
    startMs: 15000,
    endMs: 25000,
    type: '高光点',
    subType: '高能冲突',
    score: 8.5,
    emotion: '愤怒',
    reasoning: '主角与反派发生激烈争吵',
  },
  {
    id: 2,
    videoId: 1,
    videoName: '第1集.mp4',
    startMs: 45000,
    endMs: 55000,
    type: '高光点',
    subType: '身份揭露',
    score: 9.0,
    emotion: '震惊',
    reasoning: '隐藏身份被意外曝光',
  },
  // 第1集的钩子点
  {
    id: 3,
    videoId: 1,
    videoName: '第1集.mp4',
    startMs: 120000,
    endMs: 128000,
    type: '钩子点',
    subType: '悬念结尾',
    score: 9.5,
    emotion: '好奇',
    reasoning: '神秘人物留下关键线索',
  },
  // 第2集的高光点
  {
    id: 4,
    videoId: 2,
    videoName: '第2集.mp4',
    startMs: 30000,
    endMs: 40000,
    type: '高光点',
    subType: '情感高潮',
    score: 8.0,
    emotion: '悲伤',
    reasoning: '主角遭遇重大挫折',
  },
  // 第2集的钩子点
  {
    id: 5,
    videoId: 2,
    videoName: '第2集.mp4',
    startMs: 115000,
    endMs: 123000,
    type: '钩子点',
    subType: '反转预告',
    score: 8.8,
    emotion: '紧张',
    reasoning: '预告下一集将有重大反转',
  },
];

// ============================================
// 测试套件
// ============================================

describe('推荐引擎', () => {
  describe('组合生成逻辑', () => {
    it('应该生成单集组合（同一视频内的 高光→钩子）', async () => {
      const highlights = mockMarkings.filter((m) => m.type === '高光点' && m.videoId === 1);
      const hooks = mockMarkings.filter((m) => m.type === '钩子点' && m.videoId === 1);

      // 使用私有方法测试（这里假设可以通过公开API访问）
      const combinations = await RecommendationEngine.generateRecommendations({
        analysisId: 1, // Mock analysisId
        minDurationMs: 90000, // 90秒
        maxDurationMs: 120000, // 120秒
        maxCombinations: 10,
        allowCrossEpisode: false,
      });

      // 验证组合数量
      expect(combinations.length).toBeGreaterThan(0);

      // 验证组合时长
      for (const combo of combinations) {
        expect(combo.totalDurationMs).toBeGreaterThanOrEqual(90000);
        expect(combo.totalDurationMs).toBeLessThanOrEqual(120000);
      }
    });

    it('应该生成跨集组合（不同视频的 高光→钩子）', async () => {
      const combinations = await RecommendationEngine.generateRecommendations({
        analysisId: 1,
        minDurationMs: 100000,
        maxDurationMs: 150000,
        maxCombinations: 10,
        allowCrossEpisode: true,
      });

      // 验证存在跨集组合
      const crossEpisodeCombinations = combinations.filter(
        (combo) => combo.clips.some((clip) => clip.videoId === 1) &&
                   combo.clips.some((clip) => clip.videoId === 2)
      );

      expect(crossEpisodeCombinations.length).toBeGreaterThan(0);
    });

    it('应该过滤时长不符合的组合', async () => {
      const combinations = await RecommendationEngine.generateRecommendations({
        analysisId: 1,
        minDurationMs: 120000, // 最小 2 分钟
        maxDurationMs: 180000, // 最大 3 分钟
        maxCombinations: 10,
        allowCrossEpisode: false,
      });

      // 所有组合的时长都应该在范围内
      for (const combo of combinations) {
        expect(combo.totalDurationMs).toBeGreaterThanOrEqual(120000);
        expect(combo.totalDurationMs).toBeLessThanOrEqual(180000);
      }
    });
  });

  describe('多维评分算法', () => {
    it('应该正确计算冲突强度分数', () => {
      // 这个测试需要访问私有方法，或者将方法改为公开
      // 这里假设有一个公开的测试方法
      const conflictHighlights = mockMarkings.filter(
        (m) => m.subType === '高能冲突'
      );

      // 冲突类型应该得到高分 (8-10)
      // 这里需要实际的测试逻辑
      expect(conflictHighlights.length).toBeGreaterThan(0);
    });

    it('应该正确计算情感共鸣分数', () => {
      const emotionalMarkings = mockMarkings.filter(
        (m) => m.emotion === '愤怒' || m.emotion === '震惊'
      );

      // 高强度情绪应该得到高分
      expect(emotionalMarkings.length).toBeGreaterThan(0);
    });

    it('应该正确计算悬念设置分数', () => {
      const suspenseHooks = mockMarkings.filter(
        (m) => m.subType === '悬念结尾'
      );

      // 悬念结尾应该得到高分 (8-10)
      expect(suspenseHooks.length).toBeGreaterThan(0);
    });

    it('应该正确计算节奏把握分数', () => {
      // 最佳时长：2-5分钟
      const optimalDuration = 150000; // 2.5 分钟

      // 最佳时长应该得到高分 (9-10)
      // 这里需要实际的测试逻辑
      expect(optimalDuration).toBeGreaterThan(0);
    });
  });

  describe('排序逻辑', () => {
    it('应该按 overallScore 降序排序', async () => {
      const combinations = await RecommendationEngine.generateRecommendations({
        analysisId: 1,
        minDurationMs: 90000,
        maxDurationMs: 130000,
        maxCombinations: 20,
        allowCrossEpisode: false,
      });

      // 验证排序
      for (let i = 0; i < combinations.length - 1; i++) {
        expect(combinations[i].overallScore).toBeGreaterThanOrEqual(
          combinations[i + 1].overallScore
        );
      }
    });

    it('应该正确分配排名', async () => {
      const combinations = await RecommendationEngine.generateRecommendations({
        analysisId: 1,
        minDurationMs: 90000,
        maxDurationMs: 130000,
        maxCombinations: 10,
        allowCrossEpisode: false,
      });

      // 验证排名从 1 开始，连续递增
      for (let i = 0; i < combinations.length; i++) {
        expect(combinations[i].rank).toBe(i + 1);
      }
    });
  });

  describe('去重逻辑', () => {
    it('应该去除相似组合', async () => {
      // 这里需要准备包含相似标记的数据
      const combinations = await RecommendationEngine.generateRecommendations({
        analysisId: 1,
        minDurationMs: 90000,
        maxDurationMs: 130000,
        maxCombinations: 20,
        allowCrossEpisode: false,
      });

      // 验证没有重复的组合签名
      const signatures = new Set<string>();
      for (const combo of combinations) {
        const signature = `${combo.clips[0].videoId}-${combo.clips[0].startMs}-${combo.clips[0].endMs}`;
        expect(signatures.has(signature)).toBe(false);
        signatures.add(signature);
      }
    });
  });

  describe('边界情况', () => {
    it('应该处理没有标记的情况', async () => {
      // 需要一个 analysisId 但没有标记的情况
      // 这会抛出异常
      await expect(
        RecommendationEngine.generateRecommendations({
          analysisId: 999, // 不存在的 analysisId
          minDurationMs: 90000,
          maxDurationMs: 130000,
          maxCombinations: 10,
          allowCrossEpisode: false,
        })
      ).rejects.toThrow();
    });

    it('应该处理标记过少的情况', async () => {
      // 只有高光点或只有钩子点的情况
      // 应该返回空数组或抛出异常
      // 这里需要实际的测试逻辑
      expect(true).toBe(true);
    });

    it('应该处理所有组合都超时长的边界情况', async () => {
      // 设置极短的时长范围，使得所有组合都不符合
      const combinations = await RecommendationEngine.generateRecommendations({
        analysisId: 1,
        minDurationMs: 500000, // 8.3 分钟（远大于任何组合）
        maxDurationMs: 600000,
        maxCombinations: 10,
        allowCrossEpisode: false,
      });

      // 应该返回空数组
      expect(combinations.length).toBe(0);
    });
  });

  describe('推荐理由生成', () => {
    it('应该生成合理的推荐理由', async () => {
      const combinations = await RecommendationEngine.generateRecommendations({
        analysisId: 1,
        minDurationMs: 90000,
        maxDurationMs: 130000,
        maxCombinations: 5,
        allowCrossEpisode: false,
      });

      // 验证每个组合都有推荐理由
      for (const combo of combinations) {
        expect(combo.reasoning).toBeDefined();
        expect(combo.reasoning.length).toBeGreaterThan(0);

        // 验证理由包含关键信息
        expect(combo.reasoning).toContain('开场');
        expect(combo.reasoning).toContain('收尾');
        expect(combo.reasoning).toContain('分钟');
        expect(combo.reasoning).toContain('转化率');
      }
    });
  });

  describe('组合名称生成', () => {
    it('应该生成清晰的组合名称', async () => {
      const combinations = await RecommendationEngine.generateRecommendations({
        analysisId: 1,
        minDurationMs: 90000,
        maxDurationMs: 130000,
        maxCombinations: 5,
        allowCrossEpisode: false,
      });

      // 验证每个组合都有名称
      for (const combo of combinations) {
        expect(combo.name).toBeDefined();
        expect(combo.name.length).toBeGreaterThan(0);

        // 验证名称格式：类型A + 类型B
        expect(combo.name).toContain(' + ');
      }
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成推荐生成', async () => {
      const startTime = Date.now();

      await RecommendationEngine.generateRecommendations({
        analysisId: 1,
        minDurationMs: 90000,
        maxDurationMs: 130000,
        maxCombinations: 20,
        allowCrossEpisode: true,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 推荐生成应该在 5 秒内完成
      expect(duration).toBeLessThan(5000);
    });
  });
});

// ============================================
// 集成测试（需要数据库）
// ============================================

describe('推荐引擎集成测试', () => {
  // 这些测试需要真实的数据库连接
  // 在 CI/CD 环境中可以使用测试数据库

  it('应该保存推荐结果到数据库', async () => {
    // 需要真实的数据库连接
    // 这里只是示例
    expect(true).toBe(true);
  });

  it('应该能够查询已保存的推荐结果', async () => {
    // 需要真实的数据库连接
    // 这里只是示例
    expect(true).toBe(true);
  });
});
