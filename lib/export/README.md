# 视频导出模块文档

## 概述

本模块实现了杭州雷鸣项目的视频导出功能，根据剪辑组合推荐结果，使用 FFmpeg 拼接视频片段并导出成品。

## 功能特性

### 1. 核心功能
- ✅ 读取剪辑组合信息
- ✅ 提取视频片段（毫秒级精度）
- ✅ 拼接多个视频片段
- ✅ 实时进度跟踪
- ✅ 临时文件自动清理
- ✅ 支持跨集拼接
- ✅ 完整的错误处理

### 2. 技术特点
- **毫秒级精度**: 使用重编码模式（非 copy）确保精确切割
- **进度实时跟踪**: 数据库记录每个步骤的进度
- **异步执行**: 不阻塞 API 响应，支持后台处理
- **容错机制**: 完善的错误处理和回滚

## API 接口

### 1. 创建导出任务

**端点**: `POST /api/hangzhou-leiming/exports`

**请求体**:
```json
{
  "projectId": 1,
  "combinationId": 10,
  "outputFormat": "mp4"  // 可选，默认 mp4
}
```

**响应**:
```json
{
  "success": true,
  "message": "导出任务已创建，正在处理中",
  "data": {
    "projectId": 1,
    "combinationId": 10,
    "status": "pending"
  }
}
```

### 2. 查询导出状态

**端点**: `GET /api/hangzhou-leiming/exports?id=10`

**响应**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "outputPath": "/path/to/video.mp4",
    "fileSize": 10485760,
    "exportId": 10
  }
}
```

**状态值**:
- `pending`: 等待处理
- `processing`: 正在处理
- `completed`: 完成
- `error`: 失败

### 3. 查询项目导出记录

**端点**: `GET /api/hangzhou-leiming/exports?projectId=1`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "projectId": 1,
      "combinationId": 10,
      "status": "completed",
      "progress": 100,
      "currentStep": "导出完成",
      "outputPath": "/path/to/video.mp4",
      "fileSize": 10485760,
      "createdAt": "2025-02-28T10:00:00.000Z"
    }
  ]
}
```

### 4. 下载导出文件

**端点**: `GET /api/hangzhou-leiming/exports/[id]/download`

**响应**:
- 成功: 返回视频文件流（Content-Type: video/mp4）
- 未完成: 返回 202 Accepted + 状态信息
- 失败: 返回 400/404 + 错误信息

## 导出流程

### 完整流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    视频导出完整流程                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. API 请求                                                │
│     POST /api/hangzhou-leiming/exports                      │
│     { projectId, combinationId, outputFormat }              │
│                    │                                        │
│                    ▼                                        │
│  2. 创建导出记录                                            │
│     status: "processing", progress: 0                       │
│                    │                                        │
│                    ▼                                        │
│  3. 读取剪辑组合                                            │
│     解析 clips JSON 数据                                    │
│                    │                                        │
│                    ▼                                        │
│  4. 提取视频片段（10% - 50%）                               │
│     对每个 clip:                                            │
│     - 查询视频文件路径                                       │
│     - 验证文件存在                                          │
│     - FFmpeg 裁剪（毫秒级精度）                              │
│                    │                                        │
│                    ▼                                        │
│  5. 拼接视频片段（60% - 95%）                               │
│     - 创建 filelist.txt                                     │
│     - FFmpeg concat 拼接                                    │
│     - 实时进度更新                                          │
│                    │                                        │
│                    ▼                                        │
│  6. 更新完成状态（100%）                                    │
│     status: "completed"                                     │
│     outputPath, fileSize, completedAt                       │
│                    │                                        │
│                    ▼                                        │
│  7. 清理临时文件                                            │
│     删除 /tmp/exports/[exportId]/                           │
│                    │                                        │
│                    ▼                                        │
│  8. 返回结果                                                │
│     { success, outputPath, fileSize, durationMs }           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 进度跟踪

