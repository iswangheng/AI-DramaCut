import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DramaGen AI - 智能视频生产工具",
  description: "自动化短视频生产工具，支持高光智能切片和深度解说矩阵",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
