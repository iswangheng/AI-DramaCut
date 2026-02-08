# Agent 4 - shots 表字段添加说明

**时间**: 2025-02-08
**目的**: 解决 Agent 3 阻塞问题

---

## 📋 问题说明

**阻塞项**: Agent 3 的 `detectShots()` 功能被阻塞
**原因**: shots 表缺少 `thumbnailPath` 字段
**解决方案**: 添加 3 个新字段以支持镜头检测和语义搜索

---

## ✅ 已添加的字段

### 1. thumbnailPath
```typescript
thumbnailPath: text('thumbnail_path')
```
- **用途**: 存储镜头缩略图的文件路径
- **类型**: TEXT (可选)
- **说明**: Agent 3 在镜头检测时会生成缩略图，需要保存路径以便前端展示

### 2. semanticTags
```typescript
semanticTags: text('semantic_tags')
```
- **用途**: 存储语义标签（JSON 数组格式）
- **类型**: TEXT (可选)
- **说明**: Agent 2 会填充语义标签，用于模式 B 的语义搜索
- **格式**: `["动作", "冲突", "反转"]`

### 3. embeddings
```typescript
embeddings: text('embeddings')
```
- **用途**: 存储向量表示（JSON 数组格式）
- **类型**: TEXT (可选)
- **说明**: Agent 2 会生成向量，用于语义相似度匹配
- **格式**: `[0.123, -0.456, ..., 0.789]` (浮点数数组)

---

## 📝 更新的文件

### 1. Schema 定义 (`lib/db/schema.ts`)
```typescript
export const shots = sqliteTable('shots', {
  // ... 现有字段 ...

  // 新增字段
  thumbnailPath: text('thumbnail_path'),    // 缩略图路径
  semanticTags: text('semantic_tags'),      // 语义标签（JSON）
  embeddings: text('embeddings'),          // 向量表示（JSON）

  ...timestamps,
});
```

### 2. 数据库初始化 (`lib/db/client.ts`)
```sql
CREATE TABLE IF NOT EXISTS shots (
  -- ... 现有字段 ...

  -- 新增字段
  thumbnail_path TEXT,
  semantic_tags TEXT,
  embeddings TEXT,

  ...
);
```

---

## 🔄 数据库迁移

### 对于新数据库
如果还没有创建数据库，直接运行应用即可：
```bash
npm run dev
```

### 对于现有数据库
如果数据库已经存在，需要执行迁移：

**选项 1: 删除重建（开发环境）**
```bash
# POST /api/db/init
{
  "reset": true
}
```

**选项 2: 手动迁移**
```sql
-- 添加新字段
ALTER TABLE shots ADD COLUMN thumbnail_path TEXT;
ALTER TABLE shots ADD COLUMN semantic_tags TEXT;
ALTER TABLE shots ADD COLUMN embeddings TEXT;
```

---

## 📊 字段使用流程

```
Agent 3 (镜头检测)
    ↓
生成镜头缩略图
    ↓
保存 thumbnailPath
    ↓
[Agent 2 填充]
    ↓
semanticTags → 语义标签
embeddings → 向量表示
    ↓
[模式 B: 语义匹配]
    ↓
搜索相关镜头 → 拼接解说视频
```

---

## ✅ 验证

### 检查字段是否添加成功
```typescript
import { db } from '@/lib/db';
import { shots } from '@/lib/db/schema';

// 查询所有镜头
const allShots = await db.select().from(shots);

// 检查是否有新字段
console.log(allShots[0]?.thumbnailPath);      // 应该有值或 undefined
console.log(allShots[0]?.semanticTags);      // 应该有值或 undefined
console.log(allShots[0]?.embeddings);         // 应该有值或 undefined
```

---

## 🎯 Agent 3 现在可以...

1. ✅ 调用 `detectShots()` 函数
2. ✅ 保存缩略图路径到 `thumbnailPath`
3. ✅ 等待 Agent 2 填充 `semanticTags` 和 `embeddings`
4. ✅ 实现完整的镜头检测功能

---

**Agent 4 完成！Agent 3 阻塞已解除！🎉**
