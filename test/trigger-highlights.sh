#!/bin/bash
# ============================================
# 手动触发高光检测任务的 Shell 脚本
# 用途：快捷触发高光检测
# ============================================

VIDEO_ID=${1:-4}

echo "🚀 触发高光检测任务..."
echo "📹 视频 ID: $VIDEO_ID"
echo ""

# 运行 TypeScript 脚本
npm run ts-node -- test/trigger-highlights.ts $VIDEO_ID
