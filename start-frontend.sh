#!/bin/bash

echo "🚀 启动AI面试系统前端服务..."

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装Node.js"
    exit 1
fi

# 检查是否在正确的目录
if [ ! -d "admin-dashboard" ] || [ ! -d "system-admin" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 启动admin-dashboard
echo "📊 启动管理后台 (http://localhost:5174)..."
cd admin-dashboard
npm install
npm run dev &
ADMIN_PID=$!

# 等待一下
sleep 3

# 启动system-admin
echo "🔧 启动系统管理 (http://localhost:5175)..."
cd ../system-admin
npm install
npm run dev &
SYSTEM_PID=$!

echo "✅ 前端服务启动完成！"
echo "📊 管理后台: http://localhost:5174"
echo "🔧 系统管理: http://localhost:5175"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo '🛑 停止服务...'; kill $ADMIN_PID $SYSTEM_PID 2>/dev/null; exit" INT
wait 