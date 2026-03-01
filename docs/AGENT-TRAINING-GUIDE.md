# 杭州雷鸣训练 Agent 使用指南

**版本**: v1.0
**更新时间**: 2025-03-01
**目标读者**: AI Agent（Claude Code、GPT-4等）

---

## 📖 文档目的

本文档指导 AI Agent 通过**对话交互**完成杭州雷鸣项目的训练流程，无需使用 Web UI。

### 核心原则

1. **对话驱动**：Agent通过问答收集必要信息
2. **API自动化**：Agent 自动调用所有必要的 API
3. **实时反馈**：Agent 实时监控进度并汇报
4. **错误恢复**：Agent 自动处理错误并重试

---

## 🎯 完整对话流程示例

### 示例 1：首次训练

```markdown
用户: 帮我训练杭州雷鸣项目，视频在 `/path/to/videos`，标记文件在 `/path/to/markings.xlsx`

Agent: 好的，我来帮你训练杭州雷鸣项目。

**第一步：检查项目**
首先让我检查现有项目...

API: GET /api/hangzhou-leiming/projects
结果: 找到项目"测试项目-重生暖宠" (ID: 1)

**第二步：上传视频**
检测到 3 个视频文件，开始上传...
- 第1集.mp4 (45.2MB) ✅
- 第2集.mp4 (42.8MB) ✅
- 第3集.mp4 (44.1MB) ✅

**第三步：导入标记文件**
正在导入 `/path/to/markings.xlsx`...
- 解析到 8 个标记点 ✅
- 高光点: 5个
- 钩子点: 3个

**第四步：启动训练**
🚀 开始训练项目 "测试项目-重生暖宠"...

训练进度:
- [10%] 提取关键帧和ASR转录...
  - 标记 1/8: 提取29帧关键帧 ✅
  - 标记 1/8: ASR转录 (144字) ✅
  ...
- [50%] AI深度分析...
  - 标记 1/8: Gemini分析完成 ✅
  - 标记 2/8: Gemini分析完成 ✅
  ...
- [95%] 生成技能文件...

✅ 训练完成！
- 技能文件: skill_v1.1772380171604.md
- 数据库记录ID: 5
- 下一版本: v1.2

**第五步：查看结果**
技能文件已保存，包含以下模式：
- 指责性对峙: 3个
- 身份曝光: 2个
- 悬念结尾: 3个

📉 训练统计：
- 总标记数: 8
- 高光点: 5个
- 钩子点: 3个
- 训练耗时: 5分32秒

🎉 训练成功完成！
```

### 示例 2：增量训练（螺旋式更新）

```markdown
用户: 继续训练这个项目，新视频在 `/data/new-episodes/`

Agent: 好的，我来为项目"测试项目-重生暖宠"进行增量训练。

**第一步：上传新视频**
检测到 2 个新视频文件...
- 第4集.mp4 ✅
- 第5集.mp4 ✅

**第二步：检查标记文件**
需要提供新视频对应的标记文件。
- Excel 标记文件在哪里？（必需）
- 或者告诉我新视频的标记点信息

用户: 标记文件在 `/data/new-episodes/markings.xlsx`

Agent: 收到！正在导入标记...

**第三步：启动训练**
📌 **螺旋式更新模式**
- 读取现有技能文件: v1.1 (2025-02-28)
- 新训练数据: 5个标记点
- 综合分析: 旧技能 + 新数据 → 更完善的新技能

训练进度:
- [10%] 特征提取...
- [50%] AI分析...
- [80%] 生成技能文件（螺旋式综合）...

✅ 增量训练完成！
- 旧技能: v1.1 (8个模式)
- 新技能: v1.2 (10个模式)
- 新增模式: 反转揭秘、情感爆发

📊 技能进化：
- 修正了 2 个现有规则的描述
- 补充了 2 个新模式
- 去除重复内容，保持简洁
```

---

## 🔧 API 调用序列

### 1. 获取项目列表

```bash
GET /api/hangzhou-leiming/projects

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "测试项目-重生暖宠",
      "description": "...",
      "videoCount": 5,
      "markingCount": 8
    }
  ]
}
```

### 2. 上传视频

```bash
POST /api/hangzhou-leiming/videos
Content-Type: multipart/form-data

FormData:
- file: <视频文件>
- projectId: <项目ID>
- episodeNumber: "第X集"
- displayTitle: "第X集"

Response:
{
  "success": true,
  "data": {
    "id": 123,
    "filename": "第1集.mp4",
    "durationMs": 45000
  }
}
```

