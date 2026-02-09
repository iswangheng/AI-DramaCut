"use client";

import { useState, useRef, useEffect } from "react";
import { X, Play, Pause, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface VideoClipPlayerProps {
  videoPath: string;
  startMs: number;
  endMs: number;
  onClose: () => void;
}

/**
 * 视频片段播放器组件
 *
 * 功能：
 * - 播放指定时间段的视频片段
 * - 自动跳转到开始时间
 * - 到达结束时间自动暂停
 * - 支持音量调节
 * - 支持播放/暂停控制
 */
export function VideoClipPlayer({
  videoPath,
  startMs,
  endMs,
  onClose,
}: VideoClipPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isEnded, setIsEnded] = useState(false);

  // 将毫秒转换为秒
  const startTime = startMs / 1000;
  const endTime = endMs / 1000;
  const clipDuration = endTime - startTime;

  // 初始化视频
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 设置视频开始时间
    const handleLoadedMetadata = () => {
      video.currentTime = startTime;
      setDuration(video.duration);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [videoPath, startTime]);

  // 监听播放时间，到达结束时间自动暂停
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      // 到达结束时间，自动暂停
      if (video.currentTime >= endTime && isPlaying) {
        video.pause();
        setIsPlaying(false);
        setIsEnded(true);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [endTime, isPlaying]);

  // 播放/暂停
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    // 如果已经结束，重新开始
    if (isEnded || video.currentTime >= endTime) {
      video.currentTime = startTime;
      setIsEnded(false);
    }

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  // 跳转到指定时间
  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = value[0];
    // 限制在片段范围内
    const clampedTime = Math.max(startTime, Math.min(endTime, newTime));
    video.currentTime = clampedTime;
    setCurrentTime(clampedTime);
    setIsEnded(false);
  };

  // 调节音量
  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
  };

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // 计算播放进度
  const progress = ((currentTime - startTime) / (endTime - startTime)) * 100;
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">视频片段播放</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 视频播放器 */}
        <div className="p-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full"
              src={videoPath}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>

          {/* 控制栏 */}
          <div className="mt-4 space-y-4">
            {/* 进度条 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{formatTime(currentTime - startTime)}</span>
                <span>{formatTime(clipDuration)}</span>
              </div>
              <Slider
                value={[currentTime - startTime]}
                min={0}
                max={clipDuration}
                step={0.1}
                onValueChange={(value) => handleSeek([value[0] + startTime])}
                className="cursor-pointer"
              />
            </div>

            {/* 播放控制和音量 */}
            <div className="flex items-center justify-between">
              <Button
                onClick={togglePlay}
                size="lg"
                className="gap-2 cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5" />
                    暂停
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    {isEnded ? "重播" : "播放"}
                  </>
                )}
              </Button>

              <div className="flex items-center gap-3 flex-1 max-w-xs">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <Slider
                  value={[volume]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="cursor-pointer"
                />
              </div>
            </div>

            {/* 片段信息 */}
            <div className="text-sm text-muted-foreground text-center">
              片段时长: {formatTime(clipDuration)} (
                {formatTime(startMs / 1000)} - {formatTime(endMs / 1000)})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
