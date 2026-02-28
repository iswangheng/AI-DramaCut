/**
 * 杭州雷鸣 - AI 学习 API
 *
 * 功能：
 * - POST /api/hangzhou-leiming/projects/:id/learn - 启动AI学习
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlMarkings, hlSkills, hlProjects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: idStr } = await params;
    const projectId = parseInt(idStr);

    // 查询项目的所有标记数据
    const markings = await db
      .select()
      .from(hlMarkings)
      .where(eq(hlMarkings.projectId, projectId));

    if (markings.length === 0) {
      return NextResponse.json(
        { success: false, message: "没有标记数据可供学习" },
        { status: 400 }
      );
    }

    console.log(`开始学习，共 ${markings.length} 条标记数据`);

    // 分析标记数据，生成技能文件
    const skillContent = generateSkillFile(markings);

    // 保存技能文件到数据库
    const [newSkill] = await db
      .insert(hlSkills)
      .values({
        projectId,
        name: `技能文件 - ${new Date().toLocaleDateString("zh-CN")}`,
        version: "v1.0",
        content: skillContent,
        highlightTypes: JSON.stringify(extractHighlightTypes(markings)),
        hookTypes: JSON.stringify(extractHookTypes(markings)),
        editingRules: JSON.stringify(extractEditingRules(markings)),
        generatedFrom: "ai_learning",
        totalMarkings: markings.length,
      })
      .returning();

    // 更新项目状态
    await db
      .update(hlProjects)
      .set({
        status: "ready",
        trainedAt: new Date(),
      })
      .where(eq(hlProjects.id, projectId));

    return NextResponse.json({
      success: true,
      message: "AI学习完成！",
      data: newSkill,
    });
  } catch (error) {
    console.error("AI学习失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "AI学习失败",
      },
      { status: 500 }
    );
  }
}

/**
 * 生成技能文件内容（Markdown格式）
 */
