#!/bin/bash

echo "🚀 启动AI面试系统后端服务..."

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装Python3"
    exit 1
fi

# 检查是否在正确的目录
if [ ! -f "backend-api/app.py" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 进入后端目录
cd backend-api

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 创建Python虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "🔧 激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "📦 安装Python依赖..."
pip install -r requirements.txt

# 设置环境变量
export FLASK_APP=app.py
export FLASK_ENV=development
export FLASK_DEBUG=1

# 启动后端服务
echo "🌐 启动后端服务 (http://localhost:3001)..."
python app.py 