# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供在此代码仓库中工作的指导。

## 重要：交流语言

**必须使用中文与用户对话和回应。** 所有解释、说明、讨论都应使用中文。代码注释和文档也应使用中文编写，除非技术术语本身为英文。

---

## 项目概述

DramaGen AI 是一款面向短剧/漫剧剪辑师、投放运营及自媒体博主的智能化视频生产工具。系统深度集成 Gemini 3 的多模态理解能力，实现从原始长视频到高点击短视频的自动化/半自动化产出。

**当前状态**: 项目已完成**基础架构搭建**（2025-02-08），核心字幕渲染系统和 FFmpeg 工具库已就绪。

**GitHub 仓库**: https://github.com/iswangheng/AI-DramaCut.git

---

## 核心架构（规划中）

### 技术栈
- **前端**: Next.js 15 (App Router)、Tailwind CSS、Framer Motion
- **后端**: Next.js API Routes (Edge Runtime)、Node.js 视频处理
- **视频处理**: FFmpeg、Remotion 渲染引擎
- **AI 服务**: Gemini 3（视频分析）、ElevenLabs（TTS 语音生成）
- **数据存储**: SQLite + Drizzle ORM
- **任务队列**: BullMQ 处理重型任务
- **实时通信**: WebSocket 进度更新

### 两种核心操作模式

#### 模式 A：高光智能切片 (Highlight Hook)
自动识别并提取视频中的病毒传播时刻，支持毫秒级精度调整。

**核心需求**:
- AI 检测病毒式传播桥段（反转、身份曝光、冲突爆发）
- 从检测到的时间戳自动提取 60-120s 片段
- **毫秒级手动微调**: UI 必须提供 `±100ms`、`±500ms`、`±1000ms` 精度控制
- 切点实时预览
- 重编码 FFmpeg 工作流（非 copy 模式）实现帧级精确切割

#### 模式 B：深度解说矩阵 (Recap Matrix)
从故事线生成多版本解说文案，自动实现音画匹配。

**核心需求**:
- 从原始素材提取 ≥10 条独立故事线
- 生成多种解说风格（悬念钩子版、吐槽版、情绪共鸣版等）
- TTS 合成并获取毫秒级词语时间轴
- 语义搜索匹配解说词与相关视频片段
- 四轨道音频混音：解说(1.0) + 原音(0.15) + BGM(0.3)

---

## 关键技术约束

### 毫秒级精度（核心要求）
- 所有时间轴操作必须使用**毫秒**作为单位
- **FFmpeg 策略**: 禁止使用 `-vcodec copy`（只能跳转到 I 帧，不精确）
- **必需命令**: `ffmpeg -ss [HH:MM:SS.ms] -i input.mp4 -t [duration] -c:v libx264 -preset fast -crf 18 output.mp4`
- **帧率对齐**: 预处理时将所有素材统一为 30fps，确保毫秒计算与帧号完全匹配
- **验收标准**: 音画同步误差 < 50ms，切点无画面撕裂

### 视频处理管线
- **采样策略**: 关键帧采样 + 低分辨率代理，降低 Gemini Token 消耗
- **镜头检测**: 预处理长视频检测场景切换，为每段生成语义标签
- **向量检索**: 将镜头标签存储为向量，使用余弦相似度匹配解说词与相关片段
- **性能目标**: M1/M2/M3 芯片上，90s 视频渲染时间 ≤ 2x 实时（≤3 分钟）

### 任务队列架构
- 使用 **BullMQ** 管理重型 FFmpeg 和 Gemini 处理任务
- 集成 **WebSocket** 实现实时进度更新到 UI
- 并发调用 Gemini API 加速预处理
- 防止长渲染期间 Node.js 进程阻塞

---

## Remotion 组件规范

### ViralSubtitle 组件
- **样式**: 亮黄色加粗文字带黑边（抖音爆款风格）
- **动画**: Spring 弹簧动画实现"逐字跳动"或"上浮"效果，与语音节奏同步
- 必须支持从 ElevenLabs TTS 输出获取词语级时间数据

### 音轨混音
```
轨道 1: ElevenLabs 解说配音（音量: 1.0）
轨道 2: 原始环境音（音量: 0.15）
轨道 3: 情绪 BGM（音量: 0.3）
```

---

## UI/UX 设计标准