| 进度范围 | 步骤 | 说明 |
|---------|------|------|
| 0-5% | 准备临时目录 | 创建临时工作目录 |
| 5-10% | 准备阶段 | 初始化环境 |
| 10-50% | 裁剪片段 | 逐个提取视频片段 |
| 60-95% | 拼接视频 | 使用 FFmpeg concat 拼接 |
| 100% | 完成 | 保存元数据，清理临时文件 |

## FFmpeg 命令说明

### 1. 片段裁剪（毫秒级精度）

**命令**:
```bash
npx remotion ffmpeg \
  -ss 00:01:20.500 \
  -i input.mp4 \
  -t 60.000 \
  -c:v libx264 \
  -preset fast \
  -crf 18 \
  -c:a aac \
  -b:a 192k \
  output.mp4 \
  -y
```

**参数说明**:
- `-ss 00:01:20.500`: 精确开始时间（毫秒精度）
- `-i input.mp4`: 输入文件
- `-t 60.000`: 持续时间（秒）
- `-c:v libx264`: 视频编码器（重编码，非 copy）
- `-preset fast`: 编码预设（速度/质量平衡）
- `-crf 18`: 质量控制（18=高质量）
- `-c:a aac`: 音频编码器
- `-b:a 192k`: 音频比特率
- `-y`: 覆盖输出文件

**为什么不使用 `-vcodec copy`?**
- `-vcodec copy` 只能跳转到 I 帧，精度低（通常 2-10 秒误差）
- 重编码模式可以实现毫秒级精度（误差 < 50ms）
- 符合项目"毫秒级精度"的核心要求

### 2. 视频拼接

**方法1: concat demuxer**（推荐，速度快）

**命令**:
```bash
ffmpeg -f concat -safe 0 -i filelist.txt \
  -c:v libx264 -preset fast -crf 18 \
  -c:a aac -b:a 192k \
  output.mp4 -y
```

**filelist.txt 格式**:
```
file '/path/to/segment_0.mp4'
file '/path/to/segment_1.mp4'
file '/path/to/segment_2.mp4'
```

**优点**:
- 快速（如果使用 `-c copy`）
- 无重编码质量损失
- 适合编码格式相同的片段

**缺点**:
- 所有片段编码参数必须相同
- 不支持转场效果

**方法2: concat filter**（兼容性好）

**命令**:
```bash
ffmpeg -i segment0.mp4 -i segment1.mp4 -i segment2.mp4 \
  -filter_complex "[0:v]scale=1920:1080,fps=30,setpts=PTS-STARTPTS[v0]; \
                   [1:v]scale=1920:1080,fps=30,setpts=PTS-STARTPTS[v1]; \
                   [2:v]scale=1920:1080,fps=30,setpts=PTS-STARTPTS[v2]; \
                   [0:a]asetpts=PTS-STARTPTS[a0]; \
                   [1:a]asetpts=PTS-STARTPTS[a1]; \
                   [2:a]asetpts=PTS-STARTPTS[a2]; \
                   [v0][v1][v2]concat=n=3:v=1:a=0[v]; \
                   [a0][a1][a2]concat=n=3:v=0:a=1[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset fast -crf 18 \
  -c:a aac -b:a 192k \
  output.mp4 -y
```

**优点**:
- 支持不同分辨率的视频
- 支持转场效果
- 可以应用复杂滤镜

**缺点**:
- 需要重编码（较慢）
- 质量可能有损失

## 临时文件管理

### 目录结构

```
data/hangzhou-leiming/
├── temp/
│   └── export_100/
│       ├── segment_0.mp4
│       ├── segment_1.mp4
│       └── segment_2.mp4
└── exports/
    └── 冲突开场_悬念结尾_100.mp4
```

### 清理策略

- ✅ **导出成功后**: 保留成品，删除临时片段
- ✅ **导出失败后**: 删除所有临时文件，保留错误日志
- ✅ **定期清理**: 可选定时任务清理超过 24 小时的临时文件

## 错误处理

### 1. 视频文件不存在

**检测**:
```typescript
if (!existsSync(video.filePath)) {
  throw new Error(`视频文件不存在: ${video.filePath}`);
}
```

