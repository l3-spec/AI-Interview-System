#!/bin/bash

echo "🚀 启动AI面试系统完整服务..."

# 检查是否在正确的目录
if [ ! -f "backend-api/app.py" ] || [ ! -d "admin-dashboard" ] || [ ! -d "system-admin" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 启动后端服务
echo "🔧 启动后端服务..."
./start-backend.sh &
BACKEND_PID=$!

# 等待后端启动
echo "⏳ 等待后端服务启动..."
sleep 5

# 启动前端服务
echo "🎨 启动前端服务..."
./start-frontend.sh &
FRONTEND_PID=$!

echo "✅ 所有服务启动完成！"
echo ""
echo "🌐 服务地址:"
echo "📊 管理后台: http://localhost:5174"
echo "🔧 系统管理: http://localhost:5175"
echo "🔧 后端API: http://localhost:3001"
echo ""
echo "📝 测试账号:"
echo "超级管理员: superadmin@aiinterview.com / superadmin123"
echo "企业用户: company@example.com / company123"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo '🛑 停止所有服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait 