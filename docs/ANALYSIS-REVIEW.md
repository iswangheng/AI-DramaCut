# 短剧视频分析方案 - 审查报告

**审查日期**: 2025-02-24
**审查范围**: 完整的视频分析流程（关键帧 + Whisper ASR + Gemini 分析）

---

## 🚨 严重问题（Critical Issues）

### 1. **内存泄漏风险 - 临时文件未清理**

**问题描述**：
```typescript
// lib/queue/workers.ts:243-250
const audioPath = join(process.cwd(), 'uploads', `video_${videoId}_audio.wav`);
await extractAudio({ inputPath: videoPath, outputPath: audioPath, sampleRate: 16000 });
// ... 使用转录结果后 ...
// ❌ 音频文件未删除！
```

**影响**：
- 每个 45 分钟的视频生成的 WAV 文件约 500MB-1GB
- 分析 10 集视频后可能占用 5-10GB 磁盘空间
- 长期运行会导致磁盘空间耗尽

**解决方案**：
```typescript
// 在转录完成后清理临时音频文件
try {
  const transcriptionResult = await transcribeAudio(audioPath, {...});

  // 保存结果到数据库
  await queries.audioTranscription.create({...});

  // ✅ 清理临时文件
  await fs.unlink(audioPath);
  console.log(`  🗑️  已清理临时音频文件: ${audioPath}`);
} catch (error) {
  // 即使出错也尝试清理
  try { await fs.unlink(audioPath); } catch {}
  throw error;
}
```

---

### 2. **关键帧存储空间爆炸**

**问题描述**：
```typescript
// lib/queue/workers.ts:833-838
const keyframesResult = await extractVideoKeyframes({
  videoPath,
  outputDir: join(process.cwd(), 'public', 'keyframes', video.id.toString()),
  intervalSeconds: 3,  // 每 3 秒一帧
  filenamePrefix: `video_${video.id}_keyframe`,
});
```

**计算示例**：
- 45 分钟视频 = 2700 秒
- 每 3 秒 1 帧 = 900 帧
- 每帧 640x360 JPEG (~30KB) = 27MB/视频
- 10 集视频 = 270MB 关键帧
- **关键帧文件永久存储，无清理机制**

**影响**：
- 磁盘空间占用持续增长
- 关键帧用于跨集分析，但分析完成后不再需要
- public/keyframes 目录会变成存储黑洞

**解决方案**：

**方案 A：添加清理机制（推荐）**
```typescript
// lib/db/queries.ts - 添加清理方法
async function cleanupOldKeyframes(daysToKeep: number = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const oldProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(lt(projects.createdAt, cutoffDate));

  for (const project of oldProjects) {
    const keyframesDir = join(process.cwd(), 'public', 'keyframes', project.id.toString());

    // 删除目录
    await fs.rm(keyframesDir, { recursive: true, force: true });

    // 更新数据库
    await db.delete(keyframes).where(eq(keyframes.projectId, project.id));

    console.log(`🗑️  已清理项目 ${project.id} 的关键帧`);
  }
}
```

**方案 B：使用临时目录 + 按需生成**
```typescript
// 关键帧存储在临时目录，分析完成后自动清理
const tempDir = join(os.tmpdir(), `keyframes_${videoId}_${Date.now()}`);
await extractVideoKeyframes({ ..., outputDir: tempDir });

// 分析完成后
await fs.rm(tempDir, { recursive: true, force: true });
```

---

### 3. **并发任务无限制 - 可能导致资源耗尽**

**问题描述**：
```typescript
// lib/queue/workers.ts:724-998
for (let i = 0; i < videos.length; i++) {
  const video = videos[i];

  // 依次处理每个视频
  await extractVideoKeyframes(...);      // 耗时操作
  await transcribeAudio(...);             // 耗时操作
  await geminiClient.analyzeVideo(...);   // 耗时操作 + API 调用
}
```

