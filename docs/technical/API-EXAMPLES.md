# API 使用示例

本文档提供 Gemini 和 ElevenLabs API 的实际使用示例。

---

## Gemini 3 API 使用示例

### 1. 视频分析

```typescript
import { geminiClient } from '@/lib/api/gemini';

async function analyzeVideoExample() {
  // 准备视频关键帧（采样以降低 Token 消耗）
  const sampleFrames = [
    'base64_frame_1',
    'base64_frame_2',
    'base64_frame_3',
  ];

  // 分析视频
  const result = await geminiClient.analyzeVideo(
    '/path/to/video.mp4',
    sampleFrames
  );

  if (result.success && result.data) {
    console.log('剧情梗概:', result.data.summary);
    console.log('场景数量:', result.data.scenes.length);
    console.log('爆款分数:', result.data.viralScore);

    // 遍历场景
    result.data.scenes.forEach((scene, index) => {
      console.log(`场景 ${index + 1}:`);
      console.log(`  时间: ${scene.startMs}ms - ${scene.endMs}ms`);
      console.log(`  描述: ${scene.description}`);
      console.log(`  情绪: ${scene.emotion}`);
      console.log(`  爆款分数: ${scene.viralScore}`);
    });
  }
}
```

### 2. 高光时刻检测

```typescript
import { geminiClient } from '@/lib/api/gemini';

async function findHighlightsExample() {
  // 先进行视频分析
  const analysisResult = await geminiClient.analyzeVideo(videoPath, frames);

  if (!analysisResult.success || !analysisResult.data) {
    return;
  }

  // 检测 50 个高光时刻
  const highlightsResult = await geminiClient.findHighlights(
    analysisResult.data,
    50
  );

  if (highlightsResult.success && highlightsResult.data) {
    highlightsResult.data.forEach((highlight, index) => {
      console.log(`高光 ${index + 1}:`);
      console.log(`  时间戳: ${highlight.timestampMs}ms`);
      console.log(`  理由: ${highlight.reason}`);
      console.log(`  类型: ${highlight.category}`);
      console.log(`  爆款分数: ${highlight.viralScore}`);
      console.log(`  建议时长: ${highlight.suggestedDuration}秒`);
    });
  }
}
```

### 3. 故事线提取

```typescript
import { geminiClient } from '@/lib/api/gemini';

async function extractStorylinesExample() {
  // 先进行视频分析
  const analysisResult = await geminiClient.analyzeVideo(videoPath, frames);

  if (!analysisResult.success || !analysisResult.data) {
    return;
  }

  // 提取故事线
  const storylinesResult = await geminiClient.extractStorylines(
    analysisResult.data
  );

  if (storylinesResult.success && storylinesResult.data) {
    storylinesResult.data.forEach((storyline) => {
      console.log(`故事线: ${storyline.name}`);
      console.log(`  ID: ${storyline.id}`);
      console.log(`  描述: ${storyline.description}`);
      console.log(`  吸引力分数: ${storyline.attractionScore}`);
      console.log(`  场景数: ${storyline.scenes.length}`);
    });
  }
}
```

### 4. 解说文案生成

```typescript
import { geminiClient } from '@/lib/api/gemini';

async function generateRecapExample() {
  // 选择一条故事线
  const storyline = {
    id: 'storyline-1',
    name: '复仇主线',
    description: '女主从被陷害到成功复仇',
    scenes: [],
    attractionScore: 9.5,
  };

  // 生成多种风格的解说文案
  const scriptsResult = await geminiClient.generateRecapScripts(storyline, [
    'hook',      // 钩子版
    'roast',     // 吐槽版
    'suspense',  // 悬念版
  ]);

  if (scriptsResult.success && scriptsResult.data) {
    scriptsResult.data.forEach((script) => {
      console.log(`风格: ${script.style}`);
      console.log(`标题: ${script.title}`);
      console.log(`预计时长: ${script.estimatedDurationMs}ms`);

      script.paragraphs.forEach((paragraph, index) => {
        console.log(`段落 ${index + 1}:`);
        console.log(`  文案: ${paragraph.text}`);
        console.log(`  建议画面: ${paragraph.videoCues.join(', ')}`);
      });
    });
  }
}
```

---

