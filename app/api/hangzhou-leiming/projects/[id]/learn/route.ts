/**
 * 杭州雷鸣 - AI 学习 API
 *
 * 功能：
 * - POST /api/hangzhou-leiming/projects/:id/learn - 启动AI学习
 * - GET /api/hangzhou-leiming/projects/:id/learn - 查询学习状态
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlMarkings, hlSkills, hlProjects, hlVideos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { startLearning, type LearningConfig } from "@/lib/ai/learning-pipeline";
import wsServer from "@/lib/ws/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST - 启动 AI 学习流程
 */
export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  const { id: idStr } = await params;
  const projectId = parseInt(idStr);

  if (isNaN(projectId)) {
    return NextResponse.json(
      { success: false, error: '无效的项目 ID' },
      { status: 400 }
    );
  }

  try {
    console.log(`📚 [学习 API] 收到项目 ${projectId} 的学习请求`);

    // 1. 检查项目是否存在
    const [project] = await db
      .select()
      .from(hlProjects)
      .where(eq(hlProjects.id, projectId));

    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // 2. 检查项目是否有视频
    const videos = await db
      .select()
      .from(hlVideos)
      .where(eq(hlVideos.projectId, projectId));

    if (videos.length === 0) {
      return NextResponse.json(
        { success: false, error: '项目没有视频，请先上传视频' },
        { status: 400 }
      );
    }

    // 3. 检查项目是否有标记数据
    const markings = await db
      .select()
      .from(hlMarkings)
      .where(eq(hlMarkings.projectId, projectId));

    if (markings.length === 0) {
      return NextResponse.json(
        { success: false, error: '项目没有标记数据，请先导入标记数据' },
        { status: 400 }
      );
    }

    console.log(`📊 [学习 API] 项目检查通过:`);
    console.log(`   - 视频: ${videos.length} 个`);
    console.log(`   - 标记: ${markings.length} 个`);

    // 4. 解析请求配置
    const body = await req.json().catch(() => ({}));
    const config: LearningConfig = {
      projectId,
      framesPerMarking: body.framesPerMarking || 30,
      skipExistingFrames: body.skipExistingFrames !== false, // 默认 true
      skipExistingTranscript: body.skipExistingTranscript !== false, // 默认 true
    };

    // 5. 生成任务 ID
    const jobId = `learning-${projectId}-${Date.now()}`;

    // 6. 启动学习流程（异步）
    console.log(`🚀 [学习 API] 启动学习流程...`);

    // 在后台执行，不阻塞响应
    startLearning(config)
      .then((result) => {
        console.log(`✅ [学习 API] 学习完成！`);
        console.log(`   - 技能文件 ID: ${result.skillId}`);
        console.log(`   - 总标记数: ${result.totalMarkings}`);
        console.log(`   - 成功: ${result.successCount}`);
        console.log(`   - 失败: ${result.failureCount}`);

        // 更新项目状态
        db.update(hlProjects)
          .set({
            status: 'ready',
            trainedAt: new Date(),
          })
          .where(eq(hlProjects.id, projectId))
          .then(() => {
            console.log(`✅ [学习 API] 项目状态已更新`);
          })
          .catch((error: unknown) => {
            console.error(`❌ [学习 API] 更新项目状态失败:`, error);
          });
      })
      .catch((error: unknown) => {
        console.error(`❌ [学习 API] 学习失败:`, error);

        // 发送错误消息
        wsServer.sendError(jobId, error instanceof Error ? error.message : '未知错误');
      });

    // 7. 返回任务 ID（立即响应）
    return NextResponse.json({
      success: true,
      data: {
        projectId,
        jobId,
        totalMarkings: markings.length,
        totalVideos: videos.length,
        message: '学习任务已启动，请通过 WebSocket 监听进度',
        wsUrl: `ws://localhost:3001`,
        wsJobId: jobId,
      },
    });

  } catch (error) {
    console.error(`❌ [学习 API] 错误:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - 查询学习状态
 */
export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  const { id: idStr } = await params;
  const projectId = parseInt(idStr);

  if (isNaN(projectId)) {
    return NextResponse.json(
      { success: false, error: '无效的项目 ID' },
      { status: 400 }
    );
  }

  try {
    // 检查项目的技能文件
    const [project] = await db
      .select()
      .from(hlProjects)
      .where(eq(hlProjects.id, projectId));

    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // 查询技能文件
    const skills = await db
      .select()
      .from(hlSkills)
      .where(eq(hlSkills.projectId, projectId))
      .orderBy(hlSkills.createdAt);

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        status: project.status,
        trainedAt: project.trainedAt,
        skillsCount: skills.length,
        skills: skills.map((skill: any) => ({
          id: skill.id,
          name: skill.name,
          version: skill.version,
          generatedFrom: skill.generatedFrom,
          totalMarkings: skill.totalMarkings,
          createdAt: skill.createdAt,
        })),
        message: skills.length > 0
          ? `已生成 ${skills.length} 个技能文件`
          : '尚未生成技能文件，请先启动学习任务',
      },
    });

  } catch (error) {
    console.error(`❌ [学习 API] 错误:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
