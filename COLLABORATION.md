# DramaGen AI - 多 Agent 协作指南

本文档用于多个 Claude Code 实例并行开发 DramaGen AI 项目。

**最后更新**: 2025-02-08
**协作用户**: @wangheng
**并行 Agent 数量**: 4

---

## 📊 当前 Agent 分工

### Agent 1 - UI 界面开发 🎨
**职责**：用户界面和交互体验
**工作目录**:
```
app/                    # Next.js 页面
├── projects/           # ✅ 已创建项目页面
├── mode-a/             # 高光切片模式
└── mode-b/             # 深度解说模式

components/ui/          # 通用 UI 组件
components/layout/      # 布局组件
```

**当前任务**:
- ✅ 创建主布局组件 (MainLayout)
- ✅ 创建项目管理页面 (/projects)
- 🔄 视频上传界面
- 📋 待办：毫秒级调整 UI

**技术栈**:
- Radix UI (已安装)
- Tailwind CSS (已配置)
- Framer Motion (已安装)
- Lucide React Icons (已安装)

**负责人**: UI Agent 窗口

---

### Agent 2 - API 集成 🔌
**职责**：第三方 AI 服务集成
**工作目录**:
```
lib/api/
├── gemini.ts           # Gemini 3 API
├── elevenlabs.ts       # ElevenLabs TTS
├── yunwu.ts            # Yunwu.ai 代理
└── types.ts            # API 类型定义
```

**当前任务**:
- 🔄 Gemini 3 API 封装
- 📋 待办：ElevenLabs TTS 集成
- 📋 待办：流式响应处理
- 📋 待办：错误重试机制

**依赖配置**:
```bash
# 环境变量（.env）
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-exp
YUNWU_API_ENDPOINT=https://yunwu.ai/api/v1
ELEVENLABS_API_KEY=
```

**负责人**: API Agent 窗口

---

### Agent 3 - 视频处理核心 🎬
**职责**：FFmpeg 工具和 Remotion 渲染
**工作目录**:
```
lib/ffmpeg/             # ✅ FFmpeg 工具库
lib/video/              # 视频处理高级封装
components/remotion/    # ✅ Remotion 组件
```

**已完成**:
- ✅ trimVideo() - 毫秒级裁剪
- ✅ extractAudio() - 音频提取
- ✅ mixAudio() - 多轨道混音
- ✅ CaptionedVideo 组件
- ✅ KaraokeSentence 组件

**当前任务**:
- 📋 待办：视频元数据提取
- 📋 待办：镜头检测 (Shot Detection)
- 📋 待办：视频预处理管线

**负责人**: Video Agent 窗口（本窗口）

---

### Agent 4 - 数据层与任务队列 💾
**职责**：数据库、队列、实时通信
**工作目录**:
```
lib/db/                 # SQLite + Drizzle
lib/queue/              # BullMQ 任务队列
lib/websocket/          # WebSocket 服务
```

**当前任务**:
- 📋 待创建：数据库 Schema 设计
- 📋 待创建：任务队列系统
- 📋 待创建：实时进度推送

**依赖配置**:
```bash
# 环境变量（.env）
DATABASE_URL=./data/database.sqlite
REDIS_HOST=localhost
REDIS_PORT=6379
WS_PORT=3001
```

**负责人**: Data Agent 窗口

---

## 🔄 自动同步设置

### 方案 1：使用 watch 命令（推荐）

在每个 Agent 窗口运行以下命令：

```bash
# 在 macOS/Linux 上
brew install watch  # macOS 需要先安装

# 每 5 分钟自动 pull
watch -n 300 'git pull origin main'

# 每 2 分钟自动 pull（更频繁）
watch -n 120 'git pull origin main'

# 后台运行（不占用终端）
nohup watch -n 300 'git pull origin main' > /tmp/git-sync.log 2>&1 &
```

