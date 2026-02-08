# DramaGen AI 技术架构方案

## 1. 系统架构
- **Frontend**: Next.js 15 (App Router) + Tailwind CSS + Framer Motion (动画)。
- **Backend API**: Next.js API Routes (Edge Runtime 用于流式交互)。
- **Processing**: 
  - **Node-fluent-ffmpeg**: 执行毫秒级无损切片。
  - **SQLite + Drizzle**: 存储所有素材标签、时间戳及剧情线索引。

## 2. 关键算法实现
### 2.1 毫秒级视频处理
- **痛点**: 普通 FFmpeg 切割会导致开头黑屏或不准。
- **解法**: 必须采用先跳转再解码的策略：`ffmpeg -ss [ms] -i input.mp4 -t [duration] -c:v libx264 -crf 18 -preset fast -y output.mp4`。
- **帧率对齐**: 预处理时强制将所有素材统一为 30fps，确保毫秒计算与帧号绝对匹配。

### 2.2 视频理解管线 (Video Pipeline)
- **采样策略**: 长视频不全量上传，采取“关键帧采样 + 低分辨率代理”策略，降低 Gemini Token 消耗。
- **语义搜索**: 利用 `pgvector` 或简单的本地向量计算，将 ElevenLabs 文案与素材标签进行 Cosine Similarity 匹配，自动选取最相关的切片。

### 2.3 渲染引擎 (Remotion)
- **组件化字幕**: 封装 `ViralSubtitle` 组件，通过 `spring` 动画实现逐字跳动和变色。
- **混合音轨**: 
  - Track 1: ElevenLabs 配音 (Volume 1.0)。
  - Track 2: 原始环境音 (Volume 0.15)。
  - Track 3: 情绪 BGM (Volume 0.3)。

## 3. 并发与任务调度
- 使用 **BullMQ** 管理高负载的渲染任务，防止 Node.js 进程卡死。
- 支持并发调用 Gemini 接口以加快预处理速度。