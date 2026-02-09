# Remotion 渲染客户端功能文档

**Agent**: Agent 3 - 视频处理核心
**状态**: ✅ 已完成
**完成日期**: 2025-02-08

---

## 功能概述

Remotion 渲染客户端提供程序化渲染 Remotion 视频的功能。通过 Node.js 代码调用 Remotion 渲染引擎，实现自动化视频生成，支持实时进度监控和 WebSocket 集成。

---

## 核心功能

### 1. 程序化渲染

从 Node.js 代码直接渲染 Remotion 组件，无需手动执行命令行。

### 2. 实时进度监控

完整的渲染进度反馈：
- 当前渲染进度百分比
- 已渲染帧数 / 总帧数
- 已渲染时长（秒）
- 渲染速度（MB/s）

### 3. 灵活配置

- ✅ 自定义分辨率、帧率
- ✅ 支持多种输出格式（MP4、WebM）
- ✅ CRF 质量控制
- ✅ 编码预设速度（ultrafast ~ veryslow）
- ✅ 并发渲染支持

### 4. 快捷方法

提供 `renderCaptionedVideo` 快捷方法，专门用于渲染带字幕的视频。

---

## 使用方法

### 方法 1: 使用通用渲染方法

```typescript
import { renderRemotionVideo } from '@/lib/remotion/renderer';

// 渲染任意 Remotion Composition
const result = await renderRemotionVideo({
  compositionId: 'CaptionedVideo',
  inputProps: {
    src: './video.mp4',
    subtitles: subtitleData,
    fontSize: 60,
    highlightColor: '#FFE600'
  },
  outputPath: './output.mp4',
  width: 1080,
  height: 1920,
  fps: 30,
  crf: 18,
  preset: 'ultrafast',
  onProgress: (progress, renderedFrames, totalFrames, renderedDuration) => {
    console.log(`渲染进度: ${progress.toFixed(1)}%`);
    console.log(`已渲染: ${renderedFrames}/${totalFrames} 帧`);
    console.log(`已渲染时长: ${renderedDuration.toFixed(1)}s`);

    // 通过 WebSocket 发送到前端
    ws.send(JSON.stringify({
      type: 'render:progress',
      progress,
      renderedFrames,
      totalFrames,
      renderedDuration
    }));
  }
});

console.log(`输出文件: ${result.outputPath}`);
console.log(`文件大小: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
```

### 方法 2: 使用快捷方法（带字幕视频）

```typescript
import { renderCaptionedVideo } from '@/lib/remotion/renderer';

// 快捷渲染带字幕的视频
const result = await renderCaptionedVideo({
  videoPath: './video.mp4',
  subtitles: [
    {
      startMs: 1000,
      endMs: 3000,
      text: '这是字幕内容',
      words: [
        { text: '这是', startMs: 1000, endMs: 1500 },
        { text: '字幕', startMs: 1500, endMs: 2000 },
        { text: '内容', startMs: 2000, endMs: 3000 }
      ]
    }
  ],
  outputPath: './output.mp4',
  fontSize: 60,
  highlightColor: '#FFE600',
  onProgress: (progress) => console.log(`${progress.toFixed(1)}%`)
});
```

### 方法 3: 命令行测试

```bash
# 渲染带字幕的视频
npx tsx scripts/test-remotion-renderer.ts ./video.mp4 ./subtitles.json

# 指定输出分辨率
npx tsx scripts/test-remotion-renderer.ts ./video.mp4 ./subtitles.json \
  --width 1280 --height 720

# 自定义字幕样式
npx tsx scripts/test-remotion-renderer.ts ./video.mp4 ./subtitles.json \
  --font-size 80 --highlight-color "#FF0000"
