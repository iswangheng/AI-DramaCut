# DramaGen AI - 项目路线图

**更新日期**: 2025-02-09
**当前状态**: P0 + P1 + P2 部分完成

---

## 📊 项目进度概览

### 整体进度

```
[██████████████████████████░░░░] 75% 完成

✅ P0 阶段: 基础视频处理 (100%)
✅ P1 阶段: 高级视频功能 (100%)
🟡 P2 阶段: 核心业务逻辑 (70%)
🟢 P3 阶段: 性能优化 (0%)
```

### 功能模块状态

| 模块 | 状态 | 完成度 | 说明 |
|------|------|--------|------|
| 视频处理基础 | ✅ 完成 | 100% | 采样、裁剪、拼接、混音 |
| Remotion 集成 | ✅ 完成 | 100% | 渲染客户端、多片段组合 |
| API 客户端 | ✅ 完成 | 100% | Gemini 3（含安全配置）、ElevenLabs |
| 数据库层 | ✅ 完成 | 100% | SQLite + Drizzle ORM |
| 任务队列 | ✅ 完成 | 100% | BullMQ + Workers + WebSocket |
| 前端 UI | 🟡 部分完成 | 70% | 素材管理完成，毫秒级微调待开发 |
| 业务逻辑 | 🟡 部分完成 | 70% | 模式 A 基本完成，模式 B 完成 |

---

## 🎯 优先级任务清单

### ✅ P0 - 已完成（基础视频处理）

| 任务 ID | 功能 | Commit | 完成日期 | 文档 |
|---------|------|--------|----------|------|
| P0-1 | 关键帧采样 | 424565c | 2025-02-08 | [KEY-FRAME-SAMPLING.md](./docs/KEY-FRAME-SAMPLING.md) |
| P0-2 | FFmpeg 进度监控 | 74443ef | 2025-02-08 | [FFMPEG-PROGRESS.md](./docs/FFMPEG-PROGRESS.md) |
| P0-3 | 视频拼接 | 3bf40dc | 2025-02-08 | [VIDEO-CONCAT.md](./docs/VIDEO-CONCAT.md) |

### ✅ P1 - 已完成（高级视频功能）

| 任务 ID | 功能 | Commit | 完成日期 | 文档 |
|---------|------|--------|----------|------|
| P1-1 | 多轨道音频混合 | e874fb0 | 2025-02-08 | [MULTITRACK-AUDIO.md](./docs/MULTITRACK-AUDIO.md) |
| P1-2 | Remotion 渲染客户端 | 8320ceb | 2025-02-08 | [REMOTION-RENDERER.md](./docs/REMOTION-RENDERER.md) |
| P1-3 | 多片段 Remotion 组合 | a79ac0f | 2025-02-08 | [MULTICLIP-COMPOSITION.md](./docs/MULTICLIP-COMPOSITION.md) |

### 🟡 P2 - 进行中（核心业务逻辑 - 70% 完成）

#### 模式 A：高光智能切片

| 任务 ID | 功能 | 状态 | 完成日期 | 文档 |
|---------|------|------|----------|------|
| P2-A1 | Gemini 高光检测 API | ✅ 完成 | 2025-02-09 | 本文档 |
| P2-A2 | 高光片段提取 | ✅ 完成 | 2025-02-09 | 本文档 |
| P2-A3 | 毫秒级微调 UI | 🔴 待开发 | - | - |
| P2-A4 | 实时预览功能 | 🔴 待开发 | - | - |
| P2-A5 | 切片导出功能 | 🟡 部分完成 | 2025-02-09 | - |

**技术逻辑**：
```
用户上传视频
    ↓
[P2-A1 ✅] 调用 Gemini findHighlights()
    返回: [
      { timestampMs: 30000, reason: "...", viralScore: 9.2, category: "reversal" },
      { timestampMs: 85000, reason: "...", viralScore: 8.8, category: "conflict" }
    ]
    ↓
[P2-A2 ✅] 保存到数据库 highlights 表
    前端自动显示高光列表
    ↓
[P2-A3 🔴] 用户毫秒级微调（±100ms/±500ms/±1000ms）
    UI 组件: 时间轴 + 按钮
    ↓
[P2-A4 🔴] 实时预览切点
    VideoPlayer with currentTime sync
    ↓
[P2-A5 🟡] 导出最终切片（基础功能已实现）
    使用 trimVideo()
```

**已完成功能**：
- ✅ Gemini 高光检测（支持恐怖、悬疑等所有题材）
- ✅ 前端进度跟踪（实时显示 0-100%）
- ✅ 错误处理（友好提示）
- ✅ 数据持久化（自动保存到数据库）
- ✅ 任务状态轮询（每 2 秒更新）

