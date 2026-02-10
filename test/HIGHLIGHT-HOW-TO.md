# 高光切片功能使用指南

## 📋 功能说明

高光切片模式可以自动检测视频中的病毒传播时刻，并支持毫秒级精确微调。

## 🚀 使用方法

### 方法 1：通过 Web 界面（推荐）

1. **访问高光切片页面**
   ```
   http://localhost:3000/highlight
   ```

2. **点击"AI 一键生成高光切片"按钮**
   - 系统会自动调用 Gemini 3 分析视频
   - 检测病毒传播时刻（反转、冲突、身份曝光等）
   - 自动生成高光切片候选列表

3. **查看结果**
   - 检测完成后，页面会自动刷新
   - 右侧显示所有检测到的高光时刻
   - 每个高光包含：时间范围、爆款分数、推荐理由

4. **毫秒级微调**
   - 选择一个高光切片
   - 使用左侧的微调拨盘调整开始/结束时间
   - 支持 ±100ms、±500ms、±1000ms 精度

5. **渲染切片**
   - 点击切片卡片上的"..."
   - 选择"加入渲染队列"
   - 等待渲染完成

### 方法 2：通过命令行触发

**使用 TypeScript 脚本：**
```bash
# 为视频 ID 4 触发高光检测
npm run ts-node -- test/trigger-highlights.ts 4

# 为其他视频触发（指定视频ID）
npm run ts-node -- test/trigger-highlights.ts 5
```

**使用 Shell 脚本：**
```bash
# 为视频 ID 4 触发高光检测
./test/trigger-highlights.sh 4

# 为其他视频触发
./test/trigger-highlights.sh 5
```

### 方法 3：通过 API 直接调用

**触发高光检测：**
```bash
curl -X POST http://localhost:3000/api/videos/4/highlights/detect
```

**获取高光列表：**
```bash
curl http://localhost:3000/api/videos/4/highlights
```

**渲染高光切片：**
```bash
# 假设高光 ID 为 1
curl -X POST http://localhost:3000/api/highlights/1/render
```

## 📊 数据流程

```
视频上传 → Gemini 分析 → 检测高光时刻 → 保存到数据库
                                     ↓
                              前端显示列表
                                     ↓
                              用户微调时间
                                     ↓
                              添加到渲染队列
                                     ↓
                              FFmpeg 切片
                                     ↓
                              导出最终视频
```

## 🎯 高光检测说明

### 检测类型

Gemini 3 会自动识别以下类型的高光时刻：

1. **反转场景** (reversal)
   - 身份曝光
   - 真相揭露
   - 意外转折

2. **冲突爆发** (conflict)
   - 打脸桥段
   - 争吵对峙
   - 肢体冲突

3. **情感高潮** (emotional)
   - 哭戏爆发
   - 情感宣泄
   - 温馨时刻

4. **剧情高潮** (climax)
   - 关键抉择
   - 命运转折
   - 终极对决

### 爆款分数

每个高光都会获得 0-100 的爆款分数：
- **90-100**：强烈推荐，病毒传播潜力极高
- **80-89**：推荐，有较好的传播潜力
- **70-79**：一般，可以作为备选
- **<70**：较弱，不建议使用

## 🔧 故障排查

### 问题 1：点击"AI 一键生成"没有反应

**可能原因**：
- Redis 服务未启动
- BullMQ Worker 未运行

**解决方案**：
```bash
# 检查 Redis
redis-cli ping
# 应该返回: PONG

# 启动 Redis（如果未运行）
# macOS:
brew services start redis
# Linux:
sudo systemctl start redis
```

### 问题 2：高光检测一直卡在"检测中"

**可能原因**：
- Gemini API 调用失败
- 视频文件路径错误
- 网络连接问题

**解决方案**：
```bash
# 检查 Worker 日志
# 查看 BullMQ Worker 的输出

# 检查 API 配置
cat .env.local | grep GEMINI
```

### 问题 3：检测完成但没有数据

**可能原因**：
- Gemini 没有检测到高光时刻
- 数据库写入失败

**解决方案**：
```bash
# 查看数据库中的高光数据
sqlite3 data/dramagen.db "SELECT * FROM highlights;"

# 查看最近的任务
sqlite3 data/dramagen.db "SELECT * FROM queue_jobs ORDER BY created_at DESC LIMIT 5;"
```

## 📝 注意事项

1. **视频状态**：只有状态为 `ready` 的视频才能进行高光检测
2. **检测时间**：根据视频长度，检测可能需要 30 秒到几分钟
3. **API 限制**：Gemini API 有调用频率限制，不要频繁触发
4. **数据存储**：检测数据会保存在 `highlights` 表中，可以重复使用

## 🎨 UI 功能说明

### 切片卡片

每个高光切片卡片包含：

- **来源标签**：AI 生成 / 手动新增
- **状态标签**：pending / in_queue / completed
- **名称**：高光时刻的简短描述
- **时间范围**：开始时间 → 结束时间（毫秒精度）
- **时长**：切片总时长
- **爆款分数**：AI 评估的病毒传播潜力
- **推荐理由**：为什么这个时刻是高光

### 操作菜单

点击切片卡片右上角的"..."可以：

- **编辑**：将切片时间加载到微调拨盘
- **加入渲染队列**：触发 FFmpeg 切片任务
- **删除**：从列表中移除（不删除数据库记录）

## 🚀 下一步

高光切片渲染完成后：

1. 查看 `outputs/highlights/` 目录
2. 下载生成的视频文件
3. 可以用于短视频平台发布

## 📚 相关文档

- [CLAUDE.md](../CLAUDE.md) - 项目开发指南
- [ROADMAP.md](../ROADMAP.md) - 项目路线图
- [lib/queue/workers.ts](../lib/queue/workers.ts) - Worker 实现细节
