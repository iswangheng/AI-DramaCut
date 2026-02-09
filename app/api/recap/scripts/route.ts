// ============================================
// API 路由：生成解说文案
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { storylines, recapTasks, recapSegments } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

/**
 * 解说风格配置
 */
const SCRIPT_STYLES = {
  hook: {
    name: '黄金 3 秒钩子',
    prompt: '开头即高潮，瞬间抓住观众注意力',
  },
  suspense: {
    name: '悬念式',
    prompt: '层层递进，制造紧张感和期待',
  },
  emotional: {
    name: '情感共鸣',
    prompt: '深度情感描写，引发观众共鸣',
  },
  roast: {
    name: '犀利吐槽',
    prompt: '幽默调侃，轻松愉快的观看体验',
  },
  humorous: {
    name: '幽默风趣',
    prompt: '轻松搞笑，娱乐性强',
  },
};

/**
 * POST /api/recap/scripts
 *
 * 为选定的故事线生成指定风格的解说文案
 *
 * 请求体：
 * {
 *   "storylineId": 1,
 *   "style": "hook",
 *   "regenerate": false
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "taskId": 1,
 *     "script": "生成的解说文案...",
 *     "title": "黄金 3 秒标题"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求
    const body = await request.json();
    const { storylineId, style, regenerate = false } = body as {
      storylineId: number;
      style: keyof typeof SCRIPT_STYLES;
      regenerate?: boolean;
    };

    // 2. 验证参数
    if (!storylineId) {
      return NextResponse.json(
        { success: false, message: '缺少必需参数: storylineId' },
        { status: 400 }
      );
    }

    if (!style || !SCRIPT_STYLES[style]) {
      return NextResponse.json(
        {
          success: false,
          message: `无效的文案风格: ${style}，可选值: ${Object.keys(SCRIPT_STYLES).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 3. 获取故事线
    const storyline = await db.query.storylines.findFirst({
      where: eq(storylines.id, storylineId),
    });

    if (!storyline) {
      return NextResponse.json(
        { success: false, message: '故事线不存在' },
        { status: 404 }
      );
    }

    // 4. 检查是否已有生成的文案
    if (!regenerate) {
      const existingTask = await db.query.recapTasks.findFirst({
        where: eq(recapTasks.storylineId, storylineId),
      });

      if (existingTask && existingTask.status === 'ready') {
        // 获取已生成的文案段落
        const segments = await db
          .select()
          .from(recapSegments)
          .where(eq(recapSegments.taskId, existingTask.id))
          .orderBy(asc(recapSegments.order));

        const fullScript = segments.map((s: any) => s.text).join('\n\n');

        return NextResponse.json({
          success: true,
          data: {
            taskId: existingTask.id,
            script: fullScript,
            title: existingTask.title,
            segments: segments,
            cached: true,
          },
        });
      }
    }

    // 5. 生成解说文案（这里使用简化的实现）
    const generated = await generateNarrationScript(storyline, style);

    // 6. 创建任务记录
    const [task] = await db
      .insert(recapTasks)
      .values({
        storylineId,
        style,
        title: generated.title,
        estimatedDurationMs: generated.estimatedDurationMs,
        status: 'ready', // 简化：直接标记为完成
      })
      .returning();

    // 7. 保存文案段落
    const segments = generated.paragraphs.map((para, index) => ({
      taskId: task.id,
      text: para.text,
      order: index,
      startMs: index * 5000, // 简化：假设每段 5 秒
      endMs: (index + 1) * 5000,
      durationMs: 5000,
      audioOffsetMs: index * 5000,
      wordTimestamps: JSON.stringify([]), // TODO: 从 TTS 获取
    }));

    await db.insert(recapSegments).values(segments);

    // 8. 返回结果
    const fullScript = generated.paragraphs.map((p) => p.text).join('\n\n');

    return NextResponse.json({
      success: true,
      data: {
        taskId: task.id,
        script: fullScript,
        title: generated.title,
        segments: generated.paragraphs.map((p, index) => ({
          order: index,
          text: p.text,
          videoCues: p.videoCues,
        })),
        estimatedDurationMs: generated.estimatedDurationMs,
      },
    });
  } catch (error) {
    console.error('[API] 生成解说文案失败:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '生成解说文案失败',
      },
      { status: 500 }
    );
  }
}

/**
 * 生成解说文案（简化版）
 *
 * TODO: 实际实现应该调用 Gemini API，根据故事线和风格生成文案
 * 这里先提供一个基于模板的基本实现
 */
