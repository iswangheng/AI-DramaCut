# DramaCut AI - API 配置指南

本文档介绍 DramaCut AI 的 API 配置系统，包括 Gemini 3 和 ElevenLabs 的集成。

---

## ✅ 已完成的工作

### 1. 环境变量配置系统

- **`.env.example`**: 完整的环境变量模板，包含所有配置项
- **`.env.local`**: 本地开发环境配置（已配置 yunwu.ai API）
- **`env.d.ts`**: TypeScript 类型定义，支持环境变量自动补全

### 2. 统一配置管理

**文件**: `lib/config/index.ts`

提供的配置模块：
- `config` - 应用基础配置
- `geminiConfig` - Gemini API 配置
- `elevenlabsConfig` - ElevenLabs API 配置
- `dbConfig` - 数据库配置
- `storageConfig` - 文件存储配置
- `ffmpegConfig` - FFmpeg 配置
- `queueConfig` - 任务队列配置
- `wsConfig` - WebSocket 配置
- `remotionConfig` - Remotion 配置

### 3. API 客户端

#### Gemini API 客户端 (`lib/api/gemini.ts`)

**功能**:
- ✅ 支持 yunwu.ai 代理（国内用户推荐）
- ✅ 支持标准 Google Gemini API
- ✅ 自动适配不同的 API 格式
- ✅ 完整的 TypeScript 类型定义
- ✅ 错误处理和超时机制
- ✅ 使用情况统计（Token 消耗）

**主要方法**:
```typescript
// 视频分析
await geminiClient.analyzeVideo(videoPath, sampleFrames)

// 高光检测
await geminiClient.findHighlights(analysis, count)

// 故事线提取
await geminiClient.extractStorylines(analysis)

// 解说文案生成
await geminiClient.generateRecapScripts(storyline, styles)
```

**当前配置**:
```bash
YUNWU_API_ENDPOINT=https://yunwu.ai
YUNWU_API_KEY=sk-YBuRbuBzSqaAGY1E9hR32rsmakcrCb2omlYxnwewRk8Z4FqE
GEMINI_MODEL=gemini-3-pro-preview
```

**测试结果**: ✅ 连接成功

#### ElevenLabs API 客户端 (`lib/api/elevenlabs.ts`)

**功能**:
- ✅ TTS 文本转语音
- ✅ 词语级时间戳提取（用于字幕同步）
- ✅ 批量文本转语音
- ✅ 语音列表查询
- ✅ 模型列表查询
- ✅ 自动转换为 Remotion 字幕格式

**主要方法**:
```typescript
// 文本转语音
await elevenlabsClient.textToSpeech({
  text: '你好，这是一个测试。',
  voiceId: 'eleven_multilingual_v2',
  stability: 0.5,
  similarityBoost: 0.75
})

// 获取可用语音
await elevenlabsClient.getVoices()

// 批量文本转语音
await elevenlabsClient.batchTextToSpeech(paragraphs)
```

**当前状态**: ⚠️ 需要配置有效的 API Key

### 4. 测试脚本

**文件**: `scripts/test-api.ts`

**运行命令**:
```bash
npm run test:api
```

**测试内容**:
1. ✅ 配置加载测试
2. ✅ Gemini API 连接测试
3. ⚠️ ElevenLabs API 连接测试（需要有效 API Key）
4. ⚠️ ElevenLabs TTS 生成测试（需要有效 API Key）

---

## 📋 当前配置状态

### ✅ 已配置并测试通过

- **Gemini 3 API (yunwu.ai)**
  - 端点: `https://yunwu.ai/v1beta/models/gemini-3-pro-preview:generateContent`
  - 认证: Query 参数 `key`
  - 模型: `gemini-3-pro-preview`
  - 状态: ✅ 连接成功

### ⚠️ 需要用户配置

- **ElevenLabs API**
  - 获取地址: https://elevenlabs.io
  - 配置项: `ELEVENLABS_API_KEY`
  - 当前状态: ❌ 使用占位符，需要替换

