"use client";

import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Wand2,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  Check,
  Loader2,
} from "lucide-react";
// import { HighlightPlayer, formatMsToTime } from "@/components/highlight/highlight-player";
// import { formatMsToTime } from "@/components/highlight/highlight-player";

// 临时复制 formatMsToTime 函数
function formatMsToTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

interface HighlightClip {
  id: string;
  name: string;

  // 视频来源信息
  sourceVideoId: string;      // 来源视频ID
  sourceVideoName: string;    // 来源视频名称（如：第1集）
  sourceEpisodeNumber?: number; // 集数

  // AI 检测信息
  highlightMomentMs: number; // AI 检测到的高光时刻（毫秒）
  originalDurationMs: number; // 原始高光时长（毫秒）

  // 切片时间信息
  startMs: number;  // 切片开始时间（自动延伸后的）
  endMs: number;    // 切片结束时间（向后延伸 1-2 分钟）
  finalDurationMs: number; // 最终切片时长

  // 跨集信息
  crossesEpisode: boolean;  // 是否跨越多集
  endVideoId?: string;      // 结束视频ID（如果跨集的话）
  endVideoName?: string;    // 结束视频名称

  // 来源标记
  source: "ai" | "manual";
  viralScore?: number; // 爆款分数（0-100）
  reason?: string; // AI 推荐理由（如：反转场景，身份曝光）

  // 状态
  status: "pending" | "in_queue" | "rendering" | "completed" | "failed";
  errorMessage?: string;

  // 元数据
  createdAt: Date;
  updatedAt: Date;
}

