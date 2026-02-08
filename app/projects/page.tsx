"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreateProjectDialog } from "@/components/create-project-dialog";

interface Project {
  id: string;
  name: string;
  description?: string;
  videoCount: number;
  totalDuration: string;
  status: "ready" | "processing";
  progress: number;
  currentStep?: string;
  createdAt: Date;
}

// 示例数据
const initialProjects: Project[] = [
  {
    id: "1",
    name: "霸道总裁爱上我",
    videoCount: 12,
    totalDuration: "2.5 小时",
    status: "ready",
    progress: 100,
    createdAt: new Date("2025-02-01"),
  },
  {
    id: "2",
    name: "重生之豪门千金",
    videoCount: 8,
    totalDuration: "1.8 小时",
    status: "processing",
    progress: 65,
    currentStep: "Gemini 分析中... 65%",
    createdAt: new Date("2025-02-05"),
  },
];

function ProjectsContent() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const handleCreateProject = (name: string, description?: string) => {
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      description,
      videoCount: 0,
      totalDuration: "0 分钟",
      status: "ready",
      progress: 0,
      createdAt: new Date(),
    };

    setProjects([newProject, ...projects]);
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  return (
    <div className="p-10 animate-fade-in">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">素材管理</h1>
        <p className="text-base text-muted-foreground">管理你的短剧项目素材，查看预处理进度</p>
      </div>

      {/* 操作按钮 */}
      <div className="mb-6">
        <CreateProjectDialog onCreateProject={handleCreateProject} />
      </div>

      {/* 项目卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 项目卡片 */}
        {projects.map((project) => (
          <Card
            key={project.id}
            className="hover:shadow-md transition-base cursor-pointer"
            onClick={() => handleProjectClick(project.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {project.description}
                    </p>
                  )}
                </div>
                {project.status === "ready" && (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    已就绪
                  </Badge>
                )}
                {project.status === "processing" && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    处理中
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                {project.videoCount} 个视频 · 总时长 {project.totalDuration}
              </p>

              <Progress value={project.progress} className="h-1" />

              {project.status === "processing" && project.currentStep && (
                <p className="text-xs text-muted-foreground mt-2">
                  {project.currentStep}
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {/* 上传新项目卡片 - 仅作展示，实际使用上方按钮 */}
        {/* <Card className="border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-base cursor-pointer flex items-center justify-center min-h-[160px]">
          <CardContent className="text-center py-12">
            <div className="text-5xl text-muted-foreground mb-3">+</div>
            <div className="text-sm font-medium text-muted-foreground">
              上传新项目
            </div>
          </CardContent>
        </Card> */}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg mb-4">还没有项目</p>
          <CreateProjectDialog onCreateProject={handleCreateProject} />
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <MainLayout>
      <ProjectsContent />
    </MainLayout>
  );
}