**问题**：
- 虽然是串行处理，但如果多个项目同时启动分析任务
- BullMQ 默认并发执行多个 Job
- 可能同时运行 10+ 个 Whisper 转录（每个占用 1-2GB 内存）
- 可能同时上传 10+ 个视频到 Gemini（API 配额爆炸）

**影响**：
- 内存溢出（OOM）
- CPU 100% 占用
- API Rate Limit 触发
- 系统崩溃

**解决方案**：

```typescript
// lib/queue/bullmq.ts - 添加 Worker 并发限制
export const queueManager = {
  workers: [] as Worker[],

  async initialize() {
    // ... 现有代码 ...

    // ✅ 限制并发数为 2（最多同时分析 2 个视频）
    const videoProcessingWorker = new Worker(
      'video-processing',
      processors.videoJobProcessor,
      {
        connection: redis,
        concurrency: 2,  // 限制并发
        limiter: {
          max: 10,       // 每分钟最多 10 个任务
          duration: 60000,
        }
      }
    );

    this.workers.push(videoProcessingWorker);
  }
}
```

---

## ⚠️ 重要问题（Major Issues）

### 4. **Whisper 转录失败时的降级策略不完善**

**问题描述**：
```typescript
// lib/queue/workers.ts:892-895
} catch (audioError) {
  console.warn(`  ⚠️  音频转录失败:`, audioError);
  transcriptionText = '';  // ❌ 静默失败，继续执行
}
```

**问题**：
- 转录失败后继续分析，但没有标记"部分失败"状态
- 用户不知道转录失败，分析结果不完整
- 跨集连贯性分析依赖转录文本，失败会导致分析质量下降

**解决方案**：
```typescript
let transcriptionFailed = false;

try {
  const transcriptionResult = await transcribeAudio(audioPath, {...});
  transcriptionText = transcriptionResult.text;
} catch (audioError) {
  console.warn(`  ⚠️  音频转录失败:`, audioError);
  transcriptionText = '';
  transcriptionFailed = true;  // ✅ 标记失败

  // 记录到数据库
  await queries.video.updateError(video.id,
    `音频转录失败: ${audioError.message}\n视频分析将继续，但不包含音频信息`
  );
}

// 传递给 Gemini 时说明情况
let transcriptionHint = '';
if (transcriptionText) {
  transcriptionHint = `【音频转录文本】${transcriptionText}`;
} else if (transcriptionFailed) {
  transcriptionHint = `【注意】音频转录失败，请仅基于画面进行分析`;
}
```

---

### 5. **关键帧提取失败时无降级方案**

**问题描述**：
```typescript
// lib/queue/workers.ts:833-838
const keyframesResult = await extractVideoKeyframes({...});
// ❌ 如果失败，整个任务会中断
```

**问题**：
- FFmpeg 关键帧提取可能因为格式不支持、损坏等原因失败
- 失败后整个项目级分析中断
- 但即使没有关键帧，仍可以进行基本的 Gemini 分析

**解决方案**：
```typescript
let keyframesResult = null;
let keyframesFailed = false;

try {
  keyframesResult = await extractVideoKeyframes({...});
  console.log(`  ✅ 提取了 ${keyframesResult.framePaths.length} 个关键帧`);
} catch (keyframeError) {
  console.warn(`  ⚠️  关键帧提取失败:`, keyframeError);
  keyframesFailed = true;

  // 继续执行，但不使用关键帧
  keyframesResult = { framePaths: [], timestamps: [] };
}

// 在项目级分析时判断
if (keyframesResults.size === 0 || allFailed) {
  console.warn(`  ⚠️  所有关键帧提取失败，使用增强摘要进行分析`);
  // 降级为仅使用增强摘要
}
```

---

### 6. **数据库事务缺失 - 可能导致数据不一致**

**问题描述**：
```typescript
// lib/queue/workers.ts:843-852
const keyframeData = keyframesResult.framePaths.map((framePath, index) => ({...}));
await queries.keyframe.createBatch(keyframeData);  // ❌ 无事务

// ... 后续操作 ...
await queries.audioTranscription.create({...});     // ❌ 无事务
await queries.video.update({...});                  // ❌ 无事务
```

