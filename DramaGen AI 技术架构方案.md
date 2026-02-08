# DramaGen AI 技术架构方案

**更新时间**: 2026-02-08
**版本**: v2.0

---

## 1. 系统架构概览

### 1.1 技术栈

#### 前端层 (Frontend)
- **框架**: Next.js 15 (App Router) + React 18
- **样式**: Tailwind CSS + shadcn/ui 组件库
- **动画**: Framer Motion
- **状态管理**: React Hooks + Context API
- **类型安全**: TypeScript 5.x

#### 后端层 (Backend)
- **API 服务**: Next.js API Routes (Server Components & Edge Runtime)
- **任务队列**: BullMQ + Redis
- **实时通信**: WebSocket (ws)
- **数据库**: SQLite + Drizzle ORM

#### AI 服务层 (AI Services)
- **视频理解**: Gemini 2.5 Pro / Gemini 3 (多模态)
- **语音合成**: ElevenLabs TTS API
- **中转服务**: yunwu.ai (兼容 Gemini API)

#### 媒体处理层 (Media Processing)
- **视频处理**: FFmpeg (node-fluent-ffmpeg)
- **渲染引擎**: Remotion 4.x
- **图像处理**: Sharp

---

## 2. 核心模块架构

### 2.1 数据库层 (Database Layer)

#### 数据库选择
- **主数据库**: SQLite (better-sqlite3)
- **ORM**: Drizzle ORM
- **迁移工具**: Drizzle Kit

#### 数据表结构
```sql
-- 项目表
projects (id, name, description, status, progress, current_step, created_at)

-- 视频表
videos (id, project_id, filename, file_path, duration_ms, width, height, fps, status)

-- 镜头表
shots (id, video_id, start_ms, end_ms, description, emotion, dialogue, thumbnail_path)

-- 剧情线表
storylines (id, video_id, name, description, attraction_score, shot_ids)

-- 高光时刻表
highlights (id, video_id, start_ms, end_ms, reason, viral_score, category)

-- 解说任务表
recap_tasks (id, storyline_id, style, title, estimated_duration_ms, status, output_path)

-- 解说片段表
recap_segments (id, task_id, text, order, start_ms, end_ms, word_timestamps)
```

#### 索引优化
- 项目状态索引
- 视频项目 ID 外键索引
- 镜头视频 ID 外键索引
- 高光确认状态索引

---

### 2.2 任务队列系统 (Queue System)

#### BullMQ 架构
```typescript
// 队列类型
- video-processing: 视频预处理队列
- render-queue: Remotion 渲染队列
- ai-analysis: AI 分析队列

// Worker 处理器
- VideoProcessingWorker: 视频上传、元数据提取、镜头检测
- RenderWorker: Remotion 视频渲染
- AIAnalysisWorker: Gemini API 调用
```

#### 任务状态流转
```
waiting -> processing -> completed
                  ↓
                 failed
```

#### 实时进度推送
- WebSocket 服务推送任务进度
- 前端实时更新 UI 状态

---

### 2.3 API 服务层 (API Layer)

#### Gemini API 封装
```typescript
class GeminiClient {
  // 多模态视频理解
  analyzeVideo(videoPath: string): Promise<VideoAnalysis>

  // 病毒式时刻检测
  detectViralMoments(shots: SceneShot[]): Promise<Highlight[]>

  // 剧情线提取
  extractStorylines(videoAnalysis: VideoAnalysis): Promise<Storyline[]>

  // 解说文案生成
  generateNarration(storyline: Storyline, style: string): Promise<Narration>

  // 流式文案生成
  generateNarrationStream(storyline: Storyline, style: string): AsyncIterable<string>
}
```

#### ElevenLabs API 封装
```typescript
class ElevenLabsClient {
  // 文本转语音
  textToSpeech(options: TTSOptions): Promise<TTSResult>

  // 生成语音解说（含时间戳）
  generateNarration(text: string, options?: NarrationOptions): Promise<NarrationResult>
}
```

---

## 3. 关键技术实现

### 3.1 毫秒级视频处理

