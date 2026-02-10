// ============================================
// 文件上传 API
// POST /api/upload
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getMetadata } from '@/lib/video/metadata';

/**
 * POST /api/upload
 * 上传视频文件
 *
 * FormData:
 * - file: File 对象
 *
 * 返回:
 * - filePath: 保存的文件路径
 * - metadata: 视频元数据
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: '没有找到文件',
        },
        { status: 400 }
      );
    }

    // 验证文件类型
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: `不支持的文件类型: ${file.type}`,
        },
        { status: 400 }
      );
    }

    // 验证文件大小（最大 2GB）
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          message: `文件过大: ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB (最大 2GB)`,
        },
        { status: 400 }
      );
    }

    // 确保上传目录存在
    const uploadDir = join(process.cwd(), 'data', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop();
    const filename = `${timestamp}-${random}.${ext}`;
    const filePath = join(uploadDir, filename);

    // 保存文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 提取视频元数据
    console.log(`正在提取视频元数据: ${filename}`);
    const metadata = await getMetadata(filePath);

    // 转换为 API 需要的格式（duration 是秒，需要转换为毫秒）
    const apiMetadata = {
      durationMs: Math.round(metadata.duration * 1000),
      width: metadata.width,
      height: metadata.height,
      fps: Math.round(metadata.fps),
    };

    console.log(`文件上传成功: ${filename}`);
    console.log(`  - 大小: ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB`);
    console.log(`  - 时长: ${apiMetadata.durationMs / 1000}秒`);
    console.log(`  - 分辨率: ${apiMetadata.width}x${apiMetadata.height}`);
    console.log(`  - 帧率: ${apiMetadata.fps}fps`);

    return NextResponse.json({
      success: true,
      data: {
        filename: file.name,
        filePath: `data/uploads/${filename}`, // 相对于项目根目录的相对路径
        fileSize: file.size,
        ...apiMetadata,
      },
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '文件上传失败',
      },
      { status: 500 }
    );
  }
}
