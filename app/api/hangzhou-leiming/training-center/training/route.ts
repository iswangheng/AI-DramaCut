/**
 * 杭州雷鸣 - 训练执行 API
 *
 * 功能：
 * - POST - 开始训练（选择多个项目）
 *
 * 训练流程：
 * 1. 选择多个历史项目
 * 2. 读取这些项目的标记数据
 * 3. 调用 Gemini AI 学习标记模式
 * 4. 生成新的技能文件
 * 5. 保存到全局技能表
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import {
  hlProjects,
  hlVideos,
  hlMarkings,
  hlTrainingHistory,
  hlGlobalSkills,
} from "@/lib/db/schema";
import { eq, inArray, desc, sql } from "drizzle-orm";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";

/**
 * POST - 开始训练
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectIds } = body;

    // 验证参数
    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "请选择至少一个项目进行训练",
        },
        { status: 400 }
      );
    }

    console.log(`[训练中心] 开始训练，选择项目: ${projectIds.join(", ")}`);

    // 1. 查询项目信息
    const projects = await db
      .select()
      .from(hlProjects)
      .where(inArray(hlProjects.id, projectIds));

    if (projects.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "未找到选择的项目",
        },
        { status: 404 }
      );
    }

    if (projects.length !== projectIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "部分项目不存在，请检查项目ID",
        },
        { status: 404 }
      );
    }

    // 2. 创建训练历史记录
    const [trainingRecord] = await db
      .insert(hlTrainingHistory)
      .values({
        projectIds: JSON.stringify(projectIds),
        projectNames: JSON.stringify(projects.map((p: any) => p.name)),
        skillVersion: `pending_${Date.now()}`, // 临时版本号
        status: "training",
        progress: 0,
        currentStep: "初始化",
        startedAt: new Date(),
      })
      .returning();

    console.log(`[训练中心] 训练记录创建成功，ID: ${trainingRecord.id}`);

    // 3. 异步执行训练（不阻塞响应）
    executeTraining(trainingRecord.id, projects).catch((error) => {
      console.error(`[训练中心] 训练失败，ID: ${trainingRecord.id}`, error);
    });

    return NextResponse.json({
      success: true,
      message: "训练任务已创建",
      data: {
        trainingId: trainingRecord.id,
        status: "training",
      },
    });
  } catch (error) {
    console.error("[训练中心] 创建训练任务失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "创建训练任务失败",
      },
      { status: 500 }
    );
  }
}

/**
 * 执行训练任务（异步函数）
 * 使用新的TrainingExecutor实现完整的训练流程
 */
async function executeTraining(
  trainingId: number,
  projects: any[]
): Promise<void> {
  try {
    console.log(`[训练中心] 开始执行训练，ID: ${trainingId}`);

    // 读取所有项目的标记数据
    const allMarkings: any[] = [];

    for (const project of projects) {
      const markings = await db
        .select()
        .from(hlMarkings)
        .where(eq(hlMarkings.projectId, project.id));

      allMarkings.push(...markings);
      console.log(`[训练中心] 项目「${project.name}」: ${markings.length} 个标记`);
    }

    console.log(`[训练中心] 共读取 ${allMarkings.length} 个标记`);

    // ========================================
    // ✅ 使用新的TrainingExecutor
    // ========================================
    const { TrainingExecutor } = await import('@/lib/training/executor');

    const executor = new TrainingExecutor({
      trainingId,
      projectId: projects[0].id,  // 主项目ID
      markings: allMarkings,
      concurrency: 5,  // 并发数5
      onProgress: async (progress: number, step: string) => {
        // 更新训练进度
        await db
          .update(hlTrainingHistory)
          .set({
            progress,
            currentStep: step,
          })
          .where(eq(hlTrainingHistory.id, trainingId));

        console.log(`[训练中心] 进度: ${progress}% - ${step}`);
      },
    });

    // 执行训练
    await executor.execute();

    console.log(`[训练中心] 训练完成，ID: ${trainingId}`);

    // ========================================
    // 保存技能文件到数据库
    // ========================================
    console.log(`[训练中心] 保存技能文件到数据库...`);

    // 查询生成的技能文件路径（从 TrainingExecutor 获取）
    const { getGeneratedSkillPath } = await import('@/lib/training/executor');
    const skillFilePath = getGeneratedSkillPath();

    if (!skillFilePath || !existsSync(skillFilePath)) {
      throw new Error('技能文件生成失败，文件不存在');
    }

    // 生成版本号
    const [latestSkill] = await db
      .select()
      .from(hlGlobalSkills)
      .orderBy(desc(hlGlobalSkills.createdAt))
      .limit(1);

    const versionNumber = latestSkill
      ? (parseFloat(latestSkill.version.replace("v", "")) + 0.1).toFixed(1)
      : "1.0";
    const version = `v${versionNumber}`;

    // 创建技能记录
    const [newSkill] = await db
      .insert(hlGlobalSkills)
      .values({
        version,
        skillFilePath,
        totalProjects: projects.length,
        totalVideos: allMarkings.length, // 暂时使用标记数作为视频数的估计
        totalMarkings: allMarkings.length,
        trainingProjectIds: JSON.stringify(projects.map((p) => p.id)),
        status: "ready",
      })
      .returning();

    console.log(`[训练中心] 技能记录创建成功，ID: ${newSkill.id}, 版本: ${version}`);

    // 更新训练历史记录为完成状态
    await db
      .update(hlTrainingHistory)
      .set({
        status: "completed",
        progress: 100,
        currentStep: "训练完成",
        skillVersion: version,
        skillId: newSkill.id,
        totalVideosProcessed: allMarkings.length,
        totalMarkingsLearned: allMarkings.length,
        completedAt: new Date(),
      })
      .where(eq(hlTrainingHistory.id, trainingId));

    console.log(`[训练中心] 训练状态已更新为完成，ID: ${trainingId}`);

  } catch (error) {
    console.error(`[训练中心] 训练失败:`, error);

    // 更新训练历史记录为失败状态
    await db
      .update(hlTrainingHistory)
      .set({
        status: "failed",
        currentStep: "训练失败",
        errorMessage: error instanceof Error ? error.message : "未知错误",
      })
      .where(eq(hlTrainingHistory.id, trainingId));

    throw error;
  }
}

