"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UploadVideoDialog } from "@/components/upload-video-dialog";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { EditVideoDialog } from "@/components/edit-video-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Upload, MoreVertical, Trash2, Eye, Edit, TreeDeciduous, Loader2, BarChart3 } from "lucide-react";
import type { Video } from "@/lib/db/schema";

interface Project {
  id: number;
  name: string;
  description: string | null | undefined;
  videoCount: number;
  totalDuration: string;
  status: "ready" | "processing" | "error";
  progress: number;
  currentStep: string | null | undefined;
  createdAt: Date;
}

function ProjectDetailContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);

  // 查看视频详情
  const handleViewVideo = (videoId: number) => {
    router.push(`/videos/${videoId}`);
  };

  // 加载项目详情和视频列表
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const id = parseInt(projectId);
      if (isNaN(id)) {
        throw new Error("无效的项目 ID");
      }

      // 并行加载项目详情和视频列表
      const [projectRes, videosRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/projects/${id}/videos`),
      ]);

      const projectResponse = await projectRes.json();
      const videosResponse = await videosRes.json();

      if (projectResponse.success && projectResponse.data) {
        setProject(projectResponse.data);
      } else {
        setError(projectResponse.message || "加载项目详情失败");
      }

      if (videosResponse.success && videosResponse.data) {
        setVideos(videosResponse.data);
      } else {
        setError(videosResponse.message || "加载视频列表失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    loadData();
  }, [projectId]);

  // 格式化时长
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  // 格式化文件大小（使用 MB，因为短剧单集视频通常较小）
  const formatFileSize = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const getStatusBadge = (status: Video["status"]) => {
    switch (status) {
      case "ready":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">已就绪</Badge>;
      case "uploading":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">上传中</Badge>;
      case "processing":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">处理中</Badge>;
      case "analyzing":
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">理解中</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">错误</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (!confirm("确定要删除这个视频吗？")) {
      return;
    }

    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        // 重新加载视频列表
        await loadData();
      } else {
        alert(data.message || "删除视频失败");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除视频失败");
    }
  };

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video);
    setEditDialogOpen(true);
  };

  // 分析项目故事线
  const handleAnalyzeStorylines = async () => {
    if (!project) return;

    // 检查是否所有视频都有集数
    const videosWithoutEpisode = videos.filter(v => !v.episodeNumber);
    if (videosWithoutEpisode.length > 0) {
      alert(`以下视频缺少集数信息，无法进行项目级分析：\n${videosWithoutEpisode.map(v => v.filename).join('\n')}\n\n请先为这些视频设置集数。`);
      return;
    }

    if (videos.length < 2) {
      alert('至少需要 2 个视频才能进行项目级故事线分析。');
      return;
    }

    setAnalyzing(true);

    try {
      // 调用分析 API（异步任务）
      const response = await fetch(`/api/projects/${project.id}/analyze-storylines`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success && data.data) {
        const { jobId, resultsUrl } = data.data;

        // 立即重定向到结果页面，带上 jobId
        router.push(`${resultsUrl}?jobId=${jobId}`);
      } else {
        alert(data.error || '启动分析任务失败');
        setAnalyzing(false);
      }
    } catch (err) {
      console.error('启动分析任务失败:', err);
      alert(err instanceof Error ? err.message : '启动分析任务失败');
      setAnalyzing(false);
    }
  };

  const handleUploadVideos = async (files: File[]) => {
    if (!project) return;

    // 注意：这里只是演示，实际上传需要实现文件上传处理
    // 实际项目中应该：
    // 1. 上传文件到服务器或云存储
    // 2. 获取文件路径
    // 3. 提取视频元数据
    // 4. 调用 API 创建视频记录

    alert("文件上传功能需要配合后端文件上传接口实现");

    // 示例代码（需要实际的文件上传处理）：
    // for (const file of files) {
    //   // 1. 上传文件
    //   const uploadResult = await uploadFile(file);
    //
    //   // 2. 提取元数据
    //   const metadata = await extractVideoMetadata(uploadResult.path);
    //
    //   // 3. 创建记录
    //   await projectsApi.uploadVideo(project.id, {
    //     filename: file.name,
    //     filePath: uploadResult.path,
    //     fileSize: file.size,
    //     durationMs: metadata.durationMs,
    //     width: metadata.width,
    //     height: metadata.height,
    //     fps: metadata.fps,
    //   });
    // }
    //
    // await loadData();
  };

  if (loading) {
    return (
      <div className="p-10 animate-fade-in">
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-10 animate-fade-in">
        <div className="text-center py-16">
          <p className="text-red-600 text-lg mb-4">{error || "项目不存在"}</p>
          <Button variant="outline" onClick={() => router.back()}>
            返回
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 animate-fade-in">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">{project.name}</h1>
        {project.description && (
          <p className="text-base text-muted-foreground">{project.description}</p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="mb-6 flex gap-3 flex-wrap">
        <UploadVideoDialog projectId={project.id} onUploadComplete={loadData} />
        <Button
          variant="outline"
          onClick={handleAnalyzeStorylines}
          disabled={analyzing || videos.length < 2}
          className="gap-2 cursor-pointer"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <TreeDeciduous className="w-4 h-4" />
              分析故事线
            </>
          )}
        </Button>
        <Button
          variant="default"
          onClick={() => router.push(`/projects/${project.id}/storylines`)}
          className="gap-2 cursor-pointer"
        >
          <BarChart3 className="w-4 h-4" />
          查看分析结果
        </Button>
      </div>

      {/* 视频列表 */}
      <div className="space-y-4">
        {videos.map((video) => (
          <Card key={video.id} className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleViewVideo(video.id!)}>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                {/* 缩略图 */}
                <div className="w-48 h-28 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎬</div>
                    <div className="text-xs text-muted-foreground">视频预览</div>
                  </div>
                </div>

                {/* 视频信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {/* 显示标题：优先使用 displayTitle，否则使用 filename */}
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {video.displayTitle || video.filename}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {/* 集数标签 - 只在没有 displayTitle 时显示，避免重复 */}
                        {video.episodeNumber && !video.displayTitle && (
                          <>
                            <Badge variant="outline" className="text-xs">
                              第{video.episodeNumber}集
                            </Badge>
                            <span>·</span>
                          </>
                        )}
                        <span>{formatDuration(video.durationMs)}</span>
                        <span>·</span>
                        <span>{formatFileSize(video.fileSize)}</span>
                        <span>·</span>
                        <span>{getStatusBadge(video.status)}</span>
                      </div>
                      {/* 原始文件名（如果显示标题被使用） */}
                      {video.displayTitle && video.displayTitle !== video.filename && (
                        <p className="text-xs text-muted-foreground mt-1">
                          文件名：{video.filename}
                        </p>
                      )}
                    </div>

                    {/* 操作菜单 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewVideo(video.id!); }}>
                          <Eye className="w-4 h-4 mr-2" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditVideo(video);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteVideo(video.id!)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* 进度条 */}
                  {video.status !== "ready" && video.status !== "error" && (
                    <div className="mb-2">
                      <Progress value={0} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2">
                        {video.status === "uploading" && "上传中..."}
                        {video.status === "processing" && "处理中..."}
                        {video.status === "analyzing" && "AI 理解中..."}
                      </p>
                    </div>
                  )}

                  {/* 处理详情（已就绪的视频） */}
                  {video.status === "ready" && (
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>🎬 视频处理完成</span>
                      <span>·</span>
                      <span>🧠 可以开始 AI 分析</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 空状态 */}
      {videos.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📹</div>
          <p className="text-muted-foreground text-lg mb-4">还没有上传任何视频</p>
          <UploadVideoDialog projectId={project.id} onUploadComplete={loadData} />
        </div>
      )}

      {/* 编辑视频对话框 */}
      <EditVideoDialog
        video={editingVideo}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={loadData}
      />
    </div>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <MainLayout>
      <ProjectDetailContent projectId={id} />
    </MainLayout>
  );
}