**问题**：
- 如果后续操作失败，前面的数据已经写入
- 数据库处于不一致状态
- 无法回滚

**场景示例**：
1. 保存关键帧 ✅
2. 保存转录 ✅
3. 保存镜头 ❌（数据库连接断开）
4. **结果**：有关键帧和转录，但没有镜头，数据不一致

**解决方案**：

```typescript
// lib/db/client.ts - 添加事务支持
export async function runInTransaction<T>(
  callback: (tx: Transaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    return await callback(tx);
  });
}

// lib/queue/workers.ts - 使用事务
await runInTransaction(async (tx) => {
  // 所有操作在一个事务中
  await tx.insert(keyframes).values(keyframeData);
  await tx.insert(audioTranscription).values(transcriptionData);
  await tx.update(videos).set({...});

  // 如果任何操作失败，自动回滚
});
```

---

### 7. **进度更新不准确 - 用户体验差**

**问题描述**：
```typescript
// lib/queue/workers.ts:732-736
const progress = Math.round((i / videos.length) * 50);  // 前 50% 用于镜头和高光
await job.updateProgress(progress);
await queries.queueJob.updateProgress(job.id!, progress);
wsServer.sendProgress(job.id!, progress, `正在分析第 ${episodeNum} 集...`);
```

**问题**：
- 进度计算不准确（只考虑了集数，没考虑每集的处理时间）
- 第一集可能需要 10 分钟，但进度只显示 5%
- 用户以为卡住了，可能刷新页面

**解决方案**：
```typescript
// 更细粒度的进度更新
const totalVideos = videos.length;
const stepsPerVideo = 4;  // 关键帧、转录、分析、高光
const totalSteps = totalVideos * stepsPerVideo + 1;  // +1 是项目级分析
let currentStep = 0;

const updateProgress = (step: number, message: string) => {
  const progress = Math.round((step / totalSteps) * 100);
  job.updateProgress(progress);
  wsServer.sendProgress(job.id!, progress, message);
};

for (let i = 0; i < videos.length; i++) {
  const video = videos[i];

  updateProgress(currentStep++, `正在提取第 ${episodeNum} 集关键帧...`);
  await extractVideoKeyframes(...);

  updateProgress(currentStep++, `正在转录第 ${episodeNum} 集音频...`);
  await transcribeAudio(...);

  updateProgress(currentStep++, `正在分析第 ${episodeNum} 集画面...`);
  await geminiClient.analyzeVideo(...);

  updateProgress(currentStep++, `正在检测第 ${episodeNum} 集高光...`);
  await geminiClient.findHighlights(...);
}

updateProgress(currentStep++, `正在分析跨集故事线...`);
await geminiClient.analyzeProjectStorylines(...);
```

---

## 📝 中等问题（Minor Issues）

### 8. **错误信息不够详细 - 调试困难**

**问题描述**：
```typescript
} catch (error) {
  console.error('❌ 任务失败:', error);
  wsServer.sendError(job.id!, error instanceof Error ? error.message : '未知错误');
  throw error;  // ❌ 原始堆栈丢失
}
```

**改进**：
```typescript
} catch (error) {
  const errorDetails = {
    message: error instanceof Error ? error.message : '未知错误',
    stack: error instanceof Error ? error.stack : undefined,
    jobData: job.data,
    videoId: job.data.videoId,
    timestamp: new Date().toISOString(),
  };

  console.error('❌ 任务失败:', JSON.stringify(errorDetails, null, 2));

  // 保存到数据库
  await queries.queueJob.updateError(job.id!, JSON.stringify(errorDetails));

  wsServer.sendError(job.id!, errorDetails.message);

  throw error;
}
```

---

### 9. **Gemini API 超时配置不合理**

**问题描述**：
```typescript
// lib/api/gemini.ts:244
private timeout: number;

// lib/config/index.ts
geminiTimeout: 300000,  // 5 分钟超时
```

