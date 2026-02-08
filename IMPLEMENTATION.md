# DramaGen AI - 开发进度

## ✅ 已完成

### 1. 基础架构搭建
- ✅ Next.js 15 项目初始化（TypeScript + Tailwind + App Router）
- ✅ 项目目录结构创建
- ✅ 核心依赖安装（Remotion、Framer Motion、Zod）

### 2. Remotion 字幕组件集成
从 `remotion-ai-subtitle-generation` 项目适配并集成了完整的字幕系统：

#### 组件列表
- ✅ **Word.tsx** - 单词级字幕组件，支持弹跳动画
- ✅ **KaraokeSentence.tsx** - 卡拉OK风格字幕，支持单词高亮
- ✅ **CaptionedVideo.tsx** - 主视频组件，集成视频、字幕、水印

#### 核心特性
- ✅ 抖音爆款风格字幕（亮黄色 #FFE600 + 黑边）
- ✅ 单词级别的时间戳支持
- ✅ 弹性动画效果（Spring 动画）
- ✅ 自动加载字幕文件（.json 格式）
- ✅ 音量控制支持
- ✅ 水印叠加支持
- ✅ 自定义样式系统

### 3. FFmpeg 工具封装
创建了完整的视频处理工具库（`lib/ffmpeg/`）：

#### 核心功能
- ✅ **trimVideo()** - 毫秒级精度视频裁剪
  - 使用重编码实现帧级精确切割
  - 支持 CRF 质量控制
  - 支持编码预设（preset）

- ✅ **extractAudio()** - 音频提取
  - 提取为 WAV 格式
  - 支持 16kHz 采样率（用于 Whisper）

- ✅ **mixAudio()** - 音频混合
  - 混合视频原音和外部音频
  - 独立控制两个音轨的音量

- ✅ **adjustVolume()** - 音量调整
  - 精确控制视频音量

- ✅ **normalizeFrameRate()** - 帧率对齐
  - 统一转换为 30fps
  - 确保毫秒计算与帧号匹配

#### 类型定义
- ✅ 完整的 TypeScript 类型定义
- ✅ 所有函数的参数类型和返回值类型

### 4. Remotion 配置系统
- ✅ Remotion 配置文件（`remotion/config.ts`）
- ✅ Root 组件定义（`remotion/root.tsx`）
- ✅ Composition 配置
- ✅ 示例字幕数据文件

---

## 📂 项目结构

```
001-AI-DramaCut/
├── app/                      # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── remotion/
│       ├── subtitles/        # 字幕组件
│       │   ├── CaptionedVideo.tsx
│       │   ├── KaraokeSentence.tsx
│       │   ├── Word.tsx
│       │   ├── types.ts
│       │   └── index.ts
│       └── utils/
│           └── load-font.ts  # 字体加载工具
├── lib/
│   └── ffmpeg/               # FFmpeg 工具库
│       ├── index.ts
│       ├── utils.ts
│       └── types.ts
├── remotion/                 # Remotion 配置
│   ├── config.ts
│   ├── root.tsx
│   └── index.ts
├── public/                   # 静态资源
│   ├── example-subtitle.json
│   └── subtitle-props.json
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

---

## 🚀 如何使用

### 开发命令

```bash
# 启动 Next.js 开发服务器
npm run dev

# 启动 Remotion Studio（预览 Remotion 组件）
npm run remotion:preview

# 渲染视频
npm run remotion:render

# 渲染字幕视频（使用 props 文件）
npm run remotion:render:subtitle
```

### 字幕组件使用示例

```tsx
import { CaptionedVideo } from "@/components/remotion/subtitles";

<CaptionedVideo
  src="/path/to/video.mp4"
  subtitles={subtitlesData}
  fontSize={60}
  fontColor="white"
  highlightColor="#FFE600"  // 抖音爆款黄色
  outlineColor="black"
  outlineSize={5}
  subtitleY={80}
  originalVolume={1}
/>
```

### FFmpeg 工具使用示例

```typescript
import { trimVideo, extractAudio, mixAudio } from "@/lib/ffmpeg";

// 毫秒级视频裁剪
trimVideo({
  inputPath: "input.mp4",
  outputPath: "output.mp4",
  startTimeMs: 5000,  // 从第 5 秒开始
  durationMs: 30000,  // 持续 30 秒
  crf: 18,
  preset: "fast"
});

// 音频混合
mixAudio({
  videoPath: "video.mp4",
  audioPath: "voiceover.mp3",
  outputPath: "final.mp4",
  videoVolume: 0.15,  // 原音 15%
  audioVolume: 1.0    // 解说 100%
});
```

### 字幕数据格式

```json
[
  {
    "startMs": 1000,
    "endMs": 3000,
    "text": "这是字幕内容",
    "words": [
      { "text": "这是", "startMs": 1000, "endMs": 1500 },
      { "text": "字幕", "startMs": 1500, "endMs": 2000 },
      { "text": "内容", "startMs": 2000, "endMs": 3000 }
    ]
  }
]
```

---

## 🎯 下一步计划

### 阶段 2：模式 A - 高光智能切片
- [ ] 集成 Gemini 3 视频分析 API
- [ ] 实现病毒式桥段检测
- [ ] 构建毫秒级微调 UI
- [ ] 实现实时预览功能

### 阶段 3：模式 B - 深度解说矩阵
- [ ] 集成 ElevenLabs TTS
- [ ] 实现故事线提取
- [ ] 构建语义搜索系统
- [ ] 实现自动音画匹配

### 阶段 4：任务队列与性能
- [ ] 集成 BullMQ 任务队列
- [ ] 实现 WebSocket 进度更新
- [ ] 优化渲染性能

---

## 📚 参考资源

- **Remotion 官方文档**: https://www.remotion.dev/
- **remotion-ai-subtitle-generation**: https://github.com/jackleolxy-whales/remotion-ai-subtitle-generation
- **CLAUDE.md**: 项目详细架构说明
