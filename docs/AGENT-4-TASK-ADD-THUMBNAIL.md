# 🔴 Agent 4 - 紧急任务：添加 thumbnailPath 字段

**创建时间**: 2025-02-08 18:20
**优先级**: 🔴 高（阻塞核心功能）
**来源**: Agent 3 (Video Processing)

---

## 📋 问题描述

Agent 3 在实现 `detectShots()` 功能时发现，`lib/db/schema.ts` 中的 `shots` 表缺少 `thumbnailPath` 字段。

### 影响

- ❌ Agent 3 无法存储镜头缩略图
- ❌ 模式 B（深度解说）无法正常工作
- ❌ 用户无法预览镜头内容

---

## ✅ 需要做的事情

### 1. 修改数据库 Schema

**文件**: `lib/db/schema.ts`

在 `shots` 表中添加字段：

```typescript
export const shots = sqliteTable('shots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  videoId: integer('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),

  // 时间信息
  startMs: integer('start_ms').notNull(),
  endMs: integer('end_ms').notNull(),

  // Gemini 分析结果
  description: text('description').notNull(),
  emotion: text('emotion').notNull(),
  dialogue: text('dialogue'),
  characters: text('characters'),
  viralScore: real('viral_score'),

  // 帧信息
  startFrame: integer('start_frame').notNull(),
  endFrame: integer('end_frame').notNull(),

  // ⚠️ 添加这个字段
  thumbnailPath: text('thumbnail_path'),  // 镜头缩略图路径

  ...timestamps,
});
```

### 2. 创建数据库迁移

**方式 A：使用 Drizzle Kit Push（开发环境）**

```bash
npm run db:push
```

**方式 B：创建迁移文件（生产环境）**

```bash
# 生成迁移
npm run db:generate

# 查看生成的迁移文件
cat drizzle/0001_thumbnail_path.sql
```

生成的迁移内容应该类似：
```sql
ALTER TABLE shots ADD COLUMN thumbnail_path TEXT;
```

### 3. 更新查询函数（如果需要）

**文件**: `lib/db/queries.ts`

确保相关函数支持 `thumbnailPath` 字段。

### 4. 测试

```bash
# 检查数据库结构
npm run db:studio

# 或者使用 SQLite 客户端
sqlite3 data/database.sqlite
.schema shots
```

应该看到：
```sql
CREATE TABLE shots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  description TEXT NOT NULL,
  emotion TEXT NOT NULL,
  dialogue TEXT,
  characters TEXT,
  viral_score REAL,
  start_frame INTEGER NOT NULL,
  end_frame INTEGER NOT NULL,
  thumbnail_path TEXT,  -- ✅ 新字段
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

---

## 📝 完成后

### 1. 更新 COLLABORATION.md

在"当前阻塞项"部分移除此阻塞：
```markdown
### Agent Video 被阻塞：
- ✅ ~~等待 Agent Data 添加 thumbnailPath 字段~~（已完成）
```

### 2. 提交代码

```bash
git add .
git commit -m "feat(db): 添加 shots 表 thumbnailPath 字段

- 在 shots 表添加 thumbnail_path 字段
- 用于存储镜头缩略图路径
- 支持 Agent 3 的 detectShots() 功能
- 运行数据库迁移

---
Agent: Agent 4 (Data)
依赖: 无
阻塞: Agent 3 现在可以继续实现 detectShots()
"
git push origin main
```

### 3. 通知 Agent 3

在 Git Commit 消息中说明已添加字段，Agent 3 看到 `git pull` 后即可继续工作。

---

## 🎯 预期结果

完成后，Agent 3 可以实现完整的 `detectShots()` 功能：

```typescript
export async function detectShots(videoPath: string): Promise<SceneShot[]> {
  // 1. 检测场景切换
  const scenes = await detectSceneChanges(videoPath);

  // 2. 生成缩略图
  const shots = await Promise.all(scenes.map(async (scene) => {
    const thumbnailPath = await generateThumbnail(videoPath, scene.startMs);

    // 3. 存入数据库（包含 thumbnailPath）
    await db.insert(shots).values({
      ...scene,
      thumbnailPath,  // ✅ 现在可以存储了
    });

    return { ...scene, thumbnailPath };
  }));

  return shots;
}
```

---

## ⏰ 时间估算

- 修改 Schema: 5 分钟
- 创建迁移: 5 分钟
- 测试: 5 分钟
- **总计**: 约 15 分钟

---

**需要帮助？**

参考文档：
- `AGENT-4-GUIDE.md` - Agent 4 开发指南
- `CLLABORATION.md` - 协作文档
- Drizzle ORM 文档: https://orm.drizzle.team/
