# DramaGen AI - 双 Agent 协作方案

**更新时间**: 2025-02-09
**并行 Agent 数量**: 2
**协作模式**: 按功能模块独立开发（前后端一体化）

---

## 📊 分工原则

### ✅ 核心理念
- **按功能模块分工** - 每个 Agent 负责完整的独立功能
- **前后端一体化** - 一个功能从 UI 到 API 全部由一个人完成
- **独立交付** - 每个功能都可以独立测试和上线

### 🎯 为什么这样分工？

**优点**：
1. ✅ **减少沟通成本** - 不需要前后端联调
2. ✅ **责任清晰** - 一个功能一个人负责到底
3. ✅ **并行效率高** - 真正的独立开发，零冲突
4. ✅ **交付更快** - 每个功能独立完成，不互相阻塞

**vs 前后端分离**：
- ❌ 前后端分离需要频繁联调
- ❌ 接口变更互相影响
- ✅ 按功能分工更敏捷

---

## 👥 双 Agent 分工方案

### **Agent 1（我）- 素材管理 + 高光切片 + 任务管理** 🎨

**负责范围**：3 个完整的功能模块

#### 模块 1：项目管理与素材管理（首页）📁

**优先级**: 🔥 最高（用户入口）

**页面路由**: `/` 和 `/projects`

**前端页面**:
```
app/                      # 页面
├── page.tsx             # 首页（项目列表）
├── layout.tsx           # 布局（包含导航栏）
└── projects/
    ├── page.tsx         # 项目列表页
    └── [id]/
        └── page.tsx     # 项目详情页

components/
├── main-layout.tsx      # 主布局（导航栏 + 项目选择器）
├── project-selector/   # 项目选择器组件
│   ├── selector.tsx    # 下拉选择器
│   └── switcher.tsx    # 项目切换按钮
├── create-project-dialog.tsx  # 创建项目弹窗
└── edit-project-dialog.tsx   # 编辑项目弹窗
```

**后端 API**:
```
app/api/
├── projects/
│   ├── route.ts              # GET（列表）+ POST（创建）
│   ├── [id]/
│   │   ├── route.ts          # GET/PUT/DELETE 项目
│   │   └── videos/
│   │       └── route.ts      # 视频管理
├── upload/
│   └── route.ts              # 视频上传
└── videos/
    └── [id]/
        └── route.ts          # 视频删除
```

**核心功能**:
1. **项目选择器**（左上角导航栏）
   - 下拉菜单显示所有项目
   - 快速切换项目
   - 显示当前项目名称

2. **项目列表**
   - 创建项目（名称 + 描述）
   - 编辑项目信息
   - 删除项目（级联删除所有视频）
   - 搜索项目

3. **项目详情**
   - 显示项目信息
   - 视频列表展示
   - 上传视频按钮
   - 视频元数据显示

4. **视频上传**
   - 支持多文件上传
   - 实时进度条
   - 上传后自动触发处理

**数据表**:
- ✅ `projects` 表
- ✅ `videos` 表

**预计工时**: 1-2 天（UI 已完成，需优化）

---

#### 模块 2：高光切片模式 ✂️

**优先级**: 🔥 高（核心功能）

**页面路由**: `/highlight`

**前端页面**:
```
app/highlight/
├── page.tsx                      # 高光切片主页
└── components/                   # 高光切片组件
    ├── highlight-player.tsx      # 视频预览播放器
    ├── highlight-controls.tsx    # 毫秒级微调控件
    ├── highlight-list.tsx         # 高光候选列表
    ├── render-button.tsx          # 渲染按钮
    └── progress-bar.tsx           # 渲染进度条

components/highlight/             # 抽离到独立目录
```

**后端 API**:
```
app/api/highlights/
├── route.ts                      # GET（列表）+ POST（生成）
├── generate/
│   └── route.ts                  # 触发 AI 检测
├── [id]/
│   ├── adjust/
│   │   └── route.ts              # 调整切点
│   ├── confirm/
│   │   └── route.ts              # 确认高光
│   └── render/
│       └── route.ts              # 渲染视频
└── batch-render/
    └── route.ts                  # 批量渲染
```

**核心功能**:
1. **视频预览播放器**
   - 集成 react-player
   - 显示当前时间（毫秒级精度：HH:MM:SS.mmm）
   - 高光时刻标记点（在进度条上显示）
   - 点击标记点跳转到对应时间
   - 预览切点变化

