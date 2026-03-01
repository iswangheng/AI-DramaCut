# 依赖和环境配置指南

本文档详细说明项目所需的所有依赖项和环境配置步骤。

## 📋 目录

- [系统要求](#系统要求)
- [Node.js 依赖](#nodejs-依赖)
- [Python 依赖](#python-依赖)
- [外部工具](#外部工具)
- [API 服务配置](#api-服务配置)
- [验证安装](#验证安装)

---

## 系统要求

### 最低要求
- **操作系统**: macOS 11+ / Linux / Windows 10+
- **Node.js**: 18.x 或更高
- **Python**: 3.9 或更高（推荐 3.10+）
- **内存**: 至少 8GB RAM（推荐 16GB）
- **磁盘空间**: 至少 10GB 可用空间

### 推荐配置（用于训练）
- **M1/M2/M3 Mac** 或支持 CUDA 的 GPU
- **内存**: 16GB 或更多
- **磁盘空间**: 50GB+（用于临时文件和模型）

---

## Node.js 依赖

### 安装 Node.js 依赖

```bash
# 安装所有依赖
npm install

# 或者使用 pnpm
pnpm install
```

### 主要依赖包

| 包名 | 版本 | 用途 |
|------|------|------|
| `next` | 15.x | React 框架 |
| `react` | 19.x | React 库 |
| `drizzle-orm` | 0.45.x | ORM 数据库操作 |
| `better-sqlite3` | 12.x | SQLite 数据库 |
| `bullmq` | 5.x | 任务队列 |
| `ioredis` | 5.x | Redis 客户端 |
| `remotion` | 4.x | 视频渲染引擎 |
| `ffmpeg-static` | - | FFmpeg 二进制文件 |
| `@google/generative-ai` | - | Gemini AI SDK |
| `openai` | 4.x | OpenAI SDK（用于 ElevenLabs） |

---

## Python 依赖

### 安装 Python 依赖

```bash
# 安装 OpenAI Whisper（用于语音转文字）
python3 -m pip install openai-whisper
```

### 主要 Python 包

| 包名 | 版本 | 用途 | 大小 |
|------|------|------|------|
| `openai-whisper` | 20250625 | 语音转文字 | ~803 KB |
| `torch` | 2.10.0 | 深度学习框架 | ~79 MB |
| `numba` | 0.64.0 | JIT 编译器 | ~2.7 MB |
| `llvmlite` | 0.46.0 | LLVM 绑定 | ~37 MB |
| `numpy` | - | 数值计算 | 已包含 |
| `tiktoken` | - | Token 工具 | 已包含 |

**总计**: 约 **150 MB**（不含模型文件）

### Whisper 模型

首次运行时，Whisper 会自动下载模型文件到：
```
~/.cache/whisper/  # macOS/Linux
%USERPROFILE%\.cache\whisper\  # Windows
```

| 模型 | 大小 | 用途 | 下载时间 |
|------|------|------|----------|
| `base` | **~150 MB** | **训练模式（推荐）** | ~1 分钟 |
| `tiny` | ~80 MB | 快速测试 | ~30 秒 |
| `small` | ~500 MB | 高精度 | ~3 分钟 |
| `medium` | ~1.5 GB | 更高精度 | ~8 分钟 |
| `large` | ~3 GB | 最高精度 | ~15 分钟 |

**本项目使用 `base` 模型**（训练场景，准确度优先）

---

## 外部工具

### FFmpeg

**必需**: 视频处理核心工具

#### 安装方式

**macOS**:
```bash
brew install ffmpeg
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows**:
1. 下载：https://ffmpeg.org/download.html
2. 解压到 `C:\ffmpeg`
3. 添加到系统 PATH：`C:\ffmpeg\bin`

#### 验证安装
```bash
ffmpeg -version
```

### Redis（可选）

**用途**: BullMQ 任务队列

#### 安装方式

**macOS**:
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian**:
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**Windows**:
使用 WSL 或 Docker

#### 验证安装
```bash
redis-cli ping
# 应返回: PONG
```

---

## API 服务配置

### Yunwu.ai（Gemini 3 API 代理）

**用途**: Google Gemini 3 视频分析（国内用户）

#### 配置步骤

1. **获取 API Key**:
   - 访问: https://yunwu.ai
   - 注册并获取 API Key

2. **配置环境变量**:
   ```bash
   # .env.local
   YUNWU_API_ENDPOINT=https://yunwu.ai
   YUNWU_API_KEY=sk-YBuRbuBzSqaAGY1E9hR32rsmakcrCb2omlYxnwewRk8Z4FqE
   GEMINI_MODEL=gemini-3-pro-preview
   ```

3. **验证配置**:
   ```bash
   npm run test:api
   ```

### ElevenLabs API（可选）

**用途**: 文本转语音（TTS）

#### 配置步骤

1. **获取 API Key**:
   - 访问: https://elevenlabs.io
   - 注册并获取 API Key

2. **配置环境变量**:
   ```bash
   # .env.local
   ELEVENLABS_API_KEY=your_api_key_here
   ELEVENLABS_VOICE_ID=your_voice_id
   ```

---

## 验证安装

### 1. 检查 Node.js 环境

```bash
node --version  # 应显示 v18.x 或更高
npm --version
```

### 2. 检查 Python 环境

```bash
python3 --version  # 应显示 3.9 或更高

# 测试 Whisper
python3 -c "import whisper; print('✅ Whisper 可用')"
```

### 3. 检查 FFmpeg

```bash
ffmpeg -version
```

### 4. 检查 Redis（可选）

```bash
redis-cli ping  # 应返回 PONG
```

### 5. 测试 API 配置

```bash
npm run test:api
```

### 6. 构建项目

```bash
npm run build
```

---

## 常见问题

### 问题 1: Whisper 模块未找到

**错误**: `ModuleNotFoundError: No module named 'whisper'`

**解决方案**:
```bash
python3 -m pip install openai-whisper
```

### 问题 2: FFmpeg 未找到

**错误**: `ffmpeg: command not found`

**解决方案**:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

### 问题 3: Redis 连接失败

**错误**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**解决方案**:
```bash
# macOS
brew services start redis

# Ubuntu/Debian
sudo systemctl start redis
```

### 问题 4: Node.js 版本过低

**错误**: `Node.js version too old`

**解决方案**:
```bash
# 使用 nvm 升级
nvm install 18
nvm use 18
```

### 问题 5: Python 版本过低

**错误**: `Python version too old`

**解决方案**:
```bash
# macOS
brew install python@3.10

# Ubuntu/Debian
sudo apt install python3.10
```

---

## 开发环境启动

### 完整启动流程

```bash
# 1. 检查端口占用
lsof -ti:3000,3001,6379 | xargs kill -9 2>/dev/null

# 2. 清理 Next.js 缓存
rm -rf .next

# 3. 确保服务运行
redis-cli ping || brew services start redis

# 4. 启动开发服务器
npm run dev
```

### 一键启动脚本

创建快捷命令（添加到 `~/.zshrc` 或 `~/.bashrc`）:

```bash
alias restart-dev='lsof -ti:3000,3001,6379 | xargs kill -9 2>/dev/null; rm -rf .next; npm run dev'
alias clean-next='rm -rf .next'
```

使用:
```bash
restart-dev  # 一键重启开发服务器
clean-next   # 一键清理 Next.js 缓存
```

---

## 生产环境部署

详见部署文档: [`DEPLOYMENT.md`](../DEPLOYMENT.md)

---

## 依赖更新

### 更新 Node.js 依赖

```bash
# 检查过期依赖
npm outdated

# 更新所有依赖
npm update

# 更新主要版本（谨慎）
npx npm-check-updates -u
npm install
```

### 更新 Python 依赖

```bash
python3 -m pip install --upgrade openai-whisper
```

---

## 许可和版权

- **OpenAI Whisper**: MIT License
- **FFmpeg**: GPL/LGPL
- **Node.js 依赖**: 各自的许可证

详见: `node_modules/*/LICENSE`

---

## 相关文档

- [`CLAUDE.md`](../CLAUDE.md) - 项目开发指南
- [`DEPLOYMENT.md`](../DEPLOYMENT.md) - 部署指南
- [`docs/API-SETUP.md`](API-SETUP.md) - API 配置指南
- [`docs/ANALYSIS-REVIEW.md`](ANALYSIS-REVIEW.md) - 性能优化报告

---

**最后更新**: 2026-03-01
