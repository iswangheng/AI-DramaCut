"use client";

import { MainLayout } from "@/components/main-layout";
import { redirect } from "next/navigation";

export default function Home() {
  // 暂时重定向到素材管理页面
  redirect("/projects");
}
