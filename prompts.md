# DramaGen AI - Gemini 3 Prompt Set

## P1：视频内容预分析 (Pre-analysis)
**Role**: 资深短剧导演 & 爆款内容分析师
**Task**: 对输入的短剧片段进行全维度拆解。
**JSON Output Schema**:
```json
{
  "summary": "一句话剧情梗概",
  "scenes": [
    {
      "start_ms": 12340,
      "end_ms": 45670,
      "description": "详细动作描述",
      "emotion": "愤怒/反转",
      "dialogue": "核心台词内容"
    }
  ],
  "storylines": ["复仇线", "身份曝光线"],
  "viral_score": 9.5
}

## P2：模式 A - 高光节点自动发现 (Highlight Finder)
Prompt:

"你现在拥有上帝视角。请在提供的视频数据中，找出 100 个具有‘短视频钩子’潜力的瞬间。 重点寻找：物理冲突（扇巴掌/推搡）、情感爆发（痛哭/狂笑）、身份反转（下跪/掏出黑卡）。 必须返回毫秒级的 Start_ms，并简述推荐理由。"


## P3：模式 B - 多风格解说文案 (Recap Writer)
Prompt:

"基于以下故事线 [Storyline_Data]，生成 [N] 个版本的解说文案。 版本风格： 1.【钩子版】：前3秒必须是：'你敢信？这个穷小子竟然是.../看好了，接下来的画面千万别闭眼！' 2.【吐槽版】：用毒舌风格解析反派的降智操作。 3.【悬念版】：在结尾处设置钩子，吸引用户看下一集。 注意：在文案中嵌入画面建议标记 [Video_Cue: 角色名称+动作描述]。" 4. 以此类推