// ============================================
// 手动触发高光检测任务的脚本
// 用途：为指定视频重新生成高光片段数据
// ============================================

import { queueManager, QUEUE_NAMES } from '../lib/queue/bullmq';
import { videoQueries } from '../lib/db/queries';

async function triggerHighlightsDetection() {
  // 从命令行参数获取视频ID，默认使用 4
  const videoId = parseInt(process.argv[2]) || 4;

  console.log(`🚀 开始为视频 ${videoId} 触发高光检测任务...`);

  try {
    // 从数据库查询视频信息
    const video = await videoQueries.getById(videoId);

    if (!video) {
      console.error(`❌ 视频 ID ${videoId} 不存在`);
      process.exit(1);
    }

    console.log(`📹 视频名称: ${video.filename}`);
    console.log(`📹 视频路径: ${video.filePath}`);
    console.log(`📹 视频状态: ${video.status}`);

    // 检查视频状态
    if (video.status !== 'ready') {
      console.error(`❌ 视频状态不正确，当前状态: ${video.status}，需要状态: ready`);
      console.error('💡 请先等待视频分析完成');
      process.exit(1);
    }

    // 添加高光检测任务到队列
    const job = await queueManager.addJob(
      QUEUE_NAMES.geminiAnalysis,
      `detect-highlights-${videoId}-${Date.now()}`,
      {
        type: 'detect-highlights',
        videoPath: video.filePath,
        videoId,
      }
    );

    console.log(`\n✅ 任务已添加到队列`);
    console.log(`   Job ID: ${job?.id}`);
    console.log(`   队列: ${QUEUE_NAMES.geminiAnalysis}`);
    console.log(`\n⏳ 任务正在后台处理中...`);
    console.log(`📊 查看方式:`);
    console.log(`   1. 访问: http://localhost:3000/highlight`);
    console.log(`   2. 点击"AI 一键生成高光切片"按钮`);
    console.log(`   3. 等待检测完成后刷新页面查看结果`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 触发任务失败:', error);
    process.exit(1);
  }
}

// 执行触发函数
triggerHighlightsDetection();
