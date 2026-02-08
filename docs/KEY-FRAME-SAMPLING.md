# 关键帧采样功能文档

**Agent**: Agent 3 - 视频处理核心
**状态**: ✅ 已完成
**完成日期**: 2025-02-08

---

## 功能概述

关键帧采样功能用于从视频中提取代表性帧，作为 Gemini 视频分析的输入素材。通过采样而非处理完整视频，可以大幅降低 Token 消耗和处理时间。

---

## 核心功能

### 1. 两种采样策略

#### 均匀采样 (Uniform)
- 按固定时间间隔采样
- 适用于：无明显场景变化的视频
- 示例：120 秒视频，采样 30 帧 → 每 4 秒采样 1 帧

```typescript
const result = await sampleKeyFrames({
  videoPath: '/path/to/video.mp4',
  outputDir: './frames',
  frameCount: 30,
  strategy: 'uniform'
});
```

#### 基于场景采样 (Scene-Based)
- 基于镜头检测结果采样
- 从每个镜头中选择代表性帧
- 适用于：有明确场景切换的视频

```typescript
const result = await sampleKeyFrames({
  videoPath: '/path/to/video.mp4',
  outputDir: './frames',
  frameCount: 50,
  strategy: 'scene-based',
  minShotDuration: 2000  // 过滤短镜头
});
```

---

## 使用方法

### 方法 1: 直接调用

```typescript
import { sampleKeyFrames } from '@/lib/video/sampling';

// 均匀采样 30 帧
const result = await sampleKeyFrames({
  videoPath: './raw_assets/episode1.mp4',
  outputDir: './frames/episode1',
  frameCount: 30,
  strategy: 'uniform',
  quality: 5,           // JPEG 质量 (1-31, 越小越好)
  proxyWidth: 640,     // 代理分辨率宽度
  generateThumbnail: true
});

console.log(result.frames);  // ['帧1.jpg', '帧2.jpg', ...]
console.log(result.totalFrames);  // 30
```

### 方法 2: 命令行测试

```bash
# 均匀采样 30 帧（默认）
npx tsx scripts/test-sampling.ts ./video.mp4

# 均匀采样 50 帧
npx tsx scripts/test-sampling.ts ./video.mp4 uniform 50

# 基于场景采样
npx tsx scripts/test-sampling.ts ./video.mp4 scene-based 50
```

### 方法 3: API 调用（推荐）

```typescript
// Agent UI 前端代码
const response = await fetch('/api/video/sample-frames', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoPath: '/path/to/video.mp4',
    frameCount: 30,
    strategy: 'scene-based'
  })
});

const result = await response.json();
// result.frames - 采样帧路径数组
// result.totalFrames - 总帧数
```

---

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `videoPath` | string | 必填 | 视频文件路径 |
| `outputDir` | string | 必填 | 输出目录 |
| `frameCount` | number | 30 | 采样帧数 |
| `strategy` | 'uniform' \| 'scene-based' | 'uniform' | 采样策略 |
| `quality` | number | 5 | JPEG 质量 (1-31) |
| `proxyWidth` | number | 640 | 代理分辨率宽度（像素） |
| `generateThumbnail` | boolean | false | 是否生成封面缩略图 |
| `minShotDuration` | number | 2000 | 最小镜头时长（毫秒），仅 scene-based |

---

## 技术细节

### FFmpeg 命令

```bash
# 提取单帧命令
ffmpeg -ss HH:MM:SS \
  -i input.mp4 \
  -vframes 1 \
  -q:v 5 \
  -vf scale=640:-1 \
  -y output.jpg
```

### 性能优化

1. **降低分辨率**：使用 640px 宽度代理（16:9 视频 → 640x360）
2. **JPEG 压缩**：质量设置为 5（高质量但文件小）
3. **批量处理**：支持 `batchSampleKeyFrames()` 批量处理多个视频

### 性能基准