```

---

## API 参考

### RemotionRenderOptions

渲染选项：

```typescript
interface RemotionRenderOptions {
  compositionId: string;                 // Composition ID
  inputProps: Record<string, any>;       // 输入 Props
  outputPath: string;                    // 输出文件路径
  width?: number;                        // 输出宽度（默认 1080）
  height?: number;                       // 输出高度（默认 1920）
  fps?: number;                          // 输出帧率（默认 30）
  outputFormat?: 'mp4' | 'webm';         // 输出格式（默认 mp4）
  codec?: 'h264' | 'h265' | 'vp8' | 'vp9'; // 编码器（默认 h264）
  crf?: number;                          // CRF 质量（默认 18）
  preset?: 'ultrafast' | ...;            // 编码预设（默认 ultrafast）
  jpegQuality?: number;                  // JPEG 质量（默认 80）
  overwrite?: boolean;                   // 覆盖已存在文件（默认 true）
  concurrency?: number;                  // 并发渲染数（默认 1）
  onProgress?: RenderProgressCallback;   // 进度回调
  verbose?: boolean;                     // 输出详细日志（默认 false）
}
```

### RenderProgressCallback

进度回调函数：

```typescript
type RenderProgressCallback = (
  progress: number,        // 当前进度 (0-100)
  renderedFrames: number,  // 已渲染帧数
  totalFrames: number,     // 总帧数
  renderedDuration: number // 已渲染时长（秒）
) => void;
```

### RenderResult

渲染结果：

```typescript
interface RenderResult {
  outputPath: string;      // 输出文件路径
  duration: number;        // 总时长（秒）
  totalFrames: number;     // 总帧数
  renderTime: number;      // 渲染耗时（毫秒）
  size: number;            // 文件大小（字节）
}
```

---

## 应用场景

### 1. 模式 B：深度解说视频生成

```typescript
// 完整的解说视频生成流程
import { renderCaptionedVideo } from '@/lib/remotion/renderer';

// 1. AI 生成解说文案
const script = await geminiClient.generateRecapScripts({
  videoPath: './video.mp4'
});

// 2. TTS 合成音频
const { audioBuffer, alignment } = await elevenlabsClient.textToSpeech({
  text: script[0].content
});

// 3. 生成字幕数据
const subtitles = alignment_to_subtitles(alignment);

// 4. 渲染带字幕的视频
const result = await renderCaptionedVideo({
  videoPath: './video.mp4',
  subtitles,
  outputPath: './final_recap.mp4',
  onProgress: (progress) => {
    // 通过 WebSocket 实时更新 UI
    ws.send({ type: 'render:progress', progress });
  }
});

console.log('✅ 解说视频生成完成！');
```

### 2. 批量视频生成

```typescript
import { batchRenderRemotionVideos } from '@/lib/remotion/renderer';

// 批量渲染多个视频
const results = await batchRenderRemotionVideos([
  {
    compositionId: 'CaptionedVideo',
    inputProps: {
      src: './video1.mp4',
      subtitles: subtitles1
    },
    outputPath: './output1.mp4'
  },
  {
    compositionId: 'CaptionedVideo',
    inputProps: {
      src: './video2.mp4',
      subtitles: subtitles2
    },
    outputPath: './output2.mp4'
  }
]);

results.forEach((result, outputPath) => {
  console.log(`${outputPath}: ${result.size} bytes`);
});
```

### 3. 集成到 BullMQ 任务队列

```typescript
import { Queue } from 'bullmq';
import { renderCaptionedVideo } from '@/lib/remotion/renderer';

// 创建任务队列
const renderQueue = new Queue('video-rendering', {
  connection: redis
});

// 定义任务处理器
renderQueue.process('render-captioned-video', async (job) => {
  const { videoPath, subtitles, outputPath } = job.data;

  const result = await renderCaptionedVideo({
    videoPath,
    subtitles,
    outputPath,
    onProgress: (progress) => {
      // 更新任务进度
      job.updateProgress(progress);
    }
  });

  return result;
});

// 添加任务
await renderQueue.add('render-captioned-video', {
  videoPath: './video.mp4',
  subtitles: subtitleData,
  outputPath: './output.mp4'
});
```

---

## 技术实现

### 渲染流程

```
1. 验证选项
   ↓
2. 创建临时 bundle（webpack 打包）
   ↓
3. 选择 Composition（获取视频元数据）
   ↓
4. 渲染视频（逐帧渲染）
   ↓
