#!/bin/bash

echo "🎯 AI面试系统 - 完整项目启动"
echo "=================================="
echo "📱 包含：API端 + 企业管理端 + 系统管理端 + Android应用"
echo ""

# 检查系统环境
echo "🔍 检查系统环境..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js (推荐版本: 18+)"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo "✅ npm 版本: $(npm -v)"

# 创建日志目录
mkdir -p logs

ENV_FILE="backend-api/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ 未找到 $ENV_FILE，请先创建并配置环境变量"
    exit 1
fi

set -a
source "$ENV_FILE"
set +a

echo ""
echo "🚀 第一步：启动后端API服务 (端口:3001)"
echo "=================================="

cd backend-api

# 创建上传目录
mkdir -p uploads/videos
mkdir -p uploads/images
mkdir -p uploads/documents

# 安装后端依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装后端依赖..."
    npm install
fi

echo "🌟 启动后端API服务..."
node simple-server.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!

# 等待后端服务启动
echo "⏳ 等待后端服务启动..."
sleep 3

# 检查后端服务
if curl -s "http://localhost:${PORT:-3001}/health" > /dev/null; then
    echo "✅ 后端API服务启动成功! (PID: $BACKEND_PID)"
    echo "📍 API地址: http://localhost:${PORT:-3001}"
    echo "📚 API文档: http://localhost:${PORT:-3001}${API_DOCS_URL:-/api/docs}"
else
    echo "❌ 后端API服务启动失败"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

cd ..

echo ""
echo "🏢 第二步：启动企业管理后台 (端口:5174)"
echo "=================================="

cd admin-dashboard

# 安装企业端依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装企业端依赖..."
    npm install
fi

echo "🌟 启动企业管理后台..."
npm run dev > ../logs/admin.log 2>&1 &
ADMIN_PID=$!

# 等待前端服务启动
echo "⏳ 等待企业管理后台启动..."
sleep 5

echo "✅ 企业管理后台启动成功! (PID: $ADMIN_PID)"
echo "📍 企业管理后台: http://localhost:5174"
echo "👤 企业账号: ${ADMIN_EMAIL:-请在.env中配置}"
echo "🔐 企业密码: admin123456"

cd ..

echo ""
echo "🔧 第三步：启动系统管理后台 (端口:5175)"
echo "=================================="

cd system-admin

# 安装系统管理端依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装系统管理端依赖..."
    npm install
fi

echo "🌟 启动系统管理后台..."
npm run dev > ../logs/system-admin.log 2>&1 &
SYSTEM_ADMIN_PID=$!

# 等待系统管理端服务启动
echo "⏳ 等待系统管理后台启动..."
sleep 5

echo "✅ 系统管理后台启动成功! (PID: $SYSTEM_ADMIN_PID)"
echo "📍 系统管理后台: http://localhost:5175"
echo "👑 超级管理员: ${SUPER_ADMIN_EMAIL:-请在.env中配置}"
echo "🔐 超级密码: superadmin123"

cd ..

echo ""
echo "📱 第四步：Android应用运行指南"
echo "=================================="
echo "1. 📱 确保已安装 Android Studio"
echo "2. 📂 打开 android-app 项目目录"
echo "3. 🔄 同步项目依赖 (Gradle Sync)"
echo "4. 📲 连接Android设备或启动模拟器"
echo "5. ▶️  点击运行按钮启动应用"
echo ""
echo "🌐 网络配置说明:"
echo "   • 模拟器使用: http://10.10.1.128:3001"
echo "   • 真机使用: http://你的电脑IP:3001"
echo "   • 当前API地址已配置为模拟器访问地址"
echo ""

echo "🎯 系统运行状态"
echo "=================================="
echo "✅ 后端API服务: http://localhost:${PORT:-3001} (PID: $BACKEND_PID)"
echo "✅ 企业管理端: http://localhost:5174 (PID: $ADMIN_PID)" 
echo "✅ 系统管理端: http://localhost:5175 (PID: $SYSTEM_ADMIN_PID)"
echo "⏳ Android应用: 请按上述指南手动启动"
echo ""
echo "📊 主要功能入口:"
echo "   🔗 API健康检查: http://localhost:${PORT:-3001}/health"
echo "   📚 API文档: http://localhost:${PORT:-3001}${API_DOCS_URL:-/api/docs}"
echo "   🏢 企业登录: http://localhost:5174/login"
echo "   🔧 系统管理: http://localhost:5175/login"
echo "   📱 Android应用: 直接在设备上运行"
echo ""
echo "📝 日志文件:"
echo "   📄 后端日志: logs/backend.log"
echo "   📄 企业端日志: logs/admin.log"
echo "   📄 系统端日志: logs/system-admin.log"
echo ""
echo "🔐 登录信息:"
echo "   企业端 - 账号: ${ADMIN_EMAIL:-请在.env中配置} 密码: ${ADMIN_PASSWORD:-请在.env中配置}"
echo "   系统端 - 账号: ${SUPER_ADMIN_EMAIL:-请在.env中配置} 密码: ${SUPER_ADMIN_PASSWORD:-请在.env中配置}"
echo ""

# 保持脚本运行
echo "🎯 系统正在运行中..."
echo "按 Ctrl+C 停止所有服务"

# 清理函数
cleanup() {
    echo ""
    echo "🛑 正在停止所有服务..."
    kill $BACKEND_PID 2>/dev/null && echo "✅ 后端API服务已停止"
    kill $ADMIN_PID 2>/dev/null && echo "✅ 企业管理端已停止"
    kill $SYSTEM_ADMIN_PID 2>/dev/null && echo "✅ 系统管理端已停止"
    echo "🎯 所有服务已停止，感谢使用!"
    exit 0
}

# 捕获中断信号
trap cleanup INT

# 定期检查服务状态
while true; do
    sleep 5
    
    # 检查后端服务
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "⚠️  后端API服务异常停止"
        break
    fi
    
    # 检查企业管理端服务
    if ! kill -0 $ADMIN_PID 2>/dev/null; then
        echo "⚠️  企业管理端异常停止"
        break
    fi
    
    # 检查系统管理端服务
    if ! kill -0 $SYSTEM_ADMIN_PID 2>/dev/null; then
        echo "⚠️  系统管理端异常停止"
        break
    fi
done

cleanup 
