#!/bin/bash

# AI面试系统启动脚本
# 完整的两阶段面试系统启动

set -e

echo "🚀 AI面试系统启动脚本"
echo "================================"

# 检查环境变量
echo "🔍 检查环境配置..."

required_env_vars=(
    "ALIYUN_ACCESS_KEY_ID"
    "ALIYUN_ACCESS_KEY_SECRET"
    "ALIYUN_TENANT_ID"
    "ALIYUN_APP_ID"
    "DEEPSEEK_API_KEY"
)

missing_vars=()
for var in "${required_env_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        missing_vars+=($var)
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ 缺少必需的环境变量:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "请设置以下环境变量:"
    echo "export ALIYUN_ACCESS_KEY_ID=your_access_key"
    echo "export ALIYUN_ACCESS_KEY_SECRET=your_secret_key"
    echo "export ALIYUN_TENANT_ID=your_tenant_id"
    echo "export ALIYUN_APP_ID=your_app_id"
    echo "export DEEPSEEK_API_KEY=your_deepseek_key"
    exit 1
fi

echo "✅ 环境变量配置完成"

# 安装依赖
echo "📦 安装后端依赖..."
cd backend-api
npm install

# 构建项目
echo "🔨 构建后端项目..."
npm run build

# 启动后端服务
echo "🚀 启动后端服务..."
nohup npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "后端服务PID: $BACKEND_PID"

# 等待服务启动
echo "⏳ 等待后端服务启动..."
sleep 5

# 检查服务状态
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ 后端服务启动成功"
else
    echo "❌ 后端服务启动失败，请检查backend.log"
    exit 1
fi

# 运行快速测试
echo "🧪 运行快速集成测试..."
cd ..
node backend-api/test_interview_flow_integration.js --quick

if [ $? -eq 0 ]; then
    echo "✅ 快速测试通过"
else
    echo "⚠️  快速测试失败，检查配置"
fi

echo ""
echo "🎉 AI面试系统启动完成！"
echo "================================"
echo "🌐 后端API: http://localhost:3001"
echo "📊 健康检查: http://localhost:3001/health"
echo "📋 面试API文档: http://localhost:3001/api-docs"
echo ""
echo "🔧 测试命令:"
echo "  # 快速测试"
echo "  node backend-api/test_interview_flow_integration.js --quick"
echo ""
echo "  # 完整测试"
echo "  node backend-api/test_interview_flow_integration.js --full"
echo ""
echo "  # 负载测试"
echo "  node backend-api/test_interview_flow_integration.js --load"
echo ""
echo "  # 数字人单独测试"
echo "  node backend-api/test_digital_human_integration.js"
echo ""
echo "📖 集成指南: backend-api/DIGITAL_HUMAN_INTEGRATION_GUIDE.md"
echo "📝 日志文件: backend.log"
echo ""
echo "🔚 停止服务: kill $BACKEND_PID"

# 保存PID到文件
echo $BACKEND_PID > .backend_pid

# 注册清理函数
cleanup() {
    echo "🧹 正在清理..."
    if [ -f .backend_pid ]; then
        PID=$(cat .backend_pid)
        kill $PID 2>/dev/null || true
        rm .backend_pid
    fi
    echo "✅ 清理完成"
}

# 注册信号处理
trap cleanup EXIT INT TERM

# 保持脚本运行
wait $BACKEND_PID