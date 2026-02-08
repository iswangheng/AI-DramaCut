# 🚀 下一步操作指南

**最后更新**: 2025-02-08 17:45
**当前阶段**: 基础架构搭建完成，进入并行开发

---

## ✅ 已完成的工作

### 第一阶段：基础架构（已完成 ✅）
- Next.js 15 项目初始化
- Tailwind CSS Design System 配置
- Remotion 字幕渲染系统集成
- FFmpeg 工具库实现
- 协作文档创建

### 当前项目状态
```
✅ 4 个 Claude Code Agent 正在并行工作
✅ 协作文档 COLLABORATION.md 已创建
✅ 接口契约 types/api-contracts.ts 已定义
✅ 自动同步脚本已创建
```

---

## 🎯 立即执行的操作（按优先级）

### 1️⃣ 给所有脚本添加执行权限并提交代码

```bash
# 在项目根目录执行
chmod +x scripts/*.sh
chmod +x deploy*.sh backup.sh

# 提交所有新文件
git add .
git commit -m "feat: 添加协作系统和接口契约

- 创建 COLLABORATION.md 协作文档
- 创建 types/api-contracts.ts 接口契约
- 创建 scripts/sync.js 自动同步脚本
- 创建 scripts/auto-sync.sh 同步守护进程
- 创建 AGENT-4-GUIDE.md Agent 4 开发指南
- 创建 NEXT-STEPS.md 本文件

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
"

git push origin main
```

### 2️⃣ 启动自动同步（在每个 Agent 窗口执行）

**方式 A：使用 watch 命令（推荐）**
```bash
# 安装 watch（macOS）
brew install watch

# Agent 1 窗口
watch -n 300 'git pull origin main'

# Agent 2 窗口
watch -n 300 'git pull origin main'

# Agent 3 窗口（当前窗口）
watch -n 300 'git pull origin main'

# Agent 4 窗口
watch -n 300 'git pull origin main'
```

**方式 B：使用后台脚本**
```bash
# 在项目根目录
nohup ./scripts/auto-sync.sh > /tmp/dramagen-sync.log 2>&1 &

# 查看日志
tail -f /tmp/dramagen-sync.log
```

**方式 C：手动同步（最简单）**
```bash
# 每 5 分钟手动执行一次
git pull origin main
```

### 3️⃣ 分配 Agent 4 窗口任务

**如果还没开 Agent 4，现在打开：**

在你的 AI 编程工具中开启第 4 个 Claude Code 窗口，输入以下指令：

```
请按照 AGENT-4-GUIDE.md 文档开始工作。

你的任务：
1. 阅读 AGENT-4-GUIDE.md
2. 安装数据库依赖（drizzle-orm, better-sqlite3）
3. 设计数据库 Schema
4. 实现数据库查询函数

优先级：
- 阶段 1: 数据库设计与配置
- 阶段 2: 数据库查询封装

从阶段 1 开始工作。
```

### 4️⃣ 协调其他 Agent 的下一步工作

#### Agent 1 - UI（已有进展）
```
当前已完成：
✅ MainLayout 组件
✅ /projects 页面

下一步任务：
1. 创建 /projects/[id]/page.tsx 项目详情页
2. 创建视频上传组件（等待 Agent Video 的 uploadVideo API）
3. 创建毫秒级调整 UI（±100ms, ±500ms, ±1000ms）
4. 集成 Radix UI 组件

参考文档：
- components/ui/ 用于通用组件
- Tailwind 配置已完成
- Radix UI 已安装
```

#### Agent 2 - API 集成
```
当前状态：待开始

下一步任务：
1. 安装 Gemini SDK（@google/generative-ai）
2. 实现 lib/api/gemini.ts
   - detectViralMoments() 函数
   - extractStorylines() 函数
3. 实现 lib/api/elevenlabs.ts
   - generateNarration() 函数
4. 配置环境变量（.env）

参考文档：
- types/api-contracts.ts 接口定义
- prompts.md Gemini 提示词
- .env.example 环境变量模板
```

#### Agent 3 - 视频处理（当前窗口）
```
当前已完成：
✅ FFmpeg 工具库
✅ Remotion 字幕组件

下一步任务：
1. 实现 lib/video/metadata.ts
   - getVideoMetadata() 函数
2. 实现 lib/video/upload.ts
   - uploadVideo() 函数（Agent UI 需要）
3. 实现 lib/video/shot-detection.ts
   - detectShots() 函数
4. 创建视频预处理管线

参考文档：
- lib/ffmpeg/ FFmpeg 工具
- types/api-contracts.ts 接口定义
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
