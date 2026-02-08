"use client";

import { MainLayout } from "@/components/main-layout";

function HighlightContent() {
  return (
    <div className="p-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">高光切片模式</h1>
        <p className="text-base text-muted-foreground">
          AI 自动检测病毒传播时刻，毫秒级精确微调
        </p>
      </div>

      <div className="bg-muted/30 border-2 border-dashed border-border rounded-xl p-12 text-center">
        <p className="text-muted-foreground text-lg">
          高光切片模式开发中...
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          即将支持：AI 一键生成 + 手动新增切片
        </p>
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
