"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  BookOpen,
  Users,
  Lightbulb,
  Sparkles,
  Film,
  Clock,
  Eye,
  Loader2,
  BarChart3,
  TrendingUp,
} from "lucide-react";

// ============================================
// 类型定义
// ============================================

interface ProjectStorylineSegment {
  videoId: number;
  startMs: number;
  endMs: number;
  description: string;
}

interface ProjectStoryline {
  id: number;
  name: string;
  description: string;
  attractionScore: number;
  category: string;
  episodeCount: number;
  totalDurationMs: number;
  segments: ProjectStorylineSegment[];
}

interface Foreshadowing {
  set_up: string;
  payoff: string;
  description: string;
}

interface CrossEpisodeHighlight {
  start_ep: number;
  start_ms: number;
  end_ep: number;
  end_ms: number;
  description: string;
}

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

interface Highlight {
  id: number;
  videoId: number;
  startMs: number;
  endMs: number | null;
  reason: string;
  viralScore: number;
  category: string;
}

interface VideoWithShots {
  videoId: number;
  filename: string;
  episodeNumber: number | null;
  displayTitle: string | null;
  shots: Shot[];
}

interface VideoWithHighlights {
  videoId: number;
  filename: string;
  episodeNumber: number | null;
  displayTitle: string | null;
  highlights: Highlight[];
}

interface ProjectAnalysisResponse {
  projectId: number;
  mainPlot: string;
  subplotCount: number;
  characterRelationships: Record<string, Record<string, string[]>>;
  foreshadowings: Foreshadowing[];
  crossEpisodeHighlights: CrossEpisodeHighlight[];
  storylines: ProjectStoryline[];
}

// ============================================
// 主组件
// ============================================

function StorylinesPageContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [storylinesData, setStorylinesData] = useState<ProjectAnalysisResponse | null>(null);
  const [shotsData, setShotsData] = useState<{ totalShots: number; shotsByVideo: VideoWithShots[] } | null>(null);
  const [highlightsData, setHighlightsData] = useState<{ totalHighlights: number; highlightsByVideo: VideoWithHighlights[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 从 URL 参数中获取 jobId
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobIdParam = params.get('jobId');
    if (jobIdParam) {
      setJobId(jobIdParam);
      setAnalyzing(true);
      pollAnalysisStatus(jobIdParam);
    } else {
      loadAllData();
    }
  }, [projectId]);

  // 轮询分析状态
  const pollAnalysisStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/analysis-status?jobId=${jobId}`);
      const data = await response.json();

      if (data.success && data.data) {
        const { status, progress, analysisData } = data.data;

        setAnalyzeProgress(progress || 0);

        if (status === 'completed') {
          setAnalyzing(false);
          // 分析完成，加载完整数据
          await loadAllData();
        } else if (status === 'failed') {
          setAnalyzing(false);
          setError(data.data.error || '分析失败');
        } else {
          // 继续轮询
          setTimeout(() => pollAnalysisStatus(jobId), 2000);
        }
      }
    } catch (err) {
      console.error('获取分析状态失败:', err);
      // 继续轮询
      setTimeout(() => pollAnalysisStatus(jobId), 2000);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 并行加载所有数据
      const [storylinesRes, shotsRes, highlightsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/analyze-storylines`),
        fetch(`/api/projects/${projectId}/shots`),
        fetch(`/api/projects/${projectId}/highlights`),
      ]);

      const [storylinesResult, shotsResult, highlightsResult] = await Promise.all([
        storylinesRes.json(),
        shotsRes.json(),
        highlightsRes.json(),
      ]);

      if (storylinesResult.success && storylinesResult.data) {
        setStorylinesData(storylinesResult.data);
      } else {
        setError(storylinesResult.error || '加载故事线失败');
      }

      if (shotsResult.success && shotsResult.data) {
        setShotsData(shotsResult.data);
      }

      if (highlightsResult.success && highlightsResult.data) {
        setHighlightsData(highlightsResult.data);
      }

    } catch (err) {
      console.error('加载数据失败:', err);
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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      revenge: 'bg-red-100 text-red-700 hover:bg-red-100',
      romance: 'bg-pink-100 text-pink-700 hover:bg-pink-100',
      identity: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
      mystery: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100',
      power: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
      family: 'bg-green-100 text-green-700 hover:bg-green-100',
      suspense: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
      other: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
    };
    return colors[category] || colors.other;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      revenge: '复仇',
      romance: '爱情',
      identity: '身份',
      mystery: '谜团',
      power: '权力',
      family: '家庭',
      suspense: '悬疑',
      other: '其他',
    };
    return labels[category] || '其他';
  };

  // 显示分析进度
  if (analyzing) {
    return (
      <div className="p-10 animate-fade-in">
        <div className="max-w-2xl mx-auto">
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span>项目级分析进行中</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">分析进度</span>
                  <span className="font-medium">{analyzeProgress}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${analyzeProgress}%` }}
                  />
                </div>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Gemini AI 正在分析所有视频，识别镜头、高光时刻和跨集故事线。
                  这可能需要几分钟时间，请稍候...
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  分析完成后，页面将自动刷新并显示完整结果
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  className="cursor-pointer"
                >
                  返回项目页
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="cursor-pointer"
                >
                  刷新状态
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-10 animate-fade-in">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="ml-3 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !storylinesData) {
    return (
      <div className="p-10 animate-fade-in">
        <div className="text-center py-16">
          <p className="text-red-600 text-lg mb-4">{error || '加载失败'}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.back()} className="cursor-pointer">
              返回
            </Button>
            <Button onClick={loadAllData} className="cursor-pointer">
              重试
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 计算统计信息
  const stats = {
    totalVideos: shotsData?.shotsByVideo.length || 0,
    totalShots: shotsData?.totalShots || 0,
    totalHighlights: highlightsData?.totalHighlights || 0,
    totalStorylines: storylinesData.storylines.length,
  };

  return (
    <div className="p-10 animate-fade-in">
      {/* 页面标题 */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2 mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          返回项目
        </Button>
        <h1 className="text-3xl font-bold mb-2">项目级分析结果</h1>
        <p className="text-muted-foreground">
          基于所有集数的全局分析，包含镜头、故事线和高光片段
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="dashboard" className="gap-2 cursor-pointer">
            <BarChart3 className="w-4 h-4" />
            仪表盘
          </TabsTrigger>
          <TabsTrigger value="shots" className="gap-2 cursor-pointer">
            <Eye className="w-4 h-4" />
            镜头分析
          </TabsTrigger>
          <TabsTrigger value="highlights" className="gap-2 cursor-pointer">
            <Sparkles className="w-4 h-4" />
            高光片段
          </TabsTrigger>
          <TabsTrigger value="storylines" className="gap-2 cursor-pointer">
            <Film className="w-4 h-4" />
            故事线 ({storylinesData.storylines.length})
          </TabsTrigger>
          <TabsTrigger value="characters" className="gap-2 cursor-pointer">
            <Users className="w-4 h-4" />
            人物关系
          </TabsTrigger>
          <TabsTrigger value="foreshadowing" className="gap-2 cursor-pointer">
            <Lightbulb className="w-4 h-4" />
            伏笔与高光
          </TabsTrigger>
        </TabsList>

        {/* 仪表盘 Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  总视频数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Film className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {stats.totalVideos}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  总镜头数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Eye className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                    {stats.totalShots}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  总高光数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                  <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                    {stats.totalHighlights}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                  故事线数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
                  <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                    {stats.totalStorylines}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 主线剧情梗概 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                主线剧情梗概
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed">{storylinesData.mainPlot}</p>
              <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                <span>支线数量：{storylinesData.subplotCount} 条</span>
                <span>·</span>
                <span>故事线：{storylinesData.storylines.length} 条</span>
                <span>·</span>
                <span>伏笔：{storylinesData.foreshadowings.length} 个</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 镜头分析 Tab */}
        <TabsContent value="shots" className="space-y-6">
          {shotsData && shotsData.shotsByVideo.length > 0 ? (
            <div className="space-y-6">
              {shotsData.shotsByVideo.map((video) => (
                <Card key={video.videoId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {video.displayTitle || video.filename}
                        </CardTitle>
                        {video.episodeNumber && (
                          <Badge variant="outline" className="mt-2">
                            第 {video.episodeNumber} 集
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {video.shots.length}
                        </div>
                        <div className="text-xs text-muted-foreground">个镜头</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {video.shots.map((shot) => (
                        <div
                          key={shot.id}
                          className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm mb-2">{shot.description}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(shot.startMs)} - {formatTime(shot.endMs)}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {shot.emotion}
                                </Badge>
                                {shot.viralScore && (
                                  <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">
                                    ⭐ {shot.viralScore.toFixed(1)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {shot.dialogue && (
                            <div className="mt-2 p-2 bg-background rounded text-xs">
                              💬 {shot.dialogue}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                暂无镜头分析数据，请先运行项目级分析
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 高光片段 Tab */}
        <TabsContent value="highlights" className="space-y-6">
          {highlightsData && highlightsData.highlightsByVideo.length > 0 ? (
            <div className="space-y-6">
              {highlightsData.highlightsByVideo.map((video) => (
                <Card key={video.videoId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {video.displayTitle || video.filename}
                        </CardTitle>
                        {video.episodeNumber && (
                          <Badge variant="outline" className="mt-2">
                            第 {video.episodeNumber} 集
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {video.highlights.length}
                        </div>
                        <div className="text-xs text-muted-foreground">个高光</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {video.highlights.map((highlight) => (
                        <div
                          key={highlight.id}
                          className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm mb-2">{highlight.reason}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(highlight.startMs)}
                                  {highlight.endMs && ` - ${formatTime(highlight.endMs)}`}
                                </span>
                                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">
                                  ⭐ {highlight.viralScore.toFixed(1)}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {getCategoryLabel(highlight.category)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                暂无高光片段数据，请先运行项目级分析
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 故事线 Tab */}
        <TabsContent value="storylines" className="space-y-6">
          <div className="grid gap-6">
            {storylinesData.storylines.map((storyline) => (
              <Card key={storyline.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{storyline.name}</CardTitle>
                        <Badge className={getCategoryColor(storyline.category)}>
                          {getCategoryLabel(storyline.category)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{storyline.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {storyline.attractionScore.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">吸引力分数</div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-4">
                    <span>跨越 {storyline.episodeCount} 集</span>
                    <span>·</span>
                    <span>总时长 {formatTime(storyline.totalDurationMs)}</span>
                    <span>·</span>
                    <span>{storyline.segments.length} 个片段</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium mb-3">片段列表：</h4>
                    {storyline.segments.map((segment, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <Badge variant="outline" className="mt-0.5">
                          第 {index + 1} 段
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm mb-1">{segment.description}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Film className="w-3 h-3" />
                              视频 {segment.videoId}
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(segment.startMs)} - {formatTime(segment.endMs)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 人物关系 Tab */}
        <TabsContent value="characters" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                人物关系变化
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(storylinesData.characterRelationships).map(([episode, characters]) => (
                  <div key={episode}>
                    <h4 className="text-lg font-semibold mb-3">{episode}</h4>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(characters).map(([name, states]) => (
                        <div key={name} className="p-3 bg-muted/50 rounded-lg">
                          <div className="font-medium mb-2">{name}</div>
                          <div className="flex flex-wrap gap-2">
                            {states.map((state, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {state}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 伏笔与高光 Tab */}
        <TabsContent value="foreshadowing" className="space-y-6">
          {/* 伏笔 */}
          {storylinesData.foreshadowings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  伏笔设置与揭晓 ({storylinesData.foreshadowings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {storylinesData.foreshadowings.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              设置
                            </Badge>
                            <span className="text-sm font-mono">{item.set_up}</span>
                          </div>
                          <p className="text-sm mb-2">{item.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              揭晓
                            </Badge>
                            <span className="text-sm font-mono">{item.payoff}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 跨集高光 */}
          {storylinesData.crossEpisodeHighlights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  跨集高光片段 ({storylinesData.crossEpisodeHighlights.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {storylinesData.crossEpisodeHighlights.map((item, index) => (
                    <div key={index} className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <p className="font-medium mb-2">{item.description}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>第 {item.start_ep} 集 {formatTime(item.start_ms)}</span>
                            <span>→</span>
                            <span>第 {item.end_ep} 集 {formatTime(item.end_ms)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {storylinesData.foreshadowings.length === 0 && storylinesData.crossEpisodeHighlights.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                暂无伏笔和跨集高光数据
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StorylinesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <MainLayout>
      <StorylinesPageContent projectId={id} />
    </MainLayout>
  );
}