**问题**：
- 分析 45 分钟视频可能需要 10-15 分钟
- 5 分钟超时太短，导致大视频分析失败
- 超时后重试会重复消耗 API 配额

**改进**：
```typescript
// 动态超时配置
const getTimeoutForVideo = (durationMs: number) => {
  const durationMinutes = durationMs / 60000;

  if (durationMinutes < 3) {
    return 60000;      // 1 分钟（短视频）
  } else if (durationMinutes < 10) {
    return 300000;     // 5 分钟（中等视频）
  } else if (durationMinutes < 30) {
    return 900000;     // 15 分钟（长视频）
  } else {
    return 1800000;    // 30 分钟（超长视频）
  }
};

const timeout = getTimeoutForVideo(videoMetadata.duration);
```

---

### 10. **关键帧采样策略不够智能**

**问题描述**：
```typescript
// lib/queue/workers.ts:200-210
let framesPerSecond = 15;
if (videoMetadata.duration > 600) {
  framesPerSecond = 5;
} else if (videoMetadata.duration > 180) {
  framesPerSecond = 10;
}
```

**问题**：
- 固定采样率不够智能
- 动作密集的场景需要更多帧
- 静态对话场景可以减少帧

**改进方案**：
```typescript
// 基于场景复杂度的自适应采样
const calculateOptimalFrameCount = async (videoPath: string) => {
  // 1. 先提取少量帧（每 30 秒 1 帧）
  const sampleFrames = await extractVideoKeyframes({
    videoPath,
    intervalSeconds: 30,
    frameCount: Math.min(Math.ceil(duration / 30000), 50),
  });

  // 2. 使用 Gemini 快速分析场景复杂度
  const complexityAnalysis = await geminiClient.analyzeSceneComplexity(sampleFrames);

  // 3. 根据复杂度调整采样率
  let frameMultiplier = 1.0;
  if (complexityAnalysis.avgComplexity > 0.7) {
    frameMultiplier = 2.0;  // 高复杂度：增加采样
  } else if (complexityAnalysis.avgComplexity < 0.3) {
    frameMultiplier = 0.5;  // 低复杂度：减少采样
  }

  return Math.floor(baseFrameCount * frameMultiplier);
};
```

---

## 💡 性能优化建议（Performance Optimizations）

### 11. **Whisper 转录可以使用 GPU 加速**

**现状**：
```typescript
const transcriptionResult = await transcribeAudio(audioPath, {
  model: 'small',
  language: 'zh',
});
```

**优化**：
```typescript
// 检测是否有 GPU 支持
const hasGPU = await checkCUDAAvailable();

const model = hasGPU ? 'small' : 'tiny';  // GPU 可以用更大模型
const device = hasGPU ? 'cuda' : 'cpu';

const transcriptionResult = await transcribeAudio(audioPath, {
  model,
  language: 'zh',
  device,  // 使用 GPU
});
```

**预期提升**：
- CPU: 10 分钟转录 1 小时音频
- GPU (RTX 3060): 2-3 分钟转录 1 小时音频
- **速度提升 3-5 倍**

---

### 12. **关键帧提取可以并行化**

**现状**：
```typescript
// lib/video/keyframes.ts:79-111
for (let i = 0; i < actualFrameCount; i++) {
  // 串行提取每一帧
  await runFFmpeg([...args]);  // ❌ 慢
}
```

**优化方案**：
```typescript
// 并行提取多个帧
const concurrency = 4;  // 同时提取 4 帧
const batches = [];

for (let i = 0; i < actualFrameCount; i += concurrency) {
  const batch = [];
  for (let j = 0; j < concurrency && i + j < actualFrameCount; j++) {
    batch.push(extractFrame(i + j));
  }
  batches.push(Promise.all(batch));
}

await Promise.all(batches);
```

**预期提升**：
- 串行：提取 900 帧，每帧 0.5 秒 = 7.5 分钟
- 并发（4）：约 2 分钟
- **速度提升 3-4 倍**

---

### 13. **项目级分析可以使用缓存**

