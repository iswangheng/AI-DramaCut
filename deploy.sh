#!/bin/bash

# DramaGen AI 自动部署脚本
# 使用方法: ./deploy.sh [环境]
# 示例: ./deploy.sh production

set -e  # 遇到错误立即退出

# 配置变量
APP_NAME="dramagen-ai"
APP_DIR="/var/www/AI-DramaCut"
GIT_REPO="https://github.com/iswangheng/AI-DramaCut.git"
BRANCH="main"
ENV=${1:-production}

echo "🚀 开始部署 $ENV 环境..."

# 1. 进入项目目录
cd $APP_DIR || exit 1

# 2. 拉取最新代码
echo "📥 拉取最新代码..."
git fetch origin
git reset --hard origin/$BRANCH

# 3. 安装依赖
echo "📦 安装依赖..."
npm install

# 4. 构建项目
echo "🔨 构建项目..."
npm run build

# 5. 重启服务
echo "🔄 重启服务..."
if [ "$ENV" = "production" ]; then
    pm2 restart $APP_NAME || pm2 start npm --name "$APP_NAME" -- start
else
    pm2 restart $APP_NAME-dev || pm2 start npm --name "$APP_NAME-dev" -- run dev
fi

# 6. 保存 PM2 配置
pm2 save

# 7. 显示状态
echo "✅ 部署完成！"
echo ""
echo "📊 服务状态:"
pm2 status
echo ""
echo "📝 查看日志: pm2 logs $APP_NAME"
echo "🌐 访问地址: http://localhost:3000"
