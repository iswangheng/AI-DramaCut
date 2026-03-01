# 杭州雷鸣 - 智能标记功能使用指南

## 功能概述

智能标记功能根据技能文件自动标记视频中的高光点和钩子点，使用 Gemini 3 AI 模型进行视频理解。

**核心流程**:
1. 上传视频到项目
2. 创建或选择技能文件
3. 启动 AI 分析
4. 查看标记结果
5. 导出剪辑组合

---

## API 使用

### 1. 启动分析任务

**端点**: `POST /api/hangzhou-leiming/projects/:id/analyze`

**请求参数**:
```json
{
  "skillId": 1,           // 技能文件 ID（必需）
  "minDurationMs": 30000, // 最小时长（毫秒，可选）
  "maxDurationMs": 180000 // 最大时长（毫秒，可选）
}
```

**响应示例**:
```json
{
  "success": true,
  "taskId": 100,
  "projectId": 1,
  "videoCount": 5,
  "message": "分析任务已启动"
}
```

**cURL 示例**:
```bash
curl -X POST http://localhost:3000/api/hangzhou-leiming/projects/1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "skillId": 1,
    "minDurationMs": 30000,
    "maxDurationMs": 180000
  }'
```

---

### 2. 查询分析状态

**端点**: `GET /api/hangzhou-leiming/projects/:id/analyze?taskId=xxx`

**响应示例**:
```json
{
  "success": true,
  "task": {
    "id": 100,
    "status": "analyzing",
    "progress": 65,
    "currentStep": "分析第 2/5 段",
    "highlightsFound": 8,
    "hooksFound": 5,
    "errorMessage": null
  },
  "markings": [
    {
      "id": 1,
      "videoId": 1,
      "type": "高光点",
      "subType": "高能冲突",
      "startMs": 15000,
      "score": 9.2,
      "reasoning": "男女主角激烈争吵，情绪爆发"
    }
  ],
  "combinations": [...]
}
```

**状态说明**:
- `pending`: 等待开始
- `analyzing`: 正在分析
- `completed`: 分析完成
- `error`: 分析失败

---

### 3. WebSocket 实时进度

**连接地址**: `ws://localhost:3001`

**订阅消息**:
```json
{
  "type": "progress",
  "data": {
    "jobId": "marking-100-1234567890"
  }
}
```

**进度消息**:
```json
{
  "type": "progress",
  "data": {
    "jobId": "marking-100-1234567890",
    "progress": 50,
    "message": "分析第 2/5 段 - 已发现 8 个标记"
  }
}
```

**完成消息**:
```json
{
  "type": "complete",
  "data": {
    "jobId": "marking-100-1234567890",
    "totalMarkings": 13,
    "highlights": 8,
    "hooks": 5
  }
}
```

**错误消息**:
```json
{
  "type": "error",
  "data": {
    "jobId": "marking-100-1234567890",
    "error": "Gemini API 调用失败"
  }
}
```

---

## 技能文件

### 创建技能文件

技能文件定义了高光点和钩子点的识别标准。

**示例内容**:
```markdown
# 短剧剪辑技能标准

## 高光点定义
- **高能冲突**: 人物之间的激烈对抗、争吵、打斗场面
- **身份揭露**: 真实身份的揭示、秘密的曝光
- **情感高潮**: 角色情感爆发的时刻（痛哭、愤怒、震惊）
- **反转时刻**: 剧情发生突变的节点

## 钩子点定义
- **悬念结尾**: 在关键时刻截断，引发观众好奇
- **反转预告**: 暗示即将发生的剧情反转
- **疑问设置**: 通过对话或画面提出问题
- **冲突预告**: 预示即将爆发的矛盾冲突

## 评分标准
- 情绪强度: 0-10分
- 戏剧冲突: 0-10分
- 观众吸引力: 0-10分
```

### API 创建技能

**端点**: `POST /api/hangzhou-leiming/projects/:id/skills`

**请求参数**:
```json
{
  "name": "复仇剧技能",
  "content": "# 技能内容...",
  "highlightTypes": {
    "高能冲突": "激烈对抗场面",
    "身份揭露": "真实身份揭示"
  },
  "hookTypes": {
    "悬念结尾": "关键时刻截断"
  }
}
```

---

## 标记结果说明

### 标记类型

#### 高光点
- **时间点**: 视频中的精彩时刻
- **用途**: 剪辑组合的开场
- **类型**: 高能冲突、身份揭露、情感高潮、反转时刻

#### 钩子点
- **时间点**: 让人想继续看的时刻
- **用途**: 剪辑组合的结尾
- **类型**: 悬念结尾、反转预告、疑问设置、冲突预告

### 标记字段

| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | number | 标记 ID |
| videoId | number | 关联视频 ID |
| type | string | 标记类型（高光点 / 钩子点） |
| subType | string | 子类型（高能冲突、悬念结尾等） |
| startMs | number | 时间点（毫秒） |
| score | number | 置信度（0-10） |
| reasoning | string | AI 推理说明 |
| isConfirmed | boolean | 用户是否确认 |
| customStartMs | number | 用户自定义开始时间 |
| customEndMs | number | 用户自定义结束时间 |

