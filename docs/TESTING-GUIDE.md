# 🎬 DramaGen AI 测试指南

本文档介绍如何测试项目管理和视频上传功能。

---

## 📋 前置条件

### 1. 环境检查

```bash
# 检查 Node.js 版本（需要 >=18）
node -v

# 检查 Redis 是否安装
redis-cli --version

# 如果未安装 Redis（macOS）
brew install redis

# 如果未安装 Redis（Linux）
sudo apt-get install redis-server
```

### 2. 环境变量配置

确保 `.env.local` 文件已正确配置：

```bash
# 复制示例配置
cp .env.example .env.local

# 编辑配置文件
# 必须配置：
# - GEMINI_API_KEY 或 YUNWU_API_KEY
# - 数据库配置（SQLite 不需要额外配置）
# - Redis URL（默认 localhost:6379）
```

---

## 🚀 启动服务

### 方式 1：使用启动脚本（推荐）

```bash
# 运行完整启动脚本
./scripts/test-all-services.sh
```

### 方式 2：手动启动

```bash
# 终端 1: 启动 Redis
brew services start redis
# 或
redis-server

# 终端 2: 启动 Next.js 开发服务器
npm run dev

# 终端 3: 启动 Worker 进程
npx tsx scripts/workers.ts
```

### 验证服务状态

```bash
# 检查 Redis
redis-cli ping
# 应该返回: PONG

# 检查 Next.js（访问 http://localhost:3000）
curl http://localhost:3000/api/health
# 应该返回: {"success":true,...}

# 检查 Worker 进程
ps aux | grep "tsx.*workers"
```

---

## 📝 测试流程

### 步骤 1: 创建项目

1. 打开浏览器访问: `http://localhost:3000/projects`
2. 点击"创建项目"按钮
3. 输入项目信息:
   - 项目名称: `测试项目`
   - 项目描述: `用于测试视频上传和分析功能`
4. 点击"创建"

**预期结果**:
- ✅ 项目创建成功
- ✅ 项目卡片出现在列表中
- ✅ 显示"0 个视频 · 总时长 0 分钟"

---

### 步骤 2: 上传视频

1. 点击项目卡片，进入项目详情页
2. 点击"上传视频"按钮
3. 选择一个测试视频文件：
   - 格式：MP4（推荐）
   - 大小：<500MB（推荐测试）
   - 时长：1-5 分钟（推荐）
   - 内容：短剧片段
4. 拖拽或选择文件后，点击"开始上传"

**预期结果**:
- ✅ 上传进度显示（0% → 50%）
- ✅ 创建数据库记录（50% → 100%）
- ✅ 视频出现在列表中
- ✅ 状态显示为"处理中"或"理解中"

---

### 步骤 3: 查看处理进度

上传完成后，系统会自动触发 4 个任务：

1. **镜头检测**（FFmpeg 场景切换检测）
   - 状态: `processing`
   - 进度: 0% → 100%

2. **Gemini 分析**（视频 + 音频深度理解）
   - 状态: `analyzing`
   - 进度: 0% → 100%（包含音频分析）

3. **故事线提取**（提取独立剧情线）
   - 状态: `analyzing`
   - 进度: 0% → 100%

4. **高光检测**（病毒式传播时刻检测）
   - 状态: `analyzing`
   - 进度: 0% → 100%

**查看 Worker 日志**:
```bash
tail -f logs/worker.log
```

**预期日志输出**:
```
🚀 启动 DramaGen AI 队列 Workers...
✅ 视频处理 Worker 已启动: video-processing
✅ Gemini 分析 Worker 已启动: gemini-analysis
...
✨ 所有 Workers 已启动，等待任务...

🔄 开始处理任务: video-processing/extract-shots (Job ID: 1)
🎬 检测到 15 个镜头
✅ 任务完成: video-processing/extract-shots

🔄 开始处理任务: gemini-analysis/analyze (Job ID: 2)
🎵 步骤 1/2: 采样关键帧...
✅ 采样完成，共 450 帧
🎵 步骤 2/2: 提取并分析音频...
✅ 音频提取完成
🎵 调用 Gemini 分析音频...
✅ 音频分析完成
🎬 视频分析完成，正在保存数据
💾 保存了 15 个镜头切片（包含音频信息）
✅ 任务完成: gemini-analysis/analyze

🔄 开始处理任务: gemini-analysis/extract-storylines (Job ID: 3)
💾 保存了 4 条故事线
✅ 任务完成: gemini-analysis/extract-storylines

🔄 开始处理任务: gemini-analysis/detect-highlights (Job ID: 4)
💾 保存了 3 个高光候选
✅ 任务完成: gemini-analysis/detect-highlights
```

---

### 步骤 4: 查看分析结果

处理完成后（视频状态变为"已就绪"），可以查看分析结果：

#### 方式 1: 使用数据库查看器

```bash
# 启动 Drizzle Studio
npm run db:studio

# 访问 http://localhost:4983
# 查看 shots、storylines、highlights 表
```

