# DramaGen AI

> 智能化短剧视频生产工具 - 从原始长视频到高点击短视频的自动化/半自动化产出

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.1-black)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📖 项目简介

DramaGen AI 是一款面向短剧/漫剧剪辑师、投放运营及自媒体博主的智能化视频生产工具。系统深度集成 **Gemini 3** 的多模态理解能力，实现从原始长视频到高点击短视频的自动化产出。

### 核心功能

#### 🎬 模式 A：高光智能切片
自动识别并提取视频中的病毒传播时刻，支持毫秒级精度调整
- AI 检测病毒式传播桥段（反转、身份曝光、冲突爆发）
- 毫秒级手动微调（±100ms、±500ms、±1000ms）
- 切点实时预览
- 帧级精确切割

#### 🎙️ 模式 B：深度解说矩阵
从故事线生成多版本解说文案，自动实现音画匹配
- 提取 ≥10 条独立故事线
- 生成多种解说风格（悬念钩子版、吐槽版、情绪共鸣版）
- TTS 合成 + 语义画面匹配
- 四轨音频混音（解说 + 原音 + BGM）

---

## ✨ 当前状态

**版本**: v0.6.0
**更新时间**: 2026-02-08

### 已完成 ✅

| 模块 | 状态 | 完成度 |
|------|------|--------|
| **基础设施** | ✅ 完成 | 100% |
| - 数据库（SQLite + Drizzle） | ✅ | 100% |
| - 任务队列（BullMQ + Redis） | ✅ | 100% |
| - WebSocket 实时通信 | ✅ | 100% |
| - P0 错误处理机制 | ✅ | 100% |
| **素材管理** | ✅ 完成 | 95% |
| - 项目管理（CRUD + 搜索） | ✅ | 100% |
| - 视频管理（上传 + 删除） | ✅ | 100% |
| **视频处理核心** | ✅ 完成 | 100% |
| - 关键帧采样 | ✅ | 100% |
| - FFmpeg 进度监控 | ✅ | 100% |
| - 视频拼接（concat） | ✅ | 100% |
| - 多轨道音频混合 | ✅ | 100% |
| - Remotion 渲染客户端 | ✅ | 100% |
| - 多片段组合组件 | ✅ | 100% |
| **AI 服务集成** | ✅ 完成 | 100% |
| - Gemini 多模态理解 | ✅ | 100% |
| - 病毒式时刻检测 | ✅ | 100% |
| - 剧情线提取 | ✅ | 100% |
| - 解说文案生成 | ✅ | 100% |
| - ElevenLabs TTS 客户端 | ✅ | 100% |
| **自动化处理流程** | ✅ 完成 | 100% |
| - 任务队列系统 | ✅ | 100% |
| - 数据层架构 | ✅ | 100% |
| **高光切片模式** | ✅ 完成 | 95% |
| - AI 高光检测（Gemini） | ✅ | 100% |
| - 数据转换层（ViralMoment → Highlight） | ✅ | 100% |
| - 完整 API 层 | ✅ | 100% |
| - FFmpeg 毫秒级切片 | ✅ | 100% |
| - 渲染 Worker（断点续传） | ✅ | 100% |
| - 批量渲染支持 | ✅ | 100% |
| - 实时进度推送 | ✅ | 100% |
| - 前端 UI | 🟡 部分完成 | 70% |

### 部分完成 🟡

| 模块 | 状态 | 完成度 |
|------|------|--------|
| **深度解说模式** | 🟡 部分完成 | 60% |
| - 解说模式 UI | ✅ | 100% |
| - 故事线提取 API | ✅ | 100% |
| - 解说文案生成 | ✅ | 100% |
| - TTS 音频合成 | ✅ | 100% |
| - 画面自动匹配 | 🔴 待开发 | 0% |
| - Remotion 渲染集成 | 🔴 待开发 | 0% |
| **任务管理** | 🟡 部分完成 | 80% |
| - 任务列表 UI | ✅ | 100% |
| - 任务状态监控 | ✅ | 100% |
| - 任务详情查看 | 🔴 待开发 | 0% |