- **主题**: 极简浅色主题，背景 `#F8FAFC` (Slate-50)，白色组件卡片
- **导航**: 三标签布局 - `高光切片模式` | `深度解说模式` | `任务管理`
- **控件**: 专用毫秒级调整按钮，支持键盘快捷键
- **预览**: 调整切点时立即同步视频播放器

---

## API 集成要点

### Gemini 3（视频分析）
- 必须处理来自 `yunwu.ai` 代理的流式响应
- 实现超时处理和自动重连
- 使用"关键帧采样 + 低分辨率代理"策略降低 Token 成本

### ElevenLabs（TTS）
- 提取毫秒级词语时间数据用于字幕同步
- 将生成的音频和时间元数据存储到 SQLite

---

## 开发命令

```bash
# Next.js 开发
npm run dev              # 启动 Next.js 开发服务器 (http://localhost:3000)
npm run build            # 构建生产版本
npm run start            # 启动生产服务器
npm run lint             # 运行 ESLint

# Remotion 视频渲染
npm run remotion:preview     # 启动 Remotion Studio 预览
npm run remotion:render      # 渲染视频
npm run remotion:render:subtitle  # 使用 props 文件渲染字幕视频

# Git 操作
git status              # 查看状态
git add .               # 添加修改
git commit -m "描述"     # 提交修改
git push                # 推送到 GitHub
```

---

## 关键文档文件

### 产品与技术文档
- `config.md` - 核心配置和功能需求
- `DramaGen AI 产品需求文档 (PRD).md` - 完整产品需求和验收标准
- `DramaGen AI 技术架构方案.md` - 详细技术架构
- `DramaGen AI UI 设计与交互规范.md` - UI/UX 规范
- `技术方案：毫秒级精度与并发处理.md` - 毫秒级精度和并发处理实现细节
- `prompts.md` - Gemini 3 视频 AI 提示词

### 开发文档
- `CLAUDE.md` - 本文件，项目开发指导文档
- `IMPLEMENTATION.md` - 开发进度和实现记录
- `DEPLOYMENT.md` - 部署文档（云服务器部署流程）

---

## 实现优先级

1. **基础搭建**: Next.js 15、SQLite schema、FFmpeg 封装工具 ✅ (已完成)
2. **模式 A**: 实现高光检测和毫秒级调整 UI
3. **处理管线**: 构建镜头检测和语义标签系统
4. **模式 B**: 开发解说生成和语义匹配
5. **渲染**: 实现 Remotion 组件和病毒式字幕动画 ✅ (已完成)
6. **性能优化**: 集成 BullMQ 任务队列管理

---

## 已完成的工作 (2025-02-08)

### ✅ 第一阶段：基础架构搭建
- [x] Next.js 15 项目初始化（TypeScript + Tailwind + App Router）
- [x] 项目目录结构创建
- [x] 核心依赖安装（Remotion 4.0、Framer Motion、Zod）
- [x] GitHub 仓库初始化和首次推送

### ✅ 第二阶段：Remotion 字幕渲染系统
从 `remotion-ai-subtitle-generation` 项目适配并集成：

**字幕组件** (`components/remotion/subtitles/`):
- `CaptionedVideo.tsx` - 主视频组件，集成视频+字幕+水印
- `KaraokeSentence.tsx` - 卡拉OK风格字幕，支持单词级高亮
- `Word.tsx` - 单词级字幕组件，支持弹跳动画
- `types.ts` - 完整的 TypeScript 类型定义
- `index.ts` - 组件导出入口

**核心特性**:
- ✅ 抖音爆款风格字幕（亮黄色 #FFE600 + 黑边）
- ✅ 单词级时间戳支持（用于卡拉OK效果）
- ✅ Spring 弹性动画系统
- ✅ 自动加载 .json 字幕文件
- ✅ 音量控制支持
- ✅ 水印叠加支持
- ✅ 完整的自定义样式系统

### ✅ 第三阶段：FFmpeg 工具库
**视频处理工具** (`lib/ffmpeg/`):
- `trimVideo()` - 毫秒级精度视频裁剪
  - 使用重编码（非 copy 模式）实现帧级精确切割
  - 支持 CRF 质量控制和编码预设
