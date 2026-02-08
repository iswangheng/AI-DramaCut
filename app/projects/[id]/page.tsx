"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Upload, MoreVertical, Trash2, Eye } from "lucide-react";

interface Video {
  id: string;
  filename: string;
  duration: string;
  fileSize: string;
  status: "uploading" | "processing" | "analyzing" | "ready" | "error";
  progress: number;
  currentStep?: string;
  thumbnail?: string;
  createdAt: Date;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

// 模拟数据
const mockProject: Project = {
  id: "1",
  name: "霸道总裁爱上我",
  description: "都市言情短剧，共12集",
  createdAt: new Date("2025-02-01"),
};

const mockVideos: Video[] = [
  {
    id: "1",
    filename: "霸道总裁爱上我.ep1.mp4",
    duration: "45:32",
    fileSize: "1.2 GB",
    status: "ready",
    progress: 100,
    createdAt: new Date("2025-02-01"),
  },
  {
    id: "2",
    filename: "霸道总裁爱上我.ep2.mp4",
    duration: "44:18",
    fileSize: "1.1 GB",
    status: "analyzing",
    progress: 75,
    currentStep: "Gemini 完整理解中... 75%",
    createdAt: new Date("2025-02-02"),
  },
  {
    id: "3",
    filename: "霸道总裁爱上我.ep3.mp4",
    duration: "46:05",
    fileSize: "1.3 GB",
    status: "processing",
    progress: 45,
    currentStep: "镜头检测中... 检测到 82 个镜头",
    createdAt: new Date("2025-02-03"),
  },
];

function ProjectDetailContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project] = useState<Project>(mockProject);
  const [videos, setVideos] = useState<Video[]>(mockVideos);

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

  const handleDeleteVideo = (videoId: string) => {
    if (confirm("确定要删除这个视频吗？")) {
      setVideos(videos.filter((v) => v.id !== videoId));
    }
  };

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
      <div className="mb-6 flex gap-3">
        <Button className="gap-2">
          <Upload className="w-4 h-4" />
          上传视频
        </Button>
        <Button variant="outline">查看剧情树</Button>
      </div>

      {/* 视频列表 */}
      <div className="space-y-4">
        {videos.map((video) => (
          <Card key={video.id} className="hover:shadow-md transition-base">
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
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {video.filename}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{video.duration}</span>
                        <span>·</span>
                        <span>{video.fileSize}</span>
                        <span>·</span>
                        <span>{getStatusBadge(video.status)}</span>
                      </div>
                    </div>

                    {/* 操作菜单 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteVideo(video.id)}
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
                      <Progress value={video.progress} className="h-2" />
                      {video.currentStep && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {video.currentStep}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 处理详情（已就绪的视频） */}
                  {video.status === "ready" && (
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>🎬 128 个镜头片段</span>
                      <span>·</span>
                      <span>🧠 Gemini 理解完成</span>
                      <span>·</span>
                      <span>📊 15 个高光候选</span>
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
          <Button className="gap-2">
            <Upload className="w-4 h-4" />
            上传第一个视频
          </Button>
        </div>
      )}
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