**批量上传**：循环调用此 API，每次上传一个文件。

### 3. 导入 Excel 标记

```bash
POST /api/hangzhou-leiming/markings/import
Content-Type: multipart/form-data

FormData:
- file: <Excel文件>
- projectId: <项目ID>

Response:
{
  "success": true,
  "data": {
    "imported": 8,
    "skipped": 0,
    "markings": [...]
  }
}
```

### 4. 启动训练

```bash
POST /api/hangzhou-leiming/training-center/training
Content-Type: application/json

Body:
{
  "projectIds": [1, 2, ...]
}

Response:
{
  "success": true,
  "data": {
    "trainingId": 10,
    "projectId": 1
  }
}
```

### 5. 监控训练进度

**轮询**（每2秒一次）：

```bash
GET /api/hangzhou-leiming/training-center/history?limit=50

Response:
{
  "success": true,
  "data": [
    {
      "id": 10,
      "projectId": 1,
      "status": "training",  // training | completed | failed
      "progress": 45,
      "currentStep": "AI深度分析标记点",
      "errorMessage": null
    }
  ]
}
```

**轮询逻辑**：
```javascript
const pollInterval = setInterval(async () => {
  const response = await fetch('/api/hangzhou-leiming/training-center/history');
  const data = await response.json();

  const training = data.data.find(t => t.id === trainingId);

  if (training?.status === 'completed') {
    clearInterval(pollInterval);
    console.log('✅ 训练完成！');
  } else if (training?.status === 'failed') {
    clearInterval(pollInterval);
    console.log('❌ 训练失败:', training.errorMessage);
  }
}, 2000);
```

### 6. 查看技能文件

```bash
GET /api/hangzhou-leiming/training-center/skills

Response:
{
  "success": true,
  "data": [
    {
      "id": 5,
      "projectId": 1,
      "version": "v1.3",
      "filePath": "/data/.../skill_v1.md",
      "content": "..."
    }
  ]
}
```

---

## 📝 对话脚本设计

### 阶段 1：信息收集

```
Agent: 我需要以下信息来帮你训练杭州雷鸣项目：

【必需信息】
1. 项目信息：
   - 现有项目ID？还是创建新项目？
   - 项目名称是什么？

2. 视频文件：
   - 视频文件在哪里？（目录路径）
   - 如何命名集数？（如 "第1集"、"第2集"）

3. 标记文件：
   - Excel 标记文件在哪里？
   - 格式是否正确？（必需列：集数、时间点、标记类型）

【可选信息】
- 是否有现有技能文件需要继承？（螺旋式更新）

请提供这些信息，我会自动完成训练。
```

### 阶段 2：确认和执行

```
Agent: 我已收集到以下信息：

📦 项目: "测试项目-重生暖宠" (ID: 1)
📹 视频: 3 个文件
📊 标记: 8 个标记点

即将开始训练，预计耗时 5-10 分钟。

确认开始？[y/n]
```

### 阶段 3：进度报告

```
Agent: 训练进行中...

[████████░░░░░░] 45% - AI深度分析

已完成:
- ✅ 关键帧提取: 8/8 (232帧)
- ✅ ASR转录: 8/8 (1200字)
- 🔄 AI分析: 5/8 完成

预计剩余时间: 3分钟
```

### 阶段 4：结果汇报

```
Agent: ✅ 训练完成！

📊 训练结果:
- 训练ID: #10
- 技能文件: skill_v1.4.md (15KB)
- 标记覆盖: 8个
- 新增模式: 3个

📈 技能进化:
- 上一版本: v1.3 (10个模式)
- 当前版本: v1.4 (12个模式)
- 优化内容: 修正2个规则，补充2个模式

💡 建议下一步:
1. 在新视频上测试技能文件
2. 收集人工校验反馈
3. 继续训练优化

需要我帮你查看技能文件内容吗？
```

---

## 🚨 错误处理

### 常见错误及解决方案

#### 错误 1: 视频上传失败

```
❌ 上传失败: "文件格式不支持"

Agent: 检测到视频文件格式问题。

【解决方案】
请确认：
1. 文件是有效的视频文件（.mp4, .mov, .avi等）
2. 文件没有损坏
3. 文件大小不超过 2GB

建议：
- 使用 FFmpeg 转换为标准格式：
  ffmpeg -i input.mov -c:v libx264 output.mp4

重试上传？[y/n]
```

#### 错误 2: Excel 解析失败