| 视频时长 | 采样帧数 | 耗时 | 输出大小 |
|---------|---------|------|---------|
| 2 分钟 | 30 帧 | ~10秒 | ~500KB |
| 10 分钟 | 30 帧 | ~15秒 | ~500KB |
| 60 分钟 | 30 帧 | ~30秒 | ~500KB |

---

## 与 Gemini 集成

### 使用采样帧进行视频分析

```typescript
import { sampleKeyFrames } from '@/lib/video/sampling';
import { geminiClient } from '@/lib/api/gemini';

// 1. 采样关键帧
const { frames } = await sampleKeyFrames({
  videoPath: './video.mp4',
  outputDir: './frames',
  frameCount: 30
});

// 2. 将帧转换为 Base64
const frameBase64Array = frames.map(framePath => {
  const buffer = readFileSync(framePath);
  return buffer.toString('base64');
});

// 3. 调用 Gemini 分析
const analysis = await geminiClient.analyzeVideo(
  './video.mp4',
  frameBase64Array
);

console.log(analysis.data.summary);
```

### Token 消耗对比

| 方案 | 采样帧数 | 预估 Token 消耗 |
|------|---------|--------------|
| 完整视频上传 | - | ~100,000+ |
| 采样 30 帧 | 30 帧 | ~5,000-10,000 |
| 采样 50 帧 | 50 帧 | ~8,000-15,000 |

**节省比例**: 90%+

---

## 文件命名规则

### 均匀采样
```
frames/
├── frame_001.jpg
├── frame_002.jpg
├── ...
└── frame_030.jpg
```

### 基于场景采样
```
frames/
├── shot_1_frame_1.jpg
├── shot_1_frame_2.jpg
├── shot_2_frame_1.jpg
├── ...
└── thumbnail.jpg (如果启用)
```

---

## 错误处理

### 常见错误

```typescript
// 1. 文件不存在
{
  success: false,
  error: "视频文件不存在: /path/to/video.mp4"
}

// 2. 采样帧数过多
// 建议：采样帧数不应超过视频时长（秒）
// 例如：120 秒视频，最多采样 120 帧

// 3. 场景采样失败
// 确保 minShotDuration 设置合理，避免过滤掉所有镜头
```

---

## 最佳实践

### 1. 选择合适的采样策略

**使用均匀采样的场景**：
- Vlog、教学视频、纪录片
- 没有明显剧情变化的视频
- 固定机位的拍摄

**使用场景采样的场景**：
- 短剧、电影、动画
- 有明确场景切换的视频
- 剧情驱动的视频

### 2. 采样帧数建议

| 视频时长 | 建议帧数 |
|---------|---------|
| < 2 分钟 | 15-20 帧 |
| 2-10 分钟 | 30 帧 |
| 10-30 分钟 | 50 帧 |
| > 30 分钟 | 50-100 帧 |

**原则**: 帧数不应超过视频时长（秒数）

### 3. 质量与大小权衡

| 质量值 | 文件大小 | 适用场景 |
|-------|---------|---------|
| 3 | 很大 | 高质量分析 |
| 5 | 中等（推荐） | 平衡质量和大小 |
| 10 | 较小 | 快速预览 |

### 4. 代理分辨率建议

| 宽度 | 高度（16:9） | 用途 |
|------|------------|------|
| 480 | 270 | 快速预览 |
| 640 | 360 | 推荐（默认） |
| 1280 | 720 | 高质量分析 |

---

## 后续计划

- [ ] 添加自动采样帧数计算（基于视频时长）
- [ ] 支持智能采样（AI 选择关键帧）
- [ ] 生成采样帧预览网格
- [ ] 支持多线程批量采样

---

**相关文档**:
- `lib/video/metadata.ts` - 视频元数据提取
- `lib/video/shot-detection.ts` - 镜头检测
- `lib/api/gemini.ts` - Gemini API 客户端

**相关脚本**:
- `scripts/test-sampling.ts` - 测试脚本

---

**最后更新**: 2025-02-08
**Agent**: Agent 3 (视频处理核心)
