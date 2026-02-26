"use client";

import { useState, use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Clock, Eye, Sparkles, TreeDeciduous, Loader2, RefreshCw, Play, Image, FileText, ZoomIn } from "lucide-react";
import { VideoClipPlayer } from "@/components/video-clip-player";

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
  endMs: number;
  reason: string;
  viralScore: number;
  category: string;
}

interface Keyframe {
  id: number;
  videoId: number;
  framePath: string;
  timestampMs: number;
  frameNumber: number;
  fileSize: number;
}

interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface Transcription {
  id: number;
  videoId: number;
  text: string;
  language: string;
  duration: number;
  segments: TranscriptionSegment[];
  model: string;
  processingTimeMs: number;
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
  episodeNumber?: number | null;
  displayTitle?: string | null;
}

function VideoDetailContent({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [storylines, setStorylines] = useState<Storyline[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectProgress, setDetectProgress] = useState(0);
  const [detectError, setDetectError] = useState<string | null>(null);

  // 关键帧预览组件
  function KeyframePreview({
    src,
    alt,
    timestamp,
    frameNumber,
  }: {
    src: string;
    alt: string;
    timestamp: string;
    frameNumber: number;
  }) {
    const [isHovered, setIsHovered] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top;
      setPosition({ x, y });
    };

    return (
      <div
        ref={cardRef}
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
      >
        {/* 原始关键帧缩略图 */}
        <div className="relative aspect-video bg-muted rounded overflow-hidden cursor-pointer group">
          <img
            src={`/${src}`}
            alt={alt}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          {/* Hover 提示图标 */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ZoomIn className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
        </div>

        {/* 悬浮预览浮层 */}
        {isHovered && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: `${Math.min(position.x, window.innerWidth - 400)}px`,
              top: `${position.y}px`,
              transform: 'translateY(-50%) translateY(-20px)',
            }}
          >
            <div className="relative bg-black rounded-lg shadow-[0_20px_60px_rgb(0,0,0,0.5)] border border-white/10 overflow-hidden">
              {/* 完整图片 */}
              <div className="relative" style={{ width: '640px', height: '360px' }}>
                <img
                  src={`/${src}`}
                  alt={alt}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 图片信息条 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 py-3">
                <div className="flex items-center justify-between text-white">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white/90">帧 #{frameNumber}</span>
                      <span className="px-2 py-0.5 bg-blue-500 rounded text-xs font-medium">
                        {timestamp}
                      </span>
                    </div>
                    <div className="text-xs text-white/60">
                      原始分辨率图片预览
                    </div>
                  </div>
                  <ZoomIn className="w-5 h-5 text-white/60" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 视频播放器状态
  const [playingClip, setPlayingClip] = useState<{
    videoPath: string;
    startMs: number;
    endMs: number;
  } | null>(null);

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

  // 播放视频片段
  const handlePlayClip = (startMs: number, endMs: number) => {
    if (!video) return;

    // 构建视频 URL（需要确保可以被前端访问）
    const videoUrl = `/api/videos/${videoId}/stream`;

    setPlayingClip({
      videoPath: videoUrl,
      startMs,
      endMs,
    });
  };

  // 关闭播放器
  const handleClosePlayer = () => {
    setPlayingClip(null);
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
        console.error('触发高光检测失败:', result.message);
        setDetectError(result.message);
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

        // 加载关键帧
        const keyframesRes = await fetch(`/api/videos/${videoId}/keyframes`);
        if (keyframesRes.ok) {
          const keyframesData = await keyframesRes.json();
          setKeyframes(keyframesData.data || []);
        }

        // 加载转录文本
        const transcriptionRes = await fetch(`/api/videos/${videoId}/transcription`);
        if (transcriptionRes.ok) {
          const transcriptionData = await transcriptionRes.json();
          setTranscription(transcriptionData.data || null);
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
              {/* 集数标签 */}
              {video.episodeNumber && (
                <div className="mb-3">
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    第 {video.episodeNumber} 集
                  </Badge>
                </div>
              )}

              {/* 显示标题：优先使用 displayTitle，否则使用 filename */}
              <h1 className="text-3xl font-bold mb-2">
                {video.displayTitle || video.filename}
              </h1>

              {/* 显示原始文件名（如果 displayTitle 被使用） */}
              {video.displayTitle && video.displayTitle !== video.filename && (
                <p className="text-sm text-muted-foreground mb-2">
                  文件名：{video.filename}
                </p>
              )}

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
          <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
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
            <TabsTrigger value="keyframes" className="cursor-pointer">
              <Image className="w-4 h-4 mr-2" />
              关键帧 ({keyframes.length})
            </TabsTrigger>
            <TabsTrigger value="transcription" className="cursor-pointer">
              <FileText className="w-4 h-4 mr-2" />
              转录文本
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePlayClip(shot.startMs, shot.endMs)}
                            className="gap-1 cursor-pointer h-7"
                          >
                            <Play className="w-3 h-3" />
                            播放片段
                          </Button>
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePlayClip(highlight.startMs, highlight.endMs)}
                            className="gap-1 cursor-pointer h-7"
                          >
                            <Play className="w-3 h-3" />
                            播放片段
                          </Button>
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

          {/* 关键帧 */}
          <TabsContent value="keyframes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>关键帧提取结果</CardTitle>
                <p className="text-sm text-muted-foreground">
                  从视频中每 3 秒提取的关键帧，用于 AI 分析
                </p>
              </CardHeader>
              <CardContent>
                {keyframes.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {keyframes.map((keyframe) => (
                      <div
                        key={keyframe.id}
                        className="space-y-2"
                      >
                        {/* 关键帧图片预览（悬浮显示大图） */}
                        <KeyframePreview
                          src={keyframe.framePath}
                          alt={`关键帧 ${keyframe.frameNumber}`}
                          timestamp={formatTime(keyframe.timestampMs)}
                          frameNumber={keyframe.frameNumber}
                        />

                        {/* 时间戳和帧号 */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-muted-foreground">
                              #{keyframe.frameNumber}
                            </span>
                            <span className="text-blue-600 font-medium">
                              {formatTime(keyframe.timestampMs)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.floor(keyframe.timestampMs / 1000)}s
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📸</div>
                    <p className="text-muted-foreground mb-2">
                      暂无关键帧数据
                    </p>
                    <p className="text-sm text-muted-foreground">
                      视频分析时会自动提取关键帧
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 转录文本 */}
          <TabsContent value="transcription" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>音频转录文本（Whisper ASR）</CardTitle>
                <p className="text-sm text-muted-foreground">
                  使用 OpenAI Whisper 模型将视频中的语音转录为文字
                </p>
              </CardHeader>
              <CardContent>
                {transcription ? (
                  <div className="space-y-6">
                    {/* 基本信息 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">语言</p>
                        <p className="font-medium">{transcription.language}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">时长</p>
                        <p className="font-medium">{transcription.duration.toFixed(1)} 秒</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">片段数</p>
                        <p className="font-medium">{transcription.segments.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">模型</p>
                        <p className="font-medium">{transcription.model}</p>
                      </div>
                    </div>

                    {/* 完整转录文本 */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">完整转录文本</h3>
                      <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {transcription.text || '(无语音内容)'}
                        </p>
                      </div>
                    </div>

                    {/* 分段转录（带时间戳） */}
                    {transcription.segments.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">分段详情（带时间戳）</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {transcription.segments.map((segment, index) => (
                            <div
                              key={segment.id || index}
                              className="flex items-start gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                              onClick={() => handlePlayClip(segment.start * 1000, segment.end * 1000)}
                            >
                              <Badge variant="outline" className="flex-shrink-0">
                                {formatTime(segment.start * 1000)}
                              </Badge>
                              <p className="text-sm flex-1">{segment.text}</p>
                              <Play className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎵</div>
                    <p className="text-muted-foreground mb-2">
                      暂无转录文本
                    </p>
                    <p className="text-sm text-muted-foreground">
                      视频分析时会自动转录音频内容
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 视频片段播放器 */}
      {playingClip && (
        <VideoClipPlayer
          videoPath={playingClip.videoPath}
          startMs={playingClip.startMs}
          endMs={playingClip.endMs}
          onClose={handleClosePlayer}
        />
      )}
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