### 待开发 🚧

| 模块 | 状态 | 完成度 |
|------|------|--------|
| **高光切片前端集成** | 🔴 待开发 | 0% |
| - 渲染按钮和进度条 | 🔴 待开发 | 0% |
| - 毫秒级微调控件集成 | 🔴 待开发 | 0% |
| - 视频预览播放器 | 🔴 待开发 | 0% |
| **音画匹配系统** | 🔴 未开发 | 0% |
| - 语义向量化 | 🔴 待开发 | 0% |
| - 相似度匹配算法 | 🔴 待开发 | 0% |
| - 候选画面推荐 | 🔴 待开发 | 0% |

**详细路线图**: 请查看 [ROADMAP.md](./ROADMAP.md) 和 [IMPLEMENTATION.md](./IMPLEMENTATION.md)
**进度追踪**: 请查看 [PROGRESS.md](./PROGRESS.md) - 详细的已完成和未完成工作清单

---

## 🛠️ 技术栈

### 前端
- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript 5.0
- **样式**: Tailwind CSS
- **UI 组件**: shadcn/ui (Radix UI)
- **动画**: Framer Motion
- **状态管理**: React Hooks

### 后端
- **框架**: Next.js 15 (API Routes)
- **数据库**: SQLite + Drizzle ORM
- **任务队列**: BullMQ + Redis
- **实时通信**: WebSocket (ws)
- **视频处理**: FFmpeg (fluent-ffmpeg)

### AI 服务
- **视频分析**: Gemini 3
- **语音合成**: ElevenLabs TTS

---

## 🚀 快速开始

### 环境要求

**必需软件**：
- **Node.js** >= 18.0.0（推荐 20.x）
- **Redis** >= 6.0（任务队列必需）
- **FFmpeg** >= 5.0（视频处理必需）
- **npm** >= 9.0.0

**可选软件**：
- **Git**（版本控制）

---

### 📦 第一步：安装依赖

#### 1.1 macOS 系统

```bash
# 安装 Homebrew（如果未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Redis
brew install redis

# 安装 FFmpeg
brew install ffmpeg

# 验证安装
redis-cli --version
ffmpeg -version
node -v
```

#### 1.2 Linux 系统（Ubuntu/Debian）

```bash
# 安装 Redis
sudo apt update
sudo apt install -y redis-server

# 安装 FFmpeg
sudo apt install -y ffmpeg

# 验证安装
redis-cli --version
ffmpeg -version
node -v
```

#### 1.3 安装项目依赖

```bash
# 克隆仓库
git clone https://github.com/iswangheng/AI-DramaCut.git
cd AI-DramaCut

# 安装 Node.js 依赖
npm install
```

---

### ⚙️ 第二步：配置环境变量

#### 2.1 创建环境变量文件

```bash
# 复制示例配置
cp .env.example .env.local
```

#### 2.2 编辑 `.env.local` 文件

**必需配置**：

```env
# ========================================
# Gemini 3 API 配置（通过 yunwu.ai 代理）
# ========================================
YUNWU_API_ENDPOINT=https://yunwu.ai
YUNWU_API_KEY=sk-your_yunwu_api_key_here

# 或使用官方 Gemini API
# GEMINI_API_KEY=your_gemini_api_key_here

# Gemini 模型配置
GEMINI_MODEL=gemini-3-pro-preview

# ========================================
# ElevenLabs API 配置（TTS 语音合成）
# ========================================
ELEVENLABS_API_KEY=sk-your_elevenlabs_api_key_here
```

**可选配置**（已有默认值）：

```env
# ========================================
# Redis 配置
# ========================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ========================================
# 数据库配置（SQLite）
# ========================================
DATABASE_URL=./data/database.sqlite

# ========================================
# 应用配置
# ========================================
NODE_ENV=development
PORT=3000
```

> 💡 **提示**：获取 API Key
> - **yunwu.ai**: 访问 https://yunwu.ai 注册并获取 API Key（推荐国内用户）
> - **Gemini**: 访问 https://ai.google.dev/ 获取 API Key
> - **ElevenLabs**: 访问 https://elevenlabs.io/ 获取 API Key

