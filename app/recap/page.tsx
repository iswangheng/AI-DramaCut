"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
// 延迟导入 API，避免在页面加载时初始化 Gemini 客户端

// ============================================
// 类型定义
// ============================================

interface Storyline {
  id: string;
  name: string;
  description: string;
  attractionScore: number;
}

interface NarrationStyle {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// 文案风格选项
const narrationStyles: NarrationStyle[] = [
  {
    id: "hook",
    name: "黄金 3 秒钩子",
    description: "开头即高潮，瞬间抓住观众注意力",
    icon: "⚡",
  },
  {
    id: "suspense",
    name: "悬念式",
    description: "层层递进，制造紧张感和期待",
    icon: "❓",
  },
  {
    id: "emotional",
    name: "情感共鸣",
    description: "深度情感描写，引发观众共鸣",
    icon: "❤️",
  },
  {
    id: "roast",
    name: "犀利吐槽",
    description: "幽默调侃，轻松愉快的观看体验",
    icon: "🎭",
  },
];

// ============================================
// 步骤组件
// ============================================

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div key={index} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
              index < currentStep
                ? "bg-primary text-primary-foreground"
                : index === currentStep
                ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {index + 1}
          </div>
          {index < totalSteps - 1 && (
            <div
              className={`w-20 h-1 mx-2 transition-all ${
                index < currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// 主页面内容
// ============================================

function RecapContent() {
  const [currentStep, setCurrentStep] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 步骤 2: 故事线数据
  const [storylines, setStorylines] = useState<Storyline[]>([]);
  const [selectedStoryline, setSelectedStoryline] = useState<Storyline | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>("hook");

  // 步骤 4: 生成的文案
  const [generatedNarration, setGeneratedNarration] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamProgress, setStreamProgress] = useState(0);

  // 加载项目列表
  useEffect(() => {
    loadProjects();
  }, []);

  // 动态导入 API 客户端（避免初始化错误）
  const loadProjects = async () => {
    try {
      setLoading(true);

      // 动态导入，只在需要时加载
      const { projectsApi } = await import("@/lib/api/projects");

      const response = await projectsApi.list();
      if (response.success && response.data) {
        setProjects(response.data);
      } else {
        setError(response.message || "加载项目列表失败");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "加载项目列表失败";

      // 检查是否是 API key 未配置的错误
      if (errorMsg.includes("API key") || errorMsg.includes("GEMINI_API_KEY")) {
        setError(
          "API 密钥未配置。请在 .env 文件中配置 GEMINI_API_KEY 和 ELEVENLABS_API_KEY。"
        );
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // 步骤 1: 选择视频
  const handleSelectVideo = (projectId: number) => {
    setSelectedProject(projectId);
    setCurrentStep(1);
  };

  // 步骤 2: 提取故事线
  const handleExtractStorylines = async () => {
    setIsGenerating(true);
    try {
      // TODO: 调用 API 提取故事线
      // const response = await fetch('/api/gemini/extract-storylines', {
      //   method: 'POST',
      //   body: JSON.stringify({ videoPath: '...' })
      // });

      // 模拟数据
      setTimeout(() => {
        setStorylines([
          {
            id: "1",
            name: "复仇主线",
            description: "女主从被陷害到成功复仇的完整故事",
            attractionScore: 9.5,
          },
          {
            id: "2",
            name: "情感线",
            description: "男女主角之间的情感纠葛",
            attractionScore: 8.8,
          },
          {
            id: "3",
            name: "反转线",
            description: "隐藏身份的真实揭露",
            attractionScore: 9.2,
          },
        ]);
        setIsGenerating(false);
      }, 2000);
    } catch (error) {
      console.error("提取故事线失败:", error);
      setIsGenerating(false);
    }
  };

  // 步骤 3: 选择故事线和风格
  const handleSelectStorylineAndStyle = () => {
    if (!selectedStoryline) {
      alert("请选择故事线");
      return;
    }
    setCurrentStep(3);
  };

  // 步骤 4: 生成解说文案
  const handleGenerateNarration = async () => {
    setIsGenerating(true);
    setGeneratedNarration("");
    setStreamProgress(0);

    try {
      // TODO: 调用流式 API
      // const eventSource = new EventSource('/api/gemini/generate-narration-stream');
      // eventSource.addEventListener("message", (e) => {
      //   const chunk = JSON.parse(e.data);
      //   setGeneratedNarration(prev => prev + chunk.text);
      //   setStreamProgress(chunk.index * 10);
      // });

      // 模拟流式生成
      const mockText = `你敢信？这个穷小子竟然是豪门继承人！

他一巴掌扇了过去，全场震惊。女主跪地痛哭，情感瞬间爆发。

这个反转太刺激了！从被陷害到成功复仇，每一步都扣人心弦。`;
      const words = mockText.split("");
      let currentText = "";

      for (let i = 0; i < words.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 30));
        currentText += words[i];
        setGeneratedNarration(currentText);
        setStreamProgress(Math.round(((i + 1) / words.length) * 100));
      }

      setIsGenerating(false);
    } catch (error) {
      console.error("生成解说文案失败:", error);
      setIsGenerating(false);
    }
  };

  // 步骤 5: 生成语音
  const handleGenerateVoice = async () => {
    setIsGenerating(true);
    try {
      // TODO: 调用 TTS API
      // const response = await fetch('/api/elevenlabs/generate-narration', {
      //   method: 'POST',
      //   body: JSON.stringify({ text: generatedNarration })
      // });

      // 模拟生成
      await new Promise((resolve) => setTimeout(resolve, 3000));
      setCurrentStep(5);
      setIsGenerating(false);
    } catch (error) {
      console.error("生成语音失败:", error);
      setIsGenerating(false);
    }
  };

  // 渲染步骤内容
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">选择视频</h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">加载项目中...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">⚠️</div>
                <p className="text-red-600 mb-4">{error}</p>
                <div className="bg-muted/50 rounded-lg p-4 text-left max-w-md mx-auto">
                  <p className="text-sm font-semibold mb-2">快速修复：</p>
                  <ol className="text-sm space-y-1 list-decimal list-inside">
                    <li>复制 <code>.env.example</code> 为 <code>.env.local</code></li>
                    <li>在 <code>.env.local</code> 中配置你的 API 密钥</li>
                    <li>重启开发服务器</li>
                  </ol>
                </div>
                <Button onClick={() => window.location.href = "/projects"} className="mt-6">
                  前往项目管理
                </Button>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">暂无项目，请先创建项目</p>
                <Button onClick={() => window.location.href = "/projects"}>
                  前往项目管理
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => handleSelectVideo(project.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {project.description || "暂无描述"}
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <Badge variant="secondary">{project.videoCount || 0} 个视频</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">提取故事线</h2>
              <p className="text-muted-foreground">
                AI 将分析视频内容，提取多条独立的故事线供你选择
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleExtractStorylines}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    分析中...
                  </>
                ) : (
                  "开始提取故事线"
                )}
              </Button>
            </div>

            {storylines.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">发现 {storylines.length} 条故事线</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {storylines.map((storyline) => (
                    <Card
                      key={storyline.id}
                      className={`cursor-pointer transition-all ${
                        selectedStoryline?.id === storyline.id
                          ? "ring-2 ring-primary bg-primary/5"
                          : "hover:shadow-lg"
                      }`}
                      onClick={() => setSelectedStoryline(storyline)}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg">{storyline.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {storyline.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">
                            吸引力: {storyline.attractionScore}
                          </Badge>
                          {selectedStoryline?.id === storyline.id && (
                            <Badge>已选择</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">选择文案风格</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {narrationStyles.map((style) => (
                      <Card
                        key={style.id}
                        className={`cursor-pointer transition-all ${
                          selectedStyle === style.id
                            ? "ring-2 ring-primary bg-primary/5"
                            : "hover:shadow-lg"
                        }`}
                        onClick={() => setSelectedStyle(style.id)}
                      >
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-3xl mb-2">{style.icon}</div>
                            <h4 className="font-semibold mb-1">{style.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {style.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button variant="outline" onClick={() => setCurrentStep(0)}>
                    上一步
                  </Button>
                  <Button onClick={handleSelectStorylineAndStyle}>
                    下一步：生成文案
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">生成解说文案</h2>
              <p className="text-muted-foreground">
                AI 将根据选择的故事线和风格，生成吸引人的解说文案
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleGenerateNarration}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    生成中...
                  </>
                ) : (
                  "开始生成解说文案"
                )}
              </Button>
            </div>

            {isGenerating && streamProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>生成进度</span>
                  <span>{streamProgress}%</span>
                </div>
                <Progress value={streamProgress} />
              </div>
            )}

            {generatedNarration && (
              <Card>
                <CardHeader>
                  <CardTitle>生成的解说文案</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{generatedNarration}</p>
                  </div>
                  <div className="mt-6 flex gap-4">
                    <Button
                      onClick={() => {
                        setGeneratedNarration("");
                        setCurrentStep(1);
                      }}
                    >
                      重新生成
                    </Button>
                    <Button onClick={handleGenerateVoice}>
                      下一步：生成语音
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-6"></div>
              <h2 className="text-xl font-semibold mb-2">正在生成语音...</h2>
              <p className="text-muted-foreground">
                AI 正在将解说文案转换为自然流畅的语音
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="text-6xl mb-6">🎉</div>
              <h2 className="text-2xl font-bold mb-2">解说视频生成完成！</h2>
              <p className="text-muted-foreground mb-8">
                你的深度解说视频已经准备就绪
              </p>

              <Card className="max-w-md mx-auto">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">故事线</span>
                      <span className="font-semibold">{selectedStoryline?.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">风格</span>
                      <span className="font-semibold">
                        {narrationStyles.find((s) => s.id === selectedStyle)?.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">时长</span>
                      <span className="font-semibold">~90 秒</span>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setCurrentStep(0);
                        setStorylines([]);
                        setSelectedStoryline(null);
                        setGeneratedNarration("");
                      }}
                    >
                      重新开始
                    </Button>
                    <Button className="flex-1">下载视频</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-10 animate-fade-in">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">深度解说模式</h1>
        <p className="text-base text-muted-foreground">
          生成多版本解说文案，智能音画匹配
        </p>
      </div>

      {/* 步骤指示器 */}
      <StepIndicator currentStep={currentStep} totalSteps={6} />

      {/* 步骤内容 */}
      <div className="max-w-5xl mx-auto">{renderStep()}</div>
    </div>
  );
}

export default function RecapPage() {
  return (
    <MainLayout>
      <RecapContent />
    </MainLayout>
  );
}