#### 模式 B：深度解说矩阵

| 任务 ID | 功能 | 状态 | 完成日期 | 文档 |
|---------|------|------|----------|------|
| P2-B1 | 故事线提取 API | ✅ 完成 | 2025-02-09 | - |
| P2-B2 | 解说文案生成 | ✅ 完成 | 2025-02-09 | - |
| P2-B3 | ElevenLabs TTS 集成 | ✅ 完成 | 2025-02-09 | [TTS-INTEGRATION.md](./test/TTS-INTEGRATION.md) |
| P2-B4 | 语义搜索系统 | ✅ 完成 | 2025-02-09 | - |
| P2-B5 | 自动音画匹配 | ✅ 完成 | 2025-02-09 | - |
| P2-B6 | 多片段渲染 | ✅ 完成 | 2025-02-09 | [MULTICLIP-COMPOSITION.md](./docs/MULTICLIP-COMPOSITION.md) |
| P2-B7 | 四轨道混音 | ✅ 完成 | 2025-02-09 | [MULTITRACK-AUDIO.md](./docs/MULTITRACK-AUDIO.md) |

**技术逻辑**：
```
用户上传长视频
    ↓
[P2-B1] 调用 Gemini extractStorylines()
    返回: [
      {
        id: 'storyline_1',
        title: '女主发现未婚夫出轨',
        segments: [
          { startMs: 30000, endMs: 45000, description: '咖啡馆场景' },
          { startMs: 60000, endMs: 75000, description: '真相揭露' }
        ]
      }
    ]
    ↓
[P2-B2] 调用 Gemini generateRecapScripts()
    返回: [
      { style: 'suspense', content: '观众朋友们，接下来的一幕将震惊所有人...' },
      { style: 'humorous', content: '这渣男终于暴露了！女主的反应绝了...' }
    ]
    ↓
[P2-B3] 调用 ElevenLabs TTS
    返回: {
      audioBuffer: <Buffer>,
      alignment: [
        { word: '观众', startMs: 0, endMs: 300 },
        { word: '朋友们', startMs: 300, endMs: 600 }
      ]
    }
    ↓
[P2-B4] 语义搜索匹配片段
    将解说词向量化 → 与视频片段标签匹配
    返回最佳匹配片段
    ↓
[P2-B5] 自动音画匹配
    根据解说内容选择最佳视频片段
    ↓
[P2-B6] 多片段组合渲染
    renderMultiClipComposition({
      clips: matchedSegments,
      subtitles: alignment_to_subtitles(alignment)
    })
    ↓
[P2-B7] 四轨道混音
    createStandardMix({
      voiceover: TTS 音频,
      bgm: 情绪 BGM,
      sfx: 转场音效
    })
    ↓
✅ 输出完整解说视频
```

### 🔴 P2 - 待开发（基础设施）

| 任务 ID | 功能 | 优先级 | 预估工期 | 依赖 |
|---------|------|--------|----------|------|
| P2-I1 | BullMQ Worker 处理器 | 🔴 最高 | 3小时 | BullMQ 配置（已完成）|
| P2-I2 | WebSocket 进度推送 | 🔴 最高 | 2小时 | WebSocket 服务器（已创建）|
| P2-I3 | API 路由集成 | 🔴 最高 | 1天 | 无 |
| P2-I4 | 前端 UI 框架 | 🟡 高 | 2天 | 无 |
| P2-I5 | 错误处理和重试 | 🟡 高 | 2小时 | 无 |
| P2-I6 | 文件上传管理 | 🟡 高 | 3小时 | 无 |

**技术逻辑**：
```
前端提交任务
    ↓
[P2-I3] API 路由接收
    POST /api/tasks/highlight
    POST /api/tasks/recap
    ↓
[P2-I1] BullMQ Worker 处理
    queue.add('highlight-task', { videoPath, options })
    worker.process('highlight-task', async (job) => {
      // 执行视频处理
      // 更新进度
      job.updateProgress(progress)
    })
    ↓
[P2-I2] WebSocket 实时推送
    ws.send(JSON.stringify({
      type: 'task:progress',
      taskId: job.id,
      progress,
      status
    }))
    ↓
前端接收并更新 UI
    ↓
[P2-I5] 错误处理
    catch (error) {
      // 指数退避重试
      // 记录错误日志
      // 通知用户
    }
```

### 🟢 P3 - 待开发（性能优化）

