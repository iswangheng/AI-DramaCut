# 技术方案：毫秒级精度与并发处理

## 1. 毫秒级处理
- **FFmpeg 策略**：不使用 `-vcodec copy`（因为 copy 只能跳转到 I 帧，不准）。必须使用 `-c:v libx264 -preset ultrafast` 进行重编码裁剪，以实现毫秒级准确。
- **指令示例**：`ffmpeg -ss 00:01:23.456 -i raw.mp4 -t 90 -c:v libx264 output.mp4`

## 2. 任务队列
- 由于 Gemini 处理视频和 FFmpeg 渲染非常耗时，必须使用 **BullMQ** 或类似的本地任务队列。
- UI 端通过 **WebSocket** 实时监听预处理和渲染进度。

## 3. 素材向量化
- 使用 Gemini 生成的标签作为向量。当模式 B 需要匹配画面时，计算文案与切片标签的 **Cosine Similarity**，自动选出相关度最高的片段。