**现状**：
```typescript
// 每次都完整分析项目级故事线
const projectStorylinesResult = await geminiClient.analyzeProjectStorylines(
  videos,
  enhancedSummaries,
  keyframesResults
);
```

**问题**：
- 如果只新增 1 集，也要重新分析整个项目
- 成本高、速度慢

**优化**：
```typescript
// 检查是否只需要增量分析
const lastAnalysis = await queries.projectAnalysis.getByProjectId(projectId);
const newVideosSinceLastAnalysis = await queries.video.getVideosUpdatedAfter(
  projectId,
  lastAnalysis?.analyzedAt
);

if (newVideosSinceLastAnalysis.length < videos.length * 0.3) {
  // 新增视频少于 30%，使用增量分析
  console.log(`📊 使用增量分析（${newVideosSinceLastAnalysis.length} 集新视频）`);

  const incrementalResult = await geminiClient.incrementalProjectAnalysis(
    lastAnalysis,         // 旧的分析结果
    newVideosSinceLastAnalysis,  // 新视频
    enhancedSummaries,
    keyframesResults
  );
} else {
  // 完整重新分析
  const fullResult = await geminiClient.analyzeProjectStorylines(...);
}
```

---

## 🔒 安全问题（Security Issues）

### 14. **Base64 编码的文件上传无大小限制**

**问题描述**：
```typescript
// lib/api/gemini.ts:456
const videoBase64 = await this.fileToBase64(videoPath);
// ❌ 直接读取整个文件到内存
```

**风险**：
- 上传 1GB 视频会消耗 1.3GB 内存（Base64 编码增加 33%）
- 可能导致 OOM
- 恶意用户可能上传超大文件搞崩服务器

**解决方案**：
```typescript
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;  // 200MB

const stats = await fs.stat(videoPath);
if (stats.size > MAX_VIDEO_SIZE) {
  throw new Error(
    `视频文件过大 (${(stats.size / 1024 / 1024).toFixed(2)}MB)，` +
    `超过限制 (${MAX_VIDEO_SIZE / 1024 / 1024}MB)。` +
    `大视频请使用关键帧采样模式。`
  );
}
```

---

### 15. **API Key 泄露风险**

**问题描述**：
```typescript
// lib/api/gemini.ts:388
const apiUrl = `${this.endpoint}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
// ❌ API Key 直接拼接到 URL，可能被日志记录
```

**风险**：
- 日志文件可能记录完整 URL（包括 API Key）
- 错误监控工具（如 Sentry）可能捕获请求 URL

**解决方案**：
```typescript
// 使用 Header 传递 API Key
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': this.apiKey,  // ✅ 使用 Header
  },
  body: JSON.stringify(requestBody),
});

// URL 中不再包含敏感信息
const apiUrl = `${this.endpoint}/v1beta/models/${this.model}:generateContent`;
```

---

## 📋 总结与优先级

### 🔴 立即修复（P0 - 本周内）
1. **临时文件清理** - 防止磁盘空间耗尽
2. **并发限制** - 防止资源耗尽
3. **数据库事务** - 保证数据一致性

### 🟠 近期改进（P1 - 本月内）
4. **Whisper 降级策略** - 提升用户体验
5. **关键帧降级方案** - 提升容错能力
6. **进度更新优化** - 提升用户体验

### 🟡 长期优化（P2 - 下个迭代）
7. **并行关键帧提取** - 性能提升 3-4 倍
8. **GPU 加速 Whisper** - 性能提升 3-5 倍
9. **增量项目分析** - 节省成本 50%+

### 🔵 未来考虑（P3）
10. **自适应采样** - 智能调整采样率
11. **错误信息增强** - 提升调试效率
12. **动态超时配置** - 提升大视频成功率

---

**审查结论**：
整体架构设计合理，关键帧 + Whisper ASR 优化方案有效。主要问题集中在**资源管理**（内存、磁盘、并发）和**错误处理**（降级策略、事务）。建议优先修复 P0 问题，确保系统稳定性和可维护性。
