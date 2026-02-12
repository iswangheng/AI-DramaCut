"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Edit, Trash2, Eye } from "lucide-react";
import type { Project } from "@/lib/db/schema";

// 扩展 Project 类型，添加统计信息
interface ProjectWithStats extends Project {
  videoCount: number;
  totalDuration: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

function ProjectsContent() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithStats | null>(null);

  // 加载项目列表
  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/projects');
      const data: ApiResponse<Project[]> = await response.json();

      if (data.success && data.data) {
        // 为每个项目获取统计信息
        const projectsWithStats = await Promise.all(
          data.data.map(async (project) => {
            const detailRes = await fetch(`/api/projects/${project.id}`);
            const detailData: ApiResponse<ProjectWithStats> = await detailRes.json();
            if (detailData.success && detailData.data) {
              return detailData.data;
            }
            return {
              ...project,
              videoCount: 0,
              totalDuration: "0 分钟",
            };
          })
        );
        setProjects(projectsWithStats);
        setFilteredProjects(projectsWithStats);
      } else {
        setError(data.message || "加载项目列表失败");
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

  // 搜索功能
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredProjects(projects);
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(`/api/projects/search?q=${encodeURIComponent(query)}`);
      const data: ApiResponse<Project[]> = await response.json();

      if (data.success && data.data) {
        // 为搜索结果获取统计信息
        const projectsWithStats = await Promise.all(
          data.data.map(async (project) => {
            const detailRes = await fetch(`/api/projects/${project.id}`);
            const detailData: ApiResponse<ProjectWithStats> = await detailRes.json();
            if (detailData.success && detailData.data) {
              return detailData.data;
            }
            return {
              ...project,
              videoCount: 0,
              totalDuration: "0 分钟",
            };
          })
        );
        setFilteredProjects(projectsWithStats);
      }
    } catch (err) {
      console.error("搜索失败:", err);
      // 搜索失败时显示所有项目
      setFilteredProjects(projects);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateProject = async (name: string, description?: string) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const data: ApiResponse<Project> = await response.json();

      if (data.success) {
        // 重新加载项目列表
        await loadProjects();
      } else {
        alert(data.message || "创建项目失败");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "创建项目失败");
    }
  };

  const handleDeleteProject = async (projectId: number, projectName: string) => {
    if (!confirm(`确定要删除项目"${projectName}"吗？\n\n所有关联的视频将被删除，此操作不可恢复。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      const data: ApiResponse<void> = await response.json();

      if (data.success) {
        // 从列表中移除
        setFilteredProjects(filteredProjects.filter((p) => p.id !== projectId));
        setProjects(projects.filter((p) => p.id !== projectId));
      } else {
        alert(data.message || "删除项目失败");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除项目失败");
    }
  };

  const handleProjectClick = (projectId: number) => {
    router.push(`/projects/${projectId}`);
  };

  const handleEditProject = (project: ProjectWithStats) => {
    setEditingProject(project);
  };

  return (
    <>
    <div className="p-10 animate-fade-in">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">项目管理</h1>
            <p className="text-base text-muted-foreground">管理你的短剧项目素材，查看预处理进度</p>
          </div>
          <Button variant="outline" onClick={loadProjects} disabled={loading}>
            刷新
          </Button>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索项目..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
            disabled={loading || searching}
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              搜索中...
            </span>
          )}
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

      {/* 搜索结果提示 */}
      {searchQuery && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-600">
            找到 {filteredProjects.length} 个包含"{searchQuery}"的项目
          </p>
        </div>
      )}

      {/* 项目卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 项目卡片 */}
        {filteredProjects.map((project) => (
          <Card
            key={project.id}
            className="hover:shadow-md transition-base group relative"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleProjectClick(project.id!)}
                >
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {project.description}
                    </p>
                  )}
                </div>

                {/* 操作菜单 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProjectClick(project.id!);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      查看详情
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProject(project);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id!, project.name);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除项目
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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

      {!loading && filteredProjects.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg mb-4">
            {searchQuery ? `没有找到包含"${searchQuery}"的项目` : "还没有项目"}
          </p>
          {!searchQuery && <CreateProjectDialog onCreateProject={handleCreateProject} />}
        </div>
      )}

      {loading && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">加载中...</p>
        </div>
      )}
    </div>

    {/* 编辑项目对话框 */}
    {editingProject && (
      <EditProjectDialog
        key={editingProject.id}
        projectId={editingProject.id!}
        projectName={editingProject.name}
        projectDescription={editingProject.description || undefined}
        onUpdate={loadProjects}
      />
    )}
    </>
  );
}

export default function ProjectsPage() {
  return (
    <MainLayout>
      <ProjectsContent />
    </MainLayout>
  );
}
