# AIRI数字人项目完整部署指南

## 🎯 项目概述

AIRI是一个开源的数字人项目，支持实时语音对话、3D/2D数字人渲染、多种AI模型集成等功能。本文档提供完整的部署方案。

## 📊 硬件要求

### 🖥️ 本地部署（开发/测试）

#### 最低配置
```
CPU: 4核 Intel i5 或 AMD Ryzen 5
内存: 8GB RAM
存储: 50GB SSD
网络: 稳定的互联网连接
GPU: 集成显卡即可
操作系统: Ubuntu 20.04+ / macOS 10.15+ / Windows 10+
```

#### 推荐配置
```
CPU: 8核 Intel i7 或 AMD Ryzen 7
内存: 16GB RAM
存储: 100GB SSD
网络: 100Mbps以上
GPU: 独立显卡（用于3D渲染优化）
操作系统: Ubuntu 22.04 LTS
```

### ☁️ 云服务器部署（生产环境）

#### 阿里云ECS推荐配置
```
实例规格: ecs.g7.2xlarge
CPU: 8核 vCPU
内存: 32GB
系统盘: 100GB ESSD云盘
带宽: 5Mbps（按流量计费）
操作系统: Ubuntu 22.04 LTS
安全组: 开放80, 443, 3000端口
```

#### 腾讯云CVM推荐配置
```
实例规格: S5.2XLARGE16
CPU: 8核
内存: 16GB
系统盘: 100GB SSD云硬盘
带宽: 5Mbps
操作系统: Ubuntu 22.04 LTS
```

## 🚀 快速部署

### 1. 一键部署脚本

```bash
# 下载部署脚本
wget https://raw.githubusercontent.com/your-repo/deploy-airi.sh
chmod +x deploy-airi.sh

# 运行部署脚本
./deploy-airi.sh
```

### 2. 手动部署步骤

#### 步骤1: 环境准备
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础依赖
sudo apt install -y curl wget git build-essential python3 python3-pip

# 安装Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装pnpm
npm install -g pnpm
```

#### 步骤2: 克隆项目
```bash
git clone https://github.com/moeru-ai/airi.git
cd airi
```

#### 步骤3: 安装依赖
```bash
pnpm install
```

#### 步骤4: 配置环境变量
```bash
# 复制环境配置模板
cp .env.example .env

# 编辑配置文件
nano .env
```

#### 步骤5: 构建项目
```bash
pnpm run build
```

#### 步骤6: 启动服务
```bash
pnpm run dev
```

## ⚙️ 详细配置说明

### 环境变量配置

创建 `.env` 文件并配置以下参数：

```bash
# AIRI基础配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库配置（可选）
DATABASE_URL=file:./data.db

# AI模型配置
# OpenAI GPT
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Anthropic Claude
ANTHROPIC_API_KEY=<your-anthropic-api-key>
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# 阿里云DashScope
DASHSCOPE_API_KEY=sk-your-dashscope-api-key
DASHSCOPE_MODEL=qwen-vl-max

# 语音服务配置
# Azure Speech Services
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=eastasia
AZURE_SPEECH_VOICE=zh-CN-XiaoxiaoNeural

# 阿里云TTS
ALIYUN_TTS_ACCESS_KEY_ID=your-access-key-id
ALIYUN_TTS_ACCESS_KEY_SECRET=your-access-key-secret
ALIYUN_TTS_VOICE=zh-CN-XiaoxiaoNeural

# 文件存储配置
# 阿里云OSS
OSS_ACCESS_KEY_ID=your-oss-access-key-id
OSS_ACCESS_KEY_SECRET=your-oss-access-key-secret
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET_NAME=your-bucket-name

# 安全配置
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=http://localhost:3000,https://your-domain.com

# 数字人配置
CHARACTER_ID=interviewer
CHARACTER_NAME=AI面试官
CHARACTER_PERSONALITY=professional
```

### AI模型配置说明

#### 1. OpenAI GPT（推荐）
```bash
# 获取API密钥
# 访问 https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4o-mini  # 或 gpt-4o, gpt-3.5-turbo
```

#### 2. 阿里云DashScope
```bash
# 获取API密钥
# 访问 https://dashscope.console.aliyun.com/
DASHSCOPE_API_KEY=sk-your-api-key
DASHSCOPE_MODEL=qwen-vl-max  # 或 qwen-turbo, qwen-plus
```

#### 3. Anthropic Claude
```bash
# 获取API密钥
# 访问 https://console.anthropic.com/
ANTHROPIC_API_KEY=<your-anthropic-api-key>
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### 语音服务配置