| 任务 ID | 功能 | 优先级 | 预估工期 | 说明 |
|---------|------|--------|----------|------|
| P3-O1 | 并发渲染优化 | 🟢 中 | 1天 | 多个视频并行渲染 |
| P3-O2 | 缓存机制 | 🟢 中 | 3小时 | 缓存 Gemini 分析结果 |
| P3-O3 | 视频质量预设 | 🟢 低 | 2小时 | 低/中/高质量配置 |
| P3-O4 | 更多转场效果 | 🟢 低 | 3小时 | 擦除、旋转、像素化 |
| P3-O5 | 批量处理优化 | 🟢 低 | 1天 | 批量渲染性能提升 |

---

## 📁 技术架构图

### 已完成的模块

```
┌─────────────────────────────────────────────────────────┐
│                    视频处理层 (Agent 3)                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  lib/video/              lib/ffmpeg/        lib/remotion/  │
│  ├── sampling.ts  ✅     ├── progress.ts ✅  ├── renderer.ts✅│
│  ├── metadata.ts  ✅     ├── concat.ts ✅     └── index.ts ✅ │
│  ├── shot-detection✅    ├── multitrack-                     │
│  └── index.ts ✅        │   audio.ts ✅                      │
│                        ├── utils.ts ✅                      │
│                        └── index.ts ✅                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     API 客户端层                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  lib/api/                                                 │
│  ├── gemini.ts ✅         (Gemini 3 视频分析)              │
│  ├── elevenlabs.ts ✅     (ElevenLabs TTS)                │
│  └── index.ts ✅                                            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      数据层 (Agent 4)                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  lib/db/                  lib/queue/        lib/server.ts  │
│  ├── schema.ts ✅        ├── bullmq.ts ✅   (WS Server) ✅│
│  ├── client.ts ✅        └── workers.ts 🟡                 │
│  └── queries.ts ✅                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Remotion 组件层                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  components/remotion/      remotion/                      │
│  ├── MultiClipComposition✅├── root.tsx ✅                 │
│  └── subtitles/ ✅       └── config.ts ✅                  │
│      ├── CaptionedVideo✅                                  │
│      ├── KaraokeSentence✅                                 │
│      └── Word ✅                                            │
└─────────────────────────────────────────────────────────┘
```

### 待开发的模块

