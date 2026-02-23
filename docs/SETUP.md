# 🚀 DramaCut AI - 本地开发环境设置指南

本文档详细说明如何在本地设置 DramaCut AI 的开发环境，包括所有依赖的安装、配置和验证步骤。

---

## 📋 目录

- [系统要求](#系统要求)
- [安装步骤](#安装步骤)
- [环境变量配置](#环境变量配置)
- [数据库设置](#数据库设置)
- [启动服务](#启动服务)
- [验证安装](#验证安装)
- [常见问题](#常见问题)

---

## 系统要求

### 最低配置

| 组件 | 最低要求 | 推荐配置 |
|------|---------|---------|
| **操作系统** | macOS 12+ / Ubuntu 20.04+ / Windows 10+ (WSL2) | macOS 14+ / Ubuntu 22.04+ |
| **CPU** | 4 核 | 8 核及以上 |
| **内存** | 8 GB | 16 GB 及以上 |
| **磁盘空间** | 20 GB 可用空间 | 50 GB SSD |

### 必需软件

| 软件 | 版本要求 | 用途 |
|------|---------|------|
| **Node.js** | >= 18.0.0（推荐 20.x） | 运行时环境 |
| **npm** | >= 9.0.0 | 包管理器 |
| **Redis** | >= 6.0 | 任务队列 |
| **FFmpeg** | >= 5.0 | 视频处理 |
| **Git** | >= 2.0 | 版本控制（可选） |

---

## 安装步骤

### macOS 系统

#### 1. 安装 Homebrew（如果未安装）

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 2. 安装 Redis

```bash
# 安装 Redis
brew install redis

# 启动 Redis 服务
brew services start redis

# 验证安装
redis-cli ping
# 应该返回: PONG
```

#### 3. 安装 FFmpeg

```bash
# 安装 FFmpeg
brew install ffmpeg

# 验证安装
ffmpeg -version
```

#### 4. 安装 Node.js（如果未安装）

```bash
# 使用 Homebrew 安装
brew install node

# 验证安装
node -v   # 应该显示 v18.x 或 v20.x
npm -v    # 应该显示 9.x 或更高
```

---

### Linux 系统（Ubuntu/Debian）

#### 1. 更新系统

```bash
sudo apt update
sudo apt upgrade -y
```

#### 2. 安装 Redis

```bash
# 安装 Redis
sudo apt install -y redis-server

# 启动 Redis 服务
sudo systemctl start redis

# 设置开机自启
sudo systemctl enable redis

# 验证安装
redis-cli ping
# 应该返回: PONG
```

#### 3. 安装 FFmpeg

```bash
# 安装 FFmpeg
sudo apt install -y ffmpeg

# 验证安装
ffmpeg -version
```

#### 4. 安装 Node.js 20.x

```bash
# 使用 NodeSource 仓库安装
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v   # 应该显示 v20.x
npm -v    # 应该显示 9.x 或更高
```

---

### Windows 系统（WSL2）

#### 1. 启用 WSL2

参考微软官方文档：https://docs.microsoft.com/en-us/windows/wsl/install

#### 2. 在 WSL2 中安装依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Redis
sudo apt install -y redis-server
sudo systemctl start redis

# 安装 FFmpeg
sudo apt install -y ffmpeg

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 环境变量配置

### 1. 克隆项目并安装依赖

```bash
# 克隆仓库
git clone https://github.com/iswangheng/AI-DramaCut.git
cd AI-DramaCut

# 安装 Node.js 依赖
npm install

# 验证安装
ls node_modules
```

### 2. 创建环境变量文件

```bash
# 复制示例配置
cp .env.example .env.local

# 编辑配置文件
nano .env.local
# 或使用 VSCode
code .env.local
```

### 3. 配置必需的环境变量

#### 3.1 Gemini API 配置（必需）

**选项 A：使用 yunwu.ai 代理（推荐国内用户）**

```env
# yunwu.ai 代理配置
YUNWU_API_ENDPOINT=https://yunwu.ai
YUNWU_API_KEY=sk-your_yunwu_api_key_here
GEMINI_MODEL=gemini-3-pro-preview
```

**选项 B：使用官方 Gemini API**

```env
# 官方 Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3-pro-preview
```

> 💡 **获取 API Key**:
> - **yunwu.ai**: 访问 https://yunwu.ai 注册并获取 API Key
> - **Gemini**: 访问 https://ai.google.dev/ 获取 API Key

#### 3.2 ElevenLabs API 配置（TTS 功能必需）

```env
ELEVENLABS_API_KEY=sk-your_elevenlabs_api_key_here
```

> 💡 **获取 API Key**: 访问 https://elevenlabs.io/ 注册并获取 API Key

#### 3.3 其他配置（可选，已有默认值）

```env
# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 数据库配置（SQLite）
DATABASE_URL=./data/database.sqlite

# 应用配置
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 日志配置
LOG_LEVEL=debug
LOG_DIR=./logs
```

### 4. 验证环境变量配置

```bash
# 检查文件是否存在
ls -la .env.local

# 检查 API Key 是否配置
grep YUNWU_API_KEY .env.local
grep ELEVENLABS_API_KEY .env.local
```

---

## 数据库设置

### 1. 创建数据目录

```bash
# 创建必要的目录
mkdir -p data uploads outputs logs
```

### 2. 初始化数据库

```bash
# 方式 A: 初始化数据库（推荐）
npm run db:init

# 方式 B: 使用 Drizzle Push
npm run db:push

# 方式 C: 重置数据库（开发环境）
npm run db:reset
```

### 3. 验证数据库

```bash
# 检查数据库文件
ls -la .data/local.db

# 启动数据库可视化工具
npm run db:studio

# 打开浏览器访问
# http://localhost:4983
```

### 4. 数据库表结构

系统会自动创建以下 8 张表：

| 表名 | 说明 |
|------|------|
| `projects` | 项目信息 |
| `videos` | 视频信息 |
| `shots` | 镜头切片 |
| `storylines` | 故事线 |
| `highlights` | 高光候选 |
| `recap_tasks` | 解说任务 |
| `recap_segments` | 解说片段 |
| `queue_jobs` | 任务队列记录 |

---

## 启动服务

### 方式 A：使用启动脚本（推荐）

```bash
# 运行完整启动脚本
./scripts/test-all-services.sh
```

脚本会自动：
1. ✅ 启动 Redis
2. ✅ 初始化数据库
3. ✅ 启动 Next.js 开发服务器
4. ✅ 启动 Worker 进程

---

### 方式 B：手动启动（推荐用于调试）

#### 打开 3 个终端窗口：

**终端 1：启动 Redis**

```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# 或直接运行
redis-server
```

**终端 2：启动 Next.js 开发服务器**

```bash
# 进入项目目录
cd /path/to/AI-DramaCut

# 启动开发服务器
npm run dev

# 应该看到:
# ✅ Ready in 3.5s
# ○ Local:        http://localhost:3000
```

**终端 3：启动 Worker 进程**

```bash
# 进入项目目录
cd /path/to/AI-DramaCut

# 启动 Worker
npx tsx scripts/workers.ts

# 应该看到:
# ✅ 环境变量已加载
# ✅ 队列已创建: video-processing
# ✅ Worker 已创建: video-processing
# ✨ 所有 Workers 已启动，等待任务...
```

---

## 验证安装

### 1. 检查服务状态

```bash
# 检查 Redis
redis-cli ping
# 应该返回: PONG

# 检查 Next.js
curl http://localhost:3000/api/health
# 应该返回: {"success":true,...}

# 检查 Worker 进程
ps aux | grep "tsx.*workers"
# 应该看到 Worker 进程信息
```

### 2. 访问 Web 界面

打开浏览器访问：

- **首页**: http://localhost:3000
- **项目管理**: http://localhost:3000/projects
- **高光切片**: http://localhost:3000/highlight
- **深度解说**: http://localhost:3000/recap
- **任务管理**: http://localhost:3000/tasks

### 3. 测试功能

#### 测试 1: 创建项目

1. 访问 http://localhost:3000/projects
2. 点击"创建项目"按钮
3. 输入项目名称和描述
4. 点击"创建"

**预期结果**:
- ✅ 项目创建成功
- ✅ 项目出现在列表中

#### 测试 2: 上传视频（可选）

1. 进入项目详情
2. 点击"上传视频"
3. 选择一个 MP4 文件（建议 <200MB）
4. 等待上传和处理完成

**预期结果**:
- ✅ 视频上传成功
- ✅ 自动触发 AI 分析任务
- ✅ Worker 日志显示任务处理进度

---

## 常见问题

### ❓ 问题 1: Redis 启动失败

**症状**: `redis-cli ping` 返回 `Connection refused`

**解决方案**:

```bash
# macOS
brew services restart redis

# Linux
sudo systemctl restart redis

# 检查 Redis 状态
redis-cli ping
```

---

### ❓ 问题 2: Worker 启动失败

**症状**: `Error: Gemini API key is not configured`

**解决方案**:

1. 检查 `.env.local` 是否存在
   ```bash
   ls -la .env.local
   ```

2. 检查 API Key 是否配置
   ```bash
   grep YUNWU_API_KEY .env.local
   grep GEMINI_API_KEY .env.local
   ```

3. 重新启动 Worker
   ```bash
   pkill -f "tsx.*workers"
   npx tsx scripts/workers.ts
   ```

---

### ❓ 问题 3: npm install 失败

**症状**: 安装依赖时报错

**解决方案**:

```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

---

### ❓ 问题 4: FFmpeg 未找到

**症状**: `Error: FFmpeg not found`

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

### ❓ 问题 5: 端口被占用

**症状**: `Error: listen EADDRINUSE :::3000`

**解决方案**:

```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或修改 .env.local
PORT=3001
```

---

### ❓ 问题 6: 数据库初始化失败

**症状**: `Error: Database file not found`

**解决方案**:

```bash
# 创建数据目录
mkdir -p data

# 重新初始化
npm run db:init

# 或重置数据库
npm run db:reset
```

---

## 📚 下一步

环境设置完成后，你可以：

1. **阅读文档**:
   - [README.md](../README.md) - 项目概述
   - [docs/TESTING-GUIDE.md](TESTING-GUIDE.md) - 测试指南
   - [CLAUDE.md](../CLAUDE.md) - 开发规范

2. **开始开发**:
   - 运行 `npm run dev` 启动开发服务器
   - 查看 [PROJECT-STATUS.md](../PROJECT-STATUS.md) 了解开发进度
   - 查看 [ROADMAP.md](../ROADMAP.md) 了解任务清单

3. **获取帮助**:
   - 提交 Issue: https://github.com/iswangheng/AI-DramaCut/issues
   - 查看文档: [docs/](.)

---

**最后更新**: 2026-02-08