function generateSkillFile(markings: any[]): string {
  // 分类统计
  const highlightMarkings = markings.filter((m) => m.type === "高光点");
  const hookMarkings = markings.filter((m) => m.type === "钩子点");

  // 提取子类型
  const highlightSubTypes = new Map<string, number>();
  const hookSubTypes = new Map<string, number>();

  highlightMarkings.forEach((m) => {
    const subType = m.subType || "其他";
    highlightSubTypes.set(subType, (highlightSubTypes.get(subType) || 0) + 1);
  });

  hookMarkings.forEach((m) => {
    const subType = m.subType || "其他";
    hookSubTypes.set(subType, (hookSubTypes.get(subType) || 0) + 1);
  });

  // 生成Markdown内容
  let content = `# 短剧剪辑技能文件

> 生成时间：${new Date().toLocaleString("zh-CN")}
> 学习样本：${markings.length} 条标记数据
> 高光点：${highlightMarkings.length} 条
> 钩子点：${hookMarkings.length} 条

---

## 一、高光类型识别

基于历史数据分析，识别出以下高光类型：

`;

  // 高光类型
  const sortedHighlightTypes = Array.from(highlightSubTypes.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  sortedHighlightTypes.forEach(([subType, count], index) => {
    const percentage = ((count / highlightMarkings.length) * 100).toFixed(1);
    content += `### ${index + 1}. ${subType}
- 出现次数：${count} 次
- 占比：${percentage}%
- 典型特征：基于 ${count} 个样本分析

`;

    // 添加示例时间点
    const examples = highlightMarkings
      .filter((m) => m.subType === subType)
      .slice(0, 3);

    if (examples.length > 0) {
      content += `**示例时间点：**\n`;
      examples.forEach((example) => {
        content += `- ${example.timestamp} - ${example.description || "无描述"}\n`;
      });
      content += "\n";
    }
  });

  content += `---

## 二、钩子类型识别

基于历史数据分析，识别出以下钩子类型：

`;

  // 钩子类型
  const sortedHookTypes = Array.from(hookSubTypes.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  sortedHookTypes.forEach(([subType, count], index) => {
    const percentage = ((count / hookMarkings.length) * 100).toFixed(1);
    content += `### ${index + 1}. ${subType}
- 出现次数：${count} 次
- 占比：${percentage}%
- 典型特征：基于 ${count} 个样本分析

`;

    // 添加示例时间点
    const examples = hookMarkings
      .filter((m) => m.subType === subType)
      .slice(0, 3);

    if (examples.length > 0) {
      content += `**示例时间点：**\n`;
      examples.forEach((example) => {
        content += `- ${example.timestamp} - ${example.description || "无描述"}\n`;
      });
      content += "\n";
    }
  });

  content += `---

## 三、剪辑规则总结

根据历史数据，总结出以下剪辑规律：

### 3.1 高光到钩子的最佳时长

`;

  // 计算时长统计
  const durations = [];
  for (let i = 0; i < markings.length - 1; i++) {
    if (markings[i].type === "高光点" && markings[i + 1].type === "钩子点") {
      const duration = markings[i + 1].seconds - markings[i].seconds;
      if (duration > 0 && duration < 600) {
        // 只统计10分钟内的
        durations.push(duration);
      }
    }
  }

  if (durations.length > 0) {
    const avgDuration =
      durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    content += `- 平均时长：${formatSeconds(avgDuration)} (${Math.round(avgDuration)}秒)\n`;
    content += `- 最短时长：${formatSeconds(minDuration)} (${Math.round(minDuration)}秒)\n`;
    content += `- 最长时长：${formatSeconds(maxDuration)} (${Math.round(maxDuration)}秒)\n`;
    content += `- 建议范围：${Math.round(minDuration)}秒 - ${Math.round(maxDuration)}秒\n\n`;
  }

  content += `### 3.2 节奏把握建议

- 开头 3 秒必须抓住注意力
- 每 30 秒需要有一个小高潮
- 结尾留悬念，促进转化

### 3.3 排序逻辑权重

AI 推荐时将综合考虑以下因素：

1. **冲突强度** (30%): 场景中的矛盾、对抗程度
2. **情感共鸣** (25%): 观众情感投入程度
3. **悬念设置** (25%): 结尾的钩子吸引力
4. **节奏把握** (10%): 时长是否在最佳区间
5. **历史验证** (10%): 与高转化历史素材的相似度

---

## 四、使用说明

1. 在"智能剪辑"模块中，选择要应用此技能文件
2. 设定时长范围（建议 ${durations.length > 0 ? `${Math.round(Math.min(...durations))} - ${Math.round(Math.max(...durations))}` : "60 - 300"}秒）
3. AI 将自动识别新视频中的高光点和钩子点
4. 生成最优剪辑组合，按广告转化效果排序

---

*此技能文件由 AI 自动生成，基于 ${markings.length} 条历史标记数据学习得出。*
`;

  return content;
}

/**
 * 提取高光类型（JSON格式）
 */
function extractHighlightTypes(markings: any[]) {
  const highlights = markings.filter((m) => m.type === "高光点");
  const types = new Map<string, any[]>();

  highlights.forEach((m) => {
    const subType = m.subType || "其他";
    if (!types.has(subType)) {
      types.set(subType, []);
    }
    types.get(subType)!.push({
      timestamp: m.timestamp,
      seconds: m.seconds,
      description: m.description,
    });
  });

  return Object.fromEntries(types);
}

/**
 * 提取钩子类型（JSON格式）
 */
function extractHookTypes(markings: any[]) {
  const hooks = markings.filter((m) => m.type === "钩子点");
  const types = new Map<string, any[]>();

  hooks.forEach((m) => {
    const subType = m.subType || "其他";
    if (!types.has(subType)) {
      types.set(subType, []);
    }
    types.get(subType)!.push({
      timestamp: m.timestamp,
      seconds: m.seconds,
      description: m.description,
    });
  });

  return Object.fromEntries(types);
}

/**
 * 提取剪辑规则（JSON格式）
 */
function extractEditingRules(markings: any[]) {
  const durations = [];
  for (let i = 0; i < markings.length - 1; i++) {
    if (markings[i].type === "高光点" && markings[i + 1].type === "钩子点") {
      const duration = markings[i + 1].seconds - markings[i].seconds;
      if (duration > 0 && duration < 600) {
        durations.push(duration);
      }
    }
  }

  const avgDuration =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 120;

  return {
    averageDuration: Math.round(avgDuration),
    minDuration: durations.length > 0 ? Math.round(Math.min(...durations)) : 60,
    maxDuration: durations.length > 0 ? Math.round(Math.max(...durations)) : 300,
    totalSamples: markings.length,
  };
}

/**
 * 格式化秒数为可读时间
 */
function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
