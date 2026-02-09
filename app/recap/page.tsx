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
  const [generatedTaskId, setGeneratedTaskId] = useState<number | null>(null);

  // 步骤 5: 渲染相关状态
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderMessage, setRenderMessage] = useState("");
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // 重试机制状态
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries] = useState(3);
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorType, setErrorType] = useState<'network' | 'api' | 'websocket' | 'unknown'>('unknown');

  // 加载项目列表
  useEffect(() => {
    loadProjects();

    // 清理函数
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // ============================================
  // 错误分类辅助函数
  // ============================================

  /**
   * 分类错误类型
   */
  const classifyError = (error: Error | string): 'network' | 'api' | 'websocket' | 'unknown' => {
    const errorMsg = typeof error === 'string' ? error : error.message;

    if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED')) {
      return 'network';
    }

    if (errorMsg.includes('WebSocket') || errorMsg.includes('连接')) {
      return 'websocket';
    }

    if (errorMsg.includes('API') || errorMsg.includes('服务器') || errorMsg.includes('500')) {
      return 'api';
    }

    return 'unknown';
  };

  /**
   * 获取用户友好的错误消息
   */
  const getFriendlyErrorMessage = (errorType: 'network' | 'api' | 'websocket' | 'unknown', originalError?: string): string => {
    const messages = {
      network: '网络连接失败，请检查网络设置',
      api: '服务器暂时无响应，请稍后重试',
      websocket: '实时连接中断，请重新尝试',
      unknown: originalError || '操作失败，请重试',
    };

    return messages[errorType];
  };

  // WebSocket 消息处理
  useEffect(() => {
    if (!renderJobId || !ws) return;

    // 订阅任务进度
    ws.send(JSON.stringify({
      type: 'progress',
      data: { jobId: renderJobId }
    }));

    // 监听消息
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'progress':
            setRenderProgress(message.data.progress || 0);
            setRenderMessage(message.data.message || '');
            break;

          case 'complete':
            setRenderProgress(100);
            setRenderMessage('渲染完成！');
            setOutputPath(message.data.outputPath || null);
            setCurrentStep(5); // 跳转到完成页面
            break;

          case 'error':
            setError(message.data.error || '渲染失败');
            setIsGenerating(false);
            break;
        }
      } catch (error) {
        console.error('WebSocket 消息解析错误:', error);
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [renderJobId, ws]);

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
    if (!selectedProject) {
      setError('请先选择项目');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      // 调用真实 API 提取故事线
      const response = await fetch('/api/recap/storylines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: selectedProject }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '提取故事线失败');
      }

      setStorylines(result.data || []);
      setIsGenerating(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '提取故事线失败';
      setError(errorMsg);
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
    if (!selectedStoryline) {
      setError('请先选择故事线');
      return;
    }

    setIsGenerating(true);
    setGeneratedNarration("");
    setStreamProgress(0);
    setError(null);

    try {
      // 调用真实 API 生成解说文案
      const response = await fetch('/api/recap/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storylineId: Number(selectedStoryline.id),
          style: selectedStyle as any,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '生成解说文案失败');
      }

      // 模拟流式显示效果
      const fullScript = result.data.script || '';
      const words = fullScript.split('');
      let currentText = '';

      for (let i = 0; i < words.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        currentText += words[i];
        setGeneratedNarration(currentText);
        setStreamProgress(Math.round(((i + 1) / words.length) * 100));
      }

      // 保存任务 ID 用于后续操作
      setGeneratedTaskId(result.data.taskId);

      setIsGenerating(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '生成解说文案失败';
      setError(errorMsg);
      console.error("生成解说文案失败:", error);
      setIsGenerating(false);
    }
  };

  // ============================================
  // 步骤 4: 核心渲染逻辑（支持重试）
  // ============================================

  /**
   * 执行渲染流程的核心逻辑
   */
  const executeRenderFlow = async (): Promise<void> => {
    if (!generatedTaskId) {
      throw new Error('缺少任务 ID');
    }

    // 1. 调用 TTS API 生成语音
    setRenderMessage('正在生成语音...');
    const ttsResponse = await fetch('/api/recap/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: generatedTaskId }),
    });

    const ttsResult = await ttsResponse.json();

    if (!ttsResult.success) {
      throw new Error(ttsResult.message || '生成语音失败');
    }

    setRenderMessage('语音生成完成，正在准备渲染...');

    // 2. 连接 WebSocket
    const wsUrl = `ws://localhost:3001`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket 已连接');
      setWs(websocket);
    };

    websocket.onerror = (wsError) => {
      console.error('WebSocket 连接错误:', wsError);
      // WebSocket 错误不中断流程，只是警告
    };

    // 3. 调用渲染 API
    setRenderMessage('正在创建渲染任务...');
    const renderResponse = await fetch('/api/recap/render-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: generatedTaskId }),
    });

    const renderResult = await renderResponse.json();

    if (!renderResult.success) {
      throw new Error(renderResult.message || '创建渲染任务失败');
    }

    // 4. 保存渲染任务 ID，WebSocket 会监听进度
    setRenderJobId(renderResult.data.jobId);
    setRenderMessage('任务已创建，开始渲染...');
  };

  /**
   * 步骤 4: 生成语音并开始渲染（带重试机制）
   */
  const handleGenerateVoice = async () => {
    if (!generatedTaskId) {
      setError('缺少任务 ID，请重新生成文案');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setRenderProgress(0);
    setRetryCount(0);
    setErrorType('unknown');
    setCurrentStep(4); // 跳转到渲染进度页面

    // 重试循环
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 如果不是第一次尝试，显示重试状态
        if (attempt > 0) {
          setIsRetrying(true);
          setRetryCount(attempt);
          setRenderMessage(`正在重试 (${attempt}/${maxRetries})...`);

          // 指数退避：等待 2^attempt 秒
          const delayMs = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        // 执行渲染流程
        await executeRenderFlow();

        // 成功后退出重试循环
        setIsRetrying(false);
        setRetryCount(0);
        setIsGenerating(false);
        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 分类错误类型
        const classifiedError = classifyError(lastError);
        setErrorType(classifiedError);

        // 记录错误
        console.error(`渲染失败（尝试 ${attempt + 1}/${maxRetries + 1}）:`, lastError);

        // 如果还有重试次数，继续循环
        if (attempt < maxRetries) {
          continue;
        }

        // 最后一次尝试也失败了
        setIsRetrying(false);
        const friendlyError = getFriendlyErrorMessage(classifiedError, lastError.message);
        setError(friendlyError);
        setIsGenerating(false);
        // 不再自动返回步骤 3，让用户选择操作
      }
    }
  };

  /**
   * 手动重试（用户点击重试按钮）
   */
  const handleManualRetry = async () => {
    setError(null);
    setRetryCount(0);
    setErrorType('unknown');
    await handleGenerateVoice();
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
              <h2 className="text-xl font-semibold mb-2">正在渲染视频...</h2>
              <p className="text-muted-foreground mb-8">
                AI 正在匹配画面并渲染最终视频
              </p>

              {/* 渲染进度 */}
              <div className="max-w-md mx-auto space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">渲染进度</span>
                  <span className="font-semibold">{renderProgress.toFixed(0)}%</span>
                </div>
                <Progress value={renderProgress} />

                {/* 当前状态消息 */}
                {renderMessage && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">{renderMessage}</p>
                  </div>
                )}

                {/* 步骤说明 */}
                <div className="text-left bg-card rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${renderProgress >= 10 ? 'bg-green-500' : 'bg-muted'}`} />
                    <span className={renderProgress >= 10 ? 'text-foreground' : 'text-muted-foreground'}>
                      1. 加载文案段落
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${renderProgress >= 30 ? 'bg-green-500' : 'bg-muted'}`} />
                    <span className={renderProgress >= 30 ? 'text-foreground' : 'text-muted-foreground'}>
                      2. 语义匹配画面
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${renderProgress >= 40 ? 'bg-green-500' : 'bg-muted'}`} />
                    <span className={renderProgress >= 40 ? 'text-foreground' : 'text-muted-foreground'}>
                      3. Remotion 视频渲染
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${renderProgress >= 95 ? 'bg-green-500' : 'bg-muted'}`} />
                    <span className={renderProgress >= 95 ? 'text-foreground' : 'text-muted-foreground'}>
                      4. 保存输出文件
                    </span>
                  </div>
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="max-w-md mx-auto mt-6">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-4">
                    {/* 错误图标和消息 */}
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">⚠️</div>
                      <div className="flex-1">
                        <p className="font-semibold text-destructive mb-1">操作失败</p>
                        <p className="text-sm text-destructive/90">{error}</p>
                      </div>
                    </div>

                    {/* 错误类型指示 */}
                    {errorType !== 'unknown' && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/50 rounded px-2 py-1">
                        <span>错误类型：</span>
                        <span className="font-mono">
                          {errorType === 'network' && '网络错误'}
                          {errorType === 'api' && '服务器错误'}
                          {errorType === 'websocket' && '连接错误'}
                        </span>
                      </div>
                    )}

                    {/* 重试计数器 */}
                    {retryCount > 0 && (
                      <div className="text-xs text-muted-foreground">
                        已自动重试 {retryCount} 次，均失败
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleManualRetry}
                      >
                        点击重试
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setError(null);
                          setRetryCount(0);
                          setCurrentStep(3);
                        }}
                      >
                        返回上一步
                      </Button>
                    </div>

                    {/* 帮助提示 */}
                    {errorType === 'network' && (
                      <div className="text-xs text-muted-foreground bg-background/50 rounded p-2">
                        💡 <strong>提示：</strong>请检查网络连接是否正常，或尝试切换网络环境
                      </div>
                    )}
                  </div>
                </div>
              )}
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

              <Card className="max-w-2xl mx-auto">
                <CardContent className="pt-6">
                  {/* 视频预览 */}
                  {outputPath && (
                    <div className="mb-6">
                      <video
                        src={outputPath}
                        controls
                        className="w-full rounded-lg"
                        style={{ maxHeight: '400px' }}
                      />
                    </div>
                  )}

                  {/* 视频信息 */}
                  <div className="space-y-4 mb-6">
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
                      <span className="text-muted-foreground">输出路径</span>
                      <span className="font-mono text-xs">{outputPath || '未知'}</span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="space-y-3">
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => {
                        if (outputPath) {
                          // 下载视频
                          const link = document.createElement('a');
                          link.href = outputPath;
                          link.download = `recap_${generatedTaskId}_${Date.now()}.mp4`;
                          link.click();
                        }
                      }}
                    >
                      下载视频
                    </Button>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setCurrentStep(3);
                          setRenderProgress(0);
                          setRenderMessage('');
                          setOutputPath(null);
                        }}
                      >
                        重新渲染
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setCurrentStep(0);
                          setStorylines([]);
                          setSelectedStoryline(null);
                          setGeneratedNarration('');
                          setRenderProgress(0);
                          setRenderMessage('');
                          setOutputPath(null);
                          setGeneratedTaskId(null);
                        }}
                      >
                        创建新任务
                      </Button>
                    </div>
                  </div>

                  {/* 使用提示 */}
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>提示：</strong>视频已保存到 public/outputs/recap/ 目录，你可以随时下载或分享。
                    </p>
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
