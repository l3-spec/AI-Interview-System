#!/bin/bash

# AI面试系统开发环境启动脚本
echo "🚀 启动AI面试系统开发环境..."

# 检查Node.js版本
echo "📋 检查环境依赖..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js >= 16.0.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js 版本过低，需要 >= 16.0.0，当前版本: $(node -v)"
    exit 1
fi

# 检查MySQL
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL 未安装，请确保数据库已启动并可连接"
fi

# 检查Redis
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis 未安装，请确保Redis已启动并可连接"
fi

echo "✅ 环境检查完成"

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend-api
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 后端依赖安装失败"
        exit 1
    fi
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "📝 创建环境变量文件..."
    cat > .env << EOF
# 数据库配置 - MySQL
DATABASE_URL="mysql://root:password@localhost:3306/ai_interview_db"

# JWT密钥
JWT_SECRET="your-super-secret-jwt-key-here-$(date +%s)"
JWT_EXPIRE="7d"

# 服务器配置
PORT=3000
NODE_ENV="development"

# Redis配置
REDIS_URL="redis://localhost:6379"

# 邮件配置
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# 文件上传配置
UPLOAD_DIR="uploads"
MAX_FILE_SIZE=100MB

# 管理员默认账号
ADMIN_EMAIL="admin@aiinterview.com" 
ADMIN_PASSWORD="admin123456"

# API文档
API_DOCS_URL="/api/docs"
EOF
    echo "✅ 环境变量文件已创建，请编辑 backend-api/.env 配置数据库连接"
    echo "💡 MySQL连接示例: mysql://username:password@localhost:3306/ai_interview_db"
fi

# 数据库迁移
echo "🗄️  运行数据库迁移..."
npx prisma generate
npx prisma migrate dev --name init

if [ $? -ne 0 ]; then
    echo "❌ 数据库迁移失败，请检查数据库连接配置"
    echo "💡 请编辑 backend-api/.env 文件中的 DATABASE_URL"
    echo "💡 确保MySQL服务已启动并创建了数据库"
    echo "💡 MySQL创建数据库命令: CREATE DATABASE ai_interview_db;"
    exit 1
fi

# 返回根目录
cd ..

# 安装前端依赖
echo "📦 安装前端依赖..."
cd admin-dashboard
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 前端依赖安装失败"
        exit 1
    fi
fi

# 创建前端环境变量文件
if [ ! -f ".env" ]; then
    echo "📝 创建前端环境变量文件..."
    cat > .env << EOF
VITE_API_BASE_URL=http://localhost:3000/api
VITE_UPLOAD_URL=http://localhost:3000/uploads
EOF
fi

cd ..

# 启动服务
echo "🎉 开始启动服务..."

# 后台启动后端服务
echo "🔄 启动后端API服务..."
cd backend-api
npm run dev &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ 后端服务启动成功 - http://localhost:3000"
else
    echo "❌ 后端服务启动失败"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 返回根目录启动前端
cd ..
cd admin-dashboard

echo "🔄 启动管理后台..."
npm run dev &
FRONTEND_PID=$!

# 等待前端启动
sleep 3

echo ""
echo "🎊 AI面试系统启动完成！"
echo ""
echo "📍 服务地址："
echo "   后端API:    http://localhost:3000"
echo "   API文档:    http://localhost:3000/api/docs"
echo "   管理后台:   http://localhost:3001"
echo ""
echo "👤 默认管理员账号："
echo "   邮箱: admin@aiinterview.com"
echo "   密码: admin123456"
echo ""
echo "🗄️  数据库信息："
echo "   类型: MySQL"
echo "   端口: 3306"
echo "   数据库: ai_interview_db"
echo ""
echo "🛑 停止服务请按 Ctrl+C"
echo ""

# 等待用户停止
trap 'echo "🛑 正在停止服务..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT

# 保持脚本运行
while true; do
    sleep 1
done 