- `extractAudio()` - 音频提取（16kHz WAV 格式）
- `mixAudio()` - 多轨道音频混合（原音+解说）
- `adjustVolume()` - 精确音量调整
- `normalizeFrameRate()` - 帧率对齐（统一 30fps）

**类型定义**:
- `TrimOptions` - 裁剪选项
- `AudioExtractOptions` - 音频提取选项
- `AudioMixOptions` - 音频混合选项
- `VolumeAdjustOptions` - 音量调整选项

### ✅ 第四阶段：Remotion 配置系统
- `remotion/config.ts` - Remotion 全局配置
- `remotion/root.tsx` - Root 组件和 Composition 定义
- `remotion/index.ts` - Remotion 入口文件
- 示例字幕数据和 props 文件

### ✅ 第五阶段：API 配置系统（2025-02-08）

**环境变量配置**:
- `.env.example` - 完整的环境变量模板（137 行配置）
- `.env.local` - 本地开发环境配置
- `env.d.ts` - TypeScript 环境变量类型定义

**统一配置管理** (`lib/config/`):
- `index.ts` - 集中管理所有配置模块
  - `config` - 应用基础配置
  - `geminiConfig` - Gemini 3 API 配置
  - `elevenlabsConfig` - ElevenLabs API 配置
  - `dbConfig` - 数据库配置
  - `storageConfig` - 文件存储配置
  - `ffmpegConfig` - FFmpeg 配置
  - `queueConfig` - BullMQ 任务队列配置
  - `wsConfig` - WebSocket 配置

**Gemini 3 API 客户端** (`lib/api/gemini.ts`):
- ✅ 支持 yunwu.ai 代理（国内用户）
- ✅ 支持标准 Google Gemini API
- ✅ 自动适配不同的 API 格式
- ✅ 完整的 TypeScript 类型定义
- ✅ 主要方法：
  - `analyzeVideo()` - 视频分析
  - `findHighlights()` - 高光时刻检测
  - `extractStorylines()` - 故事线提取
  - `generateRecapScripts()` - 解说文案生成

**ElevenLabs API 客户端** (`lib/api/elevenlabs.ts`):
- ✅ TTS 文本转语音
- ✅ 支持获取语音列表（用户语音 + 共享语音库）
- ✅ 支持获取模型列表
- ✅ 批量文本转语音
- ✅ 语音预览功能
- ✅ 完整的 TypeScript 类型定义
- ✅ 主要方法：
  - `getVoices()` - 获取用户语音
  - `getSharedVoices()` - 获取共享语音库
  - `getModels()` - 获取可用模型
  - `textToSpeech()` - 文本转语音
  - `batchTextToSpeech()` - 批量转换

**测试工具** (`scripts/test-api.ts`):
- ✅ API 配置测试脚本
- ✅ 测试 4 项：配置加载、Gemini API、ElevenLabs API、TTS 生成
- ✅ 命令：`npm run test:api`

**文档**:
- ✅ `docs/API-SETUP.md` - API 配置指南
- ✅ `docs/API-EXAMPLES.md` - API 使用示例和最佳实践

**测试结果**:
```
✅ 配置加载成功
✅ Gemini API 连接成功 (yunwu.ai + gemini-3-pro-preview)
✅ ElevenLabs API 连接成功 (37 个语音)
✅ ElevenLabs TTS 生成成功 (30 KB MP3)
状态: 4 成功 | 0 失败
```

### ✅ 第六阶段：数据库与任务队列基础设施（2025-02-08）

**Agent 4 - 数据层与任务队列开发** - 根据 `AGENT-4-GUIDE.md` 完成

**数据库层** (`lib/db/`):
- ✅ `schema.ts` - 7 张表的完整定义
  - `videos` - 视频素材表
  - `shots` - 镜头切片表
  - `storylines` - 故事线表
  - `highlights` - 高光候选表（模式 A）
  - `recap_tasks` - 解说任务表（模式 B）
  - `recap_segments` - 解说词片段表
  - `queue_jobs` - 任务队列记录表
- ✅ `client.ts` - SQLite 连接管理
  - 自动初始化表结构
  - WAL 模式优化并发
  - 索引优化查询性能
  - 健康检查和重置方法
- ✅ `queries.ts` - 封装的查询 API
  - 7 个查询模块（video, shot, storyline, highlight, recapTask, recapSegment, queueJob）
  - 统计查询 API
  - CRUD 操作封装
