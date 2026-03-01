/**
 * 杭州雷鸣 - 剪辑推荐 API
 *
 * 功能：
 * - POST /api/hangzhou-leiming/projects/:id/recommend - 生成剪辑推荐
 * - GET  /api/hangzhou-leiming/projects/:id/recommend?taskId=xxx - 查询推荐结果
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { hlAnalysisResults, hlClipCombinations, hlProjects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { RecommendationEngine } from '@/lib/ai/recommendation-engine';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================
// POST: 生成剪辑推荐
// ============================================

export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  let projectId: number | undefined;

  try {
    const { id: idStr } = await params;
    projectId = parseInt(idStr);

    const body = await req.json();
    const {
      analysisId,
      minDurationMs = 120000, // 默认最小 2 分钟
      maxDurationMs = 300000, // 默认最大 5 分钟
      maxCombinations = 20,   // 默认返回 20 个组合
      allowCrossEpisode = true, // 默认允许跨集
    } = body;

    // 参数验证
    if (!analysisId) {
      return NextResponse.json(
        { success: false, message: '缺少分析任务 ID' },
        { status: 400 }
      );
    }

    if (minDurationMs >= maxDurationMs) {
      return NextResponse.json(
        { success: false, message: '最小时长必须小于最大时长' },
        { status: 400 }
      );
    }

    if (minDurationMs < 30000) {
      return NextResponse.json(
        { success: false, message: '最小时长不能少于 30 秒' },
        { status: 400 }
      );
    }

    if (maxCombinations < 1 || maxCombinations > 100) {
      return NextResponse.json(
        { success: false, message: '组合数量必须在 1-100 之间' },
        { status: 400 }
      );
    }

    // 验证分析任务是否存在
    const [analysis] = await db
      .select()
      .from(hlAnalysisResults)
      .where(eq(hlAnalysisResults.id, analysisId));

    if (!analysis) {
      return NextResponse.json(
        { success: false, message: '分析任务不存在' },
        { status: 404 }
      );
    }

    // 验证分析任务是否已完成
    if (analysis.status !== 'completed') {
      return NextResponse.json(
        {
          success: false,
          message: '分析任务未完成，无法生成推荐',
          status: analysis.status,
        },
        { status: 400 }
      );
    }

    console.log(`[杭州雷鸣] 开始生成推荐，分析ID: ${analysisId}`);

    // 检查是否已存在推荐结果
    const [existingResult] = await db
      .select({ count: hlClipCombinations.id })
      .from(hlClipCombinations)
      .where(eq(hlClipCombinations.analysisId, analysisId))
      .limit(1);

    if (existingResult) {
      // 清理旧结果
      console.log(`[杭州雷鸣] 清理旧推荐结果`);
      await db
        .delete(hlClipCombinations)
        .where(eq(hlClipCombinations.analysisId, analysisId));
    }

    // 更新项目状态为处理中
    await db
      .update(hlProjects)
      .set({ status: 'analyzing' })
      .where(eq(hlProjects.id, projectId));

    // 调用推荐引擎生成推荐
    const recommendations = await RecommendationEngine.generateRecommendations({
      analysisId,
      minDurationMs,
      maxDurationMs,
      maxCombinations,
      allowCrossEpisode,
    });

    // 更新项目状态为就绪
    await db
      .update(hlProjects)
      .set({ status: 'ready' })
      .where(eq(hlProjects.id, projectId));

    console.log(`[杭州雷鸣] 推荐生成完成，共 ${recommendations.length} 个组合`);

    return NextResponse.json({
      success: true,
      message: `成功生成 ${recommendations.length} 个剪辑推荐`,
      data: {
        taskId: analysisId,
        combinations: recommendations,
        total: recommendations.length,
      },
    });

  } catch (error) {
    console.error('[杭州雷鸣] 推荐生成失败:', error);

    // 更新项目状态为错误
    try {
      if (projectId) {
        await db
          .update(hlProjects)
          .set({ status: 'error' })
          .where(eq(hlProjects.id, projectId));
      }
    } catch (updateError) {
      console.error('[杭州雷鸣] 更新错误状态失败:', updateError);
    }

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '推荐生成失败',
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET: 查询推荐结果
// ============================================

export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: idStr } = await params;
    const projectId = parseInt(idStr);
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');

    if (taskId) {
      // 查询特定任务的推荐结果
      const combinations = await db
        .select()
        .from(hlClipCombinations)
        .where(eq(hlClipCombinations.analysisId, parseInt(taskId)))
        .orderBy(hlClipCombinations.rank);

      // 解析 clips JSON
      const results = combinations.map((combo: any) => ({
        ...combo,
        clips: JSON.parse(combo.clips),
      }));

      return NextResponse.json({
        success: true,
        data: {
          taskId: parseInt(taskId),
          combinations: results,
          total: results.length,
        },
      });
    } else {
      // 查询项目的所有推荐结果（通过项目ID查找最新的分析任务）
      const [latestAnalysis] = await db
        .select()
        .from(hlAnalysisResults)
        .where(eq(hlAnalysisResults.projectId, projectId))
        .orderBy(hlAnalysisResults.createdAt)
        .limit(1);

      if (!latestAnalysis) {
        return NextResponse.json(
          { success: false, message: '没有找到推荐结果' },
          { status: 404 }
        );
      }

      const combinations = await db
        .select()
        .from(hlClipCombinations)
        .where(eq(hlClipCombinations.analysisId, latestAnalysis.id))
        .orderBy(hlClipCombinations.rank);

      // 解析 clips JSON
      const results = combinations.map((combo: any) => ({
        ...combo,
        clips: JSON.parse(combo.clips),
      }));

      return NextResponse.json({
        success: true,
        data: {
          taskId: latestAnalysis.id,
          combinations: results,
          total: results.length,
        },
      });
    }

  } catch (error) {
    console.error('[杭州雷鸣] 查询推荐失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '查询推荐失败',
      },
      { status: 500 }
    );
  }
}