#### 痛点
普通 FFmpeg 切割会导致：
- 开头黑屏（关键帧对齐问题）
- 时间戳不准（只能跳转到 I 帧）

#### 解决方案
```bash
# 不使用 -vcodec copy（只能跳转到 I 帧）
ffmpeg -ss [start_ms] -i input.mp4 -t [duration] \
  -c:v libx264 -preset ultrafast -crf 18 \
  -y output.mp4

# 帧率对齐：强制统一为 30fps
ffmpeg -i input.mp4 -filter:v fps=30 -c:v libx264 output.mp4
```

#### 技术要点
- 使用 `-ss` 参数在输入文件前定位（毫秒级精度）
- 重编码确保帧对齐
- 预处理时统一帧率为 30fps

---

### 3.2 视频理解管线 (Video Pipeline)

#### 采样策略
长视频不全量上传 Gemini，采用：
1. **关键帧采样**: 每秒提取 1 帧
2. **低分辨率代理**: 生成 720p 代理文件
3. **智能分段**: 超过 10 分钟视频分段处理

#### 镜头检测算法
```typescript
// 基于 FFmpeg 场景切换检测
detectShots(videoPath, threshold = 0.3) {
  // 1. 使用 ffmpeg filter 检测场景切换
  // 2. 提取切换点时间戳
  // 3. 生成镜头片段列表
}
```

#### 语义理解流程
```
原始视频
  ↓
镜头检测 (Shot Detection)
  ↓
关键帧提取 (Keyframe Extraction)
  ↓
Gemini 多模态理解 (Gemini Vision)
  ↓
标签生成 (Tagging)
  ↓
存储到数据库 (SQLite)
```

---

### 3.3 音画匹配系统

#### 向量化方案（待实现）
```typescript
// 1. 文案向量化
const textEmbedding = await embedText(narrationText)

// 2. 镜头标签向量化
const shotEmbeddings = shots.map(shot => embedTags(shot.semanticTags))

// 3. 余弦相似度匹配
const similarities = cosineSimilarity(textEmbedding, shotEmbeddings)
const bestMatch = shots[argmax(similarities)]
```

#### 当前实现（临时方案）
- 使用关键词匹配
- 基于 emotion 和 dialogue 字段
- 人工手动调整

---

### 3.4 Remotion 渲染引擎

#### 组件架构
```typescript
// 字幕组件
<ViralSubtitle>
  <KaraokeSentence words={wordTimings} />
  <Word text="word" startMs={100} endMs={200} />
</ViralSubtitle>

// 多片段合成
<MultiClipComposition>
  <VideoClip src="clip1.mp4" start={0} duration={30} />
  <VideoClip src="clip2.mp4" start={30} duration={60} />
  <AudioTrack src="narration.mp3" volume={1.0} />
  <AudioTrack src="ambient.mp3" volume={0.15} />
</MultiClipComposition>
```

#### 字幕样式
- 亮黄色 (#FFFF00) 加粗
- 黑色描边（stroke）
- 逐字放大动画（spring 动画）
- 卡拉OK式进度条

---

## 4. 并发与性能优化

### 4.1 任务队列调度
```typescript
// BullMQ 配置
const queue = new Queue('video-processing', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})
```

### 4.2 并发控制
```typescript
// 并发限制（防止 OOM）
const worker = new Worker('video-processing', processor, {
  connection: redis,
  concurrency: 2, // 同时处理 2 个视频
})
```

### 4.3 缓存策略
- **Redis 缓存**: Gemini API 响应缓存
- **本地缓存**: 视频元数据缓存
- **CDN**: 静态资源缓存（待部署后）

---

## 5. 前端架构

### 5.1 页面结构
```
app/
├── (main)/
│   ├── page.tsx                 # 首页
│   ├── projects/
│   │   ├── page.tsx            # 项目列表
│   │   └── [id]/
│   │       └── page.tsx        # 项目详情
│   ├── recap/
│   │   └── page.tsx            # 深度解说模式
│   └── tasks/
│       └── page.tsx            # 任务管理
├── api/
│   ├── projects/               # 项目 API
│   ├── videos/                 # 视频 API
│   ├── gemini/                 # Gemini API
│   ├── elevenlabs/             # ElevenLabs API
│   └── upload/                 # 文件上传 API
```

### 5.2 状态管理
```typescript
// 使用 React Hooks + Context API
const AppContext = createContext({
  projects: Project[],
  refreshProjects: () => {},
  // ...
})

// WebSocket 实时更新
useWebSocket('ws://localhost:3001', {
  onMessage: (event) => {
    const data = JSON.parse(event.data)
    updateTaskProgress(data.taskId, data.progress)
  },
})
```

### 5.3 客户端/服务端分离
- **Server Components**: 数据获取、API 调用
- **Client Components**: 用户交互、实时更新
- **API Routes**: 业务逻辑、数据处理

---

## 6. 部署架构

### 6.1 本地开发环境
```bash
# 服务启动
npm run dev              # Next.js 开发服务器
npm run worker           # BullMQ Worker
npm run ws               # WebSocket 服务器

# 或使用一体化启动
npm run dev-all          # 同时启动所有服务
```

### 6.2 生产环境（待规划）
- **Web 服务**: Vercel / Railway
- **Worker 服务**: Docker 容器
- **Redis**: Redis Cloud / Upstash
- **文件存储**: AWS S3 / Cloudflare R2
- **CDN**: Cloudflare

---

## 7. 安全性考虑

### 7.1 API 密钥管理
```env
GEMINI_API_KEY=xxx
ELEVENLABS_API_KEY=xxx
REDIS_PASSWORD=xxx
```

### 7.2 文件上传安全
- 文件类型白名单验证
- 文件大小限制（4GB）
- 恶意文件扫描（待实现）

### 7.3 CORS 配置
```typescript
// 仅允许本地开发
const cors = {
  origin: ['http://localhost:3000'],
  credentials: true,
}
```

---

## 8. 监控与日志

### 8.1 日志系统
```typescript
// 结构化日志
console.log({
  level: 'info',
  message: 'Video uploaded',
  videoId: 123,
  timestamp: Date.now(),
})
```

### 8.2 错误追踪
- 全局错误处理
- API 错误响应标准化
- 前端错误上报（待实现）

---

## 9. 技术债务与优化方向

### 9.1 已完成的优化
- ✅ 移除 API 单例导出（修复 SSR 问题）
- ✅ 数据库客户端懒加载
- ✅ Remotion 组件添加 "use client"

### 9.2 待优化项
- ⚠️ 实现向量数据库（pgvector 或本地向量索引）
- ⚠️ 优化长视频处理性能
- ⚠️ 实现真正的分布式任务队列
- ⚠️ 添加单元测试和集成测试
- ⚠️ 实现 API 响应缓存

---

## 10. 技术选型对比

### 10.1 为什么选择 BullMQ 而不是 Bull？
- **更好的 TypeScript 支持**
- **更活跃的维护**
- **内置重试机制**
- **更好的性能**

### 10.2 为什么选择 SQLite 而不是 PostgreSQL？
- **零配置**: 本地开发无需安装数据库服务
- **性能**: 对于单机应用足够快
- **便携性**: 整个数据库就是一个文件
- **未来可迁移**: Drizzle ORM 支持平滑迁移到 PostgreSQL

### 10.3 为什么选择 Remotion？
- **React 生态**: 使用熟悉的 React 组件化开发
- **代码驱动**: 所有效果都可以用代码控制
- **精确时序**: 毫秒级时间轴控制
- **可测试性**: 视频生成逻辑可单元测试

---

## 11. 未来架构演进

### 11.1 短期目标（1-2 个月）
- 完成高光切片模式
- 完善深度解说模式
- 实现向量搜索

### 11.2 中期目标（3-6 个月）
- 迁移到 PostgreSQL
- 实现分布式任务队列
- 添加用户认证系统

### 11.3 长期目标（6-12 个月）
- 微服务架构
- 多租户支持
- AI 模型本地部署

---

**最后更新**: 2026-02-08
**维护者**: DramaGen AI Team