```
┌─────────────────────────────────────────────────────────┐
│                   业务逻辑层 (待开发)                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  app/api/                 app/                           │
│  ├── video/               ├── highlight/                  │
│  │   ├── analyze/route.ts🔴                           │
│  │   ├── highlights/route.ts🔴                          │
│  │   └── storylines/route.ts🔴                          │
│  ├── tasks/               ├── recap/                      │
│  │   ├── create/route.ts🔴  └── page.tsx 🔴               │
│  │   └── [id]/route.ts🔴                                  │
│  └── render/                                            │
│      └── route.ts 🔴                                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  Worker 处理层 (待开发)                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  lib/queue/workers.ts                                    │
│  ├── processHighlightTask() 🔴  处理高光切片任务         │
│  ├── processRecapTask() 🔴      处理解说视频任务         │
│  └── processRenderTask() 🔴     处理渲染任务             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    前端 UI 层 (待开发)                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  components/                                             │
│  ├── video/                                             │
│  │   ├── VideoPlayer.tsx 🔴     视频播放器组件          │
│  │   ├── TimelineEditor.tsx 🔴  时间轴编辑器            │
│  │   └── TrimControls.tsx 🔴    毫秒级微调控件          │
│  ├── ui/                                                │
│  │   ├── ProgressBar.tsx 🔴     进度条                  │
│  │   └── TaskList.tsx 🔴        任务列表                │
│  └── layout/                                            │
│      └── Dashboard.tsx 🔴        主界面                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 开发路线图

### 第 1 周：基础设施（P2-I）

**目标**: 搭建任务队列和实时通信基础设施

- [ ] Day 1-2: BullMQ Worker 处理器
  - `processHighlightTask()`
  - `processRecapTask()`
  - `processRenderTask()`
  - 错误处理和重试机制

- [ ] Day 3-4: WebSocket 进度推送
  - 集成 WebSocket 服务器
  - 前端 WebSocket 客户端
  - 进度更新 UI 组件

- [ ] Day 5: API 路由集成
  - `POST /api/tasks/highlight`
  - `POST /api/tasks/recap`
  - `GET /api/tasks/[id]`

**验收标准**:
- ✅ 可以通过 API 提交任务
- ✅ Worker 自动处理任务
- ✅ WebSocket 实时推送进度
- ✅ 错误自动重试

### 第 2 周：模式 A - 高光智能切片（P2-A）

**目标**: 实现端到端的高光切片功能

- [ ] Day 1-2: Gemini 高光检测
  - 集成 `geminiClient.findHighlights()`
  - 高光片段提取
  - 置信度阈值过滤

- [ ] Day 3-4: 毫秒级微调 UI
  - 时间轴组件
  - 微调按钮（±100ms/±500ms/±1000ms）
  - 实时预览播放器

- [ ] Day 5: 切片导出
  - 导出功能
  - 进度监控
  - 错误处理

**验收标准**:
- ✅ 上传视频自动检测高光时刻
- ✅ 用户可以毫秒级微调切点
- ✅ 实时预览切片效果
- ✅ 导出高质量切片视频

### 第 3 周：模式 B - 深度解说矩阵（P2-B）

**目标**: 实现端到端的解说视频生成

- [ ] Day 1-2: AI 解说生成
  - 故事线提取 API
  - 解说文案生成
  - 风格选择（悬念/吐槽/共鸣）

- [ ] Day 3-4: TTS 和音画匹配
  - ElevenLabs TTS 集成
  - 语义搜索匹配片段
  - 自动音画匹配

- [ ] Day 5: 视频渲染
  - 多片段组合
  - 四轨道混音
  - 字幕叠加

**验收标准**:
- ✅ 上传视频自动提取故事线
- ✅ 生成多种风格解说文案
- ✅ TTS 生成配音
- ✅ 自动匹配视频片段
- ✅ 渲染带字幕的解说视频

### 第 4 周：优化和完善（P3）

**目标**: 性能优化和用户体验提升

- [ ] Day 1-2: 性能优化
  - 并发渲染
  - 缓存机制
  - 批量处理优化

- [ ] Day 3-4: 功能增强
  - 更多转场效果
  - 视频质量预设
  - 批量任务管理

- [ ] Day 5: 测试和文档
  - 端到端测试
  - 用户文档
  - API 文档

---

## 📊 预估工作量

### 总体估算

| 阶段 | 任务数 | 预估总工时 | 预估工作日 |
|------|--------|-----------|-----------|
| P0 (已完成) | 3 | 24h | 3天 |
| P1 (已完成) | 3 | 32h | 4天 |
| P2 (待开发) | 17 | 136h | 17天 |
| P3 (待开发) | 5 | 32h | 4天 |
| **总计** | **28** | **224h** | **28天** |

### 分模块估算

| 模块 | 已完成 | 待开发 | 总计 |
|------|--------|--------|------|
| 视频处理 | 100% (7项) | 0% | 7项 |
| API 客户端 | 100% (2项) | 0% | 2项 |
| 数据库 | 100% (3项) | 0% | 3项 |
| 业务逻辑 | 0% | 7项 🔴 | 7项 |
| 前端 UI | 0% | 6项 🔴 | 6项 |
| 任务队列 | 50% (1项) | 2项 🔴 | 3项 |

---

## 🎯 里程碑

### Milestone 1: 基础设施完成 ✅

**达成日期**: 2025-02-08
**标志**:
- ✅ 视频处理基础功能完成
- ✅ API 客户端集成完成
- ✅ Remotion 渲染引擎集成完成
- ✅ 数据库层完成

### Milestone 2: 任务队列和 WebSocket ⏳

**预计达成**: 2025-02-15
**标志**:
- [ ] BullMQ Worker 处理器完成
- [ ] WebSocket 实时推送完成
- [ ] API 路由集成完成
- [ ] 前端 UI 框架搭建完成

### Milestone 3: 模式 A 完成 ⏳

**预计达成**: 2025-02-22
**标志**:
- [ ] 高光检测功能完成
- [ ] 毫秒级微调 UI 完成
- [ ] 实时预览功能完成
- [ ] 端到端流程打通

### Milestone 4: 模式 B 完成 ⏳

**预计达成**: 2025-03-01
**标志**:
- [ ] 故事线提取完成
- [ ] 解说文案生成完成
- [ ] TTS 集成完成
- [ ] 端到端流程打通

### Milestone 5: 项目完成 ⏳

**预计达成**: 2025-03-08
**标志**:
- [ ] 所有核心功能完成
- [ ] 性能优化完成
- [ ] 文档完善
- [ ] 可以正式发布

---

## 🔗 相关文档

- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - 实施进度和功能清单
- [CLAUDE.md](./CLAUDE.md) - 项目架构和开发指南
- [docs/](./docs/) - 功能文档目录

---

**最后更新**: 2025-02-08
**维护者**: Agent 3 (视频处理核心)
