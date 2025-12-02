#!/bin/bash
# 清理空间脚本 - 安全清理临时文件和缓存

echo "🧹 开始清理空间..."

# 1. 清理OpenAvatarChat临时文件（如果不需要完整安装）
if [ -d "OpenAvatarChat/.venv" ]; then
    echo "清理OpenAvatarChat虚拟环境..."
    rm -rf OpenAvatarChat/.venv
    echo "✅ 清理完成 (~500MB)"
fi

# 2. 清理Python缓存
echo "清理Python缓存..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete 2>/dev/null
find . -type f -name "*.pyo" -delete 2>/dev/null
echo "✅ Python缓存清理完成"

# 3. 清理Node.js缓存（保留node_modules）
echo "清理Node.js缓存..."
npm cache clean --force 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null
rm -rf backend/node_modules/.cache 2>/dev/null
rm -rf backend-api/node_modules/.cache 2>/dev/null
rm -rf admin-dashboard/node_modules/.cache 2>/dev/null
echo "✅ Node.js缓存清理完成"

# 4. 清理构建文件
echo "清理构建文件..."
find . -type d -name "dist" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null
find . -type d -name "build" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null
find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null
echo "✅ 构建文件清理完成"

# 5. 清理日志文件（保留最后100行）
echo "清理日志文件..."
if [ -d "logs" ]; then
    find logs -name "*.log" -type f -exec sh -c 'tail -100 "$1" > "$1.tmp" && mv "$1.tmp" "$1"' _ {} \; 2>/dev/null
fi
echo "✅ 日志文件清理完成"

# 6. 清理macOS系统文件
echo "清理macOS系统文件..."
rm -rf ~/.Trash/* 2>/dev/null || true
rm -rf ~/Library/Caches/com.apple.Safari/* 2>/dev/null || true
rm -rf ~/Library/Caches/com.apple.SafariTechnologyPreview/* 2>/dev/null || true
echo "✅ macOS缓存清理完成"

# 7. 显示清理结果
echo ""
echo "📊 清理完成！"
echo "当前项目大小："
du -sh . 2>/dev/null | head -1
echo ""
echo "可用空间："
df -h . | tail -1

