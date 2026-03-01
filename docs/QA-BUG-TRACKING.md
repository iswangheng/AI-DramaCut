# QA Bug 修复追踪

**更新时间**: 2026-03-01
**测试报告**: `docs/FINAL-QA-REPORT.md`

---

## ✅ 已修复问题

### 1. Jest 配置问题（P2-1）✅

**问题描述**:
- Jest 配置使用 ES Module 语法，导致测试无法运行
- 错误: `SyntaxError: Unexpected token '{'`

**修复方案**:
- 将 `jest.config.js` 从 ES Module 改为 CommonJS 语法
- 添加 `tests` 目录到 `roots`

**修复位置**: `jest.config.js`

**修复前**:
```javascript
import type { Config } from 'ts-jest';
export default { ... };
```

**修复后**:
```javascript
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib', '<rootDir>/app', '<rootDir>/tests'],
  // ...
};
```

**验证**:
```bash
npm test  # 应该可以正常运行
```

**状态**: ✅ 已修复

---

## ⏸️ 待修复问题

### 2. 临时文件清理失败未记录（P2-2）

**问题描述**:
- `learning-pipeline.ts` 第326-329行
- 临时音频文件清理失败时静默忽略
- 可能导致磁盘空间泄漏

**影响**: 低（仅影响磁盘空间）

**修复位置**: `lib/ai/learning-pipeline.ts:326`

**建议修复**:
```typescript
// 当前实现
try {
  await unlink(audioPath);
} catch {}

// 修复后
try {
  await unlink(audioPath);
  console.log(`✅ 临时文件已清理: ${audioPath}`);
} catch (error) {
  console.warn(`⚠️ 临时文件清理失败: ${audioPath}`, error);
  // 可选：记录到监控系统
}
```

**优先级**: 低

**状态**: ⏸️ 待修复

---

### 3. 学习流程限制分析前10个标记（P2-3）

**问题描述**:
- `learning-pipeline.ts` 第411行
- 使用 `.slice(0, 10)` 限制只分析前10个标记
- 可能导致学习不完整

**影响**: 中（影响 AI 学习质量）

**修复位置**: `lib/ai/learning-pipeline.ts:411`

**建议修复**:
```typescript
// 当前实现
const markingContexts = successMarkings.slice(0, 10).map(...)

// 修复方案 1: 移除限制
const markingContexts = successMarkings.map(...)

// 修复方案 2: 可配置限制
const maxMarkings = config.maxMarkings ?? 10;
const markingContexts = successMarkings.slice(0, maxMarkings).map(...)
```

**注意事项**:
- 移除限制会增加 Gemini API token 消耗
- 建议添加配置项控制

**优先级**: 中

**状态**: ⏸️ 待修复

---

### 4. 推荐引擎使用 `as any`（P2-4）

**问题描述**:
- `recommendation-engine.ts` 第152-154行
- 使用 `as any` 类型断言，失去类型安全

**影响**: 低（仅影响类型检查）

**修复位置**: `lib/ai/recommendation-engine.ts:152`

**建议修复**:
```typescript
// 当前实现
const deduplicatedCombinations = this.deduplicateCombinations(
  sortedCombinations as any
);

// 修复后
interface ScoredCombination extends ClipCombination {
  scores: ScoringResult;
}

const deduplicatedCombinations = this.deduplicateCombinations(
  sortedCombinations as ScoredCombination[]
);
```

**优先级**: 低

**状态**: ⏸️ 待修复

---

### 5. Excel 导入进度模拟（P2-5）

**问题描述**:
- `excel-importer.tsx` 第98-106行
- 使用 `setInterval` 模拟上传进度
- 可能与真实上传进度冲突

**影响**: 低（仅影响用户体验）

**修复位置**: `components/excel-importer.tsx:98`

**建议修复**:
```typescript
// 当前实现
const progressInterval = setInterval(() => {
  setUploadProgress((prev) => {
    if (prev >= 90) {
      clearInterval(progressInterval);
      return 90;
    }
    return prev + 10;
  });
}, 200);

// 修复后: 使用真实进度（需要后端支持）
const res = await fetch('/api/hangzhou-leiming/markings/import', {
  method: 'POST',
  body: formData,
});

// 使用 WebSocket 接收真实进度
```

**优先级**: 低

**状态**: ⏸️ 待修复

---

### 6. 关键帧缓存逻辑未实现（P2-6）

