"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Image as ImageIcon, Loader2, Play, ZoomIn } from "lucide-react";
import Image from "next/image";

/**
 * 关键帧图片预览组件
 * 鼠标悬停时优雅地显示完整图片
 */
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
        <Image
          src={`/${src}`}
          alt={alt}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          unoptimized
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
              <Image
                src={`/${src}`}
                alt={alt}
                fill
                className="object-cover"
                unoptimized
                priority
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

            {/* 装饰性边框光效 */}
            <div className="absolute inset-0 border-2 border-white/20 rounded-lg pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
}

interface Keyframe {
  id: number;
  videoId: number;
  framePath: string;
  timestampMs: number;
  frameNumber: number;
}

interface Video {
  id: number;
  filename: string;
  episodeNumber: number | null;
  displayTitle: string | null;
}

interface KeyframesByVideo {
  video: Video;
  keyframes: Keyframe[];
}

export default function KeyframesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [keyframesData, setKeyframesData] = useState<KeyframesByVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);

  useEffect(() => {
    loadKeyframes();
  }, [projectId]);

  const loadKeyframes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/keyframes`);
      const data = await response.json();

      if (data.success && data.data) {
        setKeyframesData(data.data);
        if (data.data.length > 0) {
          setSelectedVideo(data.data[0].video.id);
        }
      } else {
        setError(data.message || '加载关键帧失败');
      }
    } catch (err) {
      console.error('加载关键帧失败:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const selectedVideoData = keyframesData.find(v => v.video.id === selectedVideo);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <Button
              onClick={() => router.back()}
              className="mt-4 cursor-pointer"
              variant="outline"
            >
              返回
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">关键帧查看</h1>
              <p className="text-sm text-muted-foreground">
                查看所有视频的关键帧提取结果
              </p>
            </div>
          </div>
        </div>

        {/* 视频选择器 */}
        {keyframesData.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {keyframesData.map(({ video }) => (
              <Button
                key={video.id}
                variant={selectedVideo === video.id ? "default" : "outline"}
                onClick={() => setSelectedVideo(video.id)}
                className="cursor-pointer whitespace-nowrap"
              >
                第 {video.episodeNumber} 集
                {video.displayTitle && ` - ${video.displayTitle}`}
              </Button>
            ))}
          </div>
        )}

        {/* 关键帧网格 */}
        {selectedVideoData && selectedVideoData.keyframes.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                第 {selectedVideoData.video.episodeNumber} 集
                {selectedVideoData.video.displayTitle && ` - ${selectedVideoData.video.displayTitle}`}
              </h2>
              <span className="text-sm text-muted-foreground">
                共 {selectedVideoData.keyframes.length} 个关键帧
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {selectedVideoData.keyframes.map((keyframe) => (
                <Card key={keyframe.id} className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-500/30">
                  <CardContent className="p-2 space-y-2">
                    {/* 关键帧图片（带悬浮预览） */}
                    <KeyframePreview
                      src={keyframe.framePath}
                      alt={`Frame at ${formatTime(keyframe.timestampMs)}`}
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                该视频暂无关键帧数据
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
