// ============================================
// API 路由：生成 TTS 语音
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getElevenLabsClient } from '@/lib/api/elevenlabs';
import { db } from '@/lib/db/client';
import { recapSegments, recapTasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * POST /api/recap/tts
 *
 * 为解说词生成 TTS 语音
 *
 * 请求体：
 * {
 *   "taskId": 1,
 *   "voiceId": "21m00Tcm4TlvDq8ikWAM", // 可选，默认 Rachel
 *   "regenerate": false
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "audioPath": "/uploads/voiceover_1234567890.mp3",
 *     "durationMs": 45000,
 *     "segments": [
 *       {
 *         "segmentId": 1,
 *         "audioPath": "/uploads/voiceover_seg_1.mp3",
 *         "durationMs": 5000,
 *         "wordTimings": [...]
 *       }
 *     ]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求
    const body = await request.json();
    const { taskId, voiceId, regenerate = false } = body as {
      taskId: number;
      voiceId?: string;
      regenerate?: boolean;
    };

    // 2. 验证参数
    if (!taskId) {
      return NextResponse.json(
        { success: false, message: '缺少必需参数: taskId' },
        { status: 400 }
      );
    }

    // 3. 获取任务和文案段落
    const task = await db.query.recapTasks.findFirst({
      where: eq(recapTasks.id, taskId),
    });

    if (!task) {
      return NextResponse.json(
        { success: false, message: '任务不存在' },
        { status: 404 }
      );
    }

    const segments = await db
      .select()
      .from(recapSegments)
      .where(eq(recapSegments.taskId, taskId))
      .orderBy(recapSegments.order);

    if (segments.length === 0) {
      return NextResponse.json(
        { success: false, message: '未找到文案段落' },
        { status: 404 }
      );
    }

    // 4. 检查是否已生成语音
    if (!regenerate && segments[0].audioPath) {
      // 已有语音，直接返回
      const audioSegments = segments.map((seg: any) => ({
        segmentId: seg.id,
        audioPath: seg.audioPath,
        durationMs: seg.durationMs,
        wordTimings: JSON.parse(seg.wordTimestamps || '[]'),
      }));

      return NextResponse.json({
        success: true,
        data: {
          audioPath: segments[0].audioPath, // 第一个段落的音频路径
          durationMs: task.estimatedDurationMs,
          segments: audioSegments,
          cached: true,
        },
      });
    }

    // 5. 初始化 TTS 客户端
    const client = getElevenLabsClient();

    // 6. 为每个段落生成语音
    const outputDir = join(process.cwd(), 'public', 'uploads', 'voiceover');
    await mkdir(outputDir, { recursive: true });

    const audioSegments = [];
    const timestamp = Date.now();

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentFileName = `voiceover_${taskId}_${i + 1}_${timestamp}.mp3`;
      const segmentPath = join(outputDir, segmentFileName);

      // 调用 TTS 生成语音
      const response = await client.generateNarration(segment.text, {
        voice: voiceId || 'eleven_multilingual_v2',
        outputPath: segmentPath,
      });

      if (!response.success || !response.data) {
        throw new Error(`段落 ${i + 1} TTS 生成失败: ${response.error}`);
      }

      // 更新数据库记录
      await db
        .update(recapSegments)
        .set({
          audioPath: `/uploads/voiceover/${segmentFileName}`,
          audioOffsetMs: response.data.durationMs,
          wordTimestamps: JSON.stringify(response.data.wordTimings),
        })
        .where(eq(recapSegments.id, segment.id));

      audioSegments.push({
        segmentId: segment.id,
        audioPath: `/uploads/voiceover/${segmentFileName}`,
        durationMs: response.data.durationMs,
        wordTimings: response.data.wordTimings,
      });
    }

    // 7. 合并所有音频片段（可选，这里简化为返回片段列表）
    const totalDurationMs = audioSegments.reduce(
      (sum, seg) => sum + seg.durationMs,
      0
    );

    // 8. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        audioPath: audioSegments[0]?.audioPath || '', // 第一个段落的音频
        durationMs: totalDurationMs,
        segments: audioSegments,
      },
    });
  } catch (error) {
    console.error('[API] TTS 生成失败:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'TTS 生成失败',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recap/tts
 *
 * 获取可用的语音列表
 */
export async function GET() {
  try {
    const client = getElevenLabsClient();

    // 获取用户语音
    const userVoicesResponse = await client.getVoices();
    const sharedVoicesResponse = await client.getSharedVoices({ pageSize: 10 });

    return NextResponse.json({
      success: true,
      data: {
        userVoices: userVoicesResponse.success
          ? userVoicesResponse.data?.voices || []
          : [],
        sharedVoices: sharedVoicesResponse.success
          ? sharedVoicesResponse.data?.voices || []
          : [],
      },
    });
  } catch (error) {
    console.error('[API] 获取语音列表失败:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '获取语音列表失败',
      },
      { status: 500 }
    );
  }
}