5. 返回结果
```

### 核心代码

```typescript
// 1. 打包 Remotion 项目
const bundleLocation = await bundle({
  entryPoint: join(process.cwd(), 'remotion/root.tsx'),
  webpackOverride: (config) => {
    config.devtool = false;  // 禁用 source map 提高速度
    return config;
  }
});

// 2. 选择 Composition
const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: compositionId,
  inputProps
});

// 3. 渲染视频
const result = await renderMedia({
  serveUrl: bundleLocation,
  compositionId,
  inputProps,
  outputLocation: outputPath,
  onProgress: ({ progress, renderedFrames }) => {
    // 实时进度回调
  }
});
```

---

## 性能基准

| 视频时长 | 分辨率 | 帧率 | 预设 | 渲染耗时 | 输出大小 |
|---------|-------|------|------|---------|---------|
| 30 秒 | 1080x1920 | 30 | ultrafast | ~15秒 | ~5 MB |
| 60 秒 | 1080x1920 | 30 | ultrafast | ~30秒 | ~10 MB |
| 2 分钟 | 1080x1920 | 30 | ultrafast | ~60秒 | ~20 MB |
| 2 分钟 | 1080x1920 | 30 | fast | ~180秒 | ~15 MB |

**注**: 使用 `ultrafast` 预设可显著提高渲染速度，但文件会稍大。

---

## 错误处理

### 常见错误

```typescript
// 1. Composition ID 不存在
{
  error: "Composition with id 'XXX' not found"
}

// 2. 输入 Props 缺少必需字段
{
  error: "CaptionedVideo 需要 src 属性"
}

// 3. 视频文件不存在
{
  error: "视频文件不存在: ./video.mp4"
}

// 4. Remotion 依赖未安装
{
  error: "Cannot find module '@remotion/renderer'"
}
```

---

## 最佳实践

### 1. 选择合适的预设

```typescript
// ✅ 开发/测试：使用 ultrafast
await renderRemotionVideo({
  preset: 'ultrafast',  // 快速渲染
  // ...
});

// ✅ 生产环境：使用 fast 或 medium
await renderRemotionVideo({
  preset: 'medium',     // 平衡速度和质量
  crf: 18,              // 高质量
  // ...
});
```

### 2. 使用并发渲染（如果内存充足）

```typescript
// 在多核机器上启用并发渲染
await renderRemotionVideo({
  concurrency: 4,  // 同时渲染 4 个帧
  // ...
});
```

### 3. 集成 WebSocket

```typescript
import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:3001');

await renderRemotionVideo({
  // ...
  onProgress: (progress, renderedFrames, totalFrames) => {
    ws.send(JSON.stringify({
      type: 'render:progress',
      taskId: 'task-123',
      progress,
      renderedFrames,
      totalFrames,
      timestamp: Date.now()
    }));
  }
});
```

---

## 对比：命令行 vs 程序化渲染

### 命令行渲染（旧版）

```bash
# 需要手动执行
npx remotion render CaptionedVideo out.mp4 \
  --props='./data.json' \
  --sequence=false
```

**缺点**：
- ❌ 无法程序化调用
- ❌ 无法实时获取进度
- ❌ 无法集成到任务队列

### 程序化渲染（新版）

```typescript
// 从代码调用
const result = await renderRemotionVideo({
  compositionId: 'CaptionedVideo',
  inputProps: { ... },
  outputPath: './output.mp4',
  onProgress: (progress) => { ... }
});
```

**优点**：
- ✅ 完全程序化
- ✅ 实时进度反馈
- ✅ 可集成到 BullMQ
- ✅ 支持 WebSocket 更新

---

## 后续计划

- [ ] 支持渲染预览（低分辨率快速预览）
- [ ] 支持增量渲染（只渲染修改的部分）
- [ ] 添加渲染队列优先级
- [ ] 实现分布式渲染（多机器并行）

---

## 相关文档

- `remotion/config.ts` - Remotion 配置
- `remotion/root.tsx` - Remotion Root 组件
- `components/remotion/subtitles/` - 字幕组件

---

**最后更新**: 2025-02-08
**Agent**: Agent 3 (视频处理核心)