---

### 🗄️ 第三步：初始化数据库

```bash
# 初始化 SQLite 数据库
npm run db:init

# 或使用 push 方式（推荐）
npm run db:push

# 验证数据库
ls -la .data/local.db
```

---

### 🚀 第四步：启动服务

#### 方式 A：快速启动（推荐）

```bash
# 使用启动脚本（自动启动所有服务）
./scripts/test-all-services.sh
```

#### 方式 B：手动启动

**打开 3 个终端窗口**：

```bash
# 终端 1: 启动 Redis
brew services start redis  # macOS
# 或
sudo systemctl start redis  # Linux
# 或
redis-server  # 直接启动

# 终端 2: 启动 Next.js 开发服务器
npm run dev

# 终端 3: 启动 Worker 进程（任务队列处理器）
npx tsx scripts/workers.ts
```

---

### ✅ 第五步：验证服务

```bash
# 1. 检查 Redis
redis-cli ping
# 应该返回: PONG

# 2. 检查 Next.js
curl http://localhost:3000/api/health
# 应该返回: {"success":true,...}

# 3. 检查 Worker 进程
ps aux | grep "tsx.*workers"
# 应该看到 Worker 进程

# 4. 检查数据库
npm run db:studio
# 打开浏览器访问 http://localhost:4983
```

---

### 🌐 访问应用

打开浏览器访问：**http://localhost:3000**

- 项目管理：http://localhost:3000/projects
- 高光切片：http://localhost:3000/highlight
- 深度解说：http://localhost:3000/recap
- 任务管理：http://localhost:3000/tasks

---

### 🛑 停止服务

```bash
# 停止 Redis
brew services stop redis  # macOS
# 或
sudo systemctl stop redis  # Linux

# 停止 Next.js（Ctrl+C）

# 停止 Worker
pkill -f "tsx.*workers"
```

---

## 📁 项目结构