## ElevenLabs API 使用示例

### 1. 获取语音列表

```typescript
import { elevenlabsClient } from '@/lib/api/elevenlabs';

async function getVoicesExample() {
  // 获取用户自己的语音
  const result = await elevenlabsClient.getVoices();

  if (result.success && result.data) {
    console.log(`共有 ${result.data.voices.length} 个语音`);

    result.data.voices.forEach((voice) => {
      console.log(`  - ${voice.name} (${voice.voice_id})`);
      console.log(`    类别: ${voice.category}`);
      console.log(`    语言: ${voice.language}`);
      console.log(`    性别: ${voice.gender}`);
    });
  }
}
```

### 2. 获取共享语音库

```typescript
import { elevenlabsClient } from '@/lib/api/elevenlabs';

async function getSharedVoicesExample() {
  // 获取专业的中文语音
  const result = await elevenlabsClient.getSharedVoices({
    pageSize: 20,
    language: 'chinese',
    category: 'professional',
    featured: true,
  });

  if (result.success && result.data) {
    console.log(`找到 ${result.data.voices.length} 个语音`);

    result.data.voices.forEach((voice) => {
      console.log(`  - ${voice.name}`);
      console.log(`    ID: ${voice.voice_id}`);
      console.log(`    描述: ${voice.description}`);
      console.log(`    性别: ${voice.gender}`);
      console.log(`    年龄: ${voice.age}`);
      console.log(`    口音: ${voice.accent}`);
    });
  }
}
```

### 3. 文本转语音

```typescript
import { elevenlabsClient } from '@/lib/api/elevenlabs';
import { writeFileSync } from 'fs';

async function textToSpeechExample() {
  // 生成语音
  const result = await elevenlabsClient.textToSpeech({
    text: '你好，这是一个测试。我是 DramaGen AI 的语音助手。',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah 语音
    modelId: 'eleven_multilingual_v2',
    outputFormat: 'mp3_44100_128',
    stability: 0.5,
    similarityBoost: 0.75,
  });

  if (result.success && result.data) {
    // 保存音频文件
    const outputPath = './output/test.mp3';
    writeFileSync(outputPath, result.data.audioBuffer);
    console.log(`音频已保存到: ${outputPath}`);
    console.log(`格式: ${result.data.format}`);
    console.log(`大小: ${result.data.audioBuffer.length} 字节`);
  }
}
```

### 4. 批量文本转语音

```typescript
import { elevenlabsClient } from '@/lib/api/elevenlabs';
import { writeFileSync } from 'fs';

async function batchTextToSpeechExample() {
  const paragraphs = [
    '第一段解说词',
    '第二段解说词',
    '第三段解说词',
  ];

  // 批量生成
  const result = await elevenlabsClient.batchTextToSpeech(paragraphs, {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    outputFormat: 'mp3_44100_128',
  });

  if (result.success && result.data) {
    // 保存每个音频片段
    result.data.forEach((audio, index) => {
      const outputPath = `./output/segment_${index + 1}.mp3`;
      writeFileSync(outputPath, audio.audioBuffer);
      console.log(`音频片段 ${index + 1} 已保存: ${outputPath}`);
    });
  }
}
```

### 5. 选择合适的语音

```typescript
import { elevenlabsClient } from '@/lib/api/elevenlabs';

async function chooseVoiceExample() {
  // 根据视频类型选择合适的语音
  const videoType = 'serious_drama'; // 严肃剧

  let targetVoiceId: string;

  switch (videoType) {
    case 'serious_drama':
      // 选择成熟、稳重的女性语音
      targetVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah
      break;

    case 'comedy':
      // 选择活泼、俏皮的语音
      targetVoiceId = 'FGY2WhTYpPnrIDTdsKH5'; // Laura
      break;

    case 'narration':
      // 选择深沉、有磁性的男性语音
      targetVoiceId = 'CwhRBWXzGAHq8TQ4Fs17'; // Roger
      break;

    default:
      targetVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel (默认)
  }

  // 使用选定的语音生成 TTS
  const result = await elevenlabsClient.textToSpeech({
    text: '你的解说词',
    voiceId: targetVoiceId,
  });

  return result;
}
```

---

## 完整工作流示例：模式 B（解说矩阵）

