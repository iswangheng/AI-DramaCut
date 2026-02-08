"use client";

import { useState, useRef } from "react";
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
} from "lucide-react";
import ReactPlayer from "react-player";

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

function formatMsToTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

function parseTimeToMs(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length === 3) {
    const [min, sec, ms] = parts;
    return (
      parseInt(min) * 60 * 1000 +
      parseInt(sec) * 1000 +
      parseInt(ms)
    );
  } else if (parts.length === 4) {
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
  const [clips, setClips] = useState<HighlightClip[]>(mockAIGeneratedClips);
  const [selectedClip, setSelectedClip] = useState<HighlightClip | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState("00:00:00.000");
  const [startTime, setStartTime] = useState("00:12:34.000");
  const [endTime, setEndTime] = useState("00:14:34.000");
  const [manualClipCount, setManualClipCount] = useState(3); // 用户想新增多少个切片

  // AI 一键生成
  const handleAIGenerate = () => {
    // 模拟 AI 生成过程
    const newClips: HighlightClip[] = [
      {
        id: `ai-new-${Date.now()}`,
        name: "感情升温场景",
        sourceVideoId: "1",
        sourceVideoName: "霸道总裁爱上我.ep1.mp4",
        highlightMomentMs: 2465000,
        originalDurationMs: 5000,
        startMs: 2465000,
        endMs: 2585000,
        finalDurationMs: 120000,
        crossesEpisode: false,
        source: "ai",
        viralScore: 91,
        reason: "浪漫场景，感情升温",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    setClips([...clips, ...newClips]);
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
    console.log('adjustTime called:', { type, adjustment, currentTime: Date.now() });

    // 阻止事件冒泡，避免触发父容器的点击事件
    if (event) {
      event.stopPropagation();
    }

    const currentTimeStr = type === "start" ? startTime : endTime;
    const currentMs = parseTimeToMs(currentTimeStr);
    const newMs = Math.max(0, currentMs + adjustment);
    const newTimeStr = formatMsToTime(newMs);

    console.log('Time adjustment:', { currentTimeStr, currentMs, newMs, newTimeStr });

    if (type === "start") {
      setStartTime(newTimeStr);
    } else {
      setEndTime(newTimeStr);
    }
  };

  // 跳转到指定时间
  const handleSeekTo = (timeMs: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(timeMs / 1000);
    }
  };

  // 删除切片
  const handleDeleteClip = (clipId: string) => {
    if (confirm("确定要删除这个切片吗？")) {
      setClips(clips.filter((c) => c.id !== clipId));
    }
  };

  // 添加到渲染队列
  const handleAddToQueue = (clipId: string) => {
    setClips(
      clips.map((c) =>
        c.id === clipId ? { ...c, status: "in_queue" as const } : c
      )
    );
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlaying(!isPlaying);
                  }}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
              </div>

              {/* 视频播放器容器 */}
              <div className="flex items-center justify-center bg-black rounded-lg overflow-hidden">
                <div className="aspect-[9/16] max-h-[600px]">
                  {/* 这里用占位符，实际应该是视频文件 */}
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                      <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-sm opacity-50">
                        {selectedClip ? "播放切片预览" : "视频预览区域"}
                      </p>
                      <p className="text-xs opacity-30 mt-2">
                        {selectedClip ? `${selectedClip.sourceVideoName}` : "9:16 格式"}
                      </p>
                    </div>
                  </div>
                  {/* 实际使用时： */}
                  {/* <ReactPlayer
                    ref={playerRef}
                    url={selectedClip ? selectedClip.sourceVideoId : mockVideos[0].path}
                    playing={isPlaying}
                    controls={true}
                    width="100%"
                    height="100%"
                  /> */}
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
              >
                <Wand2 className="w-4 h-4" />
                AI 一键生成高光切片
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                AI 将自动检测病毒传播时刻
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
            {clips.map((clip) => (
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
            ))}
          </div>

          {/* 空状态 */}
          {clips.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-5xl mb-4">🎬</div>
                <p className="text-muted-foreground mb-4">
                  还没有任何切片
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  点击"AI 一键生成"或"手动新增"开始
                </p>
              </CardContent>
            </Card>
          )}
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
