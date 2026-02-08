# Agent 4 - projects 表添加说明

**时间**: 2025-02-08
**目的**: 支持素材管理 UI 的项目管理功能

---

## 📋 问题说明

**UI 需求**: 素材管理界面需要支持项目级别的管理
- 新建项目
- 项目内上传和删除剧集视频
- 项目管理（增删、搜索）

**原问题**: 数据库缺少 `projects` 表,导致 UI 无法实现项目管理功能
- ❌ 没有 `projects` 表
- ❌ `videos` 表没有 `projectId` 外键
- ❌ 无法关联视频到项目

**解决方案**: 添加 `projects` 表并建立与 `videos` 的一对多关系

---

## ✅ 已添加的表和字段

### 1. projects 表 (新增)

```typescript
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),                           // 项目名称
  description: text('description'),                       // 项目描述

  // 处理状态
  status: text('status', {
    enum: ['ready', 'processing', 'error']
  }).notNull().default('ready'),                          // 处理状态

  // 进度信息（用于 UI 显示）
  progress: integer('progress').notNull().default(0),    // 整体进度 (0-100)
  currentStep: text('current_step'),                     // 当前处理步骤描述

  // 错误信息
  errorMessage: text('error_message'),                    // 错误消息

  ...timestamps,
});
```

**字段说明**:
- **id**: 项目唯一标识
- **name**: 项目名称（如：霸道总裁爱上我）
- **description**: 项目描述（如：都市言情短剧，共12集）
- **status**: 项目处理状态
  - `ready` - 已就绪
  - `processing` - 处理中
  - `error` - 错误
- **progress**: 整体处理进度（0-100）
- **currentStep**: 当前处理步骤描述（如："Gemini 分析中... 65%"）
- **errorMessage**: 错误消息（如果处理失败）

### 2. videos 表更新

**新增字段**:
```typescript
projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' })
```

**说明**:
- 每个视频必须属于一个项目
- 删除项目时,所有关联的视频会被级联删除
- 支持按项目查询视频

---

## 📝 更新的文件

### 1. Schema 定义 (`lib/db/schema.ts`)

**新增**: `projects` 表定义

**更新**: `videos` 表
- 添加 `projectId` 外键字段

**新增类型导出**:
```typescript
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
```

### 2. 数据库初始化 (`lib/db/client.ts`)

**新增**: `projects` 表的 SQL CREATE TABLE 语句

**更新**: `videos` 表的 SQL CREATE TABLE 语句
- 添加 `project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE`

**新增索引**:
```sql
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_videos_project_id ON videos(project_id);
```

### 3. 数据库查询 (`lib/db/queries.ts`)

**新增**: `projectQueries` 对象,包含以下方法:

| 方法 | 说明 |
|------|------|
| `create(data)` | 创建新项目 |
| `getById(id)` | 根据 ID 获取项目 |
| `list(limit, offset)` | 获取项目列表 |
| `search(keyword, limit)` | 搜索项目（按名称） |
| `update(id, data)` | 更新项目信息 |
| `updateProgress(id, progress, currentStep?)` | 更新项目进度 |
| `delete(id)` | 删除项目（级联删除视频） |
| `getWithStats(id)` | 获取项目及视频统计信息 |

**新增**: `videoQueries.getByProjectId(projectId)`
- 根据项目 ID 获取所有视频

**更新**: `statsQueries.getOverview()`
- 添加项目统计信息

**更新**: 导出的 `queries` 对象
- 添加 `project: projectQueries`

---

## 🔄 数据库迁移

### 对于新数据库
如果还没有创建数据库,直接运行应用即可：
```bash
npm run dev
```

### 对于现有数据库
如果数据库已经存在,需要执行迁移：

**选项 1: 删除重建（开发环境）**
```bash
# POST /api/db/init
{
  "reset": true
}
```

**选项 2: 手动迁移**
```sql
-- 1. 创建 projects 表
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  progress INTEGER NOT NULL DEFAULT 0,
  current_step TEXT,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 2. 为现有 videos 表添加 project_id 字段
ALTER TABLE videos ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;

-- 3. 创建默认项目（将现有视频关联到默认项目）
INSERT INTO projects (name, description, status, progress, created_at, updated_at)
VALUES ('默认项目', '从旧版本迁移的视频', 'ready', 100, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 4. 更新现有视频的 project_id
UPDATE videos SET project_id = 1 WHERE project_id IS NULL;

-- 5. 设置 project_id 为必填
-- SQLite 不支持直接修改列为 NOT NULL，需要重建表
```

**⚠️ 重要提示**: 建议使用选项 1（删除重建）进行开发环境迁移。

---

## 📊 数据关系

```
projects (项目)
    ↓ 1:N
videos (视频)
    ↓ 1:N
    ├── shots (镜头)
    ├── storylines (故事线)
    └── highlights (高光候选)
```

**关系说明**:
- 一个项目包含多个视频
- 一个视频包含多个镜头、故事线、高光候选
- 删除项目会级联删除所有关联数据

---

## ✅ 验证

### 检查表是否创建成功
```typescript
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';

// 查询所有项目
const allProjects = await db.select().from(projects);

// 检查是否有新字段
console.log(allProjects[0]?.name);         // 应该有值
console.log(allProjects[0]?.progress);     // 应该有值
console.log(allProjects[0]?.currentStep);  // 应该有值或 undefined
```

### 测试项目查询
```typescript
import { projectQueries } from '@/lib/db/queries';

// 创建项目
const project = await projectQueries.create({
  name: '测试项目',
  description: '这是一个测试项目',
});

// 获取项目列表
const projects = await projectQueries.list();

// 搜索项目
const searchResults = await projectQueries.search('测试');

// 获取项目及统计
const projectWithStats = await projectQueries.getWithStats(project.id);
console.log(projectWithStats.videoCount);      // 视频数量
console.log(projectWithStats.totalDuration);   // 总时长
```

---

## 🎯 UI 现在可以...

1. ✅ 创建新项目
2. ✅ 显示项目列表
3. ✅ 搜索项目
4. ✅ 进入项目详情
5. ✅ 项目内上传视频
6. ✅ 项目内删除视频
7. ✅ 显示项目处理进度
8. ✅ 删除项目

---

## 📝 API 路由建议

以下是建议的 API 路由（需要 Agent Backend 实现）：

```
GET    /api/projects              - 获取项目列表
POST   /api/projects              - 创建新项目
GET    /api/projects/:id          - 获取项目详情
PUT    /api/projects/:id          - 更新项目信息
DELETE /api/projects/:id          - 删除项目
GET    /api/projects/search?q=    - 搜索项目

GET    /api/projects/:id/videos   - 获取项目的视频列表
POST   /api/projects/:id/videos   - 上传视频到项目
DELETE /api/videos/:id            - 删除视频
```

---

**Agent 4 完成！项目管理数据库层已就绪！🎉**