```typescript
import { geminiClient } from '@/lib/api/gemini';
import { elevenlabsClient } from '@/lib/api/elevenlabs';
import { writeFileSync } from 'fs';

async function recapMatrixWorkflow() {
  // 步骤 1: 分析视频
  console.log('步骤 1: 正在分析视频...');
  const analysisResult = await geminiClient.analyzeVideo(videoPath, frames);
  if (!analysisResult.success) {
    throw new Error('视频分析失败');
  }

  // 步骤 2: 提取故事线
  console.log('步骤 2: 正在提取故事线...');
  const storylinesResult = await geminiClient.extractStorylines(
    analysisResult.data
  );
  if (!storylinesResult.success) {
    throw new Error('故事线提取失败');
  }

  // 选择最吸引人的故事线
  const bestStoryline = storylinesResult.data
    .sort((a, b) => b.attractionScore - a.attractionScore)[0];

  console.log(`选择故事线: ${bestStoryline.name}`);

  // 步骤 3: 生成解说文案
  console.log('步骤 3: 正在生成解说文案...');
  const scriptsResult = await geminiClient.generateRecapScripts(
    bestStoryline,
    ['hook', 'roast', 'suspense']
  );
  if (!scriptsResult.success) {
    throw new Error('文案生成失败');
  }

  // 步骤 4: 生成语音
  console.log('步骤 4: 正在生成语音...');
  for (const script of scriptsResult.data) {
    // 合并所有段落
    const fullText = script.paragraphs
      .map((p) => p.text)
      .join('\n');

    // 生成 TTS
    const ttsResult = await elevenlabsClient.textToSpeech({
      text: fullText,
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah
    });

    if (ttsResult.success && ttsResult.data) {
      // 保存音频
      const outputPath = `./output/${script.style}_recap.mp3`;
      writeFileSync(outputPath, ttsResult.data.audioBuffer);
      console.log(`✅ ${script.style} 版本解说已生成: ${outputPath}`);
    }
  }

  console.log('🎉 解说矩阵生成完成！');
}

// 执行工作流
recapMatrixWorkflow().catch(console.error);
```

---

## 错误处理示例

```typescript
import { geminiClient, elevenlabsClient } from '@/lib/api';

async function withErrorHandling() {
  try {
    // Gemini API 调用
    const analysisResult = await geminiClient.analyzeVideo(videoPath, frames);

    if (!analysisResult.success) {
      console.error('视频分析失败:', analysisResult.error);
      // 处理错误，可能重试或使用默认值
      return;
    }

    // ElevenLabs API 调用
    const ttsResult = await elevenlabsClient.textToSpeech({
      text: '解说词',
    });

    if (!ttsResult.success) {
      console.error('TTS 生成失败:', ttsResult.error);
      // 处理错误
      return;
    }

    // 成功处理
    console.log('所有 API 调用成功');

  } catch (error) {
    // 捕获未预期的错误
    console.error('发生异常:', error);
  }
}
```

---

## 性能优化建议

### 1. 降低 Gemini Token 消耗

```typescript
// ✅ 好的做法：采样关键帧
const sampleFrames = extractKeyFrames(video, {
  maxFrames: 30,        // 最多 30 帧
  interval: 2000,       // 每 2 秒采样一次
  resolution: '720p',   // 使用较低分辨率
});

// ❌ 不好的做法：上传完整视频
const fullVideoFrames = extractAllFrames(video); // Token 消耗巨大
```

### 2. 批量处理 TTS

```typescript
// ✅ 好的做法：批量调用
const result = await elevenlabsClient.batchTextToSpeech(paragraphs);

// ❌ 不好的做法：串行调用
for (const paragraph of paragraphs) {
  await elevenlabsClient.textToSpeech({ text: paragraph });
}
```

### 3. 缓存 API 结果

```typescript
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, any>({ max: 100 });

async function cachedAnalysis(videoPath: string) {
  // 检查缓存
  const cached = cache.get(videoPath);
  if (cached) {
    return cached;
  }

  // 调用 API
  const result = await geminiClient.analyzeVideo(videoPath, frames);

  // 存入缓存
  if (result.success) {
    cache.set(videoPath, result);
  }

  return result;
}
```

---

**最后更新**: 2025-02-08
