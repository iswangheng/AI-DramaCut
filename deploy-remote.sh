#!/bin/bash

# 本地一键部署到远程服务器
# 使用方法: ./deploy-remote.sh

set -e

# 配置变量（请根据实际情况修改）
SERVER_USER="root"                    # 服务器用户名
SERVER_HOST="your-server-ip"          # 服务器 IP 或域名
APP_DIR="/var/www/AI-DramaCut"

echo "🚀 开始远程部署到 $SERVER_USER@$SERVER_HOST..."

# 1. 检查是否有未提交的修改
if [ -n "$(git status --porcelain)" ]; then
  echo "📝 检测到未提交的修改，正在提交..."
  git add .
  git commit -m "Deploy $(date '+%Y-%m-%d %H:%M:%S')"
fi

# 2. 推送到 GitHub
echo "📤 推送到 GitHub..."
git push origin main

# 3. 远程执行部署
echo "🔄 在远程服务器上执行部署..."
ssh $SERVER_USER@$SERVER_HOST << EOF
  cd $APP_DIR
  ./deploy.sh production
EOF

echo "✅ 远程部署完成！"
echo ""
echo "🌐 访问: http://$SERVER_HOST"
