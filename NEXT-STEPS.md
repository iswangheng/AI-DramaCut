# 🚀 下一步操作指南

> **⚠️ 注意**: 本文档记录项目的历史协作过程。
> **当前最新的开发路线图**: 请查看 [ROADMAP.md](./ROADMAP.md)
> **实施进度详情**: 请查看 [IMPLEMENTATION.md](./IMPLEMENTATION.md)

**最后更新**: 2025-02-08（更新当前状态）
**项目阶段**: 基础架构和视频处理核心已完成，进入业务逻辑开发

---

## 📊 项目当前状态

### 整体进度

```
✅ P0 阶段: 基础视频处理 (100% 完成)
✅ P1 阶段: 高级视频功能 (100% 完成)
🔴 P2 阶段: 核心业务逻辑 (0% 待开发)
🟢 P3 阶段: 性能优化 (0% 待开发)
```

### 已完成的核心模块

#### ✅ 视频处理核心（Agent 3）
- 关键帧采样（降低 Gemini Token 90%+）
- FFmpeg 进度监控（实时进度反馈）
- 视频拼接（concat demuxer/filter）
- 多轨道音频混合（四轨道混音）
- Remotion 渲染客户端（程序化渲染）
- 多片段 Remotion 组合（转场效果）

#### ✅ AI 服务集成（Agent 2）
- Gemini 3 API 客户端（视频分析、高光检测、故事线提取）
- ElevenLabs TTS 客户端（语音合成、毫秒级时间轴）
- API 配置系统（统一管理所有 API 密钥）

#### ✅ 数据层和任务队列（Agent 4）
- SQLite + Drizzle ORM 数据库
- BullMQ 任务队列配置
- WebSocket 服务器
- 项目管理 API（CRUD + 搜索）
- 视频管理 API（上传 + 删除）

---

## 🎯 当前开发重点（2025-02-08）

### 🔴 最高优先级：P2 阶段核心业务逻辑

#### 模块 1：基础设施（5 个任务）

| 任务 | 预估工期 | 依赖 |
|------|----------|------|
| BullMQ Worker 处理器 | 3小时 | BullMQ 配置 ✅ |
| WebSocket 进度推送 | 2小时 | WebSocket 服务器 ✅ |
| API 路由集成 | 1天 | 无 |
| 前端 UI 框架 | 2天 | 无 |
| 错误处理和重试 | 2小时 | 无 |

#### 模块 2：模式 A - 高光智能切片（5 个任务）

| 任务 | 预估工期 | 技术实现 |
|------|----------|----------|
| Gemini 高光检测 API | 2小时 | `geminiClient.findHighlights()` ✅ |
| 高光片段提取 | 3小时 | `trimVideoWithProgress()` ✅ |
| 毫秒级微调 UI | 1天 | 待开发 |
| 实时预览功能 | 1天 | 待开发 |
| 切片导出功能 | 2小时 | `trimVideoWithProgress()` ✅ |

#### 模块 3：模式 B - 深度解说矩阵（7 个任务）

| 任务 | 预估工期 | 技术实现 |
|------|----------|----------|
| 故事线提取 API | 2小时 | `geminiClient.extractStorylines()` ✅ |
| 解说文案生成 | 2小时 | `geminiClient.generateRecapScripts()` ✅ |
| ElevenLabs TTS 集成 | 3小时 | `elevenlabsClient.textToSpeech()` ✅ |
| 语义搜索系统 | 2天 | 待开发（需向量数据库）|
| 自动音画匹配 | 1天 | 待开发 |
| 多片段渲染 | 3小时 | `renderMultiClipComposition()` ✅ |
| 四轨道混音 | 2小时 | `createStandardMix()` ✅ |

**详细任务列表**: 请查看 [IMPLEMENTATION.md](./IMPLEMENTATION.md) 或 [ROADMAP.md](./ROADMAP.md)

---

## 🚀 推荐的开发流程

### 第 1 周：基础设施（P2-I）

**目标**: 搭建任务队列和实时通信基础设施

```bash
# 1. 开发 BullMQ Worker 处理器
lib/queue/workers.ts
  ├── processHighlightTask()  # 处理高光切片任务
  ├── processRecapTask()      # 处理解说视频任务
  └── processRenderTask()     # 处理渲染任务

# 2. 集成 WebSocket 进度推送
lib/server.ts
  ├── WebSocket 服务器
  └── 进度推送逻辑

# 3. 创建 API 路由
app/api/
  ├── tasks/highlight/route.ts
  ├── tasks/recap/route.ts
  └── tasks/[id]/route.ts
```

### 第 2 周：模式 A - 高光智能切片（P2-A）

**目标**: 实现端到端的高光切片功能

```typescript
// 1. Gemini 高光检测 API
app/api/video/highlights/route.ts
import { geminiClient } from '@/lib/api/gemini';

export async function POST(request: Request) {
  const { videoPath } = await request.json();
  const highlights = await geminiClient.findHighlights(videoPath);
  return Response.json(highlights);
}

// 2. 高光片段提取
await trimVideoWithProgress({
  inputPath: videoPath,
  outputPath: outputPath,
  startTimeMs: highlight.timestamp - 30000,
  durationMs: 60000
});

// 3. 毫秒级微调 UI
components/video/
  ├── TimelineEditor.tsx     # 时间轴编辑器
  └── TrimControls.tsx        # 微调控件（±100ms/±500ms/±1000ms）
```