2. **毫秒级微调控件**
   - 快捷按钮：-1000ms | -500ms | -100ms
   - 快捷按钮：+100ms | +500ms | +1000ms
   - 数字输入框（手动输入毫秒数）
   - 实时预览切点变化

3. **高光列表**
   - 显示 AI 检测到的高光候选
   - 显示高光分数（viralScore）
   - 显示高光类别（category）
   - 选择要渲染的高光片段

4. **渲染功能**
   - 单个渲染按钮
   - 批量渲染按钮
   - 实时进度条（WebSocket）
   - 渲染完成后预览视频

**数据表**:
- ✅ `highlights` 表
- ✅ `videos` 表（关联）

**预计工时**: 3-5 天

---

#### 模块 3：任务管理 📋

**优先级**: 🟡 中（辅助功能）

**页面路由**: `/tasks`

**前端页面**:
```
app/tasks/
└── page.tsx                     # 任务管理主页

components/tasks/
├── task-list.tsx                # 任务列表
├── task-card.tsx                # 任务卡片
├── task-detail.tsx              # 任务详情
└── task-filters.tsx             # 任务筛选器
```

**后端 API**:
```
app/api/tasks/
├── route.ts                     # GET（列表）
├── [id]/
│   ├── route.ts                 # GET（详情）
│   ├── logs/
│   │   └── route.ts             # 获取任务日志
│   └── cancel/
│       └── route.ts             # 取消任务
```

**核心功能**:
1. **任务列表**
   - 显示所有任务（队列中、进行中、已完成、失败）
   - 任务状态徽章
   - 任务进度条
   - 按状态筛选

2. **任务详情**
   - 完整的任务信息
   - 任务参数
   - 实时进度
   - 任务日志

3. **任务操作**
   - 取消任务
   - 重试失败任务
   - 删除任务记录

**数据表**:
- ✅ `queue_jobs` 表

**预计工时**: 2-3 天

---

### **Agent 2 - 深度解说模式** 🎙️

**负责范围**：1 个完整的功能模块

#### 模块：深度解说模式 🎙️

**优先级**: 🔥 高（核心功能）

**页面路由**: `/recap`

**前端页面**:
```
app/recap/
└── page.tsx                      # 深度解说主页

components/recap/
├── storylines-list.tsx          # 故事线列表
├── script-editor.tsx             # 解说文案编辑器
├── voice-selector.tsx           # 语音选择器
├── segment-timeline.tsx          # 片段时间轴
├── scene-matcher.tsx             # 画面匹配器
├── preview-player.tsx            # 预览播放器
└── render-button.tsx             # 渲染按钮
```

**后端 API**:
```
app/api/recap/
├── storylines/
│   └── route.ts                  # 提取故事线
├── scripts/
│   └── route.ts                  # 生成解说文案
├── tts/
│   └── route.ts                  # TTS 音频合成
├── match-scenes/
│   └── route.ts                  # 画面匹配（核心算法）
└── render/
    └── route.ts                  # Remotion 渲染
```

**核心算法**（重点）:
```
lib/semantic/                     # 语义匹配库
├── vectorizer.ts                 # 向量化
│   ├── textEmbedding()          # 文本 → embedding
│   └── shotEmbedding()          # 画面标签 → embedding
├── similarity.ts                 # 相似度计算
│   ├── cosineSimilarity()       # 余弦相似度
│   └── topKMatches()            # Top-K 检索
└── matcher.ts                    # 画面匹配器
    ├── matchScenes()            # 主匹配函数
    ├── ensureContinuity()       # 保证时间连续性
    └── fallbackStrategy()       # 无匹配回退

lib/recap/
├── scene-selector.ts             # 场景选择器
├── timeline-builder.ts           # 时间轴构建器
└── remotion-generator.ts         # Remotion composition 生成器
```

**核心功能**:
1. **故事线提取**
   - 从视频提取多条故事线
   - 显示故事线列表
   - 选择要解说的故事线

2. **解说文案生成**
   - 选择解说风格（悬念/吐槽/共鸣）
   - AI 生成解说文案
   - 编辑优化文案

3. **TTS 音频合成**
   - 选择语音（ElevenLabs）
   - 生成音频
   - 获取 word-level timings

4. **画面自动匹配**（核心算法）
   - 文本向量化（解说词 → embedding）
   - 画面向量化（镜头标签 → embedding）
   - 相似度计算
   - Top-K 候选画面检索
   - 时间连续性保证