// ============================================
// 以下为旧的实现（已废弃，保留用于参考）
// ============================================

/**
 * @deprecated 已废弃，请使用TrainingExecutor
 */
async function executeTrainingLegacy(
  trainingId: number,
  projects: any[]
): Promise<void> {
  try {
    console.log(`[训练中心] 开始执行训练，ID: ${trainingId}`);

    // 更新状态：读取标记数据
    await db
      .update(hlTrainingHistory)
      .set({
        currentStep: "读取标记数据",
        progress: 10,
      })
      .where(eq(hlTrainingHistory.id, trainingId));

    // 读取所有项目的标记数据
    const allMarkings: any[] = [];
    let totalVideos = 0;

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const progress = 10 + Math.floor((i / projects.length) * 30);

      await db
        .update(hlTrainingHistory)
        .set({
          currentStep: `读取项目「${project.name}」的标记数据`,
          progress,
        })
        .where(eq(hlTrainingHistory.id, trainingId));

      // 查询项目的标记数据
      const markings = await db
        .select()
        .from(hlMarkings)
        .where(eq(hlMarkings.projectId, project.id));

      allMarkings.push(...markings);

      // 查询项目的视频数量
      const [videoCount] = await db
        .select({ count: sql`count(*)` })
        .from(hlVideos)
        .where(eq(hlVideos.projectId, project.id));

      totalVideos += videoCount?.count || 0;

      console.log(`[训练中心] 项目「${project.name}」: ${markings.length} 个标记`);
    }

    console.log(
      `[训练中心] 共读取 ${allMarkings.length} 个标记，${totalVideos} 个视频`
    );

    // 更新状态：生成技能文件
    await db
      .update(hlTrainingHistory)
      .set({
        currentStep: "生成技能文件",
        progress: 50,
      })
      .where(eq(hlTrainingHistory.id, trainingId));

    // 生成技能文件内容
    const skillContent = generateSkillFileContent(allMarkings, projects);

    // 保存技能文件到磁盘
    const skillsDir = join(process.cwd(), "data", "hangzhou-leiming", "skills");
    await mkdir(skillsDir, { recursive: true });

    // 生成版本号
    const [latestSkill] = await db
      .select()
      .from(hlGlobalSkills)
      .orderBy(desc(hlGlobalSkills.createdAt))
      .limit(1);

    const versionNumber = latestSkill
      ? (parseFloat(latestSkill.version.replace("v", "")) + 0.1).toFixed(1)
      : "1.0";
    const version = `v${versionNumber}`;

    const skillFileName = `skill_${version}_${Date.now()}.md`;
    const skillFilePath = join(skillsDir, skillFileName);

    await writeFile(skillFilePath, skillContent, "utf-8");

    console.log(`[训练中心] 技能文件已保存: ${skillFilePath}`);

    // 更新状态：保存技能到数据库
    await db
      .update(hlTrainingHistory)
      .set({
        currentStep: "保存技能文件",
        progress: 80,
      })
      .where(eq(hlTrainingHistory.id, trainingId));

    // 创建技能记录
    const [newSkill] = await db
      .insert(hlGlobalSkills)
      .values({
        version,
        skillFilePath,
        totalProjects: projects.length,
        totalVideos,
        totalMarkings: allMarkings.length,
        trainingProjectIds: JSON.stringify(projects.map((p) => p.id)),
        status: "ready",
      })
      .returning();

    console.log(`[训练中心] 技能记录创建成功，ID: ${newSkill.id}`);

    // 更新训练历史记录
    await db
      .update(hlTrainingHistory)
      .set({
        status: "completed",
        progress: 100,
        currentStep: "训练完成",
        skillVersion: version,
        skillId: newSkill.id,
        totalVideosProcessed: totalVideos,
        totalMarkingsLearned: allMarkings.length,
        completedAt: new Date(),
      })
      .where(eq(hlTrainingHistory.id, trainingId));

    console.log(`[训练中心] 训练完成，ID: ${trainingId}`);
  } catch (error) {
    console.error(`[训练中心] 训练失败:`, error);

    // 更新训练历史记录为失败状态
    await db
      .update(hlTrainingHistory)
      .set({
        status: "failed",
        currentStep: "训练失败",
        errorMessage: error instanceof Error ? error.message : "未知错误",
      })
      .where(eq(hlTrainingHistory.id, trainingId));

    throw error;
  }
}

