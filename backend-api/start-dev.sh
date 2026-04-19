#!/bin/bash

echo "🚀 启动U-Talent后端服务..."

# 检查Node.js版本
node_version=$(node -v)
echo "📍 Node.js版本: $node_version"

# 加载 .env 配置
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
else
    echo "❌ 未找到 .env 配置文件，请先在 backend-api 目录下创建 .env"
    exit 1
fi

# 创建上传目录
mkdir -p uploads/videos
mkdir -p uploads/images
mkdir -p uploads/documents

echo "📁 创建上传目录完成"

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
fi

# 启动开发服务器
echo "🌟 启动开发服务器..."
echo "📍 服务地址: http://localhost:3001"
echo "📚 API文档: http://localhost:3001/api/docs"
echo "🔧 环境: ${NODE_ENV:-未设置}"
echo "🗄️  数据库: ${DATABASE_URL:-未设置}"
echo ""

npm run dev 
