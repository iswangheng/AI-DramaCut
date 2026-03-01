/**
 * 手动完成训练并保存技能文件到数据库
 */

import { db } from '../lib/db/client';
import { hlTrainingHistory, hlGlobalSkills, hlMarkings, hlVideos } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { TrainingExecutor } from '../lib/training/executor';
import { readFile } from 'fs/promises';
import { join } from 'path';

async function completeTraining() {
  try {
    const trainingId = 2; // 训练记录ID
    const projectId = 1; // 项目ID（简化处理）

    console.log(`🔄 手动完成训练，ID: ${trainingId}\n`);

    // 1. 检查训练记录
    const [training] = await db
      .select()
      .from(hlTrainingHistory)
      .where(eq(hlTrainingHistory.id, trainingId));

    if (!training) {
      console.error('❌ 训练记录不存在');
      process.exit(1);
    }

    console.log(`📋 训练项目ID: ${projectId}`);
    console.log(`📊 当前状态: ${training.status}, 进度: ${training.progress}%\n`);
    const allMarkings: any[] = [];

    for (const projectId of projectIds) {
      const markings = await db
        .select()
        .from(hlMarkings)
        .where(eq(hlMarkings.projectId, projectId));

      // 添加视频名称
      const markingsWithVideo = await Promise.all(markings.map(async (marking) => {
        const [video] = await db
          .select({ filename: hlVideos.filename })
          .from(hlVideos)
          .where(eq(hlVideos.id, marking.videoId))
          .limit(1);

        return {
          ...marking,
          videoName: video?.filename || '未知',
        };
      }));

      allMarkings.push(...markingsWithVideo);
      console.log(`  ✅ 项目 ${projectId}: ${markingsWithVideo.length} 个标记`);
    }

    console.log(`\n📊 总标记数: ${allMarkings.length}\n`);

    if (allMarkings.length === 0) {
      console.error('❌ 没有找到标记数据');
      process.exit(1);
    }

    // 3. 使用TrainingExecutor生成技能文件
    console.log(`🚀 开始训练流程...\n`);

    const executor = new TrainingExecutor({
      trainingId,
      projectId: projectIds[0],
      markings: allMarkings,
      concurrency: 5,
      onProgress: async (progress, step) => {
        console.log(`  [${progress}%] ${step}`);

        // 更新进度
        await db
          .update(hlTrainingHistory)
          .set({ progress, currentStep: step })
          .where(eq(hlTrainingHistory.id, trainingId));
      },
    });

    // 执行训练
    await executor.execute();

    console.log(`\n✅ 训练完成\n`);

    // 4. 查找生成的技能文件
    const skillsDir = join(process.cwd(), 'data', 'hangzhou-leiming', 'skills');
    const files = await import('fs/promises').then(fs => fs.readdir(skillsDir));
    const skillFiles = (await files).filter((f: string) => f.endsWith('.md'));

    // 按修改时间排序，取最新的
    const fileStats = await Promise.all(
      skillFiles.map(async (f: string) => {
        const filePath = join(skillsDir, f);
        const stats = await import('fs/promises').then(fs => fs.stat(filePath));
        return { fileName: f, mtime: stats.mtime, filePath };
      })
    );

    fileStats.sort((a, b) => b.mtime - a.mtime);
    const latestSkill = fileStats[0];

    console.log(`📄 最新技能文件: ${latestSkill.fileName}`);
    console.log(`📅 修改时间: ${latestSkill.mtime}\n`);

    // 5. 读取技能文件内容
    const skillContent = await readFile(latestSkill.filePath, 'utf-8');
    console.log(`📝 技能文件大小: ${skillContent.length} 字\n`);

    // 6. 保存技能到数据库
    const version = `v1.${Date.now()}`;
    const [newSkill] = await db
      .insert(hlGlobalSkills)
      .values({
        version,
        skillFilePath: latestSkill.filePath,
        totalProjects: projectIds.length,
        totalVideos: allMarkings.length, // TODO: 统计实际视频数
        totalMarkings: allMarkings.length,
        trainingProjectIds: training.projectIds,
        status: 'ready',
      })
      .returning();

    console.log(`✅ 技能已保存到数据库，ID: ${newSkill.id}`);
    console.log(`📌 版本: ${version}\n`);

    // 7. 更新训练历史
    await db
      .update(hlTrainingHistory)
      .set({
        status: 'completed',
        progress: 100,
        currentStep: '训练完成',
        skillVersion: version,
        skillId: newSkill.id,
        completedAt: new Date(),
      })
      .where(eq(hlTrainingHistory.id, trainingId));

    console.log(`✅ 训练历史已更新\n`);
    console.log(`🎉 手动训练完成！`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 手动训练失败:', error);
    process.exit(1);
  }
}

// 运行脚本
completeTraining();
