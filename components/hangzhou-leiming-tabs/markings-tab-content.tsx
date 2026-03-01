"use client";

import { useEffect, useState } from "react";
import { Trash2, FileText, Clock, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface HLMarking {
  id: number;
  projectId: number;
  videoId: number;
  videoName: string;
  timestamp: string;
  seconds: number;
  type: "高光点" | "钩子点";
  subType: string | null;
  description: string | null;
  score: number | null;
  reasoning: string | null;
  aiEnhanced: boolean;
  emotion: string | null;
  characters: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MarkingsTabContentProps {
  projectId: number;
  projectName: string;
  onUpdate?: () => void;
}

export function MarkingsTabContent({ projectId, projectName, onUpdate }: MarkingsTabContentProps) {
  const [markings, setMarkings] = useState<HLMarking[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMarking, setSelectedMarking] = useState<HLMarking | null>(null);

  useEffect(() => {
    loadMarkings();
  }, [projectId]);

  const loadMarkings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hangzhou-leiming/markings?projectId=${projectId}`);
      const result = await res.json();
      if (result.success) {
        setMarkings(result.data || []);
      }
    } catch (error) {
      console.error("加载标记失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMarking) return;
    try {
      const res = await fetch(`/api/hangzhou-leiming/markings/${selectedMarking.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteDialogOpen(false);
        loadMarkings();
        onUpdate?.();
      }
    } catch (error) {
      alert("删除失败");
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">标记管理</h2>
          <p className="text-muted-foreground text-sm mt-1">{projectName} - 人工标记数据（用于AI训练）</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-orange-600" /></div>
      ) : markings.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">暂无标记数据</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {markings.map((marking) => (
            <Card key={marking.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      {marking.subType || marking.description || "未命名"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{marking.videoName}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedMarking(marking); setDeleteDialogOpen(true); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">时间点：</span>
                  <span>{marking.timestamp}（{formatTime(marking.seconds)}）</span>
                </div>
                {marking.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{marking.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${marking.type === "高光点" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}`}>
                    {marking.type}
                  </span>
                  {marking.score && <span className="text-xs text-muted-foreground">得分: {marking.score}</span>}
                  {marking.aiEnhanced && (
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      AI增强
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="确认删除标记" description={`确定要删除此标记吗？`} confirmText="确认删除" onConfirm={handleDelete} variant="destructive" />
    </div>
  );
}
