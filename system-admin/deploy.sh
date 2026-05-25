#!/bin/bash

# system-admin 快速部署脚本
# 使用方法：./deploy.sh

set -e  # 遇到错误立即退出

echo "======================================"
echo "  system-admin 部署脚本"
echo "======================================"
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在 system-admin 目录下运行此脚本"
    exit 1
fi

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误：Node.js 未安装"
    exit 1
fi

echo "📦 1. 安装依赖..."
npm install

echo ""
echo "🔧 2. 检查生产环境配置..."
if [ ! -f ".env.production" ]; then
    echo "⚠️  未找到 .env.production 文件"
    echo "📝 从 .env.production.example 创建..."
    cp .env.production.example .env.production
    echo "✅ 已创建 .env.production，请根据实际情况修改！"
    echo ""
    echo "需要修改的内容："
    echo "  - VITE_API_BASE_URL: 后端 API 地址"
    echo "  - VITE_SERVER_HOST: 服务器域名或 IP"
    echo ""
    read -p "是否继续构建？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 部署已取消"
        exit 1
    fi
fi

echo ""
echo "🏗️  3. 构建生产版本..."
npm run build:prod

echo ""
echo "✅ 4. 构建完成！"
echo ""
echo "📁 构建产物位置：dist/"
echo ""
echo "📋 下一步："
echo "  方案一（推荐）：使用 Nginx 反向代理"
echo "    1. 参考 nginx.conf.example 配置 Nginx"
echo "    2. 将 dist/ 目录部署到服务器"
echo "    3. 重启 Nginx: sudo systemctl reload nginx"
echo ""
echo "  方案二：直接部署静态文件"
echo "    1. 确保后端 CORS 配置包含你的域名"
echo "    2. 将 dist/ 目录部署到任何静态文件服务器"
echo ""
echo "📖 详细文档：查看 DEPLOYMENT.md"
echo ""
echo "======================================"
echo "  部署准备完成！"
echo "======================================"
