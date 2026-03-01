# 杭州雷鸣 - 剪辑推荐引擎说明文档

## 概述

剪辑推荐引擎是杭州雷鸣项目的核心组件，负责根据 AI 自动标记结果生成智能剪辑推荐，并按广告转化效果排序。

## 核心功能

### 1. 组合生成

推荐引擎从 AI 标记（`hl_ai_markings` 表）中读取高光点和钩子点，生成所有可能的剪辑组合：

#### 1.1 单集组合
- **定义**：同一视频内的"高光点→钩子点"组合
- **条件**：
  - 高光点必须在钩子点之前
  - 总时长在用户设定的范围内
- **示例**：第1集的 00:15（高光点）到 02:08（钩子点）

#### 1.2 跨集组合
- **定义**：跨越不同视频的剪辑组合
- **条件**：
  - 高光点和钩子点来自不同的视频
  - 高光点所在集数必须早于钩子点所在集数
  - 总时长在用户设定的范围内
- **示例**：第1集的 00:45（高光点）+ 第2集的 01:55（钩子点）
- **配置**：可通过 `allowCrossEpisode` 参数控制是否启用

### 2. 多维评分算法

推荐引擎使用 5 个维度对每个组合进行评分，每个维度 0-10 分：

#### 2.1 冲突强度 (conflictScore)
**权重**：25%

**评分逻辑**：
```
高能冲突/对抗/争吵  → 9-10 分
身份揭露/曝光/真相  → 7-9 分
情感高潮/爆发       → 8-10 分
其他               → 5-8 分
```

**代码实现**：
```typescript
private static calculateConflictScore(highlights: Marking[]): number {
  const subType = highlight.subType.toLowerCase();

  if (subType.includes('冲突') || subType.includes('对抗')) {
    return 9 + Math.random(); // 9-10
  } else if (subType.includes('揭露') || subType.includes('曝光')) {
    return 7 + Math.random() * 2; // 7-9
  } else if (subType.includes('高潮') || subType.includes('爆发')) {
    return 8 + Math.random() * 2; // 8-10
  } else {
    return 5 + Math.random() * 3; // 5-8
  }
}
```

#### 2.2 情感共鸣 (emotionScore)
**权重**：25%

**评分逻辑**：
```
愤怒  → 9 分
震惊  → 8 分
恐惧  → 8 分
悲伤  → 7 分
紧张  → 6 分
好奇  → 5 分
其他  → 5 分
```

**计算方法**：取所有标记的情绪强度平均值

#### 2.3 悬念设置 (suspenseScore)
**权重**：25%

**评分逻辑**：
```
悬念结尾/未知      → 9-10 分
反转预告           → 7-9 分
情感余韵           → 6-8 分
其他               → 5-7 分
```

#### 2.4 节奏把握 (rhythmScore)
**权重**：15%

**评分逻辑**：
```
最佳时长（2-5分钟）    → 9-10 分
过短（< 2分钟）         → 5-8 分（按比例扣分）
过长（> 5分钟）         → 5-8 分（按比例扣分）
```

**最佳时长区间**：
- 最小：120000 毫秒（2 分钟）
- 最大：300000 毫秒（5 分钟）

#### 2.5 历史验证 (historyScore)
**权重**：10%

**当前实现**：返回默认值 6-8 分

**未来优化方向**：
- 对比技能文件中的历史高转化素材
- 使用向量相似度计算
- 基于规则匹配（相同类型 + 相似时长）

#### 2.6 综合得分计算

```
overallScore =
  conflictScore * 0.25 +
  emotionScore * 0.25 +
  suspenseScore * 0.25 +
  rhythmScore * 0.15 +
  historyScore * 0.10
```

**得分范围**：0-100 分

### 3. 智能排序

- **排序依据**：按 `overallScore` 降序排序
- **排名分配**：从 1 开始连续递增
- **Top 筛选**：默认返回前 20 个组合

### 4. 去重逻辑

**目的**：避免推荐过于相似的组合

**策略**：
- 生成组合签名：`{videoId}-{startSlot}-{endSlot}`
- 时间粒度：5 秒（5000ms）
- 规则：相同签名的组合只保留得分更高的那个

**示例**：
- 组合A：第1集 00:15.2 → 02:08.5
- 组合B：第1集 00:16.8 → 02:09.2
- 签名：`1-15000-120000`（两者相同，只保留一个）

### 5. 推荐理由生成

每个组合都会生成详细的推荐理由，包含以下信息：

1. **开场描述**：以「XXX」开场，立即抓住观众注意力
2. **结尾描述**：以「XXX」收尾，留下强烈悬念
3. **时长评价**：时长 X.X 分钟，节奏紧凑/适中
4. **转化率预测**：预计转化率：X.X%
5. **综合评价**：
   - ⭐ 推荐指数：极高，优先投放（≥85 分）
   - ⭐ 推荐指数：高，重点投放（≥75 分）
   - ⭐ 推荐指数：中，测试投放（≥65 分）
   - ⭐ 推荐指数：一般，备选投放（<65 分）

