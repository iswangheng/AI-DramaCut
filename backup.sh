#!/bin/bash

# DramaGen AI 备份脚本
# 定期备份数据库和上传文件

set -e

# 配置变量
BACKUP_DIR="/var/backups/AI-DramaCut"
SOURCE_DIR="/var/www/AI-DramaCut"
DATE=$(date '+%Y%m%d_%H%M%S')

echo "💾 开始备份 DramaGen AI..."

# 创建备份目录
mkdir -p $BACKUP_DIR

# 1. 备份数据库（如果存在）
if [ -f "$SOURCE_DIR/data/database.sqlite" ]; then
  echo "📊 备份数据库..."
  cp $SOURCE_DIR/data/database.sqlite $BACKUP_DIR/database_$DATE.sqlite
  echo "✅ 数据库备份完成"
else
  echo "⚠️  数据库文件不存在，跳过"
fi

# 2. 备份上传文件（如果存在）
if [ -d "$SOURCE_DIR/uploads" ]; then
  echo "📁 备份上传文件..."
  tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $SOURCE_DIR uploads 2>/dev/null || true
  echo "✅ 上传文件备份完成"
else
  echo "⚠️  上传目录不存在，跳过"
fi

# 3. 备份输出文件（如果存在）
if [ -d "$SOURCE_DIR/outputs" ]; then
  echo "📹 备份输出文件..."
  tar -czf $BACKUP_DIR/outputs_$DATE.tar.gz -C $SOURCE_DIR outputs 2>/dev/null || true
  echo "✅ 输出文件备份完成"
else
  echo "⚠️  输出目录不存在，跳过"
fi

# 4. 备份环境变量
if [ -f "$SOURCE_DIR/.env" ]; then
  echo "🔐 备份环境变量..."
  cp $SOURCE_DIR/.env $BACKUP_DIR/env_$DATE.backup
  echo "✅ 环境变量备份完成"
fi

# 5. 删除 7 天前的备份
echo "🧹 清理旧备份..."
find $BACKUP_DIR -type f -mtime +7 -delete

echo ""
echo "✅ 备份完成！"
echo "📍 备份位置: $BACKUP_DIR"
echo "📊 备份大小:"
du -sh $BACKUP_DIR/*
