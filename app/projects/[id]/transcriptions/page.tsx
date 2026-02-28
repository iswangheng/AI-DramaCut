"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Loader2, Clock } from "lucide-react";

interface Transcription {
  id: number;
  videoId: number;
  text: string;
  language: string;
  duration: number;
  model: string;
  createdAt: number;
}

interface Video {
  id: number;
  filename: string;
  episodeNumber: number | null;
  displayTitle: string | null;
}

interface TranscriptionWithVideo extends Transcription {
  video: Video;
}

export default function TranscriptionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transcriptions, setTranscriptions] = useState<TranscriptionWithVideo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTranscriptions();
  }, [projectId]);

  const loadTranscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/transcriptions`);
      const data = await response.json();

      if (data.success && data.data) {
        setTranscriptions(data.data);
      } else {
        setError(data.message || '加载转录文本失败');
      }
    } catch (err) {
      console.error('加载转录文本失败:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };

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
              <h1 className="text-2xl font-bold">音频转录文本</h1>
              <p className="text-sm text-muted-foreground">
                查看所有视频的 Whisper 音频转录结果
              </p>
            </div>
          </div>
          <Badge variant="secondary">
            {transcriptions.length} 个视频
          </Badge>
        </div>

        {/* 转录列表 */}
        {transcriptions.length > 0 ? (
          <div className="space-y-4">
            {transcriptions.map((transcription) => (
              <Card key={transcription.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        第 {transcription.video.episodeNumber} 集
                        {transcription.video.displayTitle && ` - ${transcription.video.displayTitle}`}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDuration(transcription.duration)}</span>
                        </div>
                        <span>语言: {transcription.language.toUpperCase()}</span>
                        <span>模型: {transcription.model}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 转录文本 */}
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {transcription.text || '暂无转录文本'}
                    </p>
                  </div>

                  {/* 文件信息 */}
                  <div className="text-xs text-muted-foreground">
                    文件名: {transcription.video.filename}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                暂无音频转录数据
              </p>
              <p className="text-sm text-muted-foreground">
                音频转录使用 Whisper ASR 将视频音频转换为文本
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