**示例**：
```
以「高能冲突」开场，立即抓住观众注意力；以「悬念结尾」收尾，
留下强烈悬念；时长 2.1 分钟，节奏紧凑；预计转化率：8.7%；
⭐ 推荐指数：极高，优先投放
```

### 6. 组合名称生成

**格式**：`{高光类型} + {钩子类型}`

**示例**：
- `高能冲突 + 悬念结尾`
- `身份揭露 + 反转预告`
- `情感高潮 + 情感余韵`

## API 使用

### 生成推荐

**端点**：`POST /api/hangzhou-leiming/projects/:id/recommend`

**请求体**：
```json
{
  "analysisId": 100,           // AI 分析任务 ID（必需）
  "minDurationMs": 120000,     // 最小时长：2 分钟（默认）
  "maxDurationMs": 300000,     // 最大时长：5 分钟（默认）
  "maxCombinations": 20,       // 最多返回数量：20（默认）
  "allowCrossEpisode": true    // 是否允许跨集：true（默认）
}
```

**响应**：
```json
{
  "success": true,
  "message": "成功生成 15 个剪辑推荐",
  "data": {
    "taskId": 100,
    "combinations": [
      {
        "id": 1,
        "name": "高能冲突 + 悬念结尾",
        "clips": [
          {
            "videoId": 1,
            "videoName": "第1集.mp4",
            "startMs": 15000,
            "endMs": 128000,
            "type": "高光点 → 钩子点",
            "subType": "高能冲突 → 悬念结尾"
          }
        ],
        "totalDurationMs": 113000,
        "overallScore": 87.3,
        "conflictScore": 9.2,
        "emotionScore": 8.5,
        "suspenseScore": 9.0,
        "rhythmScore": 8.8,
        "historyScore": 7.0,
        "reasoning": "以「高能冲突」开场，立即抓住观众注意力；以「悬念结尾」收尾...",
        "rank": 1
      }
    ],
    "total": 15
  }
}
```

### 查询推荐

**端点**：`GET /api/hangzhou-leiming/projects/:id/recommend?taskId=100`

**响应**：同上

## 数据库表结构

### hl_clip_combinations 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| analysisId | INTEGER | 关联分析任务 |
| name | TEXT | 组合名称 |
| clips | TEXT | 片段列表（JSON） |
| totalDurationMs | INTEGER | 总时长（毫秒） |
| overallScore | REAL | 综合得分（0-100） |
| conflictScore | REAL | 冲突强度（0-10） |
| emotionScore | REAL | 情感共鸣（0-10） |
| suspenseScore | REAL | 悬念设置（0-10） |
| rhythmScore | REAL | 节奏把握（0-10） |
| historyScore | REAL | 历史验证（0-10） |
| reasoning | TEXT | 推荐理由 |
| rank | INTEGER | 排名 |
| isSelected | BOOLEAN | 是否被用户选择 |
| createdAt | TIMESTAMP | 创建时间 |
| updatedAt | TIMESTAMP | 更新时间 |

## 算法优化方向

### 1. 性能优化
- ✅ 批量生成组合（避免 O(n²) 复杂度）
- ✅ 并发计算得分（使用 Promise.all）
- ✅ 早期过滤时长不符合的组合
- 🔄 索引优化（为 analysisId 添加索引）

### 2. 算法优化
- 🔄 历史验证模块（对比技能文件）
- 🔄 用户反馈学习（根据导出和转化数据调整权重）
- 🔄 A/B 测试支持（多版本推荐算法）

### 3. 边界情况处理
- ✅ 无标记情况：抛出异常
- ✅ 标记过少情况：返回空数组
- ✅ 所有组合超时长：返回空数组
- 🔄 单类型标记（只有高光或只有钩子）

## 单元测试

测试文件：`tests/recommendation-engine.test.ts`

**测试覆盖**：
- ✅ 组合生成逻辑（单集、跨集）
- ✅ 多维评分算法
- ✅ 排序逻辑
- ✅ 时长过滤
- ✅ 去重逻辑
- ✅ 边界情况处理
- ✅ 推荐理由生成
- ✅ 组合名称生成
- ✅ 性能测试

**运行测试**：
```bash
npm test -- tests/recommendation-engine.test.ts
```

## 文件清单

| 文件 | 说明 |
|------|------|
| `lib/ai/recommendation-engine.ts` | 推荐引擎核心实现 |
| `app/api/hangzhou-leiming/projects/[id]/recommend/route.ts` | 推荐 API 端点 |
| `tests/recommendation-engine.test.ts` | 单元测试 |
| `docs/RECOMMENDATION-ENGINE.md` | 本文档 |

## 版本历史

**v1.0** (2026-03-01)
- ✅ 初始版本
- ✅ 组合生成算法
- ✅ 多维评分算法
- ✅ 智能排序和去重
- ✅ API 集成
- ✅ 单元测试