// 模拟数据
const mockAIGeneratedClips: HighlightClip[] = [
  {
    id: "ai-1",
    name: "身份曝光场景",
    sourceVideoId: "1",
    sourceVideoName: "霸道总裁爱上我.ep1.mp4",
    sourceEpisodeNumber: 1,
    highlightMomentMs: 754000,
    originalDurationMs: 5000,
    startMs: 754000, // 12:34
    endMs: 874000,   // 14:34
    finalDurationMs: 120000,
    crossesEpisode: false,
    source: "ai",
    viralScore: 98,
    reason: "反转场景，身份曝光，情感爆发",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "ai-2",
    name: "打脸时刻",
    sourceVideoId: "1",
    sourceVideoName: "霸道总裁爱上我.ep1.mp4",
    sourceEpisodeNumber: 1,
    highlightMomentMs: 1518000,
    originalDurationMs: 5000,
    startMs: 1518000, // 25:18
    endMs: 1638000,  // 27:18
    finalDurationMs: 120000,
    crossesEpisode: false,
    source: "ai",
    viralScore: 94,
    reason: "冲突爆发，打脸桥段",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function parseTimeToMs(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length === 3) {
    // 格式: "MM:SS.mmm" 或 "HH:MM:SS.mmm"
    const [first, second, third] = parts;

    // 检查第三个部分是否包含小数点（秒.毫秒）
    if (third.includes(".")) {
      const [sec, ms] = third.split(".");
      // first 是分钟，second 是秒，third 是秒.毫秒（需要处理）
      // 但这种格式不太常见，先按 HH:MM:SS.mmm 处理
      const hr = parseInt(first);
      const min = parseInt(second);
      return (
        hr * 3600 * 1000 +
        min * 60 * 1000 +
        parseInt(sec) * 1000 +
        parseInt(ms.padEnd(3, '0'))
      );
    } else {
      // 格式: "MM:SS:mmm"（毫秒用冒号分隔）
      const [min, sec, ms] = parts;
      return (
        parseInt(min) * 60 * 1000 +
        parseInt(sec) * 1000 +
        parseInt(ms)
      );
    }
  } else if (parts.length === 4) {
    // 格式: "HH:MM:SS:mmm"
    const [hr, min, sec, ms] = parts;
    return (
      parseInt(hr) * 3600 * 1000 +
      parseInt(min) * 60 * 1000 +
      parseInt(sec) * 1000 +
      parseInt(ms)
    );
  }
  return 0;
}

function HighlightContent() {
  const playerRef = useRef<any>(null);

  // 状态
  const [clips, setClips] = useState<HighlightClip[]>([]);
  const [selectedClip, setSelectedClip] = useState<HighlightClip | null>(null);
  const [startTime, setStartTime] = useState("00:12:34.000");
  const [endTime, setEndTime] = useState("00:14:34.000");
  const [manualClipCount, setManualClipCount] = useState(3);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<number | null>(11); // 默认视频ID（项目2的第一个视频）

  // 加载高光数据
  const loadHighlights = async (videoId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/videos/${videoId}/highlights`);
      const result = await response.json();

      if (result.success) {
        setClips(result.data || []);
        console.log(`✅ 加载了 ${result.count || 0} 个高光切片`);
      } else {
        console.error('加载高光失败:', result.error);
      }
    } catch (error) {
      console.error('加载高光失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 页面加载时获取高光数据
  useEffect(() => {
    if (currentVideoId) {
      loadHighlights(currentVideoId);
    }
  }, [currentVideoId]);

  // 生成高光标记点（从切片列表中提取）
  const highlightMarkers = clips.map(clip => ({
    id: clip.id,
    timeMs: clip.highlightMomentMs,
    label: clip.name,
    color: clip.source === "ai" ? "#a855f7" : "#3b82f6", // AI: 紫色, 手动: 蓝色
  }));

  // AI 一键生成（触发真实的高光检测任务）
  const handleAIGenerate = async () => {
    if (!currentVideoId) {
      console.error('没有选择视频');
      return;
    }

    try {
      setIsDetecting(true);

      // 调用 API 触发高光检测
      const response = await fetch(`/api/videos/${currentVideoId}/highlights/detect`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ 高光检测任务已添加到队列:', result.data);

        // 提示用户任务已提交
        alert('高光检测任务已添加到队列，请稍后刷新页面查看结果');

        // 30秒后自动刷新数据
        setTimeout(() => {
          loadHighlights(currentVideoId);
        }, 30000);
      } else {
        console.error('触发高光检测失败:', result.error);
        alert(`触发高光检测失败: ${result.error}`);
      }
    } catch (error) {
      console.error('触发高光检测失败:', error);
      alert('触发高光检测失败，请查看控制台');
    } finally {
      setIsDetecting(false);
    }
  };

  // 手动新增切片
  const handleAddManualClip = () => {
    const startMs = parseTimeToMs(startTime);
    const endMs = parseTimeToMs(endTime);

    const newClip: HighlightClip = {
      id: `manual-${Date.now()}`,
      name: `自定义切片 ${clips.filter((c) => c.source === "manual").length + 1}`,
      sourceVideoId: selectedClip?.sourceVideoId || "1",
      sourceVideoName: selectedClip?.sourceVideoName || "未知视频",
      highlightMomentMs: startMs,
      originalDurationMs: endMs - startMs,
      startMs,
      endMs,
      finalDurationMs: endMs - startMs,
      crossesEpisode: false,
      source: "manual",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setClips([...clips, newClip]);
  };

  // 微调时间
  const adjustTime = (
    type: "start" | "end",
    adjustment: number,
    event?: React.MouseEvent
  ) => {
    // 阻止事件冒泡，避免触发父容器的点击事件
    if (event) {
      event.stopPropagation();
    }

    const currentTimeStr = type === "start" ? startTime : endTime;
    const currentMs = parseTimeToMs(currentTimeStr);
    const newMs = Math.max(0, currentMs + adjustment);
    const newTimeStr = formatMsToTime(newMs);

    if (type === "start") {
      setStartTime(newTimeStr);
    } else {
      setEndTime(newTimeStr);
    }

    // 同时跳转播放器（仅当播放器已加载时）
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(newMs / 1000);
      } catch (error) {
        // 忽略播放器错误，因为现在播放器可能还未集成
        console.debug('Player seekTo skipped:', error);
      }
    }
  };

  // 跳转到指定时间
  const handleSeekTo = (timeMs: number) => {
    // 注意：HighlightPlayer 组件内部处理跳转
    // 如果需要从外部控制，可以通过 ref 暴露方法
    console.log("跳转到时间:", formatMsToTime(timeMs));
  };

  // 删除切片
  const handleDeleteClip = (clipId: string) => {
    // TODO: 替换为自定义确认对话框
    // 根据项目规范，不允许使用原生 confirm/alert
    setClips(clips.filter((c) => c.id !== clipId));
  };

  // 添加到渲染队列（触发真实的渲染任务）
  const handleAddToQueue = async (clipId: string) => {
    try {
      // 从 clipId 中提取 highlightId（格式：highlight-{id}）
      const highlightId = clipId.replace('highlight-', '');

      // 调用渲染 API
      const response = await fetch(`/api/highlights/${highlightId}/render`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ 渲染任务已添加:', result.data);

        // 更新本地状态
        setClips(
          clips.map((c) =>
            c.id === clipId ? { ...c, status: "in_queue" as const } : c
          )
        );

        alert('渲染任务已添加到队列');
      } else {
        console.error('添加渲染任务失败:', result.error);
        alert(`添加渲染任务失败: ${result.error}`);
      }
    } catch (error) {
      console.error('添加渲染任务失败:', error);
      alert('添加渲染任务失败，请查看控制台');
    }
  };

  return (
    <div className="p-10 animate-fade-in">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              高光切片模式
            </h1>
            <p className="text-base text-muted-foreground">
              AI 自动检测病毒传播时刻，毫秒级精确微调
            </p>
          </div>
        </div>
      </div>

      {/* 中央舞台布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：视频预览 + 微调控制 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 视频预览区 */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  视频预览 {selectedClip && `(${selectedClip.sourceVideoName})`}
                </h3>
              </div>

              {/* 高光切片播放器 */}
              {/* <HighlightPlayer
                url="/sample-video.mp4" // TODO: 替换为实际视频URL
                markers={highlightMarkers}
                onMarkerClick={(marker) => {
                  console.log("跳转到标记:", marker);
                  // 可以在这里更新开始时间输入框
                  setStartTime(formatMsToTime(marker.timeMs));
                }}
                onProgress={(timeMs) => {
                  setCurrentTimeMs(timeMs);
                }}
                className="mx-auto max-w-[400px]"
              /> */}

              {/* 临时占位符 */}
              <div className="flex items-center justify-center bg-black rounded-lg overflow-hidden aspect-[9/16] max-h-[600px]">
                <div className="text-center text-white">
                  <p className="text-lg">视频播放器区域</p>
                  <p className="text-sm text-gray-400 mt-2">（播放器组件暂时禁用）</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 毫秒级微调拨盘 */}
          <Card>
            <CardContent className="p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  毫秒级微调拨盘
                </h3>
              </div>

              {/* 开始时间 */}
              <div className="mb-6">
                <Label className="mb-2 text-sm">开始时间</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => adjustTime("start", -1000, e)}
                  >
                    -1s
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => adjustTime("start", -100, e)}
                  >
                    -100ms
                  </Button>
                  <Input
                    type="text"
                    value={startTime}
                    onChange={(e) => {
                      e.stopPropagation();
                      setStartTime(e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono text-center"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => adjustTime("start", 100, e)}
                  >
                    +100ms
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => adjustTime("start", 1000, e)}
                  >
                    +1s
                  </Button>
                </div>
              </div>

              {/* 结束时间 */}
              <div className="mb-6">
                <Label className="mb-2 text-sm">结束时间</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => adjustTime("end", -1000, e)}
                  >
                    -1s
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => adjustTime("end", -100, e)}
                  >
                    -100ms
                  </Button>
                  <Input
                    type="text"
                    value={endTime}
                    onChange={(e) => {
                      e.stopPropagation();
                      setEndTime(e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono text-center"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => adjustTime("end", 100, e)}
                  >
                    +100ms
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => adjustTime("end", 1000, e)}
                  >
                    +1s
                  </Button>
                </div>
              </div>

              {/* 快捷键提示 */}
              <p className="text-xs text-muted-foreground">
                快捷键：A/D = ±100ms | Shift + A/D = ±1s
              </p>

              {/* 手动新增按钮 */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Label>新增数量：</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={manualClipCount}
                      onChange={(e) => {
                        e.stopPropagation();
                        setManualClipCount(parseInt(e.target.value) || 1);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">个</span>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddManualClip();
                    }}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    手动新增切片
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：切片列表 */}
        <div className="space-y-4">
          {/* AI 一键生成按钮 */}
          <Card>
            <CardContent className="p-4">
              <Button
                className="w-full gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAIGenerate();
                }}
                disabled={isDetecting || isLoading}
              >
                {isDetecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    检测中...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    AI 一键生成高光切片
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {isDetecting
                  ? '正在调用 AI 分析视频，请稍候...'
                  : 'AI 将自动检测病毒传播时刻'}
              </p>
            </CardContent>
          </Card>

          {/* 切片列表标题 */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              切片列表 ({clips.length})
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {selectedClip ? "已选择" : "筛选"} ▼
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>全部</DropdownMenuItem>
                <DropdownMenuItem>AI 生成</DropdownMenuItem>
                <DropdownMenuItem>手动新增</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 切片列表 */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">正在加载高光数据...</p>
                </CardContent>
              </Card>
            ) : clips.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-5xl mb-4">🎬</div>
                  <p className="text-muted-foreground mb-4">
                    还没有任何切片
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    点击"AI 一键生成"开始检测高光时刻
                  </p>
                </CardContent>
              </Card>
            ) : (
              clips.map((clip) => (
              <Card
                key={clip.id}
                className={`cursor-pointer transition-base ${
                  selectedClip?.id === clip.id
                    ? "ring-2 ring-primary"
                    : "hover:shadow-md"
                }`}
                onClick={() => setSelectedClip(clip)}
              >
                <CardContent className="p-4">
                  {/* 来源标签 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {clip.source === "ai" && (
                          <Badge className="bg-purple-100 text-purple-700">
                            AI 生成
                          </Badge>
                        )}
                        {clip.source === "manual" && (
                          <Badge className="bg-blue-100 text-blue-700">
                            手动新增
                          </Badge>
                        )}
                        {clip.status === "completed" && (
                          <Badge className="bg-green-100 text-green-700">
                            已完成
                          </Badge>
                        )}
                        {clip.status === "in_queue" && (
                          <Badge className="bg-yellow-100 text-yellow-700">
                            已入队
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">
                        {clip.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatMsToTime(clip.startMs)}</span>
                        <span>→</span>
                        <span>{formatMsToTime(clip.endMs)}</span>
                        <span>·</span>
                        <span>{Math.round(clip.finalDurationMs / 1000)}s</span>
                      </div>
                    </div>

                    {/* 操作菜单 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ...
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setStartTime(formatMsToTime(clip.startMs));
                            setEndTime(formatMsToTime(clip.endMs));
                            handleSeekTo(clip.startMs);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        {clip.status === "pending" && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToQueue(clip.id);
                            }}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            加入渲染队列
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClip(clip.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* AI 推荐信息 */}
                  {clip.source === "ai" && clip.reason && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        💡 {clip.reason}
                      </p>
                      {clip.viralScore && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            爆款分数：
                          </span>
                          <span className="text-xs font-semibold text-primary">
                            {clip.viralScore}/100
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HighlightPage() {
  return (
    <MainLayout>
      <HighlightContent />
    </MainLayout>
  );
}
