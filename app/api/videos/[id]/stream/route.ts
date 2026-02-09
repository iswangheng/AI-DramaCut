import { NextRequest, NextResponse } from "next/server";
import { createReadStream, statSync, existsSync } from "fs";
import { join } from "path";

/**
 * 视频流 API
 *
 * GET /api/videos/[id]/stream
 *
 * 功能：流式传输视频文件给前端播放器
 * 支持范围请求（Range Request），实现视频播放的拖动功能
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);

    if (isNaN(videoId)) {
      return NextResponse.json(
        { success: false, error: "无效的视频 ID" },
        { status: 400 }
      );
    }

    // TODO: 从数据库获取视频路径
    // 目前暂时使用硬编码的路径，实际应该从数据库查询
    const videoPath = `/Users/weilingkeji/360安全云盘同步版/000-海外/01-jisi/001-AI-DramaCut/data/uploads/${videoId === 4 ? "1770620671643-fxifyq" : "1770605390588-0gmlcn"}.mp4`;

    // 检查文件是否存在
    if (!existsSync(videoPath)) {
      return NextResponse.json(
        { success: false, error: "视频文件不存在" },
        { status: 404 }
      );
    }

    // 获取文件统计信息
    const stat = statSync(videoPath);
    const size = stat.size;

    // 解析 Range 请求头
    const range = request.headers.get("range");

    if (range) {
      // 支持范围请求（用于视频播放拖动）
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
      const chunkSize = end - start + 1;

      if (start >= size) {
        return NextResponse.json(
          { success: false, error: "请求的范围超出文件大小" },
          { status: 416 }
        );
      }

      // 创建可读流
      const stream = createReadStream(videoPath, { start, end });

      // 返回流式响应
      return new NextResponse(stream as any, {
        status: 206, // Partial Content
        headers: {
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": "video/mp4",
          "Cache-Control": "public, max-age=31536000", // 缓存一年
        },
      });
    } else {
      // 完整文件请求
      const stream = createReadStream(videoPath);

      return new NextResponse(stream as any, {
        headers: {
          "Content-Length": size.toString(),
          "Content-Type": "video/mp4",
          "Cache-Control": "public, max-age=31536000",
          "Accept-Ranges": "bytes",
        },
      });
    }
  } catch (error) {
    console.error("视频流错误:", error);
    return NextResponse.json(
      { success: false, error: "视频流服务错误" },
      { status: 500 }
    );
  }
}

// 配置运行时为 Node.js（支持文件流）
export const runtime = "nodejs";