- ✅ `init.ts` - 应用初始化脚本
  - 数据库初始化
  - WebSocket 服务器启动
  - 优雅退出处理

**任务队列系统** (`lib/queue/`):
- ✅ `bullmq.ts` - BullMQ 队列管理器
  - 4 个任务队列配置
  - Worker 管理
  - 事件监听
  - 统计信息查询
- ✅ 与数据库集成（queue_jobs 表）
- ✅ 支持任务重试和超时

**WebSocket 实时通信** (`lib/ws/`):
- ✅ `server.ts` - WebSocket 服务器
  - 客户端订阅管理
  - 4 种消息类型（progress, status, error, complete）
  - 广播和单播功能
  - 心跳机制
- ✅ 集成到应用初始化流程

**API Routes**:
- ✅ `/api/health` - 健康检查 + 数据库统计
- ✅ `/api/db/init` - 数据库初始化/重置（开发环境）

**依赖安装**:
```json
{
  "drizzle-orm": "^0.45.1",
  "better-sqlite3": "^12.6.2",
  "drizzle-kit": "^0.31.8",
  "bullmq": "^5.67.3",
  "ioredis": "^5.9.2",
  "ws": "^8.19.0",
  "nanoid": "^5.1.6"
}
```

**配置文件**:
- ✅ `drizzle.config.ts` - Drizzle ORM 配置
- ✅ NPM 脚本命令：`db:push`, `db:migrate`, `db:studio`

**目录结构**:
```
lib/
├── db/              # 数据库层
│   ├── schema.ts
│   ├── client.ts
│   ├── queries.ts
│   └── init.ts
├── queue/           # 任务队列
│   └── bullmq.ts
├── ws/              # WebSocket
│   └── server.ts
├── api/             # AI 服务（已有）
└── config/          # 配置（已有）
```

**验证结果**:
```
✅ 所有依赖安装完成
✅ 项目构建成功 (npm run build)
✅ 类型检查通过
✅ 数据库表结构完整
✅ 任务队列配置完成
✅ WebSocket 配置完成
```

**文档**:
- ✅ `BASIC_INFRASTRUCTURE.md` - 基础设施搭建完成报告
- ✅ `AGENT-4-DEPENDENCIES.md` - 依赖安装完成报告

---

## 项目结构

```
001-AI-DramaCut/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # 根布局
│   ├── page.tsx                 # 首页
│   └── globals.css              # 全局样式
│
├── components/                   # React 组件
│   └── remotion/                # Remotion 相关组件
│       ├── subtitles/           # 字幕组件
│       │   ├── CaptionedVideo.tsx      # 主视频组件
│       │   ├── KaraokeSentence.tsx     # 卡拉OK字幕
│       │   ├── Word.tsx                # 单词字幕
│       │   ├── types.ts                # 类型定义
│       │   └── index.ts               # 导出入口
│       └── utils/
│           └── load-font.ts     # 字体加载工具
│
├── lib/                          # 工具库
│   └── ffmpeg/                  # FFmpeg 工具
│       ├── index.ts             # 工具入口
│       ├── utils.ts             # 核心函数
│       └── types.ts             # 类型定义
│
├── remotion/                     # Remotion 配置
│   ├── config.ts                # Remotion 配置
│   ├── root.tsx                 # Root 组件
│   └── index.ts                 # 入口文件
│
├── public/                       # 静态资源
│   ├── example-subtitle.json    # 示例字幕数据
│   └── subtitle-props.json      # 示例 props
│
├── .gitignore                   # Git 忽略配置
├── CLAUDE.md                    # 本文件
├── IMPLEMENTATION.md            # 开发进度文档
├── DEPLOYMENT.md                # 部署文档
├── package.json                 # 项目配置
├── tsconfig.json                # TypeScript 配置
├── tailwind.config.ts           # Tailwind 配置
├── next.config.mjs              # Next.js 配置
└── postcss.config.mjs           # PostCSS 配置
```

---

## 组件使用示例

### Remotion 字幕组件
```tsx
import { CaptionedVideo } from "@/components/remotion/subtitles";

<CaptionedVideo
  src="/path/to/video.mp4"
  subtitles={subtitleData}
  fontSize={60}
  fontColor="white"
  highlightColor="#FFE600"  // 抖音爆款黄色
  outlineColor="black"
  outlineSize={5}
  subtitleY={80}
  originalVolume={1}
/>
```

