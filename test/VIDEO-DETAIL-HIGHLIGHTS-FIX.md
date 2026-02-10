# 视频详情页面 - 高光片段重新检测功能

## 📋 问题描述

在素材管理界面，查看视频详情的"高光片段"标签时，显示为空。原因：
1. 数据库 `highlights` 表中没有数据
2. 之前的检测任务可能失败了
3. 需要手动触发重新检测

## ✅ 已完成的功能

在视频详情页面（`/videos/[id]`）的"高光片段"标签中添加了：

### 1. **"重新检测"按钮**
- 位置：高光片段卡片的右上角
- 显示条件：当高光列表为空且视频状态为 `ready` 时显示
- 功能：点击后触发 `detect-highlights` 任务

### 2. **检测状态指示器**
- 检测中：显示旋转的加载图标 + 提示文字
- 检测完成后：30秒后自动刷新页面数据

### 3. **智能提示**
根据不同状态显示不同提示：
- `analyzing`："正在 AI 分析中..."
- `ready`："点击右上角的'重新检测'按钮开始 AI 分析"
- 其他状态："当前视频状态: [状态]"

## 🚀 使用方法

### 方式 1：通过 Web 界面（推荐）

1. **访问项目详情页面**
   ```
   http://localhost:3000/projects
   ```

2. **选择一个项目**，进入项目详情页

3. **点击某个视频**，进入视频详情页

4. **切换到"高光片段"标签**
   - 如果有数据显示高光列表
   - 如果没有数据，点击右上角的"重新检测"按钮

5. **等待检测完成**
   - 按钮显示"检测中..."
   - 30秒后页面自动刷新
   - 高光片段数据出现

### 方式 2：通过命令行触发

```bash
# 为视频 ID 4 触发高光检测
npm run ts-node -- test/trigger-highlights.ts 4

# 使用 Shell 脚本
./test/trigger-highlights.sh 4
```

### 方式 3：通过 API 直接调用

```bash
curl -X POST http://localhost:3000/api/videos/4/highlights/detect
```

## 📊 数据流程

```
用户点击"重新检测"按钮
    ↓
调用 POST /api/videos/4/highlights/detect
    ↓
添加任务到 BullMQ 队列
    ↓
Worker 调用 Gemini 3 检测高光
    ↓
保存到数据库 highlights 表
    ↓
30秒后前端自动刷新
    ↓
显示高光片段列表 ✅
```

## 🔧 修改的文件

### `app/videos/[id]/page.tsx`

**新增功能**：
1. 导入 `Loader2` 和 `RefreshCw` 图标
2. 添加 `isDetecting` 状态
3. 添加 `handleRedetectHighlights()` 函数
4. 在高光片段卡片头部添加"重新检测"按钮
5. 改进空状态显示（检测中/检测前）

**代码片段**：
```typescript
// 重新检测高光片段
const handleRedetectHighlights = async () => {
  if (!video || isDetecting) return;

  try {
    setIsDetecting(true);

    const response = await fetch(`/api/videos/${videoId}/highlights/detect`, {
      method: 'POST',
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ 高光检测任务已添加到队列');

      // 30秒后自动刷新数据
      setTimeout(() => {
        fetch(`/api/videos/${videoId}/highlights`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setHighlights(data.data || []);
            }
          });
      }, 30000);
    }
  } catch (error) {
    console.error('触发高光检测失败:', error);
  } finally {
    setIsDetecting(false);
  }
};
```

## 🎨 UI 效果

### 空状态（检测前）
```
┌────────────────────────────────────────┐
│ 高光片段                     [重新检测] │
│ AI 自动检测的最精彩片段...            │
├────────────────────────────────────────┤
│                                        │
│              ✨                         │
│        暂无高光片段数据                │
│  点击右上角的"重新检测"按钮开始分析    │
│                                        │
└────────────────────────────────────────┘
```

### 检测中
```
┌────────────────────────────────────────┐
│ 高光片段                   [🔄 检测中...] │
│ AI 自动检测的最精彩片段...            │
├────────────────────────────────────────┤
│                                        │
│            ⟳ (旋转)                    │
│      正在调用 AI 检测高光片段...       │
│      检测完成后会自动刷新页面          │
│                                        │
└────────────────────────────────────────┘
```

### 检测完成（有数据）
```
┌────────────────────────────────────────┐
│ 高光片段                                │
│ AI 自动检测的最精彩片段...            │
├────────────────────────────────────────┤
│ ✨ 高光  00:12:34        ⭐ 9.8       │
│ 身份曝光场景，情感爆发                 │
│ [反转场景]                             │
├────────────────────────────────────────┤
│ ✨ 高光  00:25:18        ⭐ 9.4       │
│ 冲突爆发，打脸桥段                     │
│ [冲突爆发]                             │
└────────────────────────────────────────┘
```

## 🐛 故障排查

### 问题 1：点击"重新检测"没有反应

**可能原因**：
- Redis 服务未启动
- BullMQ Worker 未运行

**解决方案**：
```bash
# 检查 Redis
redis-cli ping

# 启动 Redis
brew services start redis  # macOS
sudo systemctl start redis  # Linux
```

### 问题 2：一直显示"检测中"

**可能原因**：
- Gemini API 调用失败
- 视频文件路径错误
- 网络连接问题

**解决方案**：
```bash
# 查看 Worker 日志
# 检查 BullMQ Worker 的控制台输出

# 查看数据库
sqlite3 data/dramagen.db "SELECT * FROM queue_jobs ORDER BY created_at DESC LIMIT 5;"
```

### 问题 3：检测完成但还是空

**可能原因**：
- Gemini 没有检测到高光时刻
- 数据库写入失败

**解决方案**：
```bash
# 查看高光数据
sqlite3 data/dramagen.db "SELECT * FROM highlights WHERE videoId = 4;"

# 查看任务日志
sqlite3 data/dramagen.db "SELECT * FROM queue_jobs WHERE jobType = 'detect-highlights' ORDER BY created_at DESC LIMIT 1;"
```

## 📝 注意事项

1. **视频状态**：只有状态为 `ready` 的视频才能进行高光检测
2. **检测时间**：根据视频长度，检测可能需要 30 秒到几分钟
3. **自动刷新**：30秒后会自动刷新页面，也可以手动刷新
4. **API 限制**：Gemini API 有调用频率限制，不要频繁点击

## 🎯 下一步

检测完成后的操作：
1. 查看高光片段列表
2. 选择感兴趣的高光片段
3. 可以进行毫秒级微调（使用高光切片模式）
4. 添加到渲染队列
5. 导出最终视频

## 📚 相关文档

- [test/HIGHLIGHT-HOW-TO.md](./HIGHLIGHT-HOW-TO.md) - 高光切片完整使用指南
- [app/api/videos/[id]/highlights/route.ts](../../app/api/videos/[id]/highlights/route.ts) - API 实现
- [lib/queue/workers.ts](../../lib/queue/workers.ts) - Worker 实现
