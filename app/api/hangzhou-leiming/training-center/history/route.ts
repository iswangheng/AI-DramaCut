/**
 * 杭州雷鸣 - 训练历史 API
 *
 * 功能：
 * - GET - 获取训练历史记录列表
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlTrainingHistory } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

/**
 * GET - 获取训练历史记录
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");

    // 获取训练历史记录
    const history = await db
      .select()
      .from(hlTrainingHistory)
      .orderBy(desc(hlTrainingHistory.createdAt))
      .limit(limit);

    // 解析 JSON 字段（带容错处理）
    const parsedHistory = history.map((record: any) => ({
      ...record,
      projectIds: safeParseJSON(record.projectIds, []),
      projectNames: safeParseJSON(record.projectNames, []),
    }));

    return NextResponse.json({
      success: true,
      data: parsedHistory,
    });
  } catch (error) {
    console.error("获取训练历史失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "获取训练历史失败",
      },
      { status: 500 }
    );
  }
}

/**
 * 安全解析JSON（带容错处理）
 */
function safeParseJSON(jsonString: string | null, defaultValue: any = null): any {
  if (!jsonString || jsonString.trim() === '') {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn(`JSON解析失败: ${jsonString}`, error);
    return defaultValue;
  }
}
