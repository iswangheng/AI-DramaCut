/**
 * 杭州雷鸣 - Excel 导入功能单元测试
 *
 * 测试用例：
 * - 正常导入测试
 * - 格式错误测试
 * - 时间点格式错误测试
 * - 视频不存在测试
 * - 重复导入测试
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { db } from "@/lib/db/client";
import { hlProjects, hlVideos, hlMarkings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

describe("Excel 导入功能测试", () => {
  let testProjectId: number;
  let testVideoId: number;

  // 测试前准备：创建测试项目和视频
  beforeAll(async () => {
    // 创建测试项目
    const [project] = await db
      .insert(hlProjects)
      .values({
        name: "Excel导入测试项目",
        description: "用于测试Excel导入功能",
        status: "created",
      })
      .returning();
    testProjectId = project.id;

    // 创建测试视频
    const [video] = await db
      .insert(hlVideos)
      .values({
        projectId: testProjectId,
        filename: "test-episode-01.mp4",
        filePath: "/test/path/test-episode-01.mp4",
        fileSize: 1024000,
        episodeNumber: "第1集",
        displayTitle: "第1集：测试剧集",
        sortOrder: 1,
        durationMs: 1800000, // 30分钟
        width: 1920,
        height: 1080,
        fps: 30,
        status: "ready",
      })
      .returning();
    testVideoId = video.id;
  });

  // 测试后清理：删除测试数据
  afterAll(async () => {
    // 删除测试标记
    await db
      .delete(hlMarkings)
      .where(eq(hlMarkings.projectId, testProjectId));

    // 删除测试视频
    await db
      .delete(hlVideos)
      .where(eq(hlVideos.projectId, testProjectId));

    // 删除测试项目
    await db
      .delete(hlProjects)
      .where(eq(hlProjects.id, testProjectId));
  });

  /**
   * 辅助函数：生成测试 Excel 文件
   */
  function generateTestExcel(data: any[]): Buffer {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "标记数据");
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  /**
   * 辅助函数：解析时间戳
   */
  function parseTimestamp(timestamp: string): number {
    const parts = timestamp.split(":").map(Number);
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return NaN;
  }

  /**
   * 测试用例 1：正常导入测试
   */
  it("应该成功导入正常的 Excel 数据", async () => {
    const testData = [
      {
        集数: "第1集",
        时间点: "00:35",
        标记类型: "高光点",
        描述: "高能冲突",
      },
      {
        集数: "第1集",
        时间点: "01:20",
        标记类型: "钩子点",
        描述: "悬念设置",
      },
      {
        集数: "第1集",
        时间点: "02:15",
        标记类型: "高光点",
        描述: "身份揭露",
      },
    ];

    const buffer = generateTestExcel(testData);

    // 模拟 FormData 和 File 对象
    const formData = new FormData();
    formData.append("file", new Blob([buffer]), "test.xlsx");
    formData.append("projectId", String(testProjectId));

    // 调用导入 API
    const response = await fetch("http://localhost:3000/api/hangzhou-leiming/markings/import", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.data?.successCount).toBe(3);
    expect(result.data?.errorCount).toBe(0);

    // 验证数据库中的数据
    const markings = await db
      .select()
      .from(hlMarkings)
      .where(eq(hlMarkings.projectId, testProjectId));

    expect(markings.length).toBe(3);
    expect(markings[0].timestamp).toBe("00:35");
    expect(markings[0].seconds).toBe(parseTimestamp("00:35"));
    expect(markings[0].type).toBe("高光点");
    expect(markings[0].description).toBe("高能冲突");
  });

  /**
   * 测试用例 2：格式错误测试（缺少必需列）
   */
  it("应该拒绝缺少必需列的 Excel 数据", async () => {
    const testData = [
      {
        集数: "第1集",
        // 缺少时间点
        标记类型: "高光点",
      },
    ];

    const buffer = generateTestExcel(testData);

    const formData = new FormData();
    formData.append("file", new Blob([buffer]), "test-missing-column.xlsx");
    formData.append("projectId", String(testProjectId));

    const response = await fetch("http://localhost:3000/api/hangzhou-leiming/markings/import", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    // 验证结果：应该跳过无效行
    expect(result.success).toBe(true);
    expect(result.data?.errorCount).toBeGreaterThan(0);
  });

  /**
   * 测试用例 3：时间点格式错误测试
   */
  it("应该拒绝时间点格式错误的数据", async () => {
    const testData = [
      {
        集数: "第1集",
        时间点: "invalid-time", // 无效格式
        标记类型: "高光点",
        描述: "测试",
      },
    ];

    const buffer = generateTestExcel(testData);

    const formData = new FormData();
    formData.append("file", new Blob([buffer]), "test-invalid-time.xlsx");
    formData.append("projectId", String(testProjectId));

    const response = await fetch("http://localhost:3000/api/hangzhou-leiming/markings/import", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    // 验证结果：应该跳过无效行
    expect(result.success).toBe(true);
    expect(result.data?.errorCount).toBe(1);
  });

  /**
   * 测试用例 4：视频不存在测试
   */
  it("应该跳过视频不存在的标记", async () => {
    const testData = [
      {
        集数: "第999集", // 不存在的集数
        时间点: "00:35",
        标记类型: "高光点",
        描述: "测试",
      },
    ];

    const buffer = generateTestExcel(testData);

    const formData = new FormData();
    formData.append("file", new Blob([buffer]), "test-video-not-found.xlsx");
    formData.append("projectId", String(testProjectId));

    const response = await fetch("http://localhost:3000/api/hangzhou-leiming/markings/import", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    // 验证结果：应该跳过不存在的视频
    expect(result.success).toBe(true);
    expect(result.data?.errorCount).toBe(1);
  });

  /**
   * 测试用例 5：时间点格式支持测试（MM:SS 和 HH:MM:SS）
   */
  it("应该正确解析 MM:SS 和 HH:MM:SS 格式的时间点", async () => {
    const testData = [
      {
        集数: "第1集",
        时间点: "00:35", // MM:SS 格式
        标记类型: "高光点",
        描述: "测试1",
      },
      {
        集数: "第1集",
        时间点: "01:00:35", // HH:MM:SS 格式
        标记类型: "钩子点",
        描述: "测试2",
      },
    ];

    const buffer = generateTestExcel(testData);

    const formData = new FormData();
    formData.append("file", new Blob([buffer]), "test-time-formats.xlsx");
    formData.append("projectId", String(testProjectId));

    const response = await fetch("http://localhost:3000/api/hangzhou-leiming/markings/import", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.data?.successCount).toBe(2);

    // 验证数据库中的时间戳
    const markings = await db
      .select()
      .from(hlMarkings)
      .where(eq(hlMarkings.projectId, testProjectId));

    // 查找测试数据
    const marking1 = markings.find((m) => m.description === "测试1");
    const marking2 = markings.find((m) => m.description === "测试2");

    expect(marking1?.seconds).toBe(35); // 00:35 = 35秒
    expect(marking2?.seconds).toBe(3635); // 01:00:35 = 3635秒
  });

  /**
   * 测试用例 6：标记类型验证测试
   */
  it("应该只接受有效的标记类型（高光点、钩子点）", async () => {
    const testData = [
      {
        集数: "第1集",
        时间点: "00:35",
        标记类型: "高光点", // 有效
        描述: "测试1",
      },
      {
        集数: "第1集",
        时间点: "01:20",
        标记类型: "钩子点", // 有效
        描述: "测试2",
      },
      {
        集数: "第1集",
        时间点: "02:15",
        标记类型: "无效类型", // 无效
        描述: "测试3",
      },
    ];

    const buffer = generateTestExcel(testData);

    const formData = new FormData();
    formData.append("file", new Blob([buffer]), "test-invalid-type.xlsx");
    formData.append("projectId", String(testProjectId));

    const response = await fetch("http://localhost:3000/api/hangzhou-leiming/markings/import", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    // 验证结果：前两个应该成功，第三个应该失败
    expect(result.success).toBe(true);
    expect(result.data?.successCount).toBe(2); // 前两个有效
    expect(result.data?.errorCount).toBeGreaterThanOrEqual(1); // 第三个无效
  });

  /**
   * 测试用例 7：批量导入测试（大量数据）
   */
  it("应该能够批量导入大量数据", async () => {
    // 生成100条测试数据
    const testData = [];
    for (let i = 0; i < 100; i++) {
      const minutes = Math.floor(i / 60);
      const seconds = i % 60;
      testData.push({
        集数: "第1集",
        时间点: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
        标记类型: i % 2 === 0 ? "高光点" : "钩子点",
        描述: `测试标记 ${i + 1}`,
      });
    }

    const buffer = generateTestExcel(testData);

    const formData = new FormData();
    formData.append("file", new Blob([buffer]), "test-bulk.xlsx");
    formData.append("projectId", String(testProjectId));

    const response = await fetch("http://localhost:3000/api/hangzhou-leiming/markings/import", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.data?.successCount).toBe(100);
    expect(result.data?.errorCount).toBe(0);
  });

  /**
   * 测试用例 8：CSV 格式测试
   */
  it("应该支持 CSV 格式导入", async () => {
    const csvContent = `集数,时间点,标记类型,描述
第1集,00:35,高光点,测试CSV1
第1集,01:20,钩子点,测试CSV2`;

    const formData = new FormData();
    formData.append("file", new Blob([csvContent], { type: "text/csv" }), "test.csv");
    formData.append("projectId", String(testProjectId));

    const response = await fetch("http://localhost:3000/api/hangzhou-leiming/markings/import", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.data?.successCount).toBe(2);
  });
});

/**
 * 集成测试：完整流程测试
 */
describe("Excel 导入集成测试", () => {
  let testProjectId: number;
  let testVideoId: number;

  beforeAll(async () => {
    const [project] = await db
      .insert(hlProjects)
      .values({
        name: "集成测试项目",
        description: "完整流程测试",
        status: "created",
      })
      .returning();
    testProjectId = project.id;

    const [video] = await db
      .insert(hlVideos)
      .values({
        projectId: testProjectId,
        filename: "integration-test.mp4",
        filePath: "/test/path/integration-test.mp4",
        fileSize: 1024000,
        episodeNumber: "第1集",
        displayTitle: "第1集：集成测试",
        sortOrder: 1,
        durationMs: 1800000,
        width: 1920,
        height: 1080,
        fps: 30,
        status: "ready",
      })
      .returning();
    testVideoId = video.id;
  });

  afterAll(async () => {
    await db.delete(hlMarkings).where(eq(hlMarkings.projectId, testProjectId));
    await db.delete(hlVideos).where(eq(hlVideos.projectId, testProjectId));
    await db.delete(hlProjects).where(eq(hlProjects.id, testProjectId));
  });

  /**
   * 完整流程测试：上传 → 导入 → 验证 → 查询
   */
  it("应该完成完整的导入流程", async () => {
    // 1. 生成测试数据
    const testData = [
      { 集数: "第1集", 时间点: "00:35", 标记类型: "高光点", 描述: "开场冲突" },
      { 集数: "第1集", 时间点: "01:20", 标记类型: "钩子点", 描述: "悬念结尾" },
    ];

    const buffer = XLSX.write(XLSX.utils.book_new(), {
      type: "buffer",
      bookType: "xlsx",
    });

    // 2. 上传并导入
    const formData = new FormData();
    formData.append("file", new Blob([buffer]), "integration-test.xlsx");
    formData.append("projectId", String(testProjectId));

    const importResponse = await fetch("http://localhost:3000/api/hangzhou-leiming/markings/import", {
      method: "POST",
      body: formData,
    });

    const importResult = await importResponse.json();
    expect(importResult.success).toBe(true);

    // 3. 查询验证
    const markings = await db
      .select()
      .from(hlMarkings)
      .where(eq(hlMarkings.projectId, testProjectId));

    expect(markings.length).toBeGreaterThan(0);

    // 4. 通过 API 查询
    const queryResponse = await fetch(`http://localhost:3000/api/hangzhou-leiming/markings?projectId=${testProjectId}`);
    const queryResult = await queryResponse.json();

    expect(queryResult.success).toBe(true);
    expect(queryResult.data.length).toBeGreaterThan(0);
  });
});
