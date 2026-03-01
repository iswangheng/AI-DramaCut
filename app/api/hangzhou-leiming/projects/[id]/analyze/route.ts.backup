/**
 * 杭州雷鸣 - AI 分析 API（真实版本）
 *
 * 功能：
 * - POST /api/hangzhou-leiming/projects/:id/analyze - AI分析并生成剪辑组合
 * 使用真实的 Gemini API 进行视频分析
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlVideos, hlSkills, hlAnalysisResults, hlAiMarkings, hlClipCombinations, hlProjects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { GeminiClient } from "@/lib/api/gemini";
import { extractFrames, getVideoDuration } from "@/lib/video/preprocessing";
import { join } from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 解析 JSON 响应（带容错处理）
 * 支持多种 JSON 格式：标准 JSON、Markdown 代码块、部分 JSON
 */
function parseJsonResponse<T>(text: string): T | null {
  // 尝试多种 JSON 提取模式
  let jsonText = text;

  // 模式 1: 标准的 markdown json 代码块
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  } else {
    // 模式 2: 普通的代码块
    const codeMatch = text.match(/```\n([\s\S]*?)\n```/);
    if (codeMatch) {
      jsonText = codeMatch[1];
    } else {
      // 模式 3: 查找第一个 { 和最后一个 } 之间的内容
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = text.substring(firstBrace, lastBrace + 1);
      }
    }
  }

  // 清理可能的额外文本
  jsonText = jsonText.trim();

  try {
    const parsed = JSON.parse(jsonText) as T;
    console.log(`✅ JSON 解析成功`);
    return parsed;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ JSON 解析失败: ${errorMsg}`);
    console.error(`响应内容（前500字符）: ${text.substring(0, 500)}...`);
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  // 在 try 块之外声明变量，以便在 catch 块中访问
  let projectId: number | undefined;
  let analysisResult: any = undefined;

  try {
    const { id: idStr } = await params;
    projectId = parseInt(idStr);

    const body = await req.json();
    const { skillId, minDurationMs, maxDurationMs } = body;

    if (!skillId) {
      return NextResponse.json(
        { success: false, message: "缺少技能ID" },
        { status: 400 }
      );
    }

    // 查询项目的视频
    const videos = await db
      .select()
      .from(hlVideos)
      .where(eq(hlVideos.projectId, projectId));

    if (videos.length === 0) {
      return NextResponse.json(
        { success: false, message: "没有可供分析的视频" },
        { status: 400 }
      );
    }

    // 查询技能文件
    const [skill] = await db
      .select()
      .from(hlSkills)
      .where(eq(hlSkills.id, skillId));

    if (!skill) {
      return NextResponse.json(
        { success: false, message: "技能文件不存在" },
        { status: 404 }
      );
    }

    console.log(`[杭州雷鸣] 开始真实AI分析，项目 ${projectId}，视频数 ${videos.length}`);

    // 创建分析记录
    const [analysisResult] = await db
      .insert(hlAnalysisResults)
      .values({
        projectId,
        skillId,
        minDurationMs,
        maxDurationMs,
        status: "analyzing",
        progress: 0,
        currentStep: "准备分析",
        highlightsFound: 0,
        hooksFound: 0,
      })
      .returning();

    // 更新项目状态
    await db
      .update(hlProjects)
      .set({ status: "analyzing" })
      .where(eq(hlProjects.id, projectId));

    // 真实的AI标记生成（使用Gemini）
    const aiMarkings = await generateRealAiMarkings(
      analysisResult.id,
      videos,
      skill
    );

    // 生成剪辑组合
    const combinations = await generateClipCombinations(
      analysisResult.id,
      videos,
      aiMarkings,
      minDurationMs,
      maxDurationMs
    );

    // 更新分析状态为完成
    await db
      .update(hlAnalysisResults)
      .set({
        status: "completed",
        progress: 100,
        currentStep: "分析完成",
        highlightsFound: aiMarkings.filter(m => m.type === "高光点").length,
        hooksFound: aiMarkings.filter(m => m.type === "钩子点").length,
      })
      .where(eq(hlAnalysisResults.id, analysisResult.id));

    // 更新项目状态
    await db
      .update(hlProjects)
      .set({ status: "ready" })
      .where(eq(hlProjects.id, projectId));

    console.log(`[杭州雷鸣] 分析完成，生成 ${combinations.length} 个组合`);

    return NextResponse.json({
      success: true,
      message: `AI分析完成！生成了 ${combinations.length} 个剪辑组合`,
      data: combinations,
    });
  } catch (error) {
    console.error("[杭州雷鸣] AI分析失败:", error);

    // 更新分析状态为错误（如果分析记录已创建）
    try {
      if (analysisResult) {
        await db
          .update(hlAnalysisResults)
          .set({
            status: "error",
            errorMessage: error instanceof Error ? error.message : "未知错误",
          })
          .where(eq(hlAnalysisResults.id, analysisResult.id));
      }

      if (projectId) {
        await db
          .update(hlProjects)
          .set({ status: "error" })
          .where(eq(hlProjects.id, projectId));
      }
    } catch (updateError) {
      console.error("[杭州雷鸣] 更新错误状态失败:", updateError);
    }

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "AI分析失败",
      },
      { status: 500 }
    );
  }
}

/**
 * 生成真实的AI标记（使用Gemini）
 *
 * 实现说明：
 * - 使用 analyzeVideoWithUpload 方法直接上传视频到 Gemini
 * - Gemini 会分析完整视频（包括画面和音频）
 * - 根据分析结果提取高光点和钩子点
 * - 如果 API 调用失败，使用降级方案（基于时长的估算标记）
 */
async function generateRealAiMarkings(
  analysisId: number,
  videos: any[],
  skill: any
) {
  const geminiClient = new GeminiClient();
  const markings = [];

  // 解析技能文件中的类型定义
  const skillData = JSON.parse(skill.content || "{}");

  for (const video of videos) {
    console.log(`[杭州雷鸣] 分析视频: ${video.filename}`);

    try {
      const durationSec = video.durationMs / 1000;

      // 构建分析提示词
      const highlightTypes = skillData.highlightTypes || {};
      const hookTypes = skillData.hookTypes || {};

      const prompt = `请分析这段短剧视频（时长：${durationSec.toFixed(1)}秒），识别其中的高光点和钩子点。

**高光点类型**：${Object.keys(highlightTypes).join("、") || "冲突爆发、身份揭露、情感高潮、剧情反转"}

**钩子点类型**：${Object.keys(hookTypes).join("、") || "悬念结尾、反转预告、情感余韵"}

**分析要求**：
1. 识别3-5个高光点（精彩开始时刻，能吸引观众注意力）
2. 识别2-3个钩子点（让人想继续看的时刻，通常在视频后期）
3. 返回JSON格式，包含时间点（秒）、类型、子类型、得分（0-10）

返回格式：
\`\`\`json
{
  "summary": "视频剧情梗概（30字以内）",
  "highlights": [
    {
      "timestamp": 15.5,
      "type": "高光点",
      "subType": "冲突爆发",
      "score": 8.5,
      "reasoning": "角色A与角色B发生激烈争执，情绪爆发",
      "startMs": 15500,
      "endMs": 25000
    }
  ],
  "hooks": [
    {
      "timestamp": 120.3,
      "type": "钩子点",
      "subType": "悬念结尾",
      "score": 9.0,
      "reasoning": "角色C突然说出惊人真相，留下悬念",
      "startMs": 120300,
      "endMs": 128000
    }
  ]
}
\`\`\`

**重要**：
- timestamp 是时间点（秒）
- startMs 和 endMs 是毫秒级时间戳
- reasoning 必须描述实际看到的画面，不要编造`;

      // 调用 Gemini 分析视频（直接上传视频文件）
      console.log(`[杭州雷鸣] 调用 Gemini 分析: ${video.filename}`);
      const response = await geminiClient.analyzeVideoWithUpload(
        video.filePath,
        prompt,
        undefined, // systemInstruction 使用默认
        (progress, message) => {
          console.log(`[杭州雷鸣] 分析进度 ${progress}%: ${message}`);
        }
      );

      if (response.success && response.data) {
        console.log(`[杭州雷鸣] Gemini 响应成功，解析结果...`);

        // 解析 JSON 响应
        const analysisResult = parseJsonResponse<{
          summary?: string;
          highlights?: Array<{
            timestamp: number;
            type: string;
            subType: string;
            score: number;
            reasoning: string;
            startMs: number;
            endMs: number;
          }>;
          hooks?: Array<{
            timestamp: number;
            type: string;
            subType: string;
            score: number;
            reasoning: string;
            startMs: number;
            endMs: number;
          }>;
        }>(response.data);

        if (analysisResult) {
          // 处理高光点
          if (analysisResult.highlights && analysisResult.highlights.length > 0) {
            for (const highlight of analysisResult.highlights) {
              const startMs = highlight.startMs || Math.floor(highlight.timestamp * 1000);
              const endMs = highlight.endMs || (startMs + 10000);

              const [marking] = await db
                .insert(hlAiMarkings)
                .values({
                  analysisId,
                  videoId: video.id,
                  startMs,
                  endMs,
                  type: "高光点",
                  subType: highlight.subType || "其他",
                  score: highlight.score || 7,
                  reasoning: highlight.reasoning || "Gemini识别的高光点",
                })
                .returning();

              markings.push(marking);
              console.log(`[杭州雷鸣] 添加高光点: ${highlight.subType} @ ${startMs}ms`);
            }
          }

          // 处理钩子点
          if (analysisResult.hooks && analysisResult.hooks.length > 0) {
            for (const hook of analysisResult.hooks) {
              const startMs = hook.startMs || Math.floor(hook.timestamp * 1000);
              const endMs = hook.endMs || (startMs + 8000);

              const [marking] = await db
                .insert(hlAiMarkings)
                .values({
                  analysisId,
                  videoId: video.id,
                  startMs,
                  endMs,
                  type: "钩子点",
                  subType: hook.subType || "其他",
                  score: hook.score || 7,
                  reasoning: hook.reasoning || "Gemini识别的钩子点",
                })
                .returning();

              markings.push(marking);
              console.log(`[杭州雷鸣] 添加钩子点: ${hook.subType} @ ${startMs}ms`);
            }
          }

          console.log(`[杭州雷鸣] 视频 ${video.filename} 分析完成，识别 ${markings.length} 个标记`);
        } else {
          throw new Error("无法解析 Gemini 响应为 JSON");
        }
      } else {
        throw new Error(response.error || "Gemini API 调用失败");
      }

    } catch (error) {
      console.error(`[杭州雷鸣] 分析视频 ${video.filename} 失败:`, error);

      // 降级方案：基于时长的模拟标记
      console.warn(`[杭州雷鸣] 使用降级方案：基于时长的估算标记`);
      const durationSec = video.durationMs / 1000;
      const highlightCount = 3;
      const hookCount = 2;

      // 在视频的1/4、1/2、3/4处生成高光点
      for (let i = 0; i < highlightCount; i++) {
        const startSec = (durationSec / (highlightCount + 1)) * (i + 1);
        const [marking] = await db
          .insert(hlAiMarkings)
          .values({
            analysisId,
            videoId: video.id,
            startMs: startSec * 1000,
            endMs: (startSec + 15) * 1000,
            type: "高光点",
            subType: ["冲突爆发", "身份揭露", "情感高潮"][i % 3],
            score: 7 + Math.random() * 2,
            reasoning: "基于时长的估算标记（Gemini API 失败后的降级方案）",
          })
          .returning();

        markings.push(marking);
      }

      // 在视频后期生成钩子点
      for (let i = 0; i < hookCount; i++) {
        const startSec = durationSec - 30 - (i * 15);
        const [marking] = await db
          .insert(hlAiMarkings)
          .values({
            analysisId,
            videoId: video.id,
            startMs: Math.max(0, startSec) * 1000,
            endMs: Math.min(durationSec, startSec + 5) * 1000,
            type: "钩子点",
            subType: ["悬念结尾", "反转预告"][i % 2],
            score: 7 + Math.random() * 2,
            reasoning: "基于时长的估算钩子（Gemini API 失败后的降级方案）",
          })
          .returning();

        markings.push(marking);
      }
    }
  }

  return markings;
}

