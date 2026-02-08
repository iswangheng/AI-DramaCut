"use client";

import { MainLayout } from "@/components/main-layout";

function TasksContent() {
  return (
    <div className="p-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">任务管理</h1>
        <p className="text-base text-muted-foreground">
          查看所有渲染任务进度和历史记录
        </p>
      </div>

      <div className="bg-muted/30 border-2 border-dashed border-border rounded-xl p-12 text-center">
        <p className="text-muted-foreground text-lg">
          任务管理页面开发中...
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          即将支持：渲染队列 + 批量下载
        </p>
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <MainLayout>
      <TasksContent />
    </MainLayout>
  );
}
