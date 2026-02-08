"use client";

import { useState } from "react";
import { ChevronDown, FolderOpen, Scissors, Mic, ListTodo, Settings } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  section?: string;
}

const navItems: NavItem[] = [
  { id: "projects", label: "素材管理", icon: <FolderOpen className="w-5 h-5" />, section: "work" },
  { id: "highlight", label: "高光切片模式", icon: <Scissors className="w-5 h-5" />, section: "work" },
  { id: "recap", label: "深度解说模式", icon: <Mic className="w-5 h-5" />, section: "work" },
  { id: "tasks", label: "任务管理", icon: <ListTodo className="w-5 h-5" />, section: "system" },
];

interface SidebarProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
  currentProject?: string;
}

export function Sidebar({ currentPath = "projects", onNavigate, currentProject = "霸道总裁爱上我 第3集" }: SidebarProps) {
  const [activeItem, setActiveItem] = useState(currentPath);

  const handleNavClick = (itemId: string) => {
    setActiveItem(itemId);
    onNavigate?.(itemId);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-white border-r border-border flex flex-col z-50">
      {/* Logo 区域 */}
      <div className="px-4 py-5 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-700 rounded-lg flex items-center justify-center text-white text-lg font-bold">
            ▶
          </div>
          <span className="font-bold text-lg text-foreground">DramaGen AI</span>
        </div>
      </div>

      {/* 项目切换器 */}
      <div className="mx-4 mt-4 p-2.5 bg-muted/50 border border-border rounded-xl cursor-pointer transition-base hover:bg-muted hover:border-border/80">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1.5">
          <span>当前项目</span>
        </div>
        <div className="flex items-center justify-between font-semibold text-foreground/80">
          <span className="text-sm truncate flex-1">{currentProject}</span>
          <ChevronDown className="w-4 h-4 ml-1 flex-shrink-0" />
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          工作区
        </div>
        {navItems
          .filter((item) => item.section === "work")
          .map((item) => (
            <div
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-base mb-0.5 ${
                activeItem === item.id
                  ? "bg-primary/10 text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}

        <div className="px-3 pb-2 pt-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          系统
        </div>
        {navItems
          .filter((item) => item.section === "system")
          .map((item) => (
            <div
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-base mb-0.5 ${
                activeItem === item.id
                  ? "bg-primary/10 text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
      </nav>

      {/* 底部设置 */}
      <div className="p-3 border-t border-border/50">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-base text-muted-foreground hover:bg-muted/50 hover:text-foreground">
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">设置</span>
        </div>
      </div>
    </aside>
  );
}