/**
 * 生成技能文件内容（Markdown 格式）
 */
function generateSkillFileContent(markings: any[], projects: any[]): string {
  // 分析标记数据
  const highlightMarkings = markings.filter((m) => m.type === "高光点");
  const hookMarkings = markings.filter((m) => m.type === "钩子点");

  // 统计子类型
  const highlightSubTypes = highlightMarkings.reduce((acc, m) => {
    const subType = m.subType || "未分类";
    acc[subType] = (acc[subType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hookSubTypes = hookMarkings.reduce((acc, m) => {
    const subType = m.subType || "未分类";
    acc[subType] = (acc[subType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 生成 Markdown 内容
  const lines: string[] = [];

  // 标题
  lines.push(`# 杭州雷鸣 - 全局剪辑技能文件`);
  lines.push(``);
  lines.push(`## 基本信息`);
  lines.push(``);
  lines.push(`- **版本**: v${new Date().toISOString().split("T")[0].replace(/-/g, ".")}`);
  lines.push(`- **训练项目**: ${projects.map((p) => p.name).join(", ")}`);
  lines.push(`- **训练时间**: ${new Date().toLocaleString("zh-CN")}`);
  lines.push(`- **标记总数**: ${markings.length}`);
  lines.push(`- **高光点**: ${highlightMarkings.length}`);
  lines.push(`- **钩子点**: ${hookMarkings.length}`);
  lines.push(``);

  // 高光点模式
  lines.push(`## 高光点模式`);
  lines.push(``);
  Object.entries(highlightSubTypes).forEach(([subType, count]) => {
    lines.push(`### ${subType} (${count}个)`);
    lines.push(``);

    const examples = highlightMarkings
      .filter((m) => m.subType === subType)
      .slice(0, 5); // 只显示前5个示例

    examples.forEach((m) => {
      lines.push(`- **时间点**: ${m.timestamp}`);
      lines.push(`  - **描述**: ${m.description || "无"}`);
      lines.push(`  - **得分**: ${m.score || "无"}`);
      lines.push(`  - **推理**: ${m.reasoning || "无"}`);
      lines.push(``);
    });
  });

  // 钩子点模式
  lines.push(`## 钩子点模式`);
  lines.push(``);
  Object.entries(hookSubTypes).forEach(([subType, count]) => {
    lines.push(`### ${subType} (${count}个)`);
    lines.push(``);

    const examples = hookMarkings
      .filter((m) => m.subType === subType)
      .slice(0, 5); // 只显示前5个示例

    examples.forEach((m) => {
      lines.push(`- **时间点**: ${m.timestamp}`);
      lines.push(`  - **描述**: ${m.description || "无"}`);
      lines.push(`  - **得分**: ${m.score || "无"}`);
      lines.push(`  - **推理**: ${m.reasoning || "无"}`);
      lines.push(``);
    });
  });

  return lines.join("\n");
}
