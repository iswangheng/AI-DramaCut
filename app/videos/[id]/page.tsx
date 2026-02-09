"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Clock, Eye, Sparkles, TreeDeciduous, Loader2, RefreshCw } from "lucide-react";

interface Shot {
  id: number;
  videoId: number;
  startMs: number;
  endMs: number;
  description: string;
  emotion: string;
  dialogue: string | null;
  viralScore: number | null;
}

interface Storyline {
  id: number;
  videoId: number;
  name: string;
  description: string;
  attractionScore: number;
  category: string;
}

interface Highlight {
  id: number;
  videoId: number;
  startMs: number;
  reason: string;
  viralScore: number;
  category: string;
}

interface VideoDetail {
  id: number;
  filename: string;
  filePath: string;
  fileSize: number;
  durationMs: number;
  width: number;
  height: number;
  fps: number;
  status: string;
}

function VideoDetailContent({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [storylines, setStorylines] = useState<Storyline[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectProgress, setDetectProgress] = useState(0);
  const [detectError, setDetectError] = useState<string | null>(null);

  // 格式化时间
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  // 轮询任务状态
  const pollTaskStatus = async () => {
    try {
      const statusRes = await fetch(`/api/videos/${videoId}/highlights/status`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.success && statusData.data.latestJob) {
          const job = statusData.data.latestJob;
          const isActive = job.status === 'waiting' || job.status === 'active';

          setDetectProgress(job.progress || 0);
          setIsDetecting(isActive);

          // 如果任务失败，显示错误信息
          if (job.status === 'failed' && job.error) {
            setDetectError(job.error);
            setIsDetecting(false);
            return false; // 停止轮询
          }

          // 如果任务完成，刷新数据
          if (job.status === 'completed') {
            fetch(`/api/videos/${videoId}/highlights`)
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  setHighlights(data.data || []);
                  setIsDetecting(false);
                  setDetectProgress(100);
                  setDetectError(null);
                }
              });
            return false; // 停止轮询
          }

          return isActive; // 如果还在运行，继续轮询
        }
      }
      return false;
    } catch (error) {
      console.error('轮询任务状态失败:', error);
      return false;
    }
  };

  // 重新检测高光片段
  const handleRedetectHighlights = async () => {
    if (!video || isDetecting) return;

    try {
      setIsDetecting(true);
      setDetectProgress(0);
      setDetectError(null);

      const response = await fetch(`/api/videos/${videoId}/highlights/detect`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ 高光检测任务已添加到队列');

        // 开始轮询任务状态（每 2 秒一次）
        const pollInterval = setInterval(async () => {
          const shouldContinue = await pollTaskStatus();
          if (!shouldContinue) {
            clearInterval(pollInterval);
          }
        }, 2000);

        // 立即检查一次
        await pollTaskStatus();
      } else {
        console.error('触发高光检测失败:', result.error);
        setDetectError(result.error);
        setIsDetecting(false);
      }
    } catch (error) {
      console.error('触发高光检测失败:', error);
      setDetectError('触发高光检测失败，请查看控制台');
      setIsDetecting(false);
    }
  };

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 加载视频详情
        const videoRes = await fetch(`/api/videos/${videoId}`);
        if (!videoRes.ok) throw new Error("加载视频失败");
        const videoData = await videoRes.json();
        setVideo(videoData.data);

        // 加载镜头列表
        const shotsRes = await fetch(`/api/videos/${videoId}/shots`);
        if (shotsRes.ok) {
          const shotsData = await shotsRes.json();
          setShots(shotsData.data || []);
        }

        // 加载故事线
        const storylinesRes = await fetch(`/api/videos/${videoId}/storylines`);
        if (storylinesRes.ok) {
          const storylinesData = await storylinesRes.json();
          setStorylines(storylinesData.data || []);
        }

        // 加载高光片段
        const highlightsRes = await fetch(`/api/videos/${videoId}/highlights`);
        if (highlightsRes.ok) {
          const highlightsData = await highlightsRes.json();
          setHighlights(highlightsData.data || []);
        }

        // 检查是否有正在进行的检测任务
        const statusRes = await fetch(`/api/videos/${videoId}/highlights/status`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.success && statusData.data.latestJob) {
            const job = statusData.data.latestJob;

            // 显示任务进度
            setDetectProgress(job.progress || 0);

            // 如果任务正在运行，开始轮询
            if (job.status === 'waiting' || job.status === 'active') {
              console.log('检测到正在进行的检测任务，显示检测中状态');
              setIsDetecting(true);

              // 开始轮询
              const pollInterval = setInterval(async () => {
                const shouldContinue = await pollTaskStatus();
                if (!shouldContinue) {
                  clearInterval(pollInterval);
                }
              }, 2000);
            }
            // 如果任务失败，显示错误
            else if (job.status === 'failed' && job.error) {
              setDetectError(job.error);
            }
          }
        }
      } catch (error) {
        console.error("加载数据失败:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [videoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">📹</div>
          <p className="text-muted-foreground text-lg mb-4">视频不存在</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 头部 */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回项目
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{video.filename}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTime(video.durationMs)}
                </span>
                <span>·</span>
                <span>{video.width}x{video.height}</span>
                <span>·</span>
                <span>{video.fps} fps</span>
                <span>·</span>
                <span>{(video.fileSize / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>
            <Badge variant={video.status === "ready" ? "default" : "secondary"}>
              {video.status === "ready" ? "✅ 已就绪" : video.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="shots" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="shots" className="cursor-pointer">
              <Eye className="w-4 h-4 mr-2" />
              镜头分析 ({shots.length})
            </TabsTrigger>
            <TabsTrigger value="storylines" className="cursor-pointer">
              <TreeDeciduous className="w-4 h-4 mr-2" />
              剧情树 ({storylines.length})
            </TabsTrigger>
            <TabsTrigger value="highlights" className="cursor-pointer">
              <Sparkles className="w-4 h-4 mr-2" />
              高光片段 ({highlights.length})
            </TabsTrigger>
          </TabsList>

          {/* 镜头分析 */}
          <TabsContent value="shots" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>镜头分析详情</CardTitle>
                <p className="text-sm text-muted-foreground">
                  AI 深度解析每一个镜头的画面、情感和音频信息
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shots.map((shot, index) => (
                    <div
                      key={shot.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">镜头 {index + 1}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTime(shot.startMs)} - {formatTime(shot.endMs)}
                          </span>
                        </div>
                        {shot.viralScore && (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                            ⭐ {shot.viralScore.toFixed(1)}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm mb-3">{shot.description}</p>

                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">情感: {shot.emotion}</Badge>
                      </div>

                      {shot.dialogue && (
                        <div className="bg-muted p-3 rounded text-sm">
                          <p className="font-medium mb-1">💬 对白</p>
                          <p className="text-muted-foreground">{shot.dialogue}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {shots.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无镜头分析数据
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 剧情树 */}
          <TabsContent value="storylines" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>剧情树</CardTitle>
                <p className="text-sm text-muted-foreground">
                  AI 提取的故事主线，展示多条并行的剧情发展
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {storylines.map((storyline, index) => (
                    <div
                      key={storyline.id}
                      className="border-l-4 border-primary rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold">
                          {storyline.name}
                        </h3>
                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                          🔥 吸引力: {storyline.attractionScore.toFixed(1)}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {storyline.description}
                      </p>

                      <Badge variant="outline">{storyline.category}</Badge>
                    </div>
                  ))}
                </div>

                {storylines.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无剧情树数据
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 高光片段 */}
          <TabsContent value="highlights" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>高光片段</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      AI 自动检测的最精彩片段，适合用于短视频切片
                    </p>
                  </div>
                  {highlights.length === 0 && video.status === "ready" && (
                    <Button
                      onClick={handleRedetectHighlights}
                      disabled={isDetecting}
                      className="gap-2 cursor-pointer"
                    >
                      {isDetecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          检测中 {detectProgress > 0 && `(${detectProgress}%)`}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          重新检测
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {highlights.map((highlight) => (
                    <div
                      key={highlight.id}
                      className="border rounded-lg p-4 bg-gradient-to-r from-yellow-50 to-orange-50 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                            ✨ 高光
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTime(highlight.startMs)}
                          </span>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                          ⭐ {highlight.viralScore.toFixed(1)}
                        </Badge>
                      </div>

                      <p className="text-sm mb-2">{highlight.reason}</p>

                      <Badge variant="outline">{highlight.category}</Badge>
                    </div>
                  ))}
                </div>

                {highlights.length === 0 && (
                  <div className="text-center py-12">
                    {isDetecting ? (
                      <div className="space-y-4 max-w-md mx-auto">
                        <Loader2 className="w-12 h-12 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground font-medium">
                          正在调用 AI 检测高光片段...
                        </p>

                        {/* 进度条 */}
                        {detectProgress > 0 && (
                          <div className="space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                              <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${detectProgress}%` }}
                              ></div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              进度: {detectProgress}%
                            </p>
                          </div>
                        )}

                        <p className="text-sm text-muted-foreground">
                          检测完成后会自动显示结果
                        </p>
                      </div>
                    ) : detectError ? (
                      <div className="space-y-4 max-w-md mx-auto">
                        <div className="text-6xl mb-4">⚠️</div>
                        <p className="text-muted-foreground mb-4 font-medium">
                          高光检测失败
                        </p>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                          <p className="text-sm text-red-800">
                            {detectError}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          请检查视频内容是否符合 Gemini 使用政策，或稍后重试
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-6xl mb-4">✨</div>
                        <p className="text-muted-foreground mb-4">
                          暂无高光片段数据
                        </p>
                        {video.status === "analyzing" ? (
                          <p className="text-sm text-muted-foreground">
                            正在 AI 分析中...
                          </p>
                        ) : video.status === "ready" ? (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              点击右上角的"重新检测"按钮开始 AI 分析
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            当前视频状态: {video.status}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <MainLayout>
      <VideoDetailContent videoId={id} />
    </MainLayout>
  );
}
