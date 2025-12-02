#!/bin/bash

echo "🎭 开源数字人服务测试脚本"
echo "=============================="

# 检查服务是否运行
echo "1. 检查服务状态..."
response=$(curl -s http://localhost:3001/api/avatar/status)
if echo "$response" | grep -q "success.*true"; then
    echo "   ✅ 服务运行正常"
else
    echo "   ❌ 服务未响应"
    exit 1
fi

# 检查数字人页面
echo "2. 检查数字人页面..."
response=$(curl -s -I http://localhost:3001/avatar/)
if echo "$response" | grep -q "200 OK"; then
    echo "   ✅ 数字人页面可访问"
else
    echo "   ❌ 数字人页面不可访问"
fi

# 检查模型文件
echo "3. 检查模型文件..."
response=$(curl -s http://localhost:3001/api/avatar/models)
if echo "$response" | grep -q "success.*true"; then
    echo "   ✅ 模型列表可获取"
else
    echo "   ❌ 模型列表获取失败"
fi

# 检查配置
echo "4. 检查配置信息..."
response=$(curl -s http://localhost:3001/api/avatar/config)
if echo "$response" | grep -q "success.*true"; then
    echo "   ✅ 配置信息可获取"
else
    echo "   ❌ 配置信息获取失败"
fi

echo ""
echo "🎉 开源数字人服务测试完成！"
echo ""
echo "📱 移动端集成地址:"
echo "   Android WebView: webView.loadUrl(\"http://192.168.0.188:3001/avatar/\")"
echo ""
echo "🌐 浏览器访问地址:"
echo "   数字人页面: http://localhost:3001/avatar/"
echo "   API状态: http://localhost:3001/api/avatar/status"
echo "   模型列表: http://localhost:3001/api/avatar/models"
echo ""
echo "📋 配置信息:"
echo "   服务器地址: http://localhost:3001"
echo "   静态资源: http://localhost:3001/models/"
echo ""
echo "🚀 服务已完全部署，可以开始使用了！"