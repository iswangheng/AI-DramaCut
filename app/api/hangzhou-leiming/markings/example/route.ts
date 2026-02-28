/**
 * 杭州雷鸣 - Excel标记示例文件下载 API
 *
 * 功能：
 * - GET /api/hangzhou-leiming/markings/example - 下载示例Excel文件
 */

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

/**
 * GET - 生成并下载示例Excel文件
 */
export async function GET(req: NextRequest) {
  try {
    // 示例数据
    const exampleData = [
      {
        集数: "第1集",
        时间点: "00:35",
        标记类型: "高光点",
        描述: "高能冲突",
      },
      {
        集数: "第1集",
        时间点: "01:20",
        标记类型: "钩子点",
        描述: "悬念设置",
      },
      {
        集数: "第1集",
        时间点: "02:15",
        标记类型: "高光点",
        描述: "身份揭露",
      },
      {
        集数: "第2集",
        时间点: "00:45",
        标记类型: "钩子点",
        描述: "情感爆发",
      },
      {
        集数: "第2集",
        时间点: "01:50",
        标记类型: "高光点",
        描述: "剧情反转",
      },
      {
        集数: "第3集",
        时间点: "00:30",
        标记类型: "钩子点",
        描述: "开场冲突",
      },
      {
        集数: "第3集",
        时间点: "01:15",
        标记类型: "高光点",
        描述: "高能对决",
      },
    ];

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(exampleData);

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 12 }, // 集数
      { wch: 10 }, // 时间点
      { wch: 12 }, // 标记类型
      { wch: 16 }, // 描述
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "标记数据");

    // 生成Excel文件
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // 返回文件
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="杭州雷鸣-标记数据示例.xlsx"',
      },
    });
  } catch (error) {
    console.error("生成示例Excel文件失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "生成示例Excel文件失败",
      },
      { status: 500 }
    );
  }
}