```
dramagen-ai/
├── app/                      # Next.js App Router
│   ├── projects/            # 项目管理页面
│   │   ├── page.tsx         # 项目列表
│   │   └── [id]/            # 项目详情
│   │       └── page.tsx
│   └── api/                 # API 路由
│       ├── projects/        # 项目 API
│       ├── videos/          # 视频 API
│       └── upload/          # 文件上传 API
│
├── components/              # React 组件
│   ├── ui/                  # shadcn/ui 组件
│   ├── create-project-dialog.tsx
│   ├── edit-project-dialog.tsx
│   └── upload-video-dialog.tsx
│
├── lib/                     # 核心库
│   ├── api/                 # API 客户端
│   │   ├── gemini.ts        # Gemini 3 客户端 ✅
│   │   ├── elevenlabs.ts    # ElevenLabs TTS 客户端 ✅
│   │   └── types.ts         # API 类型定义 ✅
│   ├── video/               # 视频处理模块 ✅
│   │   ├── metadata.ts      # 视频元数据提取 ✅
│   │   ├── shot-detection.ts # 镜头检测 ✅
│   │   ├── sampling.ts      # 关键帧采样 ✅
│   │   ├── db-integration.ts # 数据库集成 ✅
│   │   └── index.ts         # 导出入口 ✅
│   ├── ffmpeg/              # FFmpeg 工具库 ✅
│   │   ├── utils.ts         # 基础工具（裁剪、混音）✅
│   │   ├── progress.ts      # 进度监控 ✅
│   │   ├── concat.ts        # 视频拼接 ✅
│   │   ├── multitrack-audio.ts # 多轨道混音 ✅
│   │   ├── types.ts         # 类型定义 ✅
│   │   └── index.ts         # 导出入口 ✅
│   ├── remotion/            # Remotion 渲染模块 ✅
│   │   ├── renderer.ts      # 渲染客户端 ✅
│   │   └── index.ts         # 导出入口 ✅
│   ├── db/                  # 数据库
│   │   ├── schema.ts        # Drizzle Schema ✅
│   │   ├── client.ts        # SQLite 客户端 ✅
│   │   └── queries.ts       # 查询接口 ✅
│   ├── queue/               # 任务队列
│   │   ├── bullmq.ts        # BullMQ 管理器 ✅
│   │   └── workers.ts       # Worker 处理器 🟡
│   ├── server.ts            # 自定义服务器 ✅
│   └── config/              # 统一配置 ✅
│
├── components/              # React 组件
│   ├── remotion/            # Remotion 组件 ✅
│   │   ├── MultiClipComposition.tsx # 多片段组合 ✅
│   │   └── subtitles/       # 字幕组件 ✅
│   │       ├── CaptionedVideo.tsx
│   │       ├── KaraokeSentence.tsx
│   │       └── Word.tsx
│   └── ui/                  # shadcn/ui 组件
│
├── scripts/                 # 脚本
│   ├── test-sampling.ts     # 测试关键帧采样 ✅
│   ├── test-ffmpeg-progress.ts # 测试进度监控 ✅
│   ├── test-concat.ts       # 测试视频拼接 ✅
│   ├── test-multitrack-audio.ts # 测试多轨道混音 ✅
│   ├── test-remotion-renderer.ts # 测试 Remotion 渲染 ✅
│   └── test-multiclip.ts    # 测试多片段组合 ✅
│
├── docs/                   # 文档
│   ├── KEY-FRAME-SAMPLING.md # 关键帧采样文档 ✅
│   ├── FFMPEG-PROGRESS.md    # 进度监控文档 ✅
│   ├── VIDEO-CONCAT.md       # 视频拼接文档 ✅
│   ├── MULTITRACK-AUDIO.md  # 多轨道混音文档 ✅
│   ├── REMOTION-RENDERER.md  # Remotion 渲染文档 ✅
│   ├── MULTICLIP-COMPOSITION.md # 多片段组合文档 ✅
│   ├── API-SETUP.md         # API 配置指南 ✅
│   └── API-EXAMPLES.md       # API 使用示例 ✅
│
├── remotion/                # Remotion 配置
│   ├── config.ts            # Remotion 配置 ✅
│   └── root.tsx             # Remotion Root ✅
│
└── uploads/                 # 文件上传目录
```

---

## 🔑 核心功能

### 1. 视频处理核心 ⭐

#### 关键帧采样
- **均匀采样**: 按固定时间间隔采样
- **场景采样**: 基于镜头检测结果采样
- **代理分辨率**: 降低存储和 Token 消耗（90%+ 节省）
- **性能**: 2分钟视频 ~10秒完成采样

**使用**: `lib/video/sampling.ts`

#### FFmpeg 进度监控
- **实时进度解析**: 解析 FFmpeg stderr 输出
- **进度回调**: 支持毫秒级进度反馈
- **WebSocket 集成**: 实时更新到前端 UI
- **应用**: 视频裁剪、音频混合、帧率对齐

**使用**: `lib/ffmpeg/progress.ts`

#### 视频拼接
- **两种方法**: concat demuxer（快速）/ concat filter（高级）
- **转场效果**: 淡入淡出、交叉淡入淡出
- **批量处理**: 支持多批次拼接

**使用**: `lib/ffmpeg/concat.ts`

#### 多轨道音频混合
- **四轨道支持**: 解说配音、原音、BGM、音效
- **灵活音量控制**: 每个轨道独立音量调整
- **快速混合**: 使用 -c:v copy，视频不重新编码

**使用**: `lib/ffmpeg/multitrack-audio.ts`

#### Remotion 渲染客户端
- **程序化渲染**: 从 Node.js 代码调用 Remotion
- **实时进度**: 完整的渲染进度反馈
- **多片段组合**: 支持多个视频片段无缝拼接
- **转场效果**: 淡入淡出、滑动、缩放

**使用**: `lib/remotion/renderer.ts`

### 2. AI 服务集成

#### Gemini 3 API
- **视频分析**: 内容理解、摘要生成
- **高光检测**: 识别病毒式传播桥段
- **故事线提取**: 提取多条独立故事线
- **解说文案生成**: 多种风格解说

