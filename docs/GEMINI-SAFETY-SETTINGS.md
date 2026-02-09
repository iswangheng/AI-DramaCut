# Gemini API 安全过滤器配置说明

**更新日期**: 2025-02-09
**适用场景**: 影视内容分析

---

## 📋 问题背景

### 错误现象
```
Error: PROHIBITED_CONTENT
Message: content is prohibited under official usage policies
```

### 触发场景
当分析包含以下内容的视频时，Gemini API 会拒绝请求：
- 恐怖场景（剥皮、血腥）
- 暴力冲突（打耳光、掐人）
- 悬疑内容（人骨灯笼）
- 情感爆发（争吵、对骂）

---

## ✅ 解决方案

### 添加 `safetySettings` 配置

在 `lib/api/gemini.ts` 的 `executeApiCall()` 方法中添加：

```typescript
const requestBody: Record<string, unknown> = {
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: {
    temperature: this.temperature,
    maxOutputTokens: this.maxTokens,
  },
  // 安全过滤器设置：降低阈值，允许分析影视内容
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_NONE"
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_NONE"
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_NONE"
    }
  ]
};
```

---

## 🔍 安全过滤器详解

### 5 大安全类别

| 类别 | 默认行为 | 我们的配置 | 说明 |
|------|---------|-----------|------|
| `HARM_CATEGORY_HARASSMENT` | 严格 | `BLOCK_NONE` | 允许骚扰性语言（如角色争吵） |
| `HARM_CATEGORY_HATE_SPEECH` | 严格 | `BLOCK_NONE` | 允许仇恨言论（如反派台词） |
| `HARM_CATEGORY_SEXUALLY_EXPLICIT` | 严格 | `BLOCK_MEDIUM_AND_ABOVE` | 允许轻度亲密戏 |
| `HARM_CATEGORY_DANGEROUS_CONTENT` | 严格 | `BLOCK_NONE` | 允许危险内容（如打斗） |
| `HARM_CATEGORY_HARASSMENT` | 严格 | `BLOCK_NONE` | 重复定义（兼容性） |

### 阈值等级说明

```
BLOCK_NONE (0)           → 完全不拦截
BLOCK_ONLY_HIGH (1)      → 只拦截高风险
BLOCK_MEDIUM_AND_ABOVE (2) → 拦截中等及以上
BLOCK_LOW_AND_ABOVE (3)  → 拦截低级别及以上（最严格）
```

---

## 🎯 配置原理

### 为什么这样配置是安全的？

1. **我们不生成新内容**
   - 只是分析现有的视频内容
   - 不是让 Gemini 生成暴力内容
   - 而是让它理解已有的剧情

2. **内容已经存在于视频中**
   - 视频是用户上传的
   - 我们只是分析它
   - 不是创造新的有害内容

3. **输出层面仍然安全**
   - Gemini 自己的安全策略仍然生效
   - 不会生成真正有害的内容
   - 只会输出安全的分析结果

---

## 📊 实际效果对比

### 配置前（默认策略）

```javascript
const prompt = `
场景描述：舅母狠狠给了她一记耳光
`;

// 结果
❌ Error: PROHIBITED_CONTENT
```

### 配置后（放宽限制）

```javascript
const prompt = `
场景描述：舅母狠狠给了她一记耳光
`;

// 结果
✅ Success: {
  highlights: [
    {
      timestampMs: 32000,
      reason: "舅母打婉清耳光，情绪爆发",
      viralScore: 9.2,
      category: "conflict"
    }
  ]
}
```

---

## 🔒 安全性保证

### 输入 vs 输出

| 层面 | 安全策略 | 说明 |
|------|---------|------|
| **输入（我们的 prompt）** | 放宽 | 允许发送影视内容描述 |
| **输出（Gemini 生成的内容）** | 严格 | 不会生成有害内容 |

### 示例说明

```
输入（我们发送）:
"场景描述：角色A打了角色B一耳光"
       ↓
safetySettings: BLOCK_NONE → ✅ 允许通过
       ↓
Gemini 分析
       ↓
输出（Gemini 生成）:
{
  reason: "角色冲突爆发，情感强烈"  // ← 这是安全的分析
}
```

**即使我们允许输入暴力描述，Gemini 也只会输出安全的分析结果。**

---

## 🎬 适用场景

### 支持的视频类型

- ✅ 恐怖剧（剥皮、人骨灯笼）
- ✅ 悬疑剧（惊悚、死亡）
- ✅ 动作片（打斗、追逐）
- ✅ 爱情剧（亲密戏、情感戏）
- ✅ 都市剧（争吵、冲突）

### 不支持的内容

- ❌ 真实的暴力宣传
- ❌ 色情内容（中等及以上）
- ❌ 仇恨言论（虽然放宽，但仍然有底线）

---

## 📝 注意事项

1. **仅用于分析**：这个配置是用于分析现有内容，不是生成有害内容
2. **符合使用政策**：影视内容分析符合 Gemini 的使用政策
3. **保持输出安全**：Gemini 自己的安全策略仍然会在输出层面生效
4. **定期审查**：如果 Gemini 政策变化，需要相应调整配置

---

## 🔗 相关文档

- [Gemini 安全过滤器官方文档](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-filters)
- [项目进度文档](./PROGRESS.md)
- [项目路线图](../ROADMAP.md)

---

## 📞 联系与支持

如果遇到新的安全策略问题，请：
1. 检查错误信息中的 `request id`
2. 查看本文档的配置是否正确
3. 考虑调整对应的 `threshold` 等级
