// ============================================
// 测试数据准备工具
// ============================================

import { db } from '@/lib/db/client';
import { hlAiMarkings, hlVideos, hlAnalysisResults, hlProjects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 创建推荐引擎测试数据
 */
export async function setupRecommendationEngineTestData() {
  // 0. 创建测试项目（避免外键约束失败）
  const testProjects = await db
    .insert(hlProjects)
    .values([
      {
        name: '测试项目',
        description: '推荐引擎测试项目',
      },
    ])
    .returning();

  const projectId = testProjects[0].id;

  // 1. 创建测试视频
  const testVideos = await db
    .insert(hlVideos)
    .values([
      {
        projectId, // 使用测试项目ID
        filename: '第1集.mp4',
        filePath: '/test/episode1.mp4',
        fileSize: 1024000,
        episodeNumber: '第1集', // 添加必需字段
        durationMs: 180000, // 3分钟
        width: 1920,
        height: 1080,
        fps: 30,
      },
      {
        projectId,
        filename: '第2集.mp4',
        filePath: '/test/episode2.mp4',
        fileSize: 1024000,
        episodeNumber: '第2集', // 添加必需字段
        durationMs: 180000,
        width: 1920,
        height: 1080,
        fps: 30,
      },
    ])
    .returning();

  // 2. 创建测试分析任务
  const testAnalysis = await db
    .insert(hlAnalysisResults)
    .values({
      projectId,
      videoId: testVideos[0].id, // 添加必需字段
      status: 'completed',
      highlightsFound: 3, // 修改字段名
      hooksFound: 2, // 修改字段名
    })
    .returning();

  const analysisId = testAnalysis[0].id;

  // 3. 创建测试AI标记
  await db.insert(hlAiMarkings).values([
    // 第1集的高光点（时长更长以符合跨集测试要求）
    {
      analysisId,
      videoId: testVideos[0].id,
      videoName: '第1集.mp4',
      startMs: 10000,
      endMs: 70000, // 60秒高光点
      type: '高光点',
      subType: '高能冲突',
      score: 8.5,
      emotion: '愤怒',
      reasoning: '主角与反派发生激烈争吵',
    },
    {
      analysisId,
      videoId: testVideos[0].id,
      videoName: '第1集.mp4',
      startMs: 75000,
      endMs: 80000, // 5秒高光点
      type: '高光点',
      subType: '身份揭露',
      score: 9.0,
      emotion: '震惊',
      reasoning: '隐藏身份被意外曝光',
    },
    // 第1集的钩子点
    {
      analysisId,
      videoId: testVideos[0].id,
      videoName: '第1集.mp4',
      startMs: 150000,
      endMs: 170000, // 20秒钩子点（用于单集测试）
      type: '钩子点',
      subType: '悬念结尾',
      score: 9.5,
      emotion: '好奇',
      reasoning: '神秘人物留下关键线索',
    },
    // 第2集的高光点
    {
      analysisId,
      videoId: testVideos[1].id,
      videoName: '第2集.mp4',
      startMs: 10000,
      endMs: 65000, // 55秒高光点
      type: '高光点',
      subType: '情感高潮',
      score: 8.0,
      emotion: '悲伤',
      reasoning: '主角遭遇重大挫折',
    },
    // 第2集的钩子点（时长更长以符合跨集测试要求）
    {
      analysisId,
      videoId: testVideos[1].id,
      videoName: '第2集.mp4',
      startMs: 70000,
      endMs: 140000, // 70秒钩子点
      type: '钩子点',
      subType: '反转预告',
      score: 8.8,
      emotion: '紧张',
      reasoning: '预告下一集将有重大反转',
    },
  ]);

  return {
    analysisId,
    videos: testVideos,
    projectId,
  };
}

/**
 * 清理推荐引擎测试数据
 */
export async function cleanupRecommendationEngineTestData(projectId?: number) {
  // 删除测试数据（级联删除会处理相关记录）
  if (projectId) {
    await db
      .delete(hlAnalysisResults)
      .where(eq(hlAnalysisResults.projectId, projectId));
  }
}

/**
 * 创建视频导出测试数据
 */
export async function setupVideoExportTestData() {
  // 复用推荐引擎的测试数据
  const { analysisId } = await setupRecommendationEngineTestData();

  // 返回测试数据
  const testData = await setupRecommendationEngineTestData();
  return {
    analysisId: testData.analysisId,
    projectId: testData.projectId,
  };
}

/**
 * 清理视频导出测试数据
 */
export async function cleanupVideoExportTestData() {
  await cleanupRecommendationEngineTestData();
}
