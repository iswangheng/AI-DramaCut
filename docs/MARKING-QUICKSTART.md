# 智能标记功能 - 快速开始

## 5分钟上手指南

### 步骤 1: 启动开发服务器

```bash
npm run dev
```

服务器启动在：
- Web: http://localhost:3000
- WebSocket: ws://localhost:3001

---

### 步骤 2: 创建项目和上传视频

```bash
# 创建项目
curl -X POST http://localhost:3000/api/hangzhou-leeming/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试项目",
    "description": "用于测试智能标记功能"
  }'

# 上传视频（假设项目ID=1）
curl -X POST http://localhost:3000/api/hangzhou-leeming/projects/1/videos \
  -F "file=@test-video.mp4" \
  -F "episodeNumber=第1集"
```

---

### 步骤 3: 创建技能文件（可选）

```bash
curl -X POST http://localhost:3000/api/hangzhou-leeming/projects/1/skills \
  -H "Content-Type: application/json" \
  -d '{
    "name": "复仇剧技能",
    "content": "# 高光点定义\n- 高能冲突: 激烈对抗场面\n- 身份揭露: 真实身份揭示"
  }'
```

---

### 步骤 4: 启动 AI 分析

```bash
curl -X POST http://localhost:3000/api/hangzhou-leeming/projects/1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "skillId": 1,
    "minDurationMs": 30000,
    "maxDurationMs": 180000
  }'
```

**响应示例**:
```json
{
  "success": true,
  "taskId": 100,
  "projectId": 1,
  "videoCount": 1,
  "message": "分析任务已启动"
}
```

---

### 步骤 5: 查看分析进度

#### 方法 1: HTTP 轮询

```bash
curl http://localhost:3000/api/hangzhou-leeming/projects/1/analyze?taskId=100
```

#### 方法 2: WebSocket 实时订阅

```javascript
// 连接 WebSocket
const ws = new WebSocket('ws://localhost:3001');

// 订阅任务进度
ws.addEventListener('open', () => {
  ws.send(JSON.stringify({
    type: 'progress',
    data: { jobId: 'marking-100-xxxxxxxx' }
  }));
});

// 监听进度消息
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  console.log('进度:', message.data.progress);
  console.log('步骤:', message.data.message);
});
```

---

### 步骤 6: 查看标记结果

```bash
# 分析完成后，查看标记列表
curl http://localhost:3000/api/hangzhou-leeming/projects/1/analyze?taskId=100
```

**响应示例**:
```json
{
  "success": true,
  "task": {
    "status": "completed",
    "progress": 100,
    "highlightsFound": 5,
    "hooksFound": 3
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

---

## 常见问题

### Q: 分析任务一直处于 "analyzing" 状态？

**A**: 检查 WebSocket 连接是否正常，查看服务器日志：

```bash
# 查看实时日志
npm run dev

# 或查看标记流程日志
grep "智能标记" logs/app.log
```

---

### Q: 标记数量很少（< 3个）？

**A**: 可能的原因：
1. 视频内容缺少高光时刻
2. 技能文件定义过于严格
3. Gemini API 识别失败（使用降级方案）

**解决方案**:
- 检查视频内容质量
- 调整技能文件标准
- 降低置信度阈值

---

### Q: 如何提高标记准确率？

**A**:
1. **优化技能文件**: 明确定义高光点和钩子点的类型
2. **人工审核**: 确认高置信度标记（score ≥ 8.0）
3. **调整时间**: 手动微调标记的起止时间
4. **迭代优化**: 根据实际效果调整 Prompt

---

## 进阶使用

### 自定义技能文件

技能文件定义了识别标准，可以针对不同剧集类型定制：

```markdown
# 复仇剧专用技能

## 高光点定义
- **打脸时刻**: 主角反击，打脸反派
- **真相揭露**: 揭露反派阴谋
- **情感爆发**: 主角痛哭或愤怒

## 钩子点定义
- **复仇预告**: 暗示即将复仇
- **身份反转**: 主角身份即将揭晓
```

### 调整时长范围

根据目标平台调整：

```json
{
  "minDurationMs": 15000,  // TikTok: 15秒
  "maxDurationMs": 60000   // TikTok: 60秒
}
```

或

```json
{
  "minDurationMs": 60000,   // YouTube Shorts: 60秒
  "maxDurationMs": 180000  // YouTube: 3分钟
}
```

---

## 性能优化建议

### 1. 增加关键帧密度

编辑 `lib/ai/marking-pipeline.ts`:

```typescript
const result = await extractKeyframes({
  videoPath: video.filePath,
  frameCount: 50, // 默认30，增加到50提高精度
  filenamePrefix: `frame_${video.id}`,
});
```

### 2. 降低置信度阈值

编辑 `lib/ai/marking-pipeline.ts`:

```typescript
// 过滤：置信度 < 6.0 的标记（默认7.0）
const filteredMarkings = deduplicatedMarkings.filter(m => m.score >= 6.0);
```

### 3. 调整去重阈值

编辑 `lib/ai/marking-pipeline.ts`:

```typescript
// 去重：时间接近的标记合并（3秒内，默认5秒）
const deduplicatedMarkings = this.deduplicateMarkings(allMarkings, 3000);
```

---

## 获取帮助

- **详细文档**: `docs/MARKING-PIPELINE-GUIDE.md`
- **测试报告**: `docs/MARKING-PIPELINE-TEST.md`
- **开发总结**: `docs/MARKING-IMPLEMENTATION-SUMMARY.md`

---

## 下一步

1. ✅ 运行完整的标记流程
2. ✅ 查看和分析标记结果
3. ✅ 人工审核和调整标记
4. ✅ 导出剪辑组合
5. ✅ 生成最终视频

**祝使用愉快！🎉**
