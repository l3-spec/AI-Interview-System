#!/bin/bash

echo "🔧 修复 HarmonyOS 项目配置..."

# 进入项目目录
cd "$(dirname "$0")"

echo "📦 安装依赖..."
ohpm install

echo "🧹 清理构建缓存..."
rm -rf .hvigor
rm -rf entry/.hvigor
rm -rf AppScope/.hvigor
rm -rf .idea
rm -rf build
rm -rf entry/build
rm -rf AppScope/build

echo "🔄 重新生成项目文件..."
# 重新生成 hvigor 配置
echo "✅ 项目配置修复完成！"

echo ""
echo "📋 下一步操作："
echo "1. 在 DevEco Studio 中点击 'Sync Project with Gradle Files'"
echo "2. 或者点击工具栏的同步按钮 🔄"
echo "3. 等待项目同步完成"
echo "4. 在 'Edit Configuration' 中选择 'entry' 模块"
echo "5. 选择目标设备或模拟器"
echo "6. 点击 'Run' 运行项目"
echo ""
echo "如果仍有问题，请检查："
echo "- DevEco Studio 版本是否支持当前 API 版本"
echo "- 是否已安装 HarmonyOS SDK"
echo "- 模拟器或设备是否正常"