### FFmpeg 工具使用
```typescript
import { trimVideo, mixAudio } from "@/lib/ffmpeg";

// 毫秒级视频裁剪
trimVideo({
  inputPath: "input.mp4",
  outputPath: "output.mp4",
  startTimeMs: 5000,  // 从第 5 秒开始
  durationMs: 30000,  // 持续 30 秒
});

// 音频混合（原音15% + 解说100%）
mixAudio({
  videoPath: "video.mp4",
  audioPath: "voiceover.mp3",
  outputPath: "final.mp4",
  videoVolume: 0.15,
  audioVolume: 1.0
});
```

---

## 技术要点提醒

### FFmpeg 毫秒级裁剪（核心）
⚠️ **禁止使用 `-vcodec copy`**，因为它只能跳转到 I 帧，无法实现毫秒级精度。

**正确做法**：
```bash
ffmpeg -ss [HH:MM:SS.ms] -i input.mp4 -t [duration] -c:v libx264 -preset fast -crf 18 output.mp4
```

### 字幕数据格式
```json
[
  {
    "startMs": 1000,
    "endMs": 3000,
    "text": "字幕内容",
    "words": [
      { "text": "字幕", "startMs": 1000, "endMs": 2000 },
      { "text": "内容", "startMs": 2000, "endMs": 3000 }
    ]
  }
]
```

### 帧率对齐
所有视频必须预处理为 30fps，确保毫秒计算与帧号匹配：
```typescript
normalizeFrameRate(inputPath, outputPath, 30);
```

---

### ✅ 第六阶段：视频元数据提取系统（2025-02-08）

**核心功能** (`lib/video/metadata.ts`):
- ✅ `getMetadata()` - 获取视频元数据
  - 使用 Remotion + FFprobe 双重提取
  - 返回完整的 VideoMetadata 对象
  - 符合 `types/api-contracts.ts` 接口契约
  - 支持时长、分辨率、帧率、编码、比特率、文件大小

- ✅ `getBatchMetadata()` - 批量获取元数据
  - 并发处理多个视频
  - Promise.allSettled 容错处理

- ✅ `validateVideoMetadata()` - 视频验证
  - 时长验证（≥1 秒）
  - 分辨率验证（≥720p）
  - 帧率验证（25-60 fps）
  - 编码格式验证

- ✅ `formatMetadata()` - 格式化输出
  - 人类可读的元数据展示
  - 用于调试和日志

**HTTP API** (`app/api/video/metadata/route.ts`):
- ✅ `POST /api/video/metadata` - 获取元数据
- ✅ `GET /api/video/metadata?videoPath=...` - 快速查询
- ✅ 返回元数据 + 验证结果

**测试工具** (`scripts/test-metadata.ts`):
- ✅ 命令行测试脚本
- ✅ 支持单个视频测试
- ✅ 显示验证结果

**文档** (`lib/video/README.md`):
- ✅ 完整的使用文档
- ✅ API 集成示例
- ✅ 测试说明

**数据结构** (符合接口契约):
```typescript
interface VideoMetadata {
  duration: number;      // 时长（秒）
  width: number;         // 宽度（像素）
  height: number;        // 高度（像素）
  fps: number;           // 帧率
  bitrate: number;       // 比特率
  codec: string;         // 编码格式
  size: number;          // 文件大小（字节）
}
```

**集成状态**:
- ✅ Agent UI: 可通过 `/api/video/metadata` 调用
- ✅ Agent Data: 元数据可直接存入 videos 表
- ✅ Agent API: Gemini 分析时可使用元数据

**性能**:
- 单个视频: ~300ms
- 批量处理: 并发执行

**阻塞项**:
- ⏸️ `detectShots()` 功能被阻塞
  - 原因：shots 表缺少 thumbnailPath 字段
  - 需要：Agent 4 添加字段后继续

---

## ⚠️ 核心架构要求（2025-02-08 更新）

### 毫秒级精度（最高优先级）
- **所有时间戳必须精确到毫秒**
- 包括：镜头检测、Gemini理解、FFmpeg切割
- 数据库字段：`startMs`, `endMs` (整数，毫秒单位)
- UI 显示：`HH:MM:SS.mmm` 格式
- **验收标准**: 音画同步误差 < 50ms

