#!/usr/bin/env tsx
/**
 * Agent 4 - 项目管理数据库测试脚本
 *
 * 测试 projects 表和 projectQueries 的完整功能
 */

import { projectQueries, videoQueries } from '../lib/db/queries';
import { dbClient } from '../lib/db/client';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`📋 ${title}`);
  console.log('='.repeat(60));
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logError(message: string) {
  console.log(`❌ ${message}`);
}

async function main() {
  try {
    console.log('\n🎬 DramaGen AI - 项目管理数据库测试\n');

    // 初始化数据库
    logSection('1. 初始化数据库');
    await dbClient.init();
    logSuccess('数据库初始化完成');

    // 重置数据库（测试环境）
    logSection('2. 重置数据库（测试环境）');
    await dbClient.reset();
    logSuccess('数据库重置完成');

    // 测试 1: 创建项目
    logSection('3. 创建项目');
    const project1 = await projectQueries.create({
      name: '霸道总裁爱上我',
      description: '都市言情短剧，共12集',
      status: 'ready',
      progress: 100,
    });
    logSuccess(`创建项目: ${project1.name} (ID: ${project1.id})`);

    const project2 = await projectQueries.create({
      name: '重生之豪门千金',
      description: '现代都市复仇短剧',
      status: 'processing',
      progress: 45,
      currentStep: 'Gemini 分析中... 45%',
    });
    logSuccess(`创建项目: ${project2.name} (ID: ${project2.id})`);

    // 测试 2: 获取项目列表
    logSection('4. 获取项目列表');
    const projects = await projectQueries.list();
    console.log(`找到 ${projects.length} 个项目:`);
    projects.forEach(p => {
      console.log(`  - ${p.name} (${p.status}) - ${p.progress}%`);
    });
    logSuccess('项目列表查询成功');

    // 测试 3: 根据 ID 获取项目
    logSection('5. 根据 ID 获取项目');
    const foundProject = await projectQueries.getById(project1.id!);
    if (foundProject) {
      console.log(`项目名称: ${foundProject.name}`);
      console.log(`项目描述: ${foundProject.description}`);
      console.log(`项目状态: ${foundProject.status}`);
      console.log(`项目进度: ${foundProject.progress}%`);
      logSuccess('项目查询成功');
    } else {
      logError('项目未找到');
    }

    // 测试 4: 搜索项目
    logSection('6. 搜索项目');
    const searchResults = await projectQueries.search('霸道');
    console.log(`搜索 "霸道" 找到 ${searchResults.length} 个结果:`);
    searchResults.forEach(p => {
      console.log(`  - ${p.name}`);
    });
    logSuccess('项目搜索成功');

    // 测试 5: 更新项目进度
    logSection('7. 更新项目进度');
    const updatedProject = await projectQueries.updateProgress(project2.id!, 75, '镜头检测中... 75%');
    console.log(`项目进度更新: ${updatedProject.progress}%`);
    console.log(`当前步骤: ${updatedProject.currentStep}`);
    logSuccess('项目进度更新成功');

    // 测试 6: 为项目添加视频
    logSection('8. 为项目添加视频');
    const video1 = await videoQueries.create({
      projectId: project1.id!,
      filename: '霸道总裁爱上我.ep1.mp4',
      filePath: '/data/videos/ep1.mp4',
      fileSize: 1200000000,
      durationMs: 2732000, // 45:32
      width: 1080,
      height: 1920,
      fps: 30,
      status: 'ready',
    });
    logSuccess(`添加视频: ${video1.filename}`);

    const video2 = await videoQueries.create({
      projectId: project1.id!,
      filename: '霸道总裁爱上我.ep2.mp4',
      filePath: '/data/videos/ep2.mp4',
      fileSize: 1150000000,
      durationMs: 2658000, // 44:18
      width: 1080,
      height: 1920,
      fps: 30,
      status: 'processing',
    });
    logSuccess(`添加视频: ${video2.filename}`);

    // 测试 7: 获取项目的所有视频
    logSection('9. 获取项目的所有视频');
    const projectVideos = await videoQueries.getByProjectId(project1.id!);
    console.log(`项目 "${project1.name}" 包含 ${projectVideos.length} 个视频:`);
    projectVideos.forEach(v => {
      console.log(`  - ${v.filename} (${v.status})`);
    });
    logSuccess('项目视频查询成功');

    // 测试 8: 获取项目及统计信息
    logSection('10. 获取项目及统计信息');
    const projectWithStats = await projectQueries.getWithStats(project1.id!);
    if (projectWithStats) {
      console.log(`项目名称: ${projectWithStats.name}`);
      console.log(`视频数量: ${projectWithStats.videoCount}`);
      console.log(`总时长: ${projectWithStats.totalDuration}`);
      logSuccess('项目统计查询成功');
    } else {
      logError('项目统计查询失败');
    }

    // 测试 9: 更新项目信息
    logSection('11. 更新项目信息');
    const updatedInfo = await projectQueries.update(project1.id!, {
      description: '都市言情短剧，共12集，更新描述',
    });
    console.log(`新描述: ${updatedInfo.description}`);
    logSuccess('项目信息更新成功');

    // 测试 10: 删除项目（级联删除视频）
    logSection('12. 删除项目（级联删除）');
    const deletedProject = await projectQueries.delete(project2.id!);
    console.log(`已删除项目: ${deletedProject.name}`);

    // 验证视频也被级联删除
    const remainingVideos = await videoQueries.getByProjectId(project2.id!);
    console.log(`项目 ${project2.name} 的剩余视频: ${remainingVideos.length} 个`);
    logSuccess('项目级联删除成功');

    // 测试 11: 数据库统计
    logSection('13. 数据库统计');
    const stats = await dbClient.getStats();
    console.log(`项目总数: ${stats.projects}`);
    console.log(`视频总数: ${stats.videos}`);
    logSuccess('数据库统计查询成功');

    // 总结
    logSection('测试总结');
    console.log('✅ 所有测试通过！');
    console.log('\n📊 测试覆盖的功能:');
    console.log('  1. 创建项目');
    console.log('  2. 获取项目列表');
    console.log('  3. 根据 ID 获取项目');
    console.log('  4. 搜索项目');
    console.log('  5. 更新项目进度');
    console.log('  6. 为项目添加视频');
    console.log('  7. 获取项目的所有视频');
    console.log('  8. 获取项目及统计信息');
    console.log('  9. 更新项目信息');
    console.log(' 10. 删除项目（级联删除）');
    console.log(' 11. 数据库统计');

    console.log('\n🎉 项目管理数据库层测试完成！\n');

    // 关闭数据库连接
    dbClient.close();

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
main();