**使用**: `lib/api/gemini.ts`

#### ElevenLabs TTS
- **文本转语音**: 返回二进制音频
- **毫秒级时间轴**: 精确到词语级别
- **批量转换**: 支持多段文本转换
- **语音预览**: 支持语音试听

**使用**: `lib/api/elevenlabs.ts`

### 3. 素材管理

#### 项目管理
- 创建项目（名称 + 描述）
- 编辑项目信息
- 删除项目（级联删除所有视频）
- 搜索项目（实时搜索）

#### 视频管理
- 上传视频（支持多文件）
- 删除视频（物理文件 + 数据库记录）
- 查看视频元数据（时长、分辨率、帧率等）

#### 自动化处理流程 ⭐

```mermaid
graph LR
    A[上传视频] --> B[保存文件]
    B --> C[创建记录<br/>status: uploading]
    C --> D[触发任务队列]
    D --> E[镜头检测<br/>status: processing]
    E --> F[Gemini 分析<br/>status: analyzing]
    F --> G[就绪<br/>status: ready]
```

**技术实现**：
- 异步非阻塞设计（上传 API 立即返回）
- 任务队列自动处理（BullMQ + Redis）
- 状态机管理（uploading → processing → analyzing → ready）
- 实时进度推送（WebSocket）

---

## 📊 数据库架构

### 表结构

| 表名 | 说明 | 字段数 |
|------|------|--------|
| `projects` | 项目信息 | 8 |
| `videos` | 视频信息 | 13 |
| `shots` | 镜头切片 | 13 |
| `storylines` | 故事线 | 7 |
| `highlights` | 高光候选 | 8 |
| `recap_tasks` | 解说任务 | 7 |
| `recap_segments` | 解说片段 | 7 |
| `queue_jobs` | 队列任务记录 | 8 |

### 关系

```
projects (1) ────< (N) videos (1) ────< (N) shots
                                 │
                                 ├──> (N) highlights
                                 │
storylines (1) ────< (N) recap_tasks (1) ────< (N) recap_segments
     │                                    │
     └──────────< videos ──────────────────┘
```

---

## 🔧 配置说明

### 任务队列配置

```typescript
// lib/config/index.ts
export const queueConfig = {
  redis: {
    host: 'localhost',
    port: 6379,
    password: undefined,
    db: 0,
  },
  maxConcurrentJobs: 3,
  retryAttempts: 3,
  retryDelay: 5000,
  queues: {
    videoProcessing: 'video-processing',
    geminiAnalysis: 'gemini-analysis',
    ttsGeneration: 'tts-generation',
    videoRender: 'video-render',
  },
};
```

### WebSocket 配置

```typescript
export const wsConfig = {
  port: 3001,
  heartbeatInterval: 30000,
  maxConnections: 100,
};
```

---

## 📚 API 文档

### 项目管理

```
GET    /api/projects              # 获取项目列表
POST   /api/projects              # 创建项目
GET    /api/projects/:id          # 获取项目详情
PUT    /api/projects/:id          # 更新项目
DELETE /api/projects/:id          # 删除项目
GET    /api/projects/search?q=关键词  # 搜索项目
```

### 视频管理

```
GET    /api/projects/:id/videos   # 获取项目视频列表
POST   /api/projects/:id/videos   # 上传视频
DELETE /api/videos/:id            # 删除视频
POST   /api/upload                # 文件上传（带元数据提取）
```

---

## 🧪 测试

```bash
# 运行测试
npm test

# 运行测试（监听模式）
npm run test:watch

# 测试覆盖率
npm run test:coverage
```

---

## 🔧 故障排查

### 问题 1: Redis 连接失败

**错误信息**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**解决方案**:
```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# 验证
redis-cli ping
# 应该返回: PONG
```

---

### 问题 2: Worker 进程启动失败

**错误信息**: `Gemini API key is not configured`

**解决方案**:
1. 检查 `.env.local` 是否存在
2. 确认 `YUNWU_API_KEY` 或 `GEMINI_API_KEY` 已配置
3. 重新启动 Worker:
   ```bash
   pkill -f "tsx.*workers"
   npx tsx scripts/workers.ts
   ```