**问题描述**:
- `marking-pipeline.ts` 第175行
- 存在 `TODO` 注释，关键帧缓存逻辑未实现

**影响**: 中（影响性能）

**修复位置**: `lib/ai/marking-pipeline.ts:175`

**建议实现**:
```typescript
// 当前实现
if (video.frameDir) {
  console.log(`✅ [关键帧提取] 已存在关键帧目录: ${video.frameDir}`);
  // TODO: 读取现有关键帧
}

// 修复后
if (video.frameDir) {
  console.log(`✅ [关键帧提取] 已存在关键帧目录: ${video.frameDir}`);
  // 读取现有关键帧
  const frameFiles = await readdir(video.frameDir);
  const framePaths = frameFiles
    .filter(f => f.endsWith('.jpg'))
    .map(f => join(video.frameDir!, f))
    .sort();

  return {
    outputDir: video.frameDir,
    framePaths,
    timestamps: [], // 可选：从文件名解析时间戳
  };
}
```

**优先级**: 中

**状态**: ⏸️ 待修复

---

### 7. 文件上传缺少内容检查（P2-7）

**问题描述**:
- Excel 导入只检查文件扩展名
- 未验证文件内容（MIME type vs 文件头）

**影响**: 中（安全风险）

**修复位置**: `app/api/hangzhou-leiming/markings/import/route.ts`

**建议修复**:
```typescript
import { fileTypeFromBuffer } from 'file-type';

// 在处理文件前添加
const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
const fileType = await fileTypeFromBuffer(buffer);

const allowedTypes = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

if (!fileType || !allowedTypes.includes(fileType.mime)) {
  return Response.json(
    { success: false, message: '不支持的文件类型' },
    { status: 400 }
  );
}
```

**需要安装依赖**:
```bash
npm install file-type
npm install --save-dev @types/file-type
```

**优先级**: 中

**状态**: ⏸️ 待修复

---

### 8. 导出任务无并发限制（P2-8）

**问题描述**:
- 视频导出系统缺少并发控制
- 多个导出任务同时运行可能导致资源耗尽

**影响**: 低（仅在高并发时）

**修复位置**: `lib/export/video-exporter.ts`

**建议修复**:
```typescript
// 添加导出任务队列
import { Queue } from 'bullmq';

const exportQueue = new Queue('video-export', {
  connection: { host: 'localhost', port: 6379 },
  defaultJobOptions: {
    limiter: {
      max: 1, // 最多1个并发导出任务
      duration: 1000, // 每秒1个
    },
  },
});

// 在导出前添加到队列
export async function exportCombination(job: ExportJob): Promise<ExportResult> {
  const jobId = await exportQueue.add('export', job);
  // ...
}
```

**优先级**: 低

**状态**: ⏸️ 待修复

---

## 📊 修复优先级

### 高优先级（本周修复）
- ✅ P2-1: Jest 配置问题
- ⏸️ P2-3: 学习流程标记限制
- ⏸️ P2-7: 文件上传内容检查

### 中优先级（2周内修复）
- ⏸️ P2-2: 临时文件清理日志
- ⏸️ P2-6: 关键帧缓存逻辑
- ⏸️ P2-8: 导出任务并发控制

### 低优先级（后续优化）
- ⏸️ P2-4: 推荐引擎类型安全
- ⏸️ P2-5: Excel 导入真实进度

---

## 🔧 修复指南

### 快速修复（5分钟）

```bash
# 1. 修复 Jest 配置
# ✅ 已完成

# 2. 运行测试
npm test

# 3. 查看测试覆盖率
npm run test:coverage
```

### 完整修复（1小时）

```bash
# 1. 安装额外依赖
npm install file-type
npm install --save-dev @types/file-type

# 2. 修复 P2-2, P2-3, P2-4, P2-6, P2-7
# (手动编辑相关文件)

# 3. 运行测试验证
npm test

# 4. 提交修复
git add .
git commit -m "fix: 修复 QA 发现的 P2 问题"
```

---

## 📝 修复日志

### 2026-03-01

**修复人**: QA Team
**修复内容**:
- ✅ P2-1: Jest 配置问题（ES Module → CommonJS）

**剩余问题**: 7 个（全部 P2）

**下一步**:
- 修复 P2-3（标记数量限制）
- 修复 P2-7（文件上传安全）
- 运行完整测试套件

---

**文档维护**: QA Team
**最后更新**: 2026-03-01 16:45:00