### 第 3 周：模式 B - 深度解说矩阵（P2-B）

**目标**: 实现端到端的解说视频生成

```typescript
// 1. 故事线提取
const storylines = await geminiClient.extractStorylines({
  videoPath,
  options: { minCount: 10 }
});

// 2. 解说文案生成
const scripts = await geminiClient.generateRecapScripts({
  storylines,
  styles: ['suspense', 'humorous', 'emotional']
});

// 3. TTS 合成
const { audioBuffer, alignment } = await elevenlabsClient.textToSpeech({
  text: scripts[0].content,
  voiceId: 'your_voice_id'
});

// 4. 多片段渲染
await renderMultiClipComposition({
  clips: matchedSegments,
  subtitles: alignment_to_subtitles(alignment),
  outputPath: './output.mp4'
});

// 5. 四轨道混音
await createStandardMix({
  videoPath: './video.mp4',
  voiceoverPath: './voiceover.mp3',
  bgmPath: './bgm.mp3',
  outputPath: './final.mp4'
});
```

---

## 📚 相关文档导航

### 📋 规划和进度文档

| 文档 | 用途 |
|------|------|
| **[ROADMAP.md](./ROADMAP.md)** | 🎯 完整的开发路线图（22 个任务）|
| **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** | 📊 实施进度和功能详情 |
| **[README.md](./README.md)** | 🏠 项目总览和快速开始 |

### 🔧 技术文档

| 文档 | 用途 |
|------|------|
| **[CLAUDE.md](./CLAUDE.md)** | 📖 项目架构和开发规范 |
| **[AGENT-4-GUIDE.md](./AGENT-4-GUIDE.md)** | 🗄️ 数据层开发指南 |
| **[lib/video/README.md](./lib/video/README.md)** | 🎬 视频处理模块文档 |

### 📖 功能文档（docs/）

| 文档 | 功能 |
|------|------|
| **[KEY-FRAME-SAMPLING.md](./docs/KEY-FRAME-SAMPLING.md)** | 关键帧采样 |
| **[FFMPEG-PROGRESS.md](./docs/FFMPEG-PROGRESS.md)** | FFmpeg 进度监控 |
| **[VIDEO-CONCAT.md](./docs/VIDEO-CONCAT.md)** | 视频拼接 |
| **[MULTITRACK-AUDIO.md](./docs/MULTITRACK-AUDIO.md)** | 多轨道音频混合 |
| **[REMOTION-RENDERER.md](./docs/REMOTION-RENDERER.md)** | Remotion 渲染 |
| **[MULTICLIP-COMPOSITION.md](./docs/MULTICLIP-COMPOSITION.md)** | 多片段组合 |
| **[API-SETUP.md](./docs/API-SETUP.md)** | API 配置指南 |
| **[API-EXAMPLES.md](./docs/API-EXAMPLES.md)** | API 使用示例 |

---

## 💡 快速参考

### 已完成的视频处理功能

```typescript
// 关键帧采样
import { sampleKeyFrames } from '@/lib/video/sampling';

// FFmpeg 进度监控
import { trimVideoWithProgress } from '@/lib/ffmpeg/progress';

// 视频拼接
import { concatVideos } from '@/lib/ffmpeg/concat';

// 多轨道音频混合
import { createStandardMix } from '@/lib/ffmpeg/multitrack-audio';

// Remotion 渲染
import { renderCaptionedVideo } from '@/lib/remotion/renderer';

// 多片段组合
import { renderMultiClipComposition } from '@/lib/remotion/renderer';
```

### AI 服务客户端

```typescript
// Gemini 3 API
import { geminiClient } from '@/lib/api/gemini';
const highlights = await geminiClient.findHighlights(videoPath);
const storylines = await geminiClient.extractStorylines(videoPath);

// ElevenLabs TTS
import { elevenlabsClient } from '@/lib/api/elevenlabs';
const { audioBuffer } = await elevenlabsClient.textToSpeech({ text });
```

---

## 📋 每日工作流程

### 早上启动（每个 Agent 窗口）

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装新依赖（如果有）
npm install

# 3. 查看协作状态
cat COLLABORATION.md | grep "Agent <你的名称>" -A 20

# 4. 检查接口契约更新
cat types/api-contracts.ts

# 5. 开始工作
```

### 工作中（每 30 分钟）

```bash
# 查看是否有新的提交
git fetch origin
git log origin/main --oneline -5

# 如果有新提交，拉取并查看
git pull origin main
```

### 完成任务时

```bash
# 1. 提交代码
git add .
git commit -m "feat(<scope>): <subject>

<详细说明>

---
Agent: <Agent 名称>
依赖: <依赖的其他 Agent>
阻塞: <阻塞其他 Agent 的任务>
"

