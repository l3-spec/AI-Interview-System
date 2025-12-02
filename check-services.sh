#!/bin/bash

echo "🔍 检查数字人服务状态..."
echo ""

# 检查后端服务
echo "1️⃣ 检查后端服务（端口 3001）"
if lsof -i :3001 > /dev/null 2>&1; then
    echo "✅ 后端服务运行中"
    lsof -i :3001 | tail -1
else
    echo "❌ 后端服务未启动"
    echo "   启动命令: cd backend-api && npm run dev"
fi

echo ""

# 测试健康检查
echo "2️⃣ 测试后端健康检查"
response=$(curl -s http://localhost:3001/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ 后端响应正常"
    echo "   $response"
else
    echo "❌ 后端无响应"
fi

echo ""

# 检查环境变量
echo "3️⃣ 检查环境变量配置"
if [ -f "backend-api/.env" ]; then
    echo "✅ 找到 .env 文件"
    source backend-api/.env
    
    if [ -n "$DEEPSEEK_API_KEY" ]; then
        echo "   ✓ DeepSeek: ${DEEPSEEK_API_KEY:0:10}..."
    else
        echo "   ✗ DeepSeek 未配置"
    fi
    
    if [ -n "$ALIYUN_TTS_ACCESS_KEY_ID" ]; then
        echo "   ✓ TTS: ${ALIYUN_TTS_ACCESS_KEY_ID:0:10}..."
    else
        echo "   ✗ TTS 未配置"
    fi
    
    if [ -n "$VOLC_APP_ID" ]; then
        echo "   ✓ ASR: $VOLC_APP_ID"
    else
        echo "   ⚠ ASR 未配置（仅文本输入可用）"
    fi
else
    echo "❌ 未找到 .env 文件"
fi

echo ""

# 显示本机 IP
echo "4️⃣ 本机 IP 地址"
echo "   请在 Android AppConfig.kt 中使用以下 IP："
if command -v ipconfig >/dev/null 2>&1; then
    # Mac
    ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
    if [ -n "$ip" ]; then
        echo "   ws://$ip:3001"
    fi
else
    # Linux
    ip=$(hostname -I | awk '{print $1}')
    echo "   ws://$ip:3001"
fi

echo ""
echo "✅ 检查完成！"
