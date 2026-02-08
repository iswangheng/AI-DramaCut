# DramaGen AI - 部署文档

本文档提供 DramaGen AI 项目的完整部署指南，包括云服务器环境配置、自动化部署流程和运维管理。

---

## 📋 目录

- [系统要求](#系统要求)
- [首次部署](#首次部署)
- [自动化部署](#自动化部署)
- [手动部署](#手动部署)
- [环境变量配置](#环境变量配置)
- [常见问题](#常见问题)
- [运维管理](#运维管理)

---

## 系统要求

### 服务器配置

**最低配置**：
- CPU: 4 核
- 内存: 8GB
- 硬盘: 100GB SSD
- 操作系统: Ubuntu 22.04 LTS / CentOS 8+

**推荐配置**（视频处理）：
- CPU: 8 核及以上
- 内存: 16GB 及以上
- 硬盘: 200GB SSD
- 操作系统: Ubuntu 22.04 LTS

### 软件依赖

```bash
# Node.js (推荐使用 18.x 或 20.x)
node --version  # v18.x 或 v20.x

# npm
npm --version   # 9.x 或更高

# FFmpeg（必需）
ffmpeg -version

# Git
git --version
```

---

## 首次部署

### 1. 服务器环境准备

#### 1.1 更新系统
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

#### 1.2 安装 Node.js 20.x
```bash
# 使用 NodeSource 仓库安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version
npm --version
```

#### 1.3 安装 FFmpeg
```bash
# Ubuntu/Debian
sudo apt install -y ffmpeg

# CentOS/RHEL
sudo yum install -y ffmpeg

# 验证安装
ffmpeg -version
```

#### 1.4 安装 PM2（进程管理器）
```bash
sudo npm install -g pm2

# 验证安装
pm2 --version
```

#### 1.5 配置防火墙
```bash
# 允许 HTTP
sudo ufw allow 80/tcp

# 允许 HTTPS
sudo ufw allow 443/tcp

# 允许自定义端口（如 3000）
sudo ufw allow 3000/tcp

# 启用防火墙
sudo ufw enable
```

### 2. 部署项目

#### 2.1 克隆代码仓库
```bash
# 克隆仓库
cd /var/www
sudo git clone https://github.com/iswangheng/AI-DramaCut.git
cd AI-DramaCut

# 设置权限
sudo chown -R $USER:$USER /var/www/AI-DramaCut
```

#### 2.2 安装依赖
```bash
# 安装项目依赖
npm install

# 如果遇到问题，可尝试清理后重新安装
rm -rf node_modules package-lock.json
npm install
```

#### 2.3 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

详细的环境变量配置见 [环境变量配置](#环境变量配置) 章节。

#### 2.4 构建项目
```bash
# 构建生产版本
npm run build

# 验证构建
ls -la .next/
```

---

## 自动化部署

### 创建部署脚本

为了实现一键部署，我们创建了自动化部署脚本 `deploy.sh`：

```bash
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

echo "✅ 部署完成！"
echo "📊 查看状态: pm2 status"
echo "📝 查看日志: pm2 logs $APP_NAME"
```

### 使用部署脚本

#### 创建脚本文件
```bash
# 在项目根目录创建 deploy.sh
nano /var/www/AI-DramaCut/deploy.sh

# 添加执行权限
chmod +x /var/www/AI-DramaCut/deploy.sh
```

#### 执行部署
```bash
# 部署到生产环境
./deploy.sh production

# 部署到开发环境
./deploy.sh development
```

### 本地一键部署到远程服务器

在本地机器上创建 `deploy-remote.sh`：

```bash
#!/bin/bash

# 本地一键部署到远程服务器
# 使用方法: ./deploy-remote.sh

set -e

# 配置变量
SERVER_USER="your-username"      # 服务器用户名
SERVER_HOST="your-server-ip"     # 服务器 IP 或域名
APP_DIR="/var/www/AI-DramaCut"

echo "🚀 开始远程部署..."

# 1. 提交本地修改
echo "📝 提交本地修改..."
git add .
git commit -m "Deploy $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main

# 2. 远程执行部署
echo "🔄 在远程服务器上执行部署..."
ssh $SERVER_USER@$SERVER_HOST "cd $APP_DIR && ./deploy.sh production"

echo "✅ 远程部署完成！"
echo "🌐 访问: http://$SERVER_HOST"
```

使用方法：
```bash
# 本地执行
chmod +x deploy-remote.sh
./deploy-remote.sh
```

---

## 手动部署

如果自动化脚本出现问题，可以按照以下步骤手动部署：

### 1. 拉取最新代码
```bash
cd /var/www/AI-DramaCut
git pull origin main
```

### 2. 安装依赖
```bash
npm install
```

### 3. 构建项目
```bash
npm run build
```

### 4. 重启服务
```bash
# 使用 PM2 重启
pm2 restart dramagen-ai

# 或者如果服务不存在，启动它
pm2 start npm --name "dramagen-ai" -- start
```

### 5. 检查状态
```bash
# 查看 PM2 状态
pm2 status

# 查看日志
pm2 logs dramagen-ai

# 查看实时日志
pm2 logs dramagen-ai --lines 100
```

---

## 环境变量配置

创建 `.env` 文件（需要先复制 `.env.example`）：

```bash
# 应用配置
NODE_ENV=production
PORT=3000

# Next.js 配置
NEXT_PUBLIC_APP_URL=https://your-domain.com

# AI 服务配置
GEMINI_API_KEY=your-gemini-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# 数据库配置（后续使用）
DATABASE_URL=/var/www/AI-DramaCut/data/database.sqlite

# 文件存储
UPLOAD_DIR=/var/www/AI-DramaCut/uploads
OUTPUT_DIR=/var/www/AI-DramaCut/outputs

# 日志配置
LOG_LEVEL=info
LOG_DIR=/var/www/AI-DramaCut/logs

# 安全配置
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-encryption-key

# 第三方服务
YUNWU_API_ENDPOINT=https://yunwu.ai/api
```

### 创建环境变量模板

创建 `.env.example` 文件：

```bash
# 应用配置
NODE_ENV=production
PORT=3000

# Next.js 配置
NEXT_PUBLIC_APP_URL=https://your-domain.com

# AI 服务配置
GEMINI_API_KEY=
ELEVENLABS_API_KEY=

# 数据库配置
DATABASE_URL=

# 文件存储
UPLOAD_DIR=/var/www/AI-DramaCut/uploads
OUTPUT_DIR=/var/www/AI-DramaCut/outputs

# 日志配置
LOG_LEVEL=info
LOG_DIR=/var/www/AI-DramaCut/logs

# 安全配置
JWT_SECRET=
ENCRYPTION_KEY=

# 第三方服务
YUNWU_API_ENDPOINT=
```

---

## 常见问题

### 1. 端口被占用
```bash
# 查看端口占用
sudo lsof -i :3000

# 杀死进程
sudo kill -9 <PID>

# 或者修改 .env 中的 PORT 配置
```

### 2. FFmpeg 未找到
```bash
# 检查 FFmpeg 是否安装
which ffmpeg

# 如果未安装，执行：
sudo apt install -y ffmpeg
```

### 3. 权限问题
```bash
# 设置正确的文件权限
sudo chown -R $USER:$USER /var/www/AI-DramaCut
chmod -R 755 /var/www/AI-DramaCut
```

### 4. 内存不足
```bash
# 增加 Swap 空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久生效
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 5. PM2 服务未启动
```bash
# 检查 PM2 状态
pm2 status

# 如果服务未运行，启动它
pm2 start npm --name "dramagen-ai" -- start

# 设置开机自启
pm2 startup
pm2 save
```

---

## 运维管理

### PM2 常用命令

```bash
# 查看所有进程
pm2 list

# 查看状态
pm2 status

# 查看日志
pm2 logs dramagen-ai

# 查看实时日志
pm2 logs dramagen-ai --lines 100

# 重启服务
pm2 restart dramagen-ai

# 停止服务
pm2 stop dramagen-ai

# 删除服务
pm2 delete dramagen-ai

# 监控
pm2 monit
```

### 创建 PM2 配置文件

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'dramagen-ai',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/AI-DramaCut',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/AI-DramaCut/logs/pm2-error.log',
    out_file: '/var/www/AI-DramaCut/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

使用 PM2 配置文件启动：
```bash
pm2 start ecosystem.config.js
pm2 save
```

### 日志管理

```bash
# 创建日志目录
mkdir -p /var/www/AI-DramaCut/logs

# 定期清理日志（添加到 crontab）
0 0 * * * find /var/www/AI-DramaCut/logs -name "*.log" -mtime +7 -delete
```

### 监控和告警

推荐使用以下工具进行监控：
- **PM2 Plus**: https://pm2.io/
- **Uptime Robot**: https://uptimerobot.com/
- **Sentry**: 错误追踪

### 备份策略

```bash
# 创建备份脚本 backup.sh
#!/bin/bash

BACKUP_DIR="/var/backups/AI-DramaCut"
DATE=$(date '+%Y%m%d_%H%M%S')

mkdir -p $BACKUP_DIR

# 备份数据库
cp /var/www/AI-DramaCut/data/database.sqlite $BACKUP_DIR/database_$DATE.sqlite

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/AI-DramaCut/uploads

# 删除 7 天前的备份
find $BACKUP_DIR -type f -mtime +7 -delete

echo "✅ 备份完成: $BACKUP_DIR"
```

设置定时备份：
```bash
# 添加到 crontab（每天凌晨 2 点备份）
crontab -e

# 添加以下行
0 2 * * * /var/www/AI-DramaCut/backup.sh
```

---

## Nginx 反向代理配置（可选）

如果需要使用 Nginx 作为反向代理：

### 1. 安装 Nginx
```bash
sudo apt install -y nginx
```

### 2. 创建配置文件
```bash
sudo nano /etc/nginx/sites-available/dramagen-ai
```

### 3. 添加以下配置
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 日志
    access_log /var/log/nginx/dramagen-ai-access.log;
    error_log /var/log/nginx/dramagen-ai-error.log;

    # 反向代理
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置（视频处理可能需要更长时间）
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    # 静态文件缓存
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4. 启用配置
```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/dramagen-ai /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 5. 配置 SSL（使用 Let's Encrypt）
```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 性能优化建议

### 1. 启用 Gzip 压缩（Next.js 内置）
在 `next.config.mjs` 中添加：
```javascript
const nextConfig = {
  compress: true,  // 启用 Gzip
  // 其他配置...
};
```

### 2. 配置 CDN
- 使用 CDN 加速静态资源
- 推荐服务商：Cloudflare、阿里云 CDN、腾讯云 CDN

### 3. 数据库优化
- 定期清理临时文件
- 使用索引优化查询
- 考虑使用 PostgreSQL 替代 SQLite（生产环境）

### 4. 缓存策略
- 使用 Redis 缓存频繁访问的数据
- 配置浏览器缓存头

---

## 安全建议

1. **定期更新依赖**
   ```bash
   npm audit
   npm audit fix
   ```

2. **配置防火墙**
   ```bash
   sudo ufw enable
   sudo ufw status
   ```

3. **限制 SSH 访问**
   - 禁用密码登录，仅使用密钥
   - 修改默认 SSH 端口

4. **定期备份**
   - 数据库每天备份
   - 保留 7-30 天的备份

5. **监控日志**
   - 定期检查错误日志
   - 设置异常告警

---

## 联系方式

如有部署问题，请联系：
- GitHub Issues: https://github.com/iswangheng/AI-DramaCut/issues
- 邮箱: [your-email@example.com]

---

**最后更新**: 2025-02-08