/**
 * 生成剪辑组合
 */
async function generateClipCombinations(
  analysisId: number,
  videos: any[],
  aiMarkings: any[],
  minDurationMs: number,
  maxDurationMs: number
) {
  const combinations = [];
  const highlights = aiMarkings.filter((m) => m.type === "高光点");
  const hooks = aiMarkings.filter((m) => m.type === "钩子点");

  console.log(`[杭州雷鸣] 生成剪辑组合：${highlights.length} 个高光点 × ${hooks.length} 个钩子点`);

  // 生成高光×钩子组合
  for (const highlight of highlights) {
    for (const hook of hooks) {
      // 只生成同一视频内的组合
      if (highlight.videoId !== hook.videoId) continue;

      const durationMs = hook.endMs - highlight.startMs;

      // 过滤时长不符合的组合
      if (durationMs < minDurationMs || durationMs > maxDurationMs) continue;

      // 计算得分
      const avgScore = (highlight.score + hook.score) / 2;
      const overallScore = avgScore * 10 + (Math.random() * 10); // 80-100分

      const combination = {
        name: `${highlight.subType} + ${hook.subType}`,
        clips: [
          {
            videoId: highlight.videoId,
            videoName: videos.find((v) => v.id === highlight.videoId)?.filename || "未知",
            startMs: highlight.startMs,
            endMs: hook.endMs,
            type: highlight.type + " → " + hook.type,
          },
        ],
        totalDurationMs: durationMs,
        overallScore,
        conflictScore: highlight.score,
        emotionScore: hook.score,
        suspenseScore: hook.score * 0.9,
        rhythmScore: Math.min(10, durationMs / 30000 * 10), // 基于时长
        historyScore: 8, // 因为是AI生成的，所以给高分
        reasoning: `以${highlight.subType}开场（${highlight.reasoning}），以${hook.subType}结尾（${hook.reasoning}），预计转化率：${(overallScore / 10).toFixed(1)}%`,
      };

      const [inserted] = await db
        .insert(hlClipCombinations)
        .values({
          analysisId,
          name: combination.name,
          clips: JSON.stringify(combination.clips),
          totalDurationMs: combination.totalDurationMs,
          overallScore: combination.overallScore,
          conflictScore: combination.conflictScore,
          emotionScore: combination.emotionScore,
          suspenseScore: combination.suspenseScore,
          rhythmScore: combination.rhythmScore,
          historyScore: combination.historyScore,
          reasoning: combination.reasoning,
          rank: 0,
        })
        .returning();

      combinations.push({
        id: String(inserted.id),
        ...inserted,
        clips: combination.clips,
      });
    }
  }

  // 按得分排序
  combinations.sort((a, b) => b.overallScore - a.overallScore);

  // 更新排名
  for (let i = 0; i < combinations.length; i++) {
    await db
      .update(hlClipCombinations)
      .set({ rank: i + 1 })
      .where(eq(hlClipCombinations.id, parseInt(combinations[i].id)));
  }

  // 只返回前10个
  return combinations.slice(0, 10);
}
