// ============================================
// 文件上传工具
// 封装文件上传相关功能
// ============================================

interface VideoUploadData {
  filename: string;
  filePath: string;
  fileSize: number;
  durationMs: number;
  width: number;
  height: number;
  fps: number;
}

/**
 * 上传视频文件
 *
 * @param file File 对象
 * @returns 上传结果，包含文件路径和元数据
 */
export async function uploadVideo(file: File): Promise<{
  success: boolean;
  data?: VideoUploadData;
  message?: string;
}> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '上传失败',
    };
  }
}

/**
 * 批量上传视频文件
 *
 * @param files File 对象数组
 * @param onProgress 进度回调 (current, total)
 * @returns 上传结果数组
 */
export async function uploadVideos(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<Array<{
  file: File;
  success: boolean;
  data?: VideoUploadData;
  message?: string;
}>> {
  const results: Array<{
    file: File;
    success: boolean;
    data?: VideoUploadData;
    message?: string;
  }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = await uploadVideo(file);

    results.push({
      file,
      ...result,
    });

    // 调用进度回调
    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }

  return results;
}