**处理**: 记录错误到数据库，状态设为 `error`

### 2. FFmpeg 执行失败

**检测**: try-catch 捕获 `trimVideo` 和 `concatVideos` 异常

**处理**:
- 更新状态为 `error`
- 记录错误消息到 `errorMessage` 字段
- 清理临时文件

### 3. 磁盘空间不足

**预防**:
- 导出前检查可用磁盘空间
- 限制并发导出任务数量

**处理**: 返回友好错误提示

### 4. 数据库连接失败

**检测**: try-catch 捕获数据库操作异常

**处理**: 回滚已创建的临时文件

## 性能优化

### 1. 并发控制

- **当前实现**: 单任务串行处理
- **优化方向**: 使用 BullMQ 队列，支持并发导出（限制 2-3 个并发任务）

### 2. 编码参数优化

**当前**:
```bash
-c:v libx264 -preset fast -crf 18
```

**优化选项**:
- 更快速度: `-preset veryfast`（质量略降）
- 更小文件: `-crf 20`（质量略降）
- GPU 加速: `-c:v h264_nvenc`（需要 NVIDIA GPU）

### 3. 缓存策略

- **已完成导出**: 检查是否已存在相同组合的导出文件
- **增量导出**: 如果组合变化不大，仅重新导出变化部分

## 测试

### 运行测试

```bash
# 单元测试
npm test -- tests/video-exporter.test.ts

# 覆盖率报告
npm test -- --coverage
```

### 测试用例

1. ✅ 导出任务配置验证
2. ✅ 片段数据解析
3. ✅ 临时文件管理
4. ✅ 错误处理
5. ✅ 进度跟踪
6. ✅ 文件路径处理
7. ✅ 跨集拼接

## 使用示例

### 前端集成（React）

```typescript
// 1. 创建导出任务
const createExport = async (combinationId: number) => {
  const response = await fetch('/api/hangzhou-leiming/exports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: 1,
      combinationId,
      outputFormat: 'mp4',
    }),
  });

  const result = await response.json();
  return result.data;
};

// 2. 轮询导出状态
const pollExportStatus = async (exportId: number) => {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/hangzhou-leiming/exports?id=${exportId}`);
    const result = await response.json();

    if (result.data.status === 'completed') {
      clearInterval(interval);
      // 下载文件
      window.open(`/api/hangzhou-leiming/exports/${exportId}/download`);
    } else if (result.data.status === 'error') {
      clearInterval(interval);
      console.error('导出失败:', result.data.errorMessage);
    }
  }, 2000); // 每 2 秒查询一次
};

// 3. 下载文件
const downloadVideo = (exportId: number) => {
  window.location.href = `/api/hangzhou-leiming/exports/${exportId}/download`;
};
```

## 验收标准

### 功能验收

- [x] 可以成功导出视频
- [x] 支持跨集拼接
- [x] 进度实时跟踪
- [x] 下载功能可用
- [x] 单元测试通过

### 性能验收

- [ ] 5 分钟视频导出时间 < 2 分钟
- [ ] 内存使用 < 2GB
- [ ] 临时文件及时清理

### 质量验收

- [ ] 毫秒级精度（音画同步误差 < 50ms）
- [ ] 输出文件无损坏
- [ ] 错误处理完善

## 未来优化

### 1. 断点续传

记录每个片段的处理状态，支持从中断点继续导出。

### 2. 预览模式

低分辨率快速预览拼接效果，确认后再正式导出。

### 3. 批量导出

一次性导出多个剪辑组合，后台队列处理。

### 4. 自定义参数

允许用户选择输出质量、编码速度等参数。

## 相关文档

- PRD: `杭州雷鸣-短剧剪辑-PRD.md` - 需求三
- 数据库 schema: `lib/db/schema.ts` - `hlExports` 表
- FFmpeg 工具: `lib/ffmpeg/` - 视频处理核心
- 剪辑组合: `hl_clip_combinations` 表

## 联系方式

如有问题，请联系开发团队。
