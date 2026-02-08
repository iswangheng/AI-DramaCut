"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { projectsApi, type ProjectWithStats } from "@/lib/api";

function ProjectsContent() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载项目列表
  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await projectsApi.list();

      if (response.success && response.data) {
        // 为每个项目获取统计信息
        const projectsWithStats = await Promise.all(
          response.data.map(async (project) => {
            const detailResponse = await projectsApi.getById(project.id!);
            if (detailResponse.success && detailResponse.data) {
              return detailResponse.data;
            }
            return {
              ...project,
              videoCount: 0,
              totalDuration: "0 分钟",
            };
          })
        );
        setProjects(projectsWithStats);
      } else {
        setError(response.message || "加载项目列表失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载项目列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取项目列表
  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (name: string, description?: string) => {
    try {
      const response = await projectsApi.create({ name, description });

      if (response.success) {
        // 重新加载项目列表
        await loadProjects();
      } else {
        alert(response.message || "创建项目失败");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "创建项目失败");
    }
  };

  const handleProjectClick = (projectId: number) => {
    router.push(`/projects/${projectId}`);
  };

  return (
    <div className="p-10 animate-fade-in">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">素材管理</h1>
            <p className="text-base text-muted-foreground">管理你的短剧项目素材，查看预处理进度</p>
          </div>
          <Button variant="outline" onClick={loadProjects} disabled={loading}>
            {loading ? "加载中..." : "刷新"}
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

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
            onClick={() => handleProjectClick(project.id!)}
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
                {project.status === "error" && (
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                    错误
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

      {!loading && projects.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg mb-4">还没有项目</p>
          <CreateProjectDialog onCreateProject={handleCreateProject} />
        </div>
      )}

      {loading && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">加载中...</p>
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