```
❌ 导入失败: "缺少必需列：集数"

Agent: Excel 文件格式不正确。

【解决方案】
Excel 必需包含以下列：
- ✅ 集数 (如 "第1集")
- ✅ 时间点 (如 "00:35" 或 "1:20")
- ✅ 标记类型 ("高光点" 或 "钩子点")

可选列：
- 描述 (如 "高能冲突")

【参考】
- 下载示例文件: GET /api/hangzhou-leiming/markings/example
- 查看格式说明

需要我帮你检查 Excel 文件吗？
```

#### 错误 3: Gemini 安全拦截

```
⚠️ AI 分析遇到安全拦截，正在降级到 DeepSeek...

Agent: 部分内容触发了 Gemini 的安全过滤器。

【自动处理】
✅ 已自动降级到 DeepSeek 分析
✅ 降级成功率: 100%
✅ 训练继续进行，不会中断

【原因】
- 某些视频帧可能包含敏感内容
- 这是正常的安全机制，不影响训练结果

✅ 降级处理完成，训练继续...
```

#### 错误 4: 训练超时

```
Agent: 训练耗时超过预期，正在处理中...

【状态检查】
- 关键帧提取: ✅ 完成
- ASR 转录: ✅ 完成
- AI 分析: 🔄 进行中...
- 技能生成: ⏳ 等待中...

【原因】
- 视频数量较多（>10个标记）
- Gemini API 响应慢
- 网络延迟

【建议】
⏳ 继续等待，或：
1. 稍后查看结果: GET /api/hangzhou-leiming/training-center/history
2. 查看训练日志: [日志文件路径]
```

---

## 🔍 监控和调试

### 方法 1: 轮询进度 API

```javascript
// 每 2 秒查询一次
setInterval(async () => {
  const res = await fetch('/api/hangzhou-leiming/training-center/history');
  const data = await res.json();
  const training = data.data.find(t => t.id === trainingId);

  console.log(`进度: ${training.progress}% - ${training.currentStep}`);
}, 2000);
```

### 方法 2: 查看服务器日志

```bash
# 实时查看服务器日志
tail -f /tmp/dev-server-*.log | grep -E "(训练|分析|完成|失败)"

# 查看最近的训练日志
tail -100 /tmp/dev-server-*.log | grep "训练#"
```

### 方法 3: WebSocket 实时日志（推荐）

```javascript
// 连接 WebSocket
const ws = new WebSocket('ws://localhost:3001');

// 订阅训练日志
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'training_log',
  }));
};

// 接收实时日志
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'training_log' && data.data.trainingId === trainingId) {
    console.log(`[${data.data.level}] ${data.data.message}`);
  }
};
```

---

## 📊 完整对话示例（含错误处理）

```markdown
用户: 帮我训练杭州雷鸣，项目ID 1，新视频在 `/data/videos/`

Agent: 好的，我来为项目 1 添加新视频并训练。

**第一步：检查视频文件**
扫描 `/data/videos/` 目录...
找到 3 个视频文件：
- ep1.mp4 (35.2 MB)
- ep2.mp4 (42.1 MB)
- ep3.mp4 (38.9 MB)

**第二步：上传视频**
开始上传...
✅ ep1.mp4 - 成功 (视频ID: 45)
✅ ep2.mp4 - 成功 (视频ID: 46)
❌ ep3.mp4 - 失败: "视频格式不支持"

【问题诊断】
ep3.mp4 可能是损坏的或不支持的格式。

【解决方案】
1. 跳过 ep3.mp4，继续上传其他视频
2. 或尝试修复：
   bash
   ffmpeg -i /data/videos/ep3.mp4 -c:v libx264 -c:a aac ep3_fixed.mp4

是否跳过 ep3.mp4，继续训练？[y/n]

用户: y

Agent: 已跳过 ep3.mp4，继续训练...

**第三步：导入标记文件**
需要提供标记文件。Excel 文件在哪里？

用户: 在 `/data/markings-ep1-2.xlsx`

Agent: 收到！正在导入标记...

⚠️ 导入警告: "第3集的标记时间点超出视频时长"

【问题】
第3集的某个标记点（如 10:30）超过了视频总时长（10:15）。

【自动处理】
- 已跳过无效标记
- 有效标记: 7个

**第四步：启动训练**
🚀 开始训练...

训练进度:
- [10%] 特征提取...
- ⚠️ [第5个标记] Gemini安全拦截，降级到 DeepSeek... ✅
- [50%] AI分析...
- [95%] 生成技能文件...

✅ 训练完成！

📊 结果:
- 处理标记: 7个（1个被跳过）
- 技能文件: skill_v1.5.md
- Gemini成功: 6个
- DeepSeek降级: 1个
- 训练耗时: 6分12秒

💡 建议:
1. 检查第3集视频时长
2. 重新提取 ep3.mp3 的有效标记
3. 继续训练以完善技能文件
```

---

## 🎯 快速开始模板

对于 AI Agent，建议按照以下模板进行对话：

### 信息收集模板

```
你好！我来帮你训练杭州雷鸣项目。需要以下信息：

1️⃣ 项目信息
   - 项目ID是多少？还是需要创建新项目？
   - 项目名称是什么？

2️⃣ 视频文件
   - 视频文件在哪个目录？
   - 需要我自动识别集数吗？

3️⃣ 标记文件
   - Excel 标记文件路径？
   - 或者直接告诉我标记点信息

请提供以上信息，我会自动完成所有步骤。
```

### 进度报告模板

```
🔄 训练进行中...

【进度】{{progress}}%
【当前步骤】{{currentStep}}

【已完成】
{{completed_steps}}

【剩余时间】约 {{estimated_time}}

【实时日志】
{{recent_logs}}
```

### 结果汇报模板

```
✅ 训练完成！

📊 基本信息
- 训练ID: #{{training_id}}
- 项目: {{project_name}}
- 标记数: {{marking_count}}

📈 技能文件
- 版本: {{version}}
- 文件: {{file_name}}
- 大小: {{file_size}}
- 模式数: {{pattern_count}}

🎯 技能进化
- 上一版本: {{old_version}}
- 新增模式: {{new_patterns}}
- 优化内容: {{improvements}}

💡 下一步建议
{{next_steps}}
```

---

## 🔧 技术细节

### 训练流程架构

```
┌─────────────────┐
│  对话交互层       │
│  (收集信息)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API 调用层      │
│  (自动化执行)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  监控和汇报层    │
│  (实时反馈)      │
└─────────────────┘
```

### 关键API端点汇总

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/hangzhou-leiming/projects` | GET | 获取项目列表 |
| `/api/hangzhou-leiming/videos` | POST | 上传视频 |
| `/api/hangzhou-leiming/markings/import` | POST | 导入Excel |
| `/api/hangzhou-leiming/training-center/training` | POST | 启动训练 |
| `/api/hangzhou-leiming/training-center/history` | GET | 查询进度 |
| `/api/hangzhou-leiming/training-center/skills` | GET | 查看技能 |

### 数据流

```
用户输入 (对话)
    ↓
Agent 收集信息
    ↓
调用 API (自动化)
    ↓
上传文件 → 导入标记 → 启动训练
    ↓
监控进度 (轮询 + WebSocket)
    ↓
完成 → 汇报结果 → 保存技能文件
```

---

## 📌 注意事项

1. **文件路径**
   - 所有路径应该是**绝对路径**或相对于项目根目录的路径
   - Agent 需要 `fs` 模块读取文件

2. **错误处理**
   - 网络错误：自动重试3次
   - API错误：解析错误信息，提供解决方案
   - 文件错误：检查文件格式，建议修复方法

3. **超时设置**
   - 上传超时：每个文件 5 分钟
   - 训练超时：最长 30 分钟
   - API 超时：10 秒

4. **并发控制**
   - 视频上传：串行（避免服务器过载）
   - API 调用：轮询间隔 2 秒

---

## 🎓 最佳实践

### 对话设计原则

1. **清晰明确**：一次性收集所有必需信息
2. **确认机制**：关键操作前请求确认
3. **实时反馈**：每完成一个步骤立即汇报
4. **错误恢复**：遇到错误自动提供解决方案

### API 调用原则

1. **幂等性**：相同操作可以安全重试
2. **事务性**：相关操作依次执行，失败时回滚
3. **验证性**：每步执行后验证结果
4. **可监控**：所有操作都有进度反馈

### 监控原则

1. **实时性**：2秒轮询 + WebSocket 实时推送
2. **可见性**：进度条 + 日志流
3. **容错性**：网络中断自动重连
4. **完整性**：训练完成后保存结果

---

## 📚 参考资源

- **API文档**：`docs/API.md`
- **数据库Schema**：`lib/db/schema.ts`
- **训练Executor**：`lib/training/executor.ts`
- **Prompt模板**：`prompts/hangzhou-leiming/training/`

---

**文档维护者**: Claude Code Agent
**最后更新**: 2025-03-01
**版本历史**: v1.0 (初版)
