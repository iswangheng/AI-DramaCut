/**
 * 杭州雷鸣 - 单个标记管理 API
 *
 * 功能：
 * - DELETE /api/hangzhou-leiming/markings/[id] - 删除标记
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hlMarkings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const markingId = parseInt(idStr);

    // 查询标记信息
    const [marking] = await db
      .select()
      .from(hlMarkings)
      .where(eq(hlMarkings.id, markingId));

    if (!marking) {
      return NextResponse.json(
        { success: false, message: "标记不存在" },
        { status: 404 }
      );
    }

    // 删除数据库记录
    await db.delete(hlMarkings).where(eq(hlMarkings.id, markingId));

    return NextResponse.json({
      success: true,
      message: "标记已删除",
    });
  } catch (error) {
    console.error("删除标记失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "删除标记失败",
      },
      { status: 500 }
    );
  }
}
