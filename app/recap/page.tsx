"use client";

import { MainLayout } from "@/components/main-layout";

function RecapContent() {
  return (
    <div className="p-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">深度解说模式</h1>
        <p className="text-base text-muted-foreground">
          生成多版本解说文案，智能音画匹配
        </p>
      </div>

      <div className="bg-muted/30 border-2 border-dashed border-border rounded-xl p-12 text-center">
        <p className="text-muted-foreground text-lg">
          深度解说模式开发中...
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          即将支持：多版本解说文案 + 智能音画匹配
        </p>
      </div>
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