#### 方式 2: 使用 API 查询

```bash
# 查看镜头切片
curl http://localhost:3000/api/videos/1/shots

# 查看故事线
curl http://localhost:3000/api/videos/1/storylines

# 查看高光时刻
curl http://localhost:3000/api/videos/1/highlights
```

#### 方式 3: 使用测试脚本

```bash
# 查看视频详情（包含所有分析结果）
npx tsx scripts/test-video-analysis.ts
```

---

## 📊 预期分析结果

### 1. 镜头切片 (`shots` 表)

| 字段 | 示例值 |
|------|--------|
| `start_ms` | 0 |
| `end_ms` | 5000 |
| `description` | "开场镜头：豪华别墅大门，雨夜...<br>【音频信息】对白: ... \| 配乐: 悬疑紧张" |
| `emotion` | "悬疑" |
| `dialogue` | "旁白：那个雨夜，改变了一切。" |
| `viral_score` | 6.0 |

### 2. 故事线 (`storylines` 表)

| 字段 | 示例值 |
|------|--------|
| `name` | "身份之谜" |
| `description` | "豪门千金林浅失忆..." |
| `category` | "identity" |
| `attraction_score` | 9.5 |
| `shot_ids` | "[1,2,5,12,18,23,45,67]" |

### 3. 高光时刻 (`highlights` 表)

| 字段 | 示例值 |
|------|--------|
| `start_ms` | 125000 |
| `end_ms` | 128000 |
| `reason` | "林浅当众反驳顾夜琛的商业方案" |
| `viral_score` | 9.8 |
| `category` | "conflict" |

---

## 🐛 常见问题

### 问题 1: Redis 连接失败

**错误**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**解决**:
```bash
# 启动 Redis
brew services start redis

# 或手动启动
redis-server
```

---

### 问题 2: Worker 进程未运行

**错误**: 任务一直处于"等待中"状态

**解决**:
```bash
# 检查 Worker 进程
ps aux | grep "tsx.*workers"

# 如果未运行，手动启动
npx tsx scripts/workers.ts
```

---

### 问题 3: Gemini API 调用失败

**错误**: `Gemini API 请求失败`

**解决**:
1. 检查 `.env.local` 中的 API Key 是否正确
2. 如果使用 yunwu.ai 代理，确认账户有足够余额
3. 查看详细错误日志:
   ```bash
   tail -f logs/worker.log | grep "Gemini"
   ```

---

### 问题 4: 视频元数据提取失败

**错误**: `视频元数据提取失败`

**解决**:
1. 确认 FFmpeg 已安装:
   ```bash
   ffmpeg -version
   ```
2. 检查视频文件是否损坏
3. 尝试重新上传

---

### 问题 5: 数据库文件不存在

**错误**: `Database file not found`

**解决**:
```bash
# 初始化数据库
npm run db:init

# 或重置数据库（开发环境）
npm run db:reset
```

---

## 🎯 测试检查清单

### 基础功能测试

- [ ] 创建项目成功
- [ ] 项目出现在列表中
- [ ] 可以上传视频文件
- [ ] 上传进度正确显示
- [ ] 视频出现在项目详情中
- [ ] 视频状态从"上传中"变为"处理中"

### AI 分析测试

- [ ] 镜头检测任务执行成功
- [ ] Gemini 分析任务执行成功
- [ ] 音频分析成功（对白、配乐、音效）
- [ ] 故事线提取成功（≥3 条）
- [ ] 高光检测成功（≥2 个）
- [ ] 视频状态最终变为"已就绪"

### 数据验证测试

- [ ] `shots` 表包含镜头切片数据
- [ ] 镜头描述包含音频信息
- [ ] `storylines` 表包含故事线数据
- [ ] `highlights` 表包含高光候选数据
- [ ] 所有时间戳为毫秒级精度

### 错误处理测试

- [ ] 上传非视频文件被正确拒绝
- [ ] 上传超大文件（>2GB）被正确拒绝
- [ ] 无效的项目 ID 返回 404
- [ ] Worker 任务失败时错误被正确记录

---

## 📚 相关文档

- **AI 分析示例**: `docs/AI-ANALYSIS-EXAMPLES.md`
- **API 文档**: `docs/API-SETUP.md`
- **项目状态**: `PROJECT-STATUS.md`
- **开发路线图**: `ROADMAP.md`

---

## 💡 下一步

测试完成后，你可以：

1. **开发高光切片 UI**: 展示高光列表 + 毫秒级微调 + 导出功能
2. **开发深度解说 UI**: 故事线选择 + 解说生成 + 画面匹配
3. **开发任务管理 UI**: 任务列表 + 进度显示 + 错误处理
4. **性能优化**: 并发处理、缓存策略、大文件优化

需要帮助请查看:
- `CLAUDE.md` - 项目开发指导
- `IMPLEMENTATION.md` - 开发进度记录
- GitHub Issues: https://github.com/iswangheng/AI-DramaCut/issues
