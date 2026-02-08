# 视频元数据提取 - 使用文档

**Agent 3 - 视频处理**
**状态**: ✅ 已完成

---

## 功能概述

提供视频元数据提取功能，符合 `types/api-contracts.ts` 接口契约。

**返回的元数据包括**:
- 时长（秒）
- 分辨率（宽 x 高）
- 帧率（fps）
- 编码格式
- 比特率
- 文件大小

---

## 使用方法

### 1. 直接调用（推荐用于后端处理）

```typescript
import { getMetadata } from '@/lib/video/metadata';

// 获取视频元数据
const metadata = await getMetadata('/path/to/video.mp4');

console.log(metadata.duration);   // 120.5 (秒)
console.log(metadata.width);      // 1920
console.log(metadata.height);     // 1080
console.log(metadata.fps);        // 29.97
console.log(metadata.codec);      // 'h264'
console.log(metadata.bitrate);    // 5000000
console.log(metadata.size);       // 125829120 (字节)
```

### 2. 通过 API 调用（Agent UI 使用）

```typescript
// Agent UI 前端代码
const response = await fetch('/api/video/metadata', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    videoPath: '/path/to/video.mp4',
  }),
});

const result = await response.json();

if (result.success) {
  console.log(result.metadata);
  console.log(result.validation); // 视频验证结果
}
```

### 3. 批量处理

```typescript
import { getBatchMetadata } from '@/lib/video/metadata';

const videoPaths = [
  '/path/to/video1.mp4',
  '/path/to/video2.mp4',
  '/path/to/video3.mp4',
];

const metadataArray = await getBatchMetadata(videoPaths);
```

---

## 验证视频

### 自动验证

```typescript
import { validateVideoMetadata } from '@/lib/video/metadata';

const metadata = await getMetadata('/path/to/video.mp4');
const validation = validateVideoMetadata(metadata);

if (!validation.valid) {
  console.warn('视频不符合要求:');
  validation.errors.forEach((error) => {
    console.warn(`- ${error}`);
  });
}
```

### 验证规则

- **时长**: 至少 1 秒
- **分辨率**: 建议 1280x720 (720p) 以上
- **帧率**: 建议 25-60 fps
- **编码格式**: 支持 H.264, H.265, HEVC, VP9, AV1

---

## 测试

### 命令行测试

```bash
# 测试单个视频
npx tsx scripts/test-metadata.ts /path/to/video.mp4

# 示例
npx tsx scripts/test-metadata.ts ./test-data/sample.mp4
```

### API 测试

```bash
# 启动开发服务器
npm run dev

# 测试 API（GET）
curl "http://localhost:3000/api/video/metadata?videoPath=/path/to/video.mp4"

# 测试 API（POST）
curl -X POST http://localhost:3000/api/video/metadata \
  -H "Content-Type: application/json" \
  -d '{"videoPath":"/path/to/video.mp4"}'
```

---

## 与其他 Agent 的集成

### Agent 1 - UI

**场景**: 用户上传视频后，显示视频信息

```typescript
// app/projects/[id]/page.tsx
const handleVideoUpload = async (file: File) => {
  // 1. 上传文件
  const uploadedPath = await uploadFile(file);

  // 2. 获取元数据
  const response = await fetch('/api/video/metadata', {
    method: 'POST',
    body: JSON.stringify({ videoPath: uploadedPath }),
  });

  const result = await response.json();

  // 3. 显示信息
  if (result.success) {
    console.log('视频时长:', result.metadata.duration);
    console.log('分辨率:', `${result.metadata.width}x${result.metadata.height}`);
  }
};
```

### Agent 4 - 数据库

**场景**: 保存视频素材到数据库

```typescript
import { getMetadata } from '@/lib/video/metadata';
import { addVideoAsset } from '@/lib/db/queries';

// 上传并保存
const metadata = await getMetadata(videoPath);
await addVideoAsset(projectId, videoPath, metadata);
```

---

## 错误处理

### 常见错误

```typescript
try {
  const metadata = await getMetadata(videoPath);
} catch (error) {
  if (error.message.includes('不存在')) {
    console.error('视频文件不存在');
  } else if (error.message.includes('未找到视频流')) {
    console.error('文件不是有效的视频');
  } else {
    console.error('未知错误:', error.message);
  }
}
```

---

## 技术细节

### 依赖

- **@remotion/media-utils**: 基础元数据（快速）
- **ffprobe**: 详细元数据（比特率、编码）

### 性能

- Remotion: ~100ms
- FFprobe: ~200ms
- 总计: ~300ms per video

### 批量处理性能

- 并发处理: Promise.all
- 10 个视频: ~3 秒
- 100 个视频: ~30 秒

---

## 后续计划

- [ ] 添加缩略图生成功能
- [ ] 添加视频预览截图
- [ ] 支持更多视频格式（MKV, AVI）
- [ ] 添加视频质量评估

---

**相关文档**:
- `types/api-contracts.ts` - 接口定义
- `AGENT-4-GUIDE.md` - 数据库集成
- `COLLABORATION.md` - 协作文档