# 2. 推送到远程
git push origin main

# 3. 更新 COLLABORATION.md
# 编辑"协作日志"部分
```

---

## 🎯 关键里程碑

### 里程碑 1：数据层就绪（1-2 天）
**负责人**: Agent 4
**交付物**:
- [x] 数据库 Schema 设计
- [ ] 所有查询函数实现
- [ ] 基础测试通过

**验收标准**:
```bash
# 能运行以下命令
npm run db:push
npm run db:studio

# 能执行数据库操作
node -e "const {createProject} = require('./lib/db/queries'); createProject('测试项目')"
```

### 里程碑 2：API 集成完成（2-3 天）
**负责人**: Agent 2
**交付物**:
- [ ] Gemini 3 API 集成
- [ ] ElevenLabs TTS 集成
- [ ] 错误处理和重试机制

**验收标准**:
```bash
# 能调用 Gemini API
node -e "const {detectViralMoments} = require('./lib/api/gemini'); detectViralMoments('test.mp3')"
```

### 里程碑 3：视频处理完成（2-3 天）
**负责人**: Agent 3（当前窗口）
**交付物**:
- [x] FFmpeg 基础工具
- [ ] 视频元数据提取
- [ ] 镜头检测功能
- [ ] 视频上传处理

**验收标准**:
```bash
# 能处理视频
node -e "const {getVideoMetadata} = require('./lib/video/metadata'); getVideoMetadata('test.mp4')"
```

### 里程碑 4：UI 界面完成（3-4 天）
**负责人**: Agent 1
**交付物**:
- [x] 主布局和项目页面
- [ ] 视频上传界面
- [ ] 毫秒级调整界面
- [ ] 预览播放器

**验收标准**:
```bash
# 能访问页面
npm run dev
# 访问 http://localhost:3000/projects
```

### 里程碑 5：系统集成测试（1-2 天）
**所有 Agent 协作**
- [ ] 端到端流程测试
- [ ] 性能测试
- [ ] Bug 修复

---

## ⚠️ 常见问题和解决方案

### Q1: 多个 Agent 同时修改 package.json 导致冲突

**解决方案**:
```bash
# 指定 Agent API 负责 package.json
# 其他 Agent 需要新依赖时：
# 1. 在协作文档中记录
# 2. 通知 Agent API
# 3. 等待 Agent API 添加依赖后 pull
```

### Q2: 接口定义不统一

**解决方案**:
```bash
# 严格遵守 types/api-contracts.ts
# 修改接口前：
# 1. 与相关 Agent 讨论
# 2. 更新接口契约
# 3. 通知所有 Agent
```

### Q3: Git 冲突频繁

**解决方案**:
```bash
# 使用分支开发
git checkout -b agent/feature-name

# 完成后合并
git checkout main
git merge agent/feature-name
```

### Q4: 某个 Agent 被阻塞

**解决方案**:
```bash
# 1. 在 COLLABORATION.md 中记录阻塞项
# 2. 通知被依赖的 Agent
# 3. 转而做其他不依赖的任务
# 4. 或者创建接口桩（stub）继续开发
```

---

## 📞 协作沟通

### 日常沟通方式
1. **Git Commit 消息** - 主要沟通方式
2. **COLLABORATION.md** - 状态和阻塞项
3. **代码注释** - TODO 和 FIXME 标记

### 紧急沟通
如果遇到阻塞或其他 Agent 无法解决的问题：
```bash
# 在代码中添加醒目标记
// 🚨 AGENT X: 紧急，需要协助
// 问题描述：...
// 期望：...
```

---

## 🎓 学习资源

**Agent 1 - UI**:
- Radix UI: https://www.radix-ui.com/
- Tailwind CSS: https://tailwindcss.com/
- Framer Motion: https://www.framer.com/motion/

**Agent 2 - API**:
- Gemini API: https://ai.google.dev/
- ElevenLabs: https://elevenlabs.io/docs

**Agent 3 - Video**:
- FFmpeg: https://ffmpeg.org/documentation.html
- Remotion: https://www.remotion.dev/

**Agent 4 - Data**:
- Drizzle ORM: https://orm.drizzle.team/
- BullMQ: https://docs.bullmq.io/
- SQLite: https://www.sqlite.org/docs.html

---

## 📊 进度跟踪

### 每日检查清单

- [ ] 是否拉取了最新代码
- [ ] 是否提交了今天的进度
- [ ] 是否更新了 COLLABORATION.md
- [ ] 是否检查了其他 Agent 的提交
- [ ] 是否有阻塞项需要记录

### 每周总结

```markdown
## 本周完成

### Agent 1 - UI
- [ ] 任务1
- [ ] 任务2

### Agent 2 - API
- [ ] 任务1
- [ ] 任务2

### Agent 3 - Video
- [ ] 任务1
- [ ] 任务2

### Agent 4 - Data
- [ ] 任务1
- [ ] 任务2

## 下周计划
- [ ] 计划1
- [ ] 计划2
```

---

**立即开始执行吧！** 🚀

有任何问题随时在协作文档中记录或通过 Git Commit 沟通。