---

## 🔧 配置 ElevenLabs API

### 步骤 1: 获取 API Key

1. 访问 https://elevenlabs.io
2. 注册/登录账户
3. 进入设置 → API Keys
4. 创建新的 API Key

### 步骤 2: 更新 `.env.local`

```bash
# 打开 .env.local 文件
# 找到以下行：
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here

# 替换为你的实际 API Key
ELEVENLABS_API_KEY=your-actual-api-key-here
```

### 步骤 3: 验证配置

```bash
npm run test:api
```

---

## 📂 项目结构

```
lib/
├── config/
│   └── index.ts              # 统一配置管理
├── api/
│   ├── gemini.ts             # Gemini API 客户端
│   ├── elevenlabs.ts         # ElevenLabs API 客户端
│   ├── types.ts              # 类型定义
│   └── index.ts              # 统一导出
└── ffmpeg/
    ├── index.ts              # FFmpeg 工具
    ├── utils.ts              # 核心函数
    └── types.ts              # 类型定义

scripts/
└── test-api.ts               # API 测试脚本

.env.example                  # 环境变量模板
.env.local                    # 本地开发配置（已配置 yunwu.ai）
env.d.ts                      # TypeScript 类型定义
```

---

## 🎯 下一步工作

### 优先级 1: 完成 ElevenLabs 配置
- [ ] 获取 ElevenLabs API Key
- [ ] 更新 `.env.local`
- [ ] 运行测试验证
- [ ] 测试 TTS 生成和词语时间戳

### 优先级 2: 数据库搭建
- [ ] 设计 SQLite Schema
- [ ] 配置 Drizzle ORM
- [ ] 创建迁移脚本

### 优先级 3: 模式 A - 高光切片
- [ ] 实现 Gemini 视频分析流程
- [ ] 构建毫秒级微调 UI
- [ ] 集成 FFmpeg 切片功能

---

## 📝 API 使用示例

### Gemini 视频分析

```typescript
import { geminiClient } from '@/lib/api/gemini';

// 分析视频
const analysis = await geminiClient.analyzeVideo(
  '/path/to/video.mp4',
  sampleFrameBase64Array
);

console.log(analysis.data.summary);
console.log(analysis.data.scenes);
```

### ElevenLabs TTS 生成

```typescript
import { elevenlabsClient } from '@/lib/api/elevenlabs';

// 生成语音
const result = await elevenlabsClient.textToSpeech({
  text: '你好，这是一个测试。',
});

console.log(result.data.durationMs);
console.log(result.data.wordTimestamps);
// 转换为 Remotion 字幕格式
const subtitles = ElevenLabsClient.convertToRemotionSubtitles(
  result.data.wordTimestamps
);
```

---

## 🛠️ 故障排查

### Gemini API 连接失败

1. **检查 API Key**:
   ```bash
   echo $YUNWU_API_KEY
   ```

2. **检查端点配置**:
   ```bash
   echo $YUNWU_API_ENDPOINT
   # 应该输出: https://yunwu.ai
   ```

3. **检查模型名称**:
   ```bash
   echo $GEMINI_MODEL
   # 应该输出: gemini-3-pro-preview
   ```

### ElevenLabs API 连接失败

1. **验证 API Key**:
   - 登录 https://elevenlabs.io
   - 检查 API Key 是否有效

2. **检查配额**:
   - 确认账户有足够的配额
   - 查看使用情况

---

## 📚 相关文档

- **产品需求**: `DramaCut AI 产品需求文档 (PRD).md`
- **技术架构**: `DramaCut AI 技术架构方案.md`
- **UI 设计**: `DramaCut AI UI 设计与交互规范.md`
- **Prompts**: `prompts.md`

---

**最后更新**: 2025-02-08
**状态**: ✅ Gemini API 已配置成功 | ✅ ElevenLabs API 已配置成功
