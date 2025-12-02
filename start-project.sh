#!/bin/bash

echo "🎯 AI面试系统 - 完整项目启动"
echo "=================================="

# 检查系统环境
echo "🔍 检查系统环境..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo "✅ npm 版本: $(npm -v)"

# 启动后端服务
echo ""
echo "🚀 启动后端API服务..."
echo "=================================="

ENV_FILE="backend-api/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ 未找到 $ENV_FILE，请先创建并配置环境变量"
    exit 1
fi

set -a
source "$ENV_FILE"
set +a

cd backend-api

# 创建上传目录
mkdir -p uploads/videos
mkdir -p uploads/images
mkdir -p uploads/documents

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装后端依赖..."
    npm install
fi

# 编译TypeScript
echo "🔨 编译TypeScript..."
npm run build

echo ""
echo "🌟 后端服务启动信息:"
echo "📍 服务地址: http://localhost:${PORT:-3001}"
echo "📚 API文档: http://localhost:${PORT:-3001}${API_DOCS_URL:-/api/docs}"
echo "🔧 环境: ${NODE_ENV:-未设置}"
echo ""
echo "🎯 主要API端点:"
echo "   POST /api/interview/start     - 开始面试"
echo "   POST /api/interview/next      - 获取下一题"
echo "   POST /api/interview/submit    - 提交面试结果"
echo "   POST /api/interview/upload-video - 上传视频"
echo "   GET  /api/interview/sessions  - 获取面试列表"
echo ""

# 启动服务器
echo "🚀 启动后端服务器..."
npm start &
BACKEND_PID=$!

# 等待服务器启动
echo "⏳ 等待后端服务启动..."
sleep 5

# 检查服务器是否启动成功
if curl -s "http://localhost:${PORT:-3001}/api/health" > /dev/null; then
    echo "✅ 后端服务启动成功!"
else
    echo "❌ 后端服务启动失败"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "📱 Android应用构建说明:"
echo "=================================="
echo "1. 确保后端服务正在运行 (http://localhost:${PORT:-3001})"
echo "2. 打开Android Studio"
echo "3. 导入 android-app 项目"
echo "4. 连接Android设备或启动模拟器"
echo "5. 运行应用"
echo ""
echo "🔧 如果遇到网络连接问题:"
echo "   - 模拟器使用: http://10.10.1.128:3001"
echo "   - 真机使用: http://你的电脑IP:3001"
echo ""

# 保持脚本运行
echo "🎯 后端服务正在运行..."
echo "按 Ctrl+C 停止服务"

# 等待用户中断
trap "echo ''; echo '🛑 停止后端服务...'; kill $BACKEND_PID 2>/dev/null; exit 0" INT

# 保持脚本运行
while true; do
    sleep 1
done 