---

## 剪辑组合

### 组合生成规则

AI 自动生成"高光点 → 钩子点"的组合：

1. **同一视频内**: 高光点和钩子点必须来自同一视频
2. **时长过滤**: 只保留符合时长要求的组合
3. **得分排序**: 按综合得分降序排列
4. **Top 10**: 只返回得分最高的 10 个组合

### 组合字段

| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | number | 组合 ID |
| name | string | 组合名称（如：高能冲突 + 悬念结尾） |
| clips | array | 片段列表 |
| totalDurationMs | number | 总时长（毫秒） |
| overallScore | number | 综合得分（0-100） |
| conflictScore | number | 冲突强度（0-10） |
| emotionScore | number | 情感共鸣（0-10） |
| suspenseScore | number | 悬念设置（0-10） |
| rank | number | 排名（1-10） |

---

## 错误处理

### 常见错误

#### 1. 技能文件不存在
```json
{
  "success": false,
  "error": "技能文件不存在"
}
```

**解决方案**: 检查 skillId 是否正确

#### 2. 项目中没有视频
```json
{
  "success": false,
  "error": "项目中没有视频"
}
```

**解决方案**: 先上传视频到项目

#### 3. Gemini API 调用失败
```json
{
  "success": false,
  "error": "Gemini API 调用失败"
}
```

**解决方案**:
- 检查 API Key 配置
- 检查网络连接
- 查看服务器日志

---

## 最佳实践

### 1. 技能文件优化

- ✅ 明确定义高光点和钩子点的类型
- ✅ 提供详细的评分标准
- ✅ 根据实际数据迭代优化

### 2. 视频质量要求

- ✅ 分辨率 ≥ 720p
- ✅ 帧率 25-60 fps
- ✅ 音质清晰（用于转录）

### 3. 时长设置建议

- **短视频** (< 2分钟): minDurationMs=15000, maxDurationMs=60000
- **中视频** (2-5分钟): minDurationMs=30000, maxDurationMs=120000
- **长视频** (5-10分钟): minDurationMs=60000, maxDurationMs=180000

### 4. 标记质量提升

- ✅ 人工审核 AI 标记结果
- ✅ 确认高置信度标记（score ≥ 8.0）
- ✅ 调整低置信度标记的起止时间
- ✅ 补充漏掉的标记点

---

## 性能优化

### 分段处理

- 自动将长视频分成 2-3 分钟段
- 并行调用 Gemini API 分析
- 聚合和去重结果

### 缓存策略

- 关键帧提取结果缓存
- 音频转录结果缓存
- 避免重复处理

### 降级方案

如果 Gemini API 失败，自动使用基于时长的估算标记：

- 高光点：1/4、1/2、3/4 处
- 钩子点：视频后期（-30s、-15s）

---

## 监控和日志

### 查看实时进度

```bash
# WebSocket 连接
ws://localhost:3001

# 订阅任务进度
{"type":"progress","data":{"jobId":"marking-100-xxx"}}
```

### 查看服务器日志

```bash
# 查看所有日志
npm run dev

# 查看标记流程日志
grep "智能标记" logs/app.log
```

### 性能监控

```bash
# 查看处理时间
grep "分析完成" logs/app.log

# 查看标记数量
grep "共找到" logs/app.log
```

---

## 故障排查

### 问题: 分析任务一直处于 "analyzing" 状态

**原因**:
- WebSocket 连接断开
- 服务器进程崩溃

**解决方案**:
1. 检查 WebSocket 连接状态
2. 重启开发服务器
3. 查看服务器日志

### 问题: 标记数量很少（< 3个）

**原因**:
- 视频内容质量低
- 技能文件定义过于严格
- Gemini API 识别准确率低

**解决方案**:
1. 检查视频内容是否有高光时刻
2. 调整技能文件标准
3. 降低置信度阈值（过滤 score < 7.0）

### 问题: 标记时间不准确

**原因**:
- 关键帧采样密度不够
- Gemini 时间戳估算偏差

**解决方案**:
1. 增加关键帧数量（frameCount: 30 → 50）
2. 手动调整标记时间
3. 人工审核标记结果

---

## 附录

### A. 默认技能文件

如果未指定技能文件，系统使用默认技能：

- **高光点类型**: 高能冲突、身份揭露、情感高潮、反转时刻
- **钩子点类型**: 悬念结尾、反转预告、疑问设置、冲突预告
- **评分标准**: 情绪强度、戏剧冲突、观众吸引力

### B. 配置文件

环境变量配置（.env.local）:

```bash
# Gemini API
GEMINI_API_KEY=your_api_key
GEMINI_ENDPOINT=https://generativelanguage.googleapis.com

# 或使用 yunwu.ai 代理（国内用户）
YUNWU_API_KEY=your_yunwu_key
```

### C. 相关文档

- **技术文档**: `杭州雷鸣-短剧剪辑-技术文档.md`
- **产品需求**: `杭州雷鸣-短剧剪辑-PRD.md`
- **测试报告**: `docs/MARKING-PIPELINE-TEST.md`