### 方案 2：使用 Git Hook（自动提交前 pull）

创建 `.git/hooks/pre-commit`:
```bash
#!/bin/bash
echo "🔄 拉取最新代码..."
git pull origin main
```

设置权限：
```bash
chmod +x .git/hooks/pre-commit
```

### 方案 3：使用 Node.js 脚本（跨平台）

创建 `scripts/sync.js`:
```javascript
const { execSync } = require('child_process');

console.log('🔄 自动同步中...');

try {
  execSync('git pull origin main', {
    stdio: 'inherit'
  });
  console.log('✅ 同步完成');
} catch (error) {
  console.error('❌ 同步失败:', error.message);
}
```

在 package.json 添加：
```json
{
  "scripts": {
    "sync": "node scripts/sync.js"
  }
}
```

设置定时任务（推荐）：
```bash
# 每 3 分钟执行一次
*/3 * * * * cd /path/to/AI-DramaCut && npm run sync
```

---

## 📋 接口契约（Interface Contracts）

所有 Agent 必须遵守的接口约定。

### 视频 API（Agent 3 提供）

```typescript
// lib/video/metadata.ts
export interface VideoMetadata {
  duration: number;        // 时长（秒）
  width: number;           // 宽度
  height: number;          // 高度
  fps: number;             // 帧率
  bitrate: number;         // 比特率
  codec: string;           // 编码格式
}

export async function getVideoMetadata(videoPath: string): Promise<VideoMetadata>

// lib/video/shot-detection.ts
export interface SceneShot {
  startMs: number;
  endMs: number;
  thumbnail: Buffer;       // 缩略图
  semanticTags: string[];  // AI 生成的标签
}

export async function detectShots(videoPath: string): Promise<SceneShot[]>
```

### AI API（Agent 2 提供）

```typescript
// lib/api/gemini.ts
export interface ViralMoment {
  timestampMs: number;
  type: "plot_twist" | "reveal" | "conflict" | "emotional";
  confidence: number;
  description: string;
}

export interface Storyline {
  id: string;
  title: string;
  summary: string;
  keyMoments: number[];    // 时间戳数组
}

export async function detectViralMoments(videoPath: string): Promise<ViralMoment[]>
export async function extractStorylines(videoPath: string): Promise<Storyline[]>

// lib/api/elevenlabs.ts
export interface TTSResult {
  audioPath: string;       // 生成的音频文件路径
  durationMs: number;
  wordTimings: Array<{     // 单词级时间戳
    word: string;
    startMs: number;
    endMs: number;
  }>;
}

export async function generateNarration(
  text: string,
  voice?: string
): Promise<TTSResult>
```

### 数据库 API（Agent 4 提供）

```typescript
// lib/db/schema.ts
export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoAsset {
  id: string;
  projectId: string;
  path: string;
  metadata: VideoMetadata;
  processedAt?: Date;
}

export interface ProcessedClip {
  id: string;
  projectId: string;
  startMs: number;
  endMs: number;
  type: "highlight" | "recap";
  outputPath: string;
}

// lib/db/queries.ts
export async function createProject(name: string): Promise<Project>
export async function addVideoAsset(projectId: string, path: string): Promise<VideoAsset>
export async function saveProcessedClip(clip: ProcessedClip): Promise<void>
export async function getProject(projectId: string): Promise<Project>
```

### 任务队列 API（Agent 4 提供）

```typescript
// lib/queue/types.ts
export interface VideoProcessingJob {
  id: string;
  type: "trim" | "analyze" | "render";
  inputPath: string;
  outputPath: string;
  options: Record<string, any>;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;         // 0-100
}

// lib/queue/client.ts
export async function submitJob(job: Omit<VideoProcessingJob, 'id' | 'status' | 'progress'>): Promise<string>
export async function getJobStatus(jobId: string): Promise<VideoProcessingJob>
```

---

## ⚠️ 协作规则