async function generateNarrationScript(
  storyline: any,
  style: keyof typeof SCRIPT_STYLES
): Promise<{
  title: string;
  paragraphs: Array<{ text: string; videoCues: string[] }>;
  estimatedDurationMs: number;
}> {
  const styleConfig = SCRIPT_STYLES[style];
  const description = storyline.description;

  // 简化实现：基于故事线描述生成文案
  const paragraphs: Array<{ text: string; videoCues: string[] }> = [];

  // 根据 style 生成不同风格的文案
  switch (style) {
    case 'hook':
      paragraphs.push({
        text: `你敢信？这个${description}太刺激了！`,
        videoCues: ['开场特写', '人物表情'],
      });
      paragraphs.push({
        text: '反转来得太突然，完全没想到！',
        videoCues: ['反转场景', '震惊反应'],
      });
      paragraphs.push({
        text: '每一步都扣人心弦，绝对是今年最值得看的剧情！',
        videoCues: ['高潮场景', '情感爆发'],
      });
      break;

    case 'suspense':
      paragraphs.push({
        text: '看似平静的开端，却隐藏着巨大的秘密...',
        videoCues: ['平静场景', '细节暗示'],
      });
      paragraphs.push({
        text: '每一个细节都是线索，你发现了吗？',
        videoCues: ['线索特写', '伏笔'],
      });
      paragraphs.push({
        text: '真相即将揭晓，准备好迎接震惊了吗？',
        videoCues: ['揭秘场景', '反转时刻'],
      });
      break;

    case 'emotional':
      paragraphs.push({
        text: `那一刻，所有情绪都爆发了。${description}让人泪目...`,
        videoCues: ['情感特写', '泪眼'],
      });
      paragraphs.push({
        text: '不是所有的等待都有结果，但坚持的人值得尊重。',
        videoCues: ['坚持场景', '感动瞬间'],
      });
      paragraphs.push({
        text: '这份感动，只有经历过的人才懂。',
        videoCues: ['回忆杀', '情感升华'],
      });
      break;

    case 'roast':
      paragraphs.push({
        text: `哈哈哈哈！这个${description}笑死我了！`,
        videoCues: ['搞笑场景', '表情包'],
      });
      paragraphs.push({
        text: '这操作太骚了，编剧脑洞有多大？',
        videoCues: ['奇葩操作', '吐槽点'],
      });
      paragraphs.push({
        text: '不过话说回来，还挺上头的怎么回事？',
        videoCues: ['反转剧情', '真香时刻'],
      });
      break;

    default:
      paragraphs.push({
        text: `这是一个${description}。`,
        videoCues: ['开场场景'],
      });
      paragraphs.push({
        text: '故事非常精彩，值得一看。',
        videoCues: ['精彩片段'],
      });
  }

  // 生成标题（黄金 3 秒钩子）
  const titles = [
    `这个${description.split('的')[0]}太绝了！`,
    `反转来了！${description}`,
    `没想到会是这样的${description.split('的')[0]}...`,
    `我泪目了！${description}`,
  ];
  const title = titles[Math.floor(Math.random() * titles.length)];

  // 估算时长（假设 200 字/分钟）
  const totalWords = paragraphs.reduce((sum, p) => sum + p.text.length, 0);
  const estimatedDurationMs = Math.round((totalWords / 200) * 60 * 1000);

  return {
    title,
    paragraphs,
    estimatedDurationMs,
  };
}

/**
 * GET /api/recap/scripts
 *
 * 获取已生成的解说文案
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const storylineId = searchParams.get('storylineId');

    if (taskId) {
      // 获取特定任务的文案
      const task = await db.query.recapTasks.findFirst({
        where: eq(recapTasks.id, Number(taskId)),
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
        .where(eq(recapSegments.taskId, task.id))
        .orderBy(asc(recapSegments.order));

      const fullScript = segments.map((s: any) => s.text).join('\n\n');

      return NextResponse.json({
        success: true,
        data: {
          taskId: task.id,
          script: fullScript,
          title: task.title,
          segments: segments,
        },
      });
    } else if (storylineId) {
      // 获取故事线的所有任务
      const tasks = await db.query.recapTasks.findMany({
        where: eq(recapTasks.storylineId, Number(storylineId)),
      });

      return NextResponse.json({
        success: true,
        data: tasks,
      });
    } else {
      return NextResponse.json(
        { success: false, message: '缺少参数: taskId 或 storylineId' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[API] 获取解说文案失败:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '获取解说文案失败',
      },
      { status: 500 }
    );
  }
}