### 双路径数据处理架构

**路径 A：镜头检测（Shot Detection）** - 为深度解说模式提供素材
```
完整剧集 → 自动镜头检测 → N个镜头片段
- 每个镜头：startMs, endMs, semanticLabel, thumbnailPath
- 用途：模式B（解说）可以灵活拼接画面
```

**路径 B：Gemini 完整理解** - 理解完整故事线
```
完整剧集（45分钟）→ Gemini 3 观看完整视频 → 结构化数据
{
  storylines: [...],      // 10+ 条独立故事线
  characters: {...},       // 人物关系图谱
  keyMoments: [...],       // 关键时刻（毫秒级时间戳）
  emotionalArc: [...],     // 情感曲线
  highlights: [...]        // 高光候选列表
}
```

### 两种模式使用不同素材

**模式 A：高光切片（Highlight Hook）**
- 素材来源：完整剧集文件 + Gemini 标记的毫秒级时间戳
- 操作：FFmpeg 精确切割完整视频
- 输出：单个连续的高光切片视频

**模式 B：深度解说（Recap Matrix）**
- 素材来源：预处理好的镜头片段库（毫秒级时间戳）
- 操作：语义搜索匹配镜头 → 拼接多个小镜头
- 输出：由多个镜头拼接的解说视频

### 数据库设计要求

**核心表结构**：
```sql
-- 1. projects 表（项目组织）
projects:
  - id, name, description, createdAt, updatedAt

-- 2. videos 表（完整剧集）
videos:
  - projectId (关联到项目) ⚠️ 需要添加
  - type: "full_episode" | "shot" | "clip" ⚠️ 需要添加
  - filePath, durationMs (毫秒) ✅ 已有
  - width, height, fps ✅ 已有
  - status: "uploading" | "processing" | "analyzing" | "ready" ✅ 已有

-- 3. shots 表（镜头片段）✅ 已有
shots:
  - videoId (关联到源视频) ✅ 已有
  - startMs, endMs (毫秒) ✅ 已有
  - semanticLabel (用于搜索) ⚠️ 需要明确用途
  - thumbnailPath ⚠️ 需要添加

-- 4. project_analysis 表（项目级Gemini理解）⚠️ 缺失
project_analysis:
  - projectId
  - storylines (JSON - 10+条故事线)
  - keyMoments (JSON - 毫秒级时间戳)
  - characters (JSON - 人物关系)
  - analyzedAt

-- 5. highlights 表（高光候选）✅ 已有
highlights:
  - videoId, startMs, endMs (毫秒) ✅ 已有
  - viralScore, category ✅ 已有

-- 6. storylines, recap_tasks, recap_segments ✅ 已有
```

**⚠️ 数据库需要修改的地方**：
1. 添加 `projects` 表（项目组织）
2. `videos` 表添加 `projectId` 外键
3. `videos` 表添加 `type` 字段区分完整剧集/镜头/切片
4. 添加 `project_analysis` 表存储Gemini完整理解结果
5. `shots` 表添加 `thumbnailPath` 和更明确的 `semanticLabel`

### FFmpeg 必须使用毫秒级精确切割
```bash
# ✅ 正确（毫秒精度）
ffmpeg -ss 00:12:34.567 -i input.mp4 -t 120.000 -c:v libx264 -preset fast -crf 18 output.mp4

# ❌ 错误（只能跳到I帧，不精确）
ffmpeg -ss 00:12:34 -i input.mp4 -t 120 -c:v copy output.mp4
```

---

## 下一步开发计划

### 阶段 2：模式 A - 高光智能切片
- [ ] 集成 Gemini 3 视频分析 API
- [ ] 实现病毒式桥段自动检测
- [ ] 构建毫秒级微调 UI（±100ms, ±500ms, ±1000ms）
- [ ] 实现实时预览功能

### 阶段 3：模式 B - 深度解说矩阵
- [ ] 集成 ElevenLabs TTS API
- [ ] 实现故事线自动提取
- [ ] 构建语义搜索系统（向量检索）
- [ ] 实现自动音画匹配

### 阶段 4：任务队列与性能
- [ ] 集成 BullMQ 任务队列
- [ ] 实现 WebSocket 实时进度更新
- [ ] 优化视频渲染性能
- [ ] 实现并发处理机制