### 1. 文件所有权规则

| 文件/目录 | 负责人 | 其他 Agent 规则 |
|-----------|--------|----------------|
| `app/` | Agent UI | 其他 Agent 只读 |
| `components/ui/` | Agent UI | 其他 Agent 只读 |
| `lib/api/` | Agent API | 其他 Agent 只读 |
| `lib/ffmpeg/` | Agent Video | 其他 Agent 只读 |
| `lib/video/` | Agent Video | 其他 Agent 只读 |
| `lib/db/` | Agent Data | 其他 Agent 只读 |
| `lib/queue/` | Agent Data | 其他 Agent 只读 |
| `types/` | 共享 | ✅ 所有 Agent 可编辑 |
| `package.json` | Agent API | ⚠️ 需要新依赖时通知 API Agent |
| `.env` | 共享 | ✅ 所有 Agent 可编辑 |

### 2. 提交消息规范

每个 Agent 提交时必须遵循以下格式：

```bash
# 格式
git commit -m "<type>(<scope>): <subject>

<详细说明>

---
Agent: <Agent 名称>
依赖: <依赖的其他 Agent>
阻塞: <阻塞其他 Agent 的任务>
"

# 示例
git commit -m "feat(ui): 添加视频上传组件

- 创建 VideoUploader 组件
- 支持拖拽上传和进度显示
- 添加文件格式验证

---
Agent: Agent UI
依赖: Agent Video (uploadVideo 函数)
阻塞: 无
"
```

### 3. 冲突解决流程

当发生 Git 冲突时：

```bash
# 1. 先 pull
git pull origin main

# 2. 如果有冲突，查看冲突文件
git status

# 3. 联系其他 Agent 确认
# 在本文档的"冲突日志"部分记录

# 4. 手动解决冲突后
git add .
git commit -m "chore: 解决 <Agent A> 和 <Agent B> 的冲突"
```

---

## 📝 协作日志

### 2025-02-08

**17:00** - 项目启动
- 创建协作文档
- 定义 4 个 Agent 分工
- Agent UI 已完成 MainLayout 和项目页面
- Agent Video 已完成 FFmpeg 工具库

**17:30** - 接口定义
- 定义所有 API 接口契约
- 设置自动同步机制

---

## 🔧 快速参考

### 每个 Agent 开始工作前必做

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 检查是否有新的接口定义
cat types/api-contracts.ts

# 3. 检查协作文档
cat COLLABORATION.md | grep "Agent <你的名称>" -A 20

# 4. 安装新依赖（如果有）
npm install

# 5. 开始工作
```

### 每个 Agent 完成任务时必做

```bash
# 1. 提交代码
git add .
git commit -m "遵循提交消息规范"

# 2. 推送到远程
git push origin main

# 3. 更新本文档
# 编辑 COLLABORATION.md 的"协作日志"部分

# 4. 通知其他 Agent
# 在提交消息中说明依赖和阻塞关系
```

---

## 🚨 当前阻塞项

### Agent UI 被阻塞：
- ❌ 等待 Agent Video 提供 `uploadVideo()` 函数
- ❌ 等待 Agent API 提供 `detectViralMoments()` 函数

### Agent API 被阻塞：
- ✅ 无阻塞

### Agent Video 被阻塞：
- ❌ 等待 Agent Data 提供数据库存储 API

### Agent Data 被阻塞：
- ❌ 等待所有 Agent 完成数据模型设计

---

## 📞 联系方式

- **GitHub Issues**: https://github.com/iswangheng/AI-DramaCut/issues
- **协作文档**: 本文件

---

## 📚 相关文档

- `CLAUDE.md` - 项目开发指导
- `IMPLEMENTATION.md` - 开发进度记录
- `DEPLOYMENT.md` - 部署运维文档
- `types/api-contracts.ts` - 接口契约定义

---

**更新频率**: 每次有新任务或依赖变化时更新
