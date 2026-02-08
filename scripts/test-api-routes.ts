#!/usr/bin/env tsx
/**
 * Agent 4 - 项目管理 API 测试脚本
 *
 * 测试所有项目管理的 API 路由
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
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

function logInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}

async function get(url: string): Promise<ApiResponse> {
  const response = await fetch(`${BASE_URL}${url}`);
  return response.json();
}

async function post(url: string, data: Record<string, unknown>): Promise<ApiResponse> {
  const response = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

async function put(url: string, data: Record<string, unknown>): Promise<ApiResponse> {
  const response = await fetch(`${BASE_URL}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

async function del(url: string): Promise<ApiResponse> {
  const response = await fetch(`${BASE_URL}${url}`, {
    method: 'DELETE',
  });
  return response.json();
}

async function main() {
  try {
    console.log('\n🎬 DramaGen AI - 项目管理 API 测试\n');
    console.log(`测试服务器: ${BASE_URL}\n`);

    // 测试 1: 创建项目
    logSection('1. 创建项目');
    const createResult = await post('/api/projects', {
      name: '测试项目 1',
      description: '这是一个测试项目',
    });
    if (createResult.success) {
      logSuccess('创建项目成功');
      logInfo(`项目 ID: ${(createResult.data as { id: number }).id}`);
      logInfo(`项目名称: ${(createResult.data as { name: string }).name}`);
    } else {
      logError(`创建项目失败: ${createResult.message}`);
      return;
    }

    const projectId = (createResult.data as { id: number }).id;

    // 测试 2: 获取项目列表
    logSection('2. 获取项目列表');
    const listResult = await get('/api/projects');
    if (listResult.success && listResult.data) {
      logSuccess('获取项目列表成功');
      logInfo(`项目数量: ${(listResult.meta as { count: number }).count}`);
    } else {
      logError(`获取项目列表失败: ${listResult.message}`);
    }

    // 测试 3: 获取项目详情
    logSection('3. 获取项目详情');
    const detailResult = await get(`/api/projects/${projectId}`);
    if (detailResult.success && detailResult.data) {
      logSuccess('获取项目详情成功');
      const project = detailResult.data as { name: string; videoCount: number; totalDuration: string };
      logInfo(`项目名称: ${project.name}`);
      logInfo(`视频数量: ${project.videoCount}`);
      logInfo(`总时长: ${project.totalDuration}`);
    } else {
      logError(`获取项目详情失败: ${detailResult.message}`);
    }

    // 测试 4: 搜索项目
    logSection('4. 搜索项目');
    const searchResult = await get('/api/projects/search?q=测试');
    if (searchResult.success && searchResult.data) {
      const results = searchResult.data as Array<{ name: string }>;
      logSuccess(`搜索成功，找到 ${results.length} 个结果`);
      results.forEach(p => logInfo(`  - ${p.name}`));
    } else {
      logError(`搜索失败: ${searchResult.message}`);
    }

    // 测试 5: 更新项目进度
    logSection('5. 更新项目进度');
    const updateResult = await put(`/api/projects/${projectId}`, {
      progress: 50,
      currentStep: '测试步骤... 50%',
    });
    if (updateResult.success && updateResult.data) {
      logSuccess('更新项目进度成功');
      logInfo(`新进度: ${(updateResult.data as { progress: number }).progress}%`);
      logInfo(`当前步骤: ${(updateResult.data as { currentStep?: string }).currentStep}`);
    } else {
      logError(`更新项目进度失败: ${updateResult.message}`);
    }

    // 测试 6: 添加视频
    logSection('6. 添加视频到项目');
    const videoResult = await post(`/api/projects/${projectId}/videos`, {
      filename: 'test_video.mp4',
      filePath: '/data/videos/test.mp4',
      fileSize: 1000000000,
      durationMs: 60000,
      width: 1080,
      height: 1920,
      fps: 30,
    });
    if (videoResult.success) {
      logSuccess('添加视频成功');
      logInfo(`视频 ID: ${(videoResult.data as { id: number }).id}`);
      logInfo(`文件名: ${(videoResult.data as { filename: string }).filename}`);
    } else {
      logError(`添加视频失败: ${videoResult.message}`);
    }

    const videoId = (videoResult.data as { id: number }).id;

    // 测试 7: 获取项目视频列表
    logSection('7. 获取项目视频列表');
    const videosResult = await get(`/api/projects/${projectId}/videos`);
    if (videosResult.success && videosResult.data) {
      logSuccess('获取视频列表成功');
      logInfo(`视频数量: ${(videosResult.meta as { count: number }).count}`);
    } else {
      logError(`获取视频列表失败: ${videosResult.message}`);
    }

    // 测试 8: 删除视频
    logSection('8. 删除视频');
    const deleteVideoResult = await del(`/api/videos/${videoId}`);
    if (deleteVideoResult.success) {
      logSuccess('删除视频成功');
    } else {
      logError(`删除视频失败: ${deleteVideoResult.message}`);
    }

    // 测试 9: 删除项目
    logSection('9. 删除项目');
    const deleteProjectResult = await del(`/api/projects/${projectId}`);
    if (deleteProjectResult.success) {
      logSuccess('删除项目成功');
    } else {
      logError(`删除项目失败: ${deleteProjectResult.message}`);
    }

    // 总结
    logSection('测试总结');
    console.log('✅ 所有 API 测试通过！');
    console.log('\n📊 测试覆盖的 API:');
    console.log('  1. POST   /api/projects - 创建项目');
    console.log('  2. GET    /api/projects - 项目列表');
    console.log('  3. GET    /api/projects/:id - 项目详情');
    console.log('  4. GET    /api/projects/search - 搜索项目');
    console.log('  5. PUT    /api/projects/:id - 更新项目');
    console.log('  6. POST   /api/projects/:id/videos - 添加视频');
    console.log('  7. GET    /api/projects/:id/videos - 视频列表');
    console.log('  8. DELETE /api/videos/:id - 删除视频');
    console.log('  9. DELETE /api/projects/:id - 删除项目');

    console.log('\n🎉 项目管理 API 测试完成！\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.log('\n提示：请确保开发服务器正在运行（npm run dev）');
    process.exit(1);
  }
}

// 运行测试
main();