#### 1. Azure Speech Services
```bash
# 获取密钥和区域
# 访问 https://portal.azure.com/
AZURE_SPEECH_KEY=your-speech-key
AZURE_SPEECH_REGION=eastasia
AZURE_SPEECH_VOICE=zh-CN-XiaoxiaoNeural
```

#### 2. 阿里云TTS
```bash
# 获取访问密钥
# 访问 https://ram.console.aliyun.com/
ALIYUN_TTS_ACCESS_KEY_ID=your-access-key-id
ALIYUN_TTS_ACCESS_KEY_SECRET=your-access-key-secret
ALIYUN_TTS_VOICE=zh-CN-XiaoxiaoNeural
```

## 🌐 访问和配置

### 本地访问
```bash
# 启动服务后访问
http://localhost:3000
```

### 云服务器访问

#### 1. 直接访问
```bash
# 使用服务器公网IP
http://your-server-ip:3000
```

#### 2. 域名访问（推荐）

配置Nginx反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
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
    }
    
    # WebSocket支持
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 3. SSL证书配置

使用Let's Encrypt免费SSL证书：

```bash
# 安装certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 服务管理

### 使用systemd管理服务

创建服务文件 `/etc/systemd/system/airi.service`：

```ini
[Unit]
Description=AIRI Digital Human Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/airi
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

服务管理命令：

```bash
# 启动服务
sudo systemctl start airi

# 停止服务
sudo systemctl stop airi

# 重启服务
sudo systemctl restart airi

# 查看状态
sudo systemctl status airi

# 查看日志
sudo journalctl -u airi -f

# 开机自启
sudo systemctl enable airi
```

### 使用PM2管理服务

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs airi

# 重启服务
pm2 restart airi

# 停止服务
pm2 stop airi
```

## 📱 Android应用集成

### 1. 更新AIRI配置

编辑 `ai-interview-app/app/src/main/java/com/aiinterview/app/config/AIRIConfig.kt`：

```kotlin
object AIRIConfig {
    // 更新为您的AIRI服务地址
    const val AIRI_WEB_URL = "https://your-domain.com"
    
    // 其他配置保持不变
    const val AIRI_API_BASE_URL = "https://your-domain.com/api"
    const val AIRI_API_KEY = "your-api-key"
}
```

### 2. 测试集成

```bash
cd ai-interview-app
chmod +x test_airi_integration.sh
./test_airi_integration.sh
```

## 🔍 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 查看端口占用
sudo netstat -tlnp | grep :3000

# 杀死进程
sudo kill -9 <PID>
```

#### 2. 权限问题
```bash
# 修复文件权限
sudo chown -R $USER:$USER airi/
chmod +x deploy-airi.sh
```

#### 3. 依赖安装失败
```bash
# 清理缓存
pnpm store prune
rm -rf node_modules
pnpm install
```

#### 4. 内存不足
```bash
# 增加swap空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 日志查看

```bash
# 查看应用日志
tail -f airi/logs/app.log

# 查看系统日志
sudo journalctl -u airi -f

# 查看Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 📊 性能优化

### 1. 系统优化

```bash
# 优化内核参数
echo 'net.core.somaxconn = 65535' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog = 65535' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 2. Node.js优化

```bash
# 增加Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
```

### 3. 数据库优化

```bash
# 如果使用SQLite，定期优化
sqlite3 data.db "VACUUM;"
```

## 🔒 安全配置

### 1. 防火墙配置

```bash
# 只开放必要端口
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. 定期更新

```bash
# 创建更新脚本
cat > update-airi.sh << 'EOF'
#!/bin/bash
cd /home/ubuntu/airi
git pull
pnpm install
pnpm run build
sudo systemctl restart airi
EOF

chmod +x update-airi.sh
```

### 3. 备份策略

```bash
# 创建备份脚本
cat > backup-airi.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/airi_$DATE.tar.gz airi/
find $BACKUP_DIR -name "airi_*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup-airi.sh
```

## 📈 监控和维护

### 1. 系统监控

```bash
# 安装htop
sudo apt install htop

# 监控系统资源
htop
```

### 2. 应用监控

```bash
# 使用PM2监控
pm2 monit

# 查看性能指标
pm2 show airi
```

### 3. 日志轮转

```bash
# 配置logrotate
sudo tee /etc/logrotate.d/airi << EOF
/home/ubuntu/airi/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
}
EOF
```

## 🎯 总结

通过以上步骤，您可以成功部署AIRI数字人项目并集成到您的Android应用中。关键要点：

1. **硬件要求适中**：8GB内存、4核CPU即可满足基本需求
2. **部署简单**：使用提供的脚本可以一键部署
3. **配置灵活**：支持多种AI模型和语音服务
4. **扩展性强**：可以根据需求进行定制和优化

部署完成后，您就可以通过Android应用访问AIRI数字人服务，享受完整的AI面试体验！


