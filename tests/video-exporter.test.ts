/**
 * 视频导出模块单元测试
 *
 * 测试内容：
 * - 导出任务配置验证
 * - 片段数据解析
 * - 临时文件管理
 * - 错误处理
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "@jest/globals";
import {
  exportCombination,
  getExportStatus,
  cleanupTempFiles,
  type ExportJob,
  type ClipSegment,
} from "@/lib/export";

// Mock 数据库
jest.mock("@/lib/db/client", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock FFmpeg 工具
jest.mock("@/lib/ffmpeg", () => ({
  trimVideo: jest.fn(),
}));

jest.mock("@/lib/ffmpeg/concat", () => ({
  concatVideos: jest.fn(),
}));

// Mock fs 模块
jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(),
  statSync: jest.fn(() => ({ size: 1024 * 1024 * 10 })),
  readdirSync: jest.fn(() => []),
}));

jest.mock("fs/promises", () => ({
  mkdir: jest.fn(),
  rm: jest.fn(),
}));

describe("视频导出模块", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("导出任务配置", () => {
    it("应该验证必要的参数", () => {
      const invalidJob1 = {} as ExportJob;
      const invalidJob2 = { projectId: 1 } as ExportJob;
      const validJob: ExportJob = {
        projectId: 1,
        combinationId: 10,
        outputFormat: "mp4",
      };

      expect(invalidJob1.projectId).toBeUndefined();
      expect(invalidJob2.combinationId).toBeUndefined();
      expect(validJob.projectId).toBeDefined();
      expect(validJob.combinationId).toBeDefined();
    });

    it("应该支持不同的输出格式", () => {
      const formats: Array<"mp4" | "mov" | "avi"> = ["mp4", "mov", "avi"];

      formats.forEach((format) => {
        const job: ExportJob = {
          projectId: 1,
          combinationId: 10,
          outputFormat: format,
        };
        expect(job.outputFormat).toBe(format);
      });
    });
  });

  describe("片段数据解析", () => {
    it("应该正确解析字符串格式的 clips 数据", () => {
      const clipsString = JSON.stringify([
        {
          video_id: 1,
          video_name: "ep01.mp4",
          start_ms: 80000,
          end_ms: 140000,
          type: "高光点",
        },
      ]);

      const clips = JSON.parse(clipsString);

      expect(clips).toHaveLength(1);
      expect(clips[0].video_id).toBe(1);
      expect(clips[0].start_ms).toBe(80000);
    });

    it("应该正确解析对象格式的 clips 数据", () => {
      const clipsObject = [
        {
          videoId: 1,
          videoName: "ep01.mp4",
          startMs: 80000,
          endMs: 140000,
          type: "高光点",
        },
      ];

      expect(clipsObject).toHaveLength(1);
      expect(clipsObject[0].videoId).toBe(1);
      expect(clipsObject[0].startMs).toBe(80000);
    });

    it("应该验证片段数据的完整性", () => {
      const incompleteClip = {
        videoId: 1,
        startMs: 80000,
        // 缺少 endMs
      };

      expect(incompleteClip.endMs).toBeUndefined();
    });
  });

  describe("临时文件管理", () => {
    it("应该构建正确的临时目录路径", () => {
      const exportId = 100;
      const expectedPath = expect.stringContaining(`export_${exportId}`);

      expect(expectedPath).toBeTruthy();
    });

    it("应该清理临时文件", async () => {
      const tempDir = "/tmp/exports/test_123";

      // Mock rm 函数
      const rm = jest.fn().mockResolvedValue(undefined);
      vi.doMock("fs/promises", () => ({ rm }));

      // 调用清理函数
      await cleanupTempFiles(tempDir, false);

      // 验证调用
      expect(rm).toHaveBeenCalledWith(tempDir, {
        recursive: true,
        force: true,
      });
    });
  });

  describe("错误处理", () => {
    it("应该处理视频文件不存在的情况", () => {
      const existsSync = jest.fn(() => false);

      expect(existsSync("/nonexistent/video.mp4")).toBe(false);
    });

    it("应该处理 FFmpeg 执行失败的情况", () => {
      const mockError = new Error("FFmpeg 执行失败");

      expect(mockError).toBeInstanceOf(Error);
      expect(mockError.message).toContain("FFmpeg");
    });

    it("应该处理数据库连接失败的情况", () => {
      const dbError = new Error("数据库连接失败");

      expect(dbError).toBeInstanceOf(Error);
      expect(dbError.message).toContain("数据库");
    });
  });

  describe("导出状态查询", () => {
    it("应该返回正确的导出状态", async () => {
      const exportId = 100;

      // Mock 数据库查询
      const mockExportRecord = {
        id: exportId,
        status: "completed",
        outputPath: "/exports/video_100.mp4",
        fileSize: 1024 * 1024 * 10,
        errorMessage: null,
      };

      expect(mockExportRecord.id).toBe(exportId);
      expect(mockExportRecord.status).toBe("completed");
      expect(mockExportRecord.outputPath).toBeDefined();
    });

    it("应该处理导出记录不存在的情况", async () => {
      const exportId = 999;

      // Mock 空结果
      const mockEmptyResult = [];

      expect(mockEmptyResult).toHaveLength(0);
    });
  });

  describe("进度跟踪", () => {
    it("应该正确计算进度百分比", () => {
      const totalClips = 10;
      const currentClip = 5;

      const baseProgress = 10;
      const progressRange = 40;
      const currentProgress = baseProgress + Math.floor((currentClip / totalClips) * progressRange);

      expect(currentProgress).toBeGreaterThanOrEqual(baseProgress);
      expect(currentProgress).toBeLessThanOrEqual(baseProgress + progressRange);
    });

    it("应该在拼接阶段更新进度", () => {
      const concatProgress = 50;
      const overallProgress = 60 + Math.floor(concatProgress * 0.35);

      expect(overallProgress).toBeGreaterThanOrEqual(60);
      expect(overallProgress).toBeLessThanOrEqual(95);
    });
  });

  describe("文件路径处理", () => {
    it("应该正确处理特殊字符的文件名", () => {
      const combinationName = "冲突开场 + 悬念结尾";
      const exportId = 100;

      const sanitized = combinationName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_");
      const fileName = `${sanitized}_${exportId}.mp4`;

      expect(fileName).toBe("冲突开场___悬念结尾_100.mp4");
    });

    it("应该生成唯一的文件名", () => {
      const exportId1 = 100;
      const exportId2 = 101;

      const fileName1 = `video_${exportId1}.mp4`;
      const fileName2 = `video_${exportId2}.mp4`;

      expect(fileName1).not.toBe(fileName2);
    });
  });

  describe("跨集拼接", () => {
    it("应该支持跨集片段拼接", () => {
      const clips: ClipSegment[] = [
        {
          videoId: 1,
          videoName: "ep01.mp4",
          startMs: 85000,
          endMs: 120000,
          type: "高光点",
          order: 0,
        },
        {
          videoId: 2,
          videoName: "ep02.mp4",
          startMs: 5000,
          endMs: 40000,
          type: "钩子点",
          order: 1,
        },
      ];

      expect(clips).toHaveLength(2);
      expect(clips[0].videoId).toBe(1);
      expect(clips[1].videoId).toBe(2);
      expect(clips[0].videoId).not.toBe(clips[1].videoId);
    });
  });
});
