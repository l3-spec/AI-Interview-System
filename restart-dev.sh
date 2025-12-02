#!/bin/bash

echo "🔄 重启开发服务器..."

# 停止现有进程
echo "🛑 停止现有进程..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "python app.py" 2>/dev/null || true

# 等待进程完全停止
sleep 3

# 清理缓存
echo "🧹 清理缓存..."
rm -rf admin-dashboard/node_modules/.vite 2>/dev/null || true
rm -rf system-admin/node_modules/.vite 2>/dev/null || true

# 重启后端
echo "🔧 重启后端服务..."
cd backend-api
if [ -d "venv" ]; then
    source venv/bin/activate
fi
python app.py &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 5

# 重启前端
echo "🎨 重启前端服务..."

# 启动admin-dashboard
echo "📊 启动管理后台..."
cd admin-dashboard
npm run dev &
ADMIN_PID=$!
cd ..

# 等待一下
sleep 3

# 启动system-admin
echo "🔧 启动系统管理..."
cd system-admin
npm run dev &
SYSTEM_PID=$!
cd ..

echo "✅ 所有服务重启完成！"
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
trap "echo '🛑 停止服务...'; kill $BACKEND_PID $ADMIN_PID $SYSTEM_PID 2>/dev/null; exit" INT
wait 