---

### 问题 3: FFmpeg 未找到

**错误信息**: `Error: FFmpeg not found`

**解决方案**:
```bash
# macOS
brew install ffmpeg

# Linux
sudo apt install -y ffmpeg

# 验证
ffmpeg -version
```

---

### 问题 4: 数据库文件不存在

**错误信息**: `Database file not found`

**解决方案**:
```bash
# 初始化数据库
npm run db:init

# 或重置数据库（开发环境）
npm run db:reset
```

---

### 问题 5: 端口被占用

**错误信息**: `Error: listen EADDRINUSE: address already in use :::3000`

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或修改 .env.local 中的 PORT 配置
PORT=3001
```

---

### 问题 6: 任务一直处于"等待中"状态

**原因**: Worker 进程未运行

**解决方案**:
```bash
# 检查 Worker 进程
ps aux | grep "tsx.*workers"

# 如果未运行，启动 Worker
npx tsx scripts/workers.ts

# 查看日志
tail -f logs/worker.log
```

---

### 问题 7: 视频上传失败

**可能原因**:
1. 文件过大（>2GB）
2. 格式不支持
3. 磁盘空间不足

**解决方案**:
```bash
# 检查磁盘空间
df -h

# 检查文件格式
ffmpeg -i your-video.mp4

# 查看上传日志
tail -f logs/worker.log | grep upload
```

---

## 📚 获取帮助

如果遇到以上文档未覆盖的问题：

1. **查看日志**: `tail -f logs/worker.log`
2. **查看测试指南**: [docs/TESTING-GUIDE.md](docs/TESTING-GUIDE.md)
3. **提交 Issue**: https://github.com/iswangheng/AI-DramaCut/issues
4. **查看开发文档**: [CLAUDE.md](CLAUDE.md)

---

## 📖 文档

### 项目文档
- **[环境设置指南](docs/SETUP.md)** - 完整的本地开发环境设置步骤 ⭐
- **[测试指南](docs/TESTING-GUIDE.md)** - 功能测试和验证步骤 ⭐
- **[项目路线图](ROADMAP.md)** - 完整的开发路线图和任务清单
- **[实施进度](IMPLEMENTATION.md)** - 功能完成度和技术细节
- **[CLAUDE.md](CLAUDE.md)** - 项目架构和开发规范
- **[部署文档](DEPLOYMENT.md)** - 云服务器部署指南

### 视频处理文档
- **[关键帧采样](docs/KEY-FRAME-SAMPLING.md)** - 降低 Gemini Token 消耗
- **[FFmpeg 进度监控](docs/FFMPEG-PROGRESS.md)** - 实时进度反馈
- **[视频拼接](docs/VIDEO-CONCAT.md)** - 视频片段拼接
- **[多轨道音频混合](docs/MULTITRACK-AUDIO.md)** - 四轨道混音
- **[Remotion 渲染客户端](docs/REMOTION-RENDERER.md)** - 程序化渲染
- **[多片段组合](docs/MULTICLIP-COMPOSITION.md)** - Remotion 组件

### API 文档
- **[API 配置指南](docs/API-SETUP.md)** - Gemini 3 和 ElevenLabs 配置
- **[API 使用示例](docs/API-EXAMPLES.md)** - 完整的 API 使用示例

### Agent 协作文档
- **[Agent 4 指南](AGENT-4-GUIDE.md)** - 数据层开发指南
- **[协作文档](COLLABORATION.md)** - Agent 协作机制
- **[部署指南](DEPLOYMENT.md)** - 部署说明

---

## 🤝 贡献指南

欢迎贡献！请先查看 [CLAUDE.md](CLAUDE.md) 了解项目规范。

### 开发流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📝 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- [Next.js](https://nextjs.org/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [BullMQ](https://docs.bullmq.io/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Gemini](https://ai.google.dev/)
- [ElevenLabs](https://elevenlabs.io/)

---

**Made with ❤️ by DramaGen AI Team**
