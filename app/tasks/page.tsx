"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Play,
  FileVideo,
  Mic,
  Workflow,
  Loader2,
} from "lucide-react";

// 任务类型定义
interface QueueJob {
  id: number;
  jobId: string;
  queueName: string;
  jobType: string;
  payload: string;
  status: "waiting" | "active" | "completed" | "failed" | "delayed" | "retried";
  result?: string;
  error?: string;
  progress?: number;
  processedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 模拟数据
const mockJobs: QueueJob[] = [
  {
    id: 1,
    jobId: "job-1",
    queueName: "highlight-render",
    jobType: "highlight_clip",
    payload: JSON.stringify({
      clipId: "ai-1",
      clipName: "身份曝光场景",
      sourceVideo: "霸道总裁爱上我.ep1.mp4",
    }),
    status: "active",
    processedAt: new Date(Date.now() - 30000),
    progress: 65,
    createdAt: new Date(Date.now() - 60000),
    updatedAt: new Date(),
  },
  {
    id: 2,
    jobId: "job-2",
    queueName: "highlight-render",
    jobType: "highlight_clip",
    payload: JSON.stringify({
      clipId: "ai-2",
      clipName: "打脸时刻",
      sourceVideo: "霸道总裁爱上我.ep1.mp4",
    }),
    status: "waiting",
    createdAt: new Date(Date.now() - 120000),
    updatedAt: new Date(Date.now() - 120000),
  },
  {
    id: 3,
    jobId: "job-3",
    queueName: "recap-render",
    jobType: "recap_video",
    payload: JSON.stringify({
      recapTaskId: "recap-1",
      title: "霸道总裁剧情解说 - 悬念版",
      duration: 90,
    }),
    status: "completed",
    result: JSON.stringify({
      outputPath: "/output/recap-1.mp4",
      thumbnailPath: "/output/recap-1-thumb.jpg",
    }),
    processedAt: new Date(Date.now() - 600000),
    completedAt: new Date(Date.now() - 300000),
    createdAt: new Date(Date.now() - 700000),
    updatedAt: new Date(Date.now() - 300000),
  },
  {
    id: 4,
    jobId: "job-4",
    queueName: "highlight-render",
    jobType: "highlight_clip",
    payload: JSON.stringify({
      clipId: "manual-1",
      clipName: "自定义切片 1",
      sourceVideo: "霸道总裁爱上我.ep2.mp4",
    }),
    status: "failed",
    error: "FFmpeg error: Output file already exists",
    processedAt: new Date(Date.now() - 900000),
    createdAt: new Date(Date.now() - 950000),
    updatedAt: new Date(Date.now() - 900000),
  },
];

function getJobIcon(jobType: string) {
  switch (jobType) {
    case "highlight_clip":
      return <FileVideo className="w-5 h-5" />;
    case "recap_video":
      return <Mic className="w-5 h-5" />;
    default:
      return <Workflow className="w-5 h-5" />;
  }
}

function getStatusBadge(status: QueueJob["status"]) {
  switch (status) {
    case "waiting":
      return (
        <Badge className="bg-slate-100 text-slate-700">
          <Clock className="w-3 h-3 mr-1" />
          等待中
        </Badge>
      );
    case "active":
      return (
        <Badge className="bg-blue-100 text-blue-700">
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          进行中
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-green-100 text-green-700">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          已完成
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-100 text-red-700">
          <XCircle className="w-3 h-3 mr-1" />
          失败
        </Badge>
      );
    case "delayed":
      return (
        <Badge className="bg-yellow-100 text-yellow-700">
          <AlertCircle className="w-3 h-3 mr-1" />
          延迟
        </Badge>
      );
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}小时${minutes % 60}分`;
  } else if (minutes > 0) {
    return `${minutes}分${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}

function TasksContent() {
  const router = useRouter();
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  // 加载任务列表
  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks');
      const data = await response.json();

      if (data.success) {
        setJobs(data.data || []);
      } else {
        console.error('加载任务失败:', data.error);
      }
    } catch (error) {
      console.error('加载任务错误:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadJobs();
  }, []);

  // 定时刷新（每 5 秒）
  useEffect(() => {
    const interval = setInterval(() => {
      loadJobs();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // 重试任务（仅针对渲染任务）
  const handleRetry = async (taskId: number) => {
    if (!confirm('确定要重试这个渲染任务吗？')) return;

    try {
      // TODO: 实现渲染任务重试逻辑
      // 1. 从 payload 解析任务类型（render-highlight 或 recap-render）
      // 2. 重新调用渲染 API
      // 3. 更新原任务状态为 retried

      alert('重试功能待实现，请重新创建渲染任务');
    } catch (error) {
      console.error('重试任务错误:', error);
      alert('重试任务失败');
    }
  };

  // 根据标签过滤任务
  const filteredJobs = jobs.filter((job) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return job.status === "active" || job.status === "waiting";
    if (activeTab === "completed") return job.status === "completed";
    if (activeTab === "failed") return job.status === "failed";
    return true;
  });

  // 统计数据
  const stats = {
    total: jobs.length,
    active: jobs.filter((j) => j.status === "active" || j.status === "waiting").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };

  return (
    <div className="p-10 animate-fade-in">
      {/* 页面标题 */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">任务管理</h1>
          <p className="text-base text-muted-foreground">
            查看所有渲染任务进度和历史记录
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadJobs}
          className="cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">全部任务</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.total}</p>
              </div>
              <Workflow className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">进行中</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.active}</p>
              </div>
              <RefreshCw className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已完成</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.completed}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">失败</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 任务列表 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">全部 ({stats.total})</TabsTrigger>
          <TabsTrigger value="active">进行中 ({stats.active})</TabsTrigger>
          <TabsTrigger value="completed">已完成 ({stats.completed})</TabsTrigger>
          <TabsTrigger value="failed">失败 ({stats.failed})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-3">
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">加载任务中...</p>
              </CardContent>
            </Card>
          ) : filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-muted-foreground mb-2">暂无任务</p>
                <p className="text-sm text-muted-foreground">
                  {activeTab === "all"
                    ? "还没有任何渲染任务"
                    : `没有${activeTab === "active" ? "进行中" : activeTab === "completed" ? "已完成" : "失败"}的任务`}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job) => {
              const payload = JSON.parse(job.payload);
              const progress = (job as any).progress || (job.status === "completed" ? 100 : job.status === "active" ? 50 : 0);

              return (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        {/* 任务图标 */}
                        <div className="mt-1 text-primary">
                          {getJobIcon(job.jobType)}
                        </div>

                        {/* 任务信息 */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">
                              {payload.clipName || payload.title || "未知任务"}
                            </h3>
                            {getStatusBadge(job.status)}
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">
                            {job.jobType === "highlight_clip"
                              ? `切片渲染 · ${payload.sourceVideo}`
                              : job.jobType === "recap_video"
                              ? `深度解说 · ${payload.duration}秒`
                              : job.jobType}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              创建于 {new Date(job.createdAt).toLocaleTimeString("zh-CN")}
                            </span>
                            {job.processedAt && (
                              <span>
                                开始于 {new Date(job.processedAt).toLocaleTimeString("zh-CN")}
                              </span>
                            )}
                            {job.completedAt && (
                              <span className="text-green-600">
                                耗时 {formatDuration(job.completedAt.getTime() - job.processedAt!.getTime())}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2">
                        {job.status === "waiting" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => console.log("取消任务:", job.jobId)}
                            className="cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            取消
                          </Button>
                        )}
                        {job.status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetry(job.id)}
                            className="cursor-pointer border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            重试
                          </Button>
                        )}
                        {job.status === "completed" && (
                          <Button
                            size="sm"
                            onClick={() => console.log("下载任务:", job.jobId)}
                            className="cursor-pointer"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            下载
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 进度条 */}
                    {job.status === "active" || job.status === "waiting" ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {job.status === "waiting" ? "等待中" : "执行进度"}
                          </span>
                          <span className="font-semibold text-foreground">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    ) : job.status === "failed" && job.error ? (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">{job.error}</p>
                      </div>
                    ) : job.status === "completed" && job.result ? (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700">✓ 任务完成</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function TasksPage() {
  return (
    <MainLayout>
      <TasksContent />
    </MainLayout>
  );
}
