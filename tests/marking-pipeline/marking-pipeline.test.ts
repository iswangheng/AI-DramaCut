// ============================================
// 智能标记流程单元测试
// ============================================

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MarkingPipeline } from '@/lib/ai/marking-pipeline';
import { db } from '@/lib/db/client';
import { hlAiMarkings, hlAnalysisResults } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Mock 依赖
jest.mock('@/lib/db/client', () => ({
  db: {
    insert: jest.fn(),
    update: jest.fn(),
    select: jest.fn(),
  },
}));

jest.mock('@/lib/video/keyframes', () => ({
  extractKeyframes: jest.fn(),
}));

jest.mock('@/lib/audio/transcriber', () => ({
  transcribeAudio: jest.fn(),
}));

jest.mock('@/lib/api/gemini', () => ({
  getGeminiClient: jest.fn(() => ({
    callApi: jest.fn(),
  })),
}));

jest.mock('@/lib/ws/server', () => ({
  wsServer: {
    sendProgress: jest.fn(),
    sendError: jest.fn(),
    sendComplete: jest.fn(),
  },
}));

describe('MarkingPipeline', () => {
  const mockVideo = {
    id: 1,
    projectId: 1,
    filename: 'test-video.mp4',
    filePath: '/path/to/video.mp4',
    durationMs: 180000, // 3分钟
    frameDir: null,
    asrResultPath: null,
  };

  const mockAnalysisId = 100;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('execute()', () => {
    it('应该完整执行标记流程', async () => {
      // Mock 关键帧提取
      const { extractKeyframes } = await import('@/lib/video/keyframes');
      jest.mocked(extractKeyframes).mockResolvedValue({
        framePaths: ['frame1.jpg', 'frame2.jpg', 'frame3.jpg'],
        timestamps: [10000, 20000, 30000],
        outputDir: '/path/to/frames',
      });

      // Mock 音频转录
      const { transcribeAudio } = await import('@/lib/audio/transcriber');
      jest.mocked(transcribeAudio).mockResolvedValue({
        text: '这是测试转录文本',
        language: 'zh',
        duration: 180,
        segments: [
          { start: 0, end: 10, text: '这是测试' },
          { start: 10, end: 20, text: '转录文本' },
        ],
      });

      // Mock Gemini API
      const { getGeminiClient } = await import('@/lib/api/gemini');
      jest.mocked(getGeminiClient).mockReturnValue({
        callApi: jest.fn().mockResolvedValue({
          success: true,
          data: JSON.stringify({
            highlights: [
              { timeMs: 15000, type: '高能冲突', confidence: 9.0, reasoning: '测试高光点' },
            ],
            hooks: [
              { timeMs: 120000, type: '悬念结尾', confidence: 8.5, reasoning: '测试钩子点' },
            ],
          }),
        }),
      } as any);

      // Mock 数据库操作
      jest.mocked(db.update).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      } as any);

      jest.mocked(db.insert).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            { id: 1, startMs: 15000, type: '高光点' },
            { id: 2, startMs: 120000, type: '钩子点' },
          ]),
        }),
      } as any);

      // 创建 pipeline 并执行
      const pipeline = new MarkingPipeline({
        analysisId: mockAnalysisId,
        video: mockVideo as any,
        skillContent: '测试技能内容',
        minDurationMs: 30000,
        maxDurationMs: 180000,
      });

      const result = await pipeline.execute();

      // 验证结果
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('高光点');
      expect(result[1].type).toBe('钩子点');
    });

    it('应该正确处理错误情况', async () => {
      // Mock Gemini API 失败
      const { getGeminiClient } = await import('@/lib/api/gemini');
      jest.mocked(getGeminiClient).mockReturnValue({
        callApi: jest.fn().mockResolvedValue({
          success: false,
          error: 'API 调用失败',
        }),
      } as any);

      const pipeline = new MarkingPipeline({
        analysisId: mockAnalysisId,
        video: mockVideo as any,
      });

      await expect(pipeline.execute()).rejects.toThrow();
    });
  });

  describe('parseGeminiResponse()', () => {
    it('应该解析标准 JSON 响应', () => {
      const pipeline = new MarkingPipeline({
        analysisId: mockAnalysisId,
        video: mockVideo as any,
      });

      const jsonText = JSON.stringify({
        highlights: [{ timeMs: 10000, type: '高能冲突', confidence: 8.5, reasoning: '测试' }],
        hooks: [],
      });

      const result = pipeline['parseGeminiResponse'](jsonText);

      expect(result).not.toBeNull();
      expect(result?.highlights).toHaveLength(1);
      expect(result?.highlights[0].timeMs).toBe(10000);
    });

    it('应该解析 Markdown 代码块中的 JSON', () => {
      const pipeline = new MarkingPipeline({
        analysisId: mockAnalysisId,
        video: mockVideo as any,
      });

      const markdownText = `
这是一个示例响应：

\`\`\`json
{
  "highlights": [],
  "hooks": [{ "timeMs": 5000, "type": "悬念结尾", "confidence": 9.0, "reasoning": "测试" }]
}
\`\`\`
`;

      const result = pipeline['parseGeminiResponse'](markdownText);

      expect(result).not.toBeNull();
      expect(result?.hooks).toHaveLength(1);
    });

    it('应该处理格式错误的 JSON', () => {
      const pipeline = new MarkingPipeline({
        analysisId: mockAnalysisId,
        video: mockVideo as any,
      });

      const invalidJson = '{ invalid json }';
      const result = pipeline['parseGeminiResponse'](invalidJson);

      expect(result).toBeNull();
    });
  });

  describe('deduplicateMarkings()', () => {
    it('应该去除时间接近的重复标记', () => {
      const pipeline = new MarkingPipeline({
        analysisId: mockAnalysisId,
        video: mockVideo as any,
      });

      const markings = [
        {
          analysisId: mockAnalysisId,
          videoId: 1,
          startMs: 10000,
          endMs: null,
          type: '高光点' as const,
          subType: '高能冲突',
          score: 8.0,
          reasoning: '测试1',
          emotion: null,
          intensity: null,
          isConfirmed: false,
          customStartMs: null,
          customEndMs: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          analysisId: mockAnalysisId,
          videoId: 1,
          startMs: 12000, // 接近第一个标记（2秒内）
          endMs: null,
          type: '高光点' as const,
          subType: '高能冲突',
          score: 7.0, // 置信度更低
          reasoning: '测试2',
          emotion: null,
          intensity: null,
          isConfirmed: false,
          customStartMs: null,
          customEndMs: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          analysisId: mockAnalysisId,
          videoId: 1,
          startMs: 50000, // 远离前两个标记
          endMs: null,
          type: '高光点' as const,
          subType: '身份揭露',
          score: 9.0,
          reasoning: '测试3',
          emotion: null,
          intensity: null,
          isConfirmed: false,
          customStartMs: null,
          customEndMs: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = pipeline['deduplicateMarkings'](markings, 5000);

      // 应该保留2个标记（第一个和第三个，第二个被去重）
      expect(result).toHaveLength(2);
      expect(result[0].startMs).toBe(10000);
      expect(result[1].startMs).toBe(50000);
    });

    it('应该保留置信度更高的重复标记', () => {
      const pipeline = new MarkingPipeline({
        analysisId: mockAnalysisId,
        video: mockVideo as any,
      });

      const markings = [
        {
          analysisId: mockAnalysisId,
          videoId: 1,
          startMs: 10000,
          endMs: null,
          type: '高光点' as const,
          subType: '高能冲突',
          score: 7.0, // 置信度较低
          reasoning: '测试1',
          emotion: null,
          intensity: null,
          isConfirmed: false,
          customStartMs: null,
          customEndMs: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          analysisId: mockAnalysisId,
          videoId: 1,
          startMs: 11000, // 接近第一个标记
          endMs: null,
          type: '高光点' as const,
          subType: '高能冲突',
          score: 9.0, // 置信度更高，应该保留这个
          reasoning: '测试2',
          emotion: null,
          intensity: null,
          isConfirmed: false,
          customStartMs: null,
          customEndMs: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = pipeline['deduplicateMarkings'](markings, 5000);

      // 应该保留1个标记（置信度更高的）
      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(9.0);
      expect(result[0].reasoning).toBe('测试2');
    });
  });
});
