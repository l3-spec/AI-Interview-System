#!/bin/bash

# 数字人面试应用 - 快速重新编译和安装脚本

set -e  # 遇到错误立即退出

echo "================================"
echo "数字人面试应用 - 重新编译和安装"
echo "================================"
echo ""

# 进入项目目录
cd "$(dirname "$0")"

echo "📁 当前目录: $(pwd)"
echo ""

# 检查 gradlew 是否存在
if [ ! -f "./gradlew" ]; then
    echo "❌ 错误: 找不到 gradlew 文件"
    echo "请确保在 android-v0-compose 目录下运行此脚本"
    exit 1
fi

# 赋予 gradlew 执行权限
chmod +x ./gradlew

# 清理旧的构建文件
echo "🧹 清理旧的构建文件..."
./gradlew clean

echo ""
echo "🔨 重新编译应用（Debug 版本）..."
./gradlew assembleDebug

echo ""
echo "📱 检查连接的设备..."
adb devices

echo ""
echo "📲 安装应用到设备..."
./gradlew installDebug

echo ""
echo "✅ 编译和安装完成！"
echo ""
echo "💡 提示："
echo "   1. 在设备上打开应用"
echo "   2. 进入数字人面试页面"
echo "   3. 您应该能看到真实的数字人图片而不是 'AI' 文字"
echo ""
echo "🔍 查看日志："
echo "   adb logcat | grep -i 'DigitalHumanPlaceholder'"
echo ""

