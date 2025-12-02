#!/bin/bash

echo "🚀 AI面试系统 - 一键启动所有服务"
echo "=================================="

# 检查系统环境
echo "🔍 检查系统环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo "✅ npm 版本: $(npm -v)"

# 停止现有进程
echo "🔄 停止现有进程..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "node.*3001" 2>/dev/null || true
pkill -f "vite.*5174" 2>/dev/null || true
pkill -f "vite.*5175" 2>/dev/null || true

# 等待进程完全停止
sleep 2

# 创建日志目录
mkdir -p logs

# 启动后端API服务 (端口3001)
echo ""
echo "🔧 启动后端API服务 (端口3001)..."
cd backend-api
if [ ! -f ".env" ]; then
    echo "📝 创建环境变量文件..."
    cat > .env << 'EOF'
# 数据库配置
DATABASE_URL="file:./dev.db"

# JWT密钥
JWT_SECRET="ai-interview-system-jwt-secret-key-2024"
JWT_EXPIRE="7d"

# 服务器配置
PORT=3001
NODE_ENV="development"

# 管理员默认账号
ADMIN_EMAIL="superadmin@aiinterview.com"
ADMIN_PASSWORD="superadmin123"

# 企业测试账号
COMPANY_EMAIL="company@aiinterview.com"
COMPANY_PASSWORD="company123456"

# 用户测试账号
USER_EMAIL="user@aiinterview.com"
USER_PASSWORD="user123456"
EOF
fi

npm install > /dev/null 2>&1
echo "✅ 后端依赖安装完成"

# 启动后端服务
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!

# 等待后端启动
echo "⏳ 等待后端服务启动..."
sleep 5

# 检查后端是否启动成功
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ 后端API服务启动成功 (PID: $BACKEND_PID)"
    echo "📍 API地址: http://localhost:3001/api"
    echo "📚 API文档: http://localhost:3001/api/docs"
else
    echo "❌ 后端API服务启动失败"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

cd ..

# 启动企业管理端 (端口5174)
echo ""
echo "🔧 启动企业管理端 (端口5174)..."
cd admin-dashboard
npm install > /dev/null 2>&1
echo "✅ 企业管理端依赖安装完成"

npm run dev > ../logs/admin-dashboard.log 2>&1 &
ADMIN_PID=$!

# 等待企业管理端启动
echo "⏳ 等待企业管理端启动..."
sleep 8

# 检查企业管理端是否启动成功
if curl -s http://localhost:5174 > /dev/null; then
    echo "✅ 企业管理端启动成功 (PID: $ADMIN_PID)"
    echo "📍 访问地址: http://localhost:5174"
else
    echo "❌ 企业管理端启动失败"
    kill $ADMIN_PID 2>/dev/null
fi

cd ..

# 启动系统管理端 (端口5175)
echo ""
echo "🔧 启动系统管理端 (端口5175)..."
cd system-admin
npm install > /dev/null 2>&1
echo "✅ 系统管理端依赖安装完成"

npm run dev > ../logs/system-admin.log 2>&1 &
SYSTEM_PID=$!

# 等待系统管理端启动
echo "⏳ 等待系统管理端启动..."
sleep 8

# 检查系统管理端是否启动成功
if curl -s http://localhost:5175 > /dev/null; then
    echo "✅ 系统管理端启动成功 (PID: $SYSTEM_PID)"
    echo "📍 访问地址: http://localhost:5175"
else
    echo "❌ 系统管理端启动失败"
    kill $SYSTEM_PID 2>/dev/null
fi

cd ..

echo ""
echo "🎉 所有服务启动完成！"
echo "=================================="
echo "📍 服务地址汇总:"
echo "   🔧 后端API:     http://localhost:3001/api"
echo "   📚 API文档:     http://localhost:3001/api/docs"
echo "   🏢 企业管理端:  http://localhost:5174"
echo "   🔐 系统管理端:  http://localhost:5175"
echo ""
echo "🔐 测试账号:"
echo "   企业用户: company@aiinterview.com / company123456"
echo "   系统管理员: superadmin@aiinterview.com / superadmin123"
echo ""
echo "📱 Android App 配置:"
echo "   本地开发: http://192.168.101.26:3001/api/"
echo "   模拟器: http://10.10.1.128:3001/api/"
echo ""
echo "📝 日志文件:"
echo "   后端: logs/backend.log"
echo "   企业管理端: logs/admin-dashboard.log"
echo "   系统管理端: logs/system-admin.log"
echo ""
echo "⚠️  按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo ''; echo '🛑 正在停止所有服务...'; kill $BACKEND_PID $ADMIN_PID $SYSTEM_PID 2>/dev/null; exit 0" INT

# 保持脚本运行
while true; do
    sleep 1
done 