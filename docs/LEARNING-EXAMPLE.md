# AI 学习流程使用指南

本文档说明如何使用杭州雷鸣项目的 AI 学习流程功能。

## 功能概述

AI 学习流程会自动分析项目中的历史标记数据，归纳剪辑技能和规律，生成可复用的技能文件。

## 工作流程

### 1. 数据准备

系统会读取项目中的以下数据：
- 视频文件（`hl_videos` 表）
- 历史标记数据（`hl_markings` 表）

### 2. 多模态提取

对每个视频：
- 提取关键帧（30 帧，均匀分布）
- Whisper 转录音频（中文）

### 3. Gemini 分析

基于标记点的时间戳，提取对应的关键帧和转录文本，调用 Gemini 分析：
- 归纳高光类型
- 归纳钩子类型
- 总结剪辑规则

### 4. 生成技能文件

生成 Markdown 格式的技能文件，保存到 `hl_skills` 表。

## API 使用

### 启动学习任务

**请求**:
```bash
POST /api/hangzhou-leiming/projects/{projectId}/learn
Content-Type: application/json

{
  "framesPerMarking": 30,              // 可选，默认 30
  "skipExistingFrames": true,          // 可选，默认 true
  "skipExistingTranscript": true       // 可选，默认 true
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "projectId": 1,
    "jobId": "learning-1-1234567890",
    "totalMarkings": 50,
    "totalVideos": 10,
    "message": "学习任务已启动，请通过 WebSocket 监听进度",
    "wsUrl": "ws://localhost:3001",
    "wsJobId": "learning-1-1234567890"
  }
}
```

### 查询学习状态

**请求**:
```bash
GET /api/hangzhou-leiming/projects/{projectId}/learn
```

**响应**:
```json
{
  "success": true,
  "data": {
    "projectId": 1,
    "status": "ready",
    "trainedAt": "2025-03-01T12:00:00.000Z",
    "skillsCount": 1,
    "skills": [
      {
        "id": 1,
        "name": "技能文件 v1.0",
        "version": "v1.0",
        "generatedFrom": "ai_learning",
        "totalMarkings": 50,
        "createdAt": "2025-03-01T12:00:00.000Z"
      }
    ],
    "message": "已生成 1 个技能文件"
  }
}
```

## WebSocket 进度监听

连接到 WebSocket 服务器监听学习进度：

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  // 订阅任务进度
  ws.send(JSON.stringify({
    type: 'progress',
    data: {
      jobId: 'learning-1-1234567890'
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'progress') {
    console.log(`进度: ${message.data.progress}% - ${message.data.message}`);
  } else if (message.type === 'complete') {
    console.log('学习完成！', message.data);
  } else if (message.type === 'error') {
    console.error('学习失败：', message.data.error);
  }
};
```

**进度阶段**:
- 5%: 读取项目数据和标记信息
- 10%: 提取关键帧和转录音频
- 50%: AI 分析中，归纳剪辑规律
- 80%: 生成剪辑技能文件
- 100%: 学习完成

## 生成的技能文件格式

技能文件是 Markdown 格式，包含以下部分：

### 1. 分析推理

总结学习过程和主要发现。

### 2. 高光类型

列出所有识别出的高光类型，每种类型包括：
- 名称和描述
- 视觉特征
- 听觉特征
- 示例时间点

### 3. 钩子类型

列出所有识别出的钩子类型，每种类型包括：
- 名称和描述
- 视觉特征
- 听觉特征
- 示例时间点

### 4. 剪辑规则

总结剪辑规律，每种场景包括：
- 时长建议
- 节奏建议
- 组合方式
- 切入/切出建议

## 示例技能文件

```markdown
# 剪辑技能文件

> 本文件由 AI 学习自动生成，基于历史标记数据归纳剪辑规律。

---

## 📊 分析推理

基于 50 个标记数据的分析，发现高光点主要集中在冲突爆发和情感高潮时刻，钩子点多出现在剧情反转和悬念设置处。建议剪辑时保留完整的冲突过程，突出情绪转折点。

---

## 🎯 高光类型

### 高能冲突

**描述**: 激烈的争吵或打斗场景，通常伴随强烈的情绪表达

**视觉特征**:
- 人物表情愤怒
- 动作幅度大
- 镜头切换快

**听觉特征**:
- 激烈的对白
- 紧张的配乐
- 打斗音效

**示例**:
- 00:35: 主角与反派激烈对峙

---

## ✂️ 剪辑规则

### 高能冲突场景

- **时长**: 60-90秒
- **节奏**: 快节奏剪辑，镜头切换频繁
- **组合方式**: 可单独使用，也可作为开场
- **切入**: 从冲突爆发点开始
- **切出**: 在冲突达到顶峰后戛然而止
```

## 错误处理

如果学习失败，系统会：

1. 通过 WebSocket 发送错误消息
2. 记录详细的错误日志
3. 不保存部分结果

常见错误：
- **项目没有视频**: 请先上传视频
- **项目没有标记数据**: 请先导入标记数据
- **Gemini API 错误**: 检查 API 密钥配置
- **关键帧提取失败**: 检查视频文件路径
- **音频转录失败**: 检查 FFmpeg 是否正确安装

## 性能优化

### 跳过已提取的数据

```json
{
  "skipExistingFrames": true,      // 跳过已提取的关键帧
  "skipExistingTranscript": true    // 跳过已转录的音频
}
```

### 控制帧数

```json
{
  "framesPerMarking": 15  // 减少提取的帧数（默认 30）
}
```

## 下一步

生成技能文件后，可以：

1. 在智能剪辑模块中使用技能文件
2. 手动编辑技能文件内容
3. 导出技能文件为 Markdown
4. 分享技能文件给其他项目

## 技术实现细节

详见：
- 核心流程: `lib/ai/learning-pipeline.ts`
- API 端点: `app/api/hangzhou-leiming/projects/[id]/learn/route.ts`
- Prompt 模板: `prompts/hl-learning.md`
- 单元测试: `tests/learning-pipeline.test.ts`
