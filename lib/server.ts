// ============================================
// DramaCut AI 自定义服务器
// 集成 Next.js + WebSocket
// Agent 4 - 服务器集成
// ============================================

// 加载环境变量（必须在所有其他导入之前）
import * as dotenv from 'dotenv';
import path from 'path';

// 加载 .env.local 文件
const envPath = path.join(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('⚠️  警告: 无法加载 .env.local 文件:', result.error.message);
} else {
  console.log('✅ 环境变量已加载:', envPath);
}

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { wsServer } from './ws/server';
import { queueManager, QUEUE_NAMES } from './queue';
import { initializeApp } from './db/init';
import { videoJobProcessor } from './queue/workers';

// ============================================
// 服务器配置
// ============================================

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// 创建 Next.js 应用
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ============================================
// 服务器启动
// ============================================

app.prepare().then(async () => {
  // 1. 初始化应用（数据库、配置等）
  console.log('🚀 正在初始化 DramaCut AI...');
  await initializeApp();

  // 2. 创建 HTTP 服务器
  const server = createServer(async (req, res) => {
    try {
      // 解析 URL
      const parsedUrl = parse(req.url!, true);

      // 处理 Next.js 请求
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('❌ 请求处理错误:', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // 3. 启动 WebSocket 服务器
  // 注意：WebSocket 服务器已经在 initializeApp 中启动
  // 这里只需要确认它正在运行
  console.log('✅ WebSocket 服务器已集成');

  // 4. 启动所有队列 Workers
  try {
    // 启动视频处理 Worker（镜头检测）
    queueManager.createWorker(QUEUE_NAMES.videoProcessing, videoJobProcessor);
    console.log(`✅ 视频处理 Worker 已启动: ${QUEUE_NAMES.videoProcessing}`);

    // 启动 Gemini 分析 Worker
    queueManager.createWorker(QUEUE_NAMES.geminiAnalysis, videoJobProcessor);
    console.log(`✅ Gemini 分析 Worker 已启动: ${QUEUE_NAMES.geminiAnalysis}`);

    // 启动 TTS 生成 Worker
    queueManager.createWorker(QUEUE_NAMES.ttsGeneration, videoJobProcessor);
    console.log(`✅ TTS 生成 Worker 已启动: ${QUEUE_NAMES.ttsGeneration}`);

    // 启动视频渲染 Worker
    queueManager.createWorker(QUEUE_NAMES.videoRender, videoJobProcessor);
    console.log(`✅ 视频渲染 Worker 已启动: ${QUEUE_NAMES.videoRender}`);
  } catch (error) {
    console.warn('⚠️  Workers 启动失败（可能 Redis 未运行）:', error);
  }

  // 5. 监听端口
  server
    .once('error', (err) => {
      console.error('❌ 服务器错误:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🎬 DramaCut AI 服务器已启动`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 本地: http://localhost:${port}`);
      console.log(`🔌 WebSocket: ws://localhost:${port}`);
      console.log(`🌍 环境: ${dev ? '开发' : '生产'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
    });
});

// ============================================
// 优雅退出
// ============================================

process.on('SIGINT', async () => {
  console.log('\n收到 SIGINT 信号，正在优雅退出...');

  try {
    await queueManager.close();
    wsServer.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 退出失败:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n收到 SIGTERM 信号，正在优雅退出...');

  try {
    await queueManager.close();
    wsServer.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 退出失败:', error);
    process.exit(1);
  }
});

// ============================================
// 导出
// ============================================

export default app;
