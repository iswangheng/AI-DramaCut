"use client";

import { ReactNode } from "react";
import { Sidebar } from "./sidebar";

interface MainLayoutProps {
  children: ReactNode;
  currentPath?: string;
}

export function MainLayout({ children, currentPath }: MainLayoutProps) {
  const [path, setPath] = useState(currentPath);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPath={path} onNavigate={setPath} />
      <main className="ml-[260px] min-h-screen">
        {children}
      </main>
    </div>
  );
}

import { useState } from "react";