5. **Remotion 渲染**
   - 生成 composition
   - 音画同步
   - 字幕叠加（word-level）
   - 渲染输出视频

**数据表**:
- ✅ `storylines` 表
- ✅ `recap_tasks` 表
- ✅ `recap_segments` 表
- ✅ `shots` 表（关联）

**预计工时**: 5-7 天（算法开发复杂）

---

## 🔄 协作流程

### 工作模式
1. **独立开发** - 各自负责完整功能模块
2. **零冲突** - 工作在不同页面和 API
3. **共享资源** - 共用数据库和组件库
4. **每日同步** - 更新 `docs/PROGRESS.md`

### 文件分离
```
Agent 1 文件（不触碰）:
├── app/page.tsx                          # 首页
├── app/projects/                         # 项目管理
├── app/highlight/                        # 高光切片
├── app/tasks/                            # 任务管理
├── app/api/projects/                     # 项目 API
├── app/api/upload/                       # 上传 API
├── app/api/videos/                       # 视频 API
├── app/api/highlights/                   # 高光 API
├── app/api/tasks/                        # 任务 API
└── components/main-layout.tsx            # 导航栏

Agent 2 文件（不触碰）:
├── app/recap/                            # 深度解说页面
├── app/api/recap/                        # 解说 API
├── lib/semantic/                         # 语义匹配库
└── components/recap/                     # 解说组件

共享文件（都可以读，谨慎写）:
├── components/ui/                        # 通用 UI 组件
├── lib/db/                               # 数据库
├── lib/queue/                            # 任务队列
└── docs/PROGRESS.md                      # 进度文档（追加更新）
```

### 数据库表分离
```
Agent 1:
├── projects          # 项目管理
├── videos            # 视频管理
├── highlights        # 高光切片
└── queue_jobs        # 任务队列（只读状态）

Agent 2:
├── storylines        # 故事线
├── recap_tasks       # 解说任务
├── recap_segments    # 解说片段
└── shots             # 镜头（只读，用于匹配）
```

---

## 📅 时间线

### Week 1: 核心开发

**Day 1-2**:
- **Agent 1**: 优化项目选择器 + 项目管理页面
- **Agent 2**: 故事线提取 + 解说文案生成

**Day 3-5**:
- **Agent 1**: 高光切片播放器 + 微调控件
- **Agent 2**: 语义向量化算法 + 相似度计算

**Day 6-7**:
- **Agent 1**: 高光渲染功能 + 任务管理
- **Agent 2**: 画面匹配算法 + Remotion 集成

### Week 2: 完善和测试

**Day 8-10**:
- 各自测试功能
- 修复 Bug
- 性能优化
- 文档更新

---

## ✅ 开始前检查清单

### Agent 1 检查清单
- [ ] 查看 `app/projects/` 页面现状
- [ ] 查看 `components/main-layout.tsx` 导航栏
- [ ] 测试 `/api/projects` API
- [ ] 确认项目选择器是否需要创建

### Agent 2 检查清单
- [ ] 查看 `app/recap/` 页面现状
- [ ] 确认 `shots` 表有 `semanticLabel` 字段
- [ ] 查看 `lib/api/gemini.ts` API 封装
- [ ] 选择 embedding 方案（OpenAI/Cohere/开源）

---

## 📞 每日同步格式

在 `docs/PROGRESS.md` 中追加：

```markdown
### 2025-02-XX Agent 1 进度
- ✅ 完成：项目选择器组件
- 🚧 进行中：高光切片播放器（50%）
- 📋 明日：完成微调控件

### 2025-02-XX Agent 2 进度
- ✅ 完成：故事线提取 API
- 🚧 进行中：语义向量化（30%）
- 📋 明日：完成相似度算法
```

---

## 🎯 成功标准

### Agent 1 成功标准
- ✅ 用户可以快速切换项目
- ✅ 可以创建和管理项目/视频
- ✅ 可以调整高光切点并渲染视频
- ✅ 可以查看和管理所有任务

### Agent 2 成功标准
- ✅ 可以从视频提取故事线
- ✅ 可以生成解说文案和 TTS
- ✅ 解说词可以自动匹配画面
- ✅ 可以渲染音画同步的解说视频

---

**准备就绪！各自开始开发独立功能模块！** 🚀
