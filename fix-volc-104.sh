#!/bin/bash
set -e

echo "🔧 修复火山引擎ASR -104错误"
echo "================================"

PROJECT_ROOT="/Volumes/Leo/dev/AI-Interview-System"
cd "$PROJECT_ROOT"

# 1. 停止后端
echo ""
echo "1️⃣ 停止后端服务..."
pkill -f "node.*backend-api" || true
sleep 1

# 2. 检查环境变量
echo ""
echo "2️⃣ 检查环境变量..."
if [ -f "backend-api/.env" ]; then
    if grep -q "^VOLC_APP_KEY=" backend-api/.env 2>/dev/null || \
       grep -q "^RTC_APP_KEY=" backend-api/.env 2>/dev/null; then
        echo "⚠️  警告：发现 VOLC_APP_KEY 或 RTC_APP_KEY 环境变量"
        echo "   使用env token时应该删除或注释掉这些变量"
        echo "   请手动编辑 backend-api/.env 文件"
        read -p "   是否继续？(y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# 3. 重启后端
echo ""
echo "3️⃣ 重启后端..."
cd backend-api
npm run dev > /tmp/backend-api.log 2>&1 &
BACKEND_PID=$!
echo "   后端进程PID: $BACKEND_PID"
sleep 5

# 检查后端是否启动成功
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ 后端启动失败！查看日志："
    tail -20 /tmp/backend-api.log
    exit 1
fi

# 4. 测试后端配置
echo ""
echo "4️⃣ 测试后端配置..."
sleep 2
RESPONSE=$(curl -s http://localhost:3001/api/voice/config || echo '{"error":"无法连接"}')
echo "$RESPONSE" | jq '.data | {tokenSource, appKey: (if .appKey then "EXISTS" else "null" end)}' 2>/dev/null || echo "$RESPONSE"

TOKEN_SOURCE=$(echo "$RESPONSE" | jq -r '.data.tokenSource // "unknown"')
HAS_APP_KEY=$(echo "$RESPONSE" | jq -r '.data.appKey // "null"')

if [ "$TOKEN_SOURCE" = "env" ] && [ "$HAS_APP_KEY" != "null" ]; then
    echo "❌ 错误：tokenSource=env但仍返回appKey！"
    echo "   请检查后端代码是否已更新"
    exit 1
else
    echo "✅ 后端配置正确：tokenSource=$TOKEN_SOURCE, appKey=$HAS_APP_KEY"
fi

# 5. 重新构建Android
echo ""
echo "5️⃣ 重新构建Android应用..."
cd "$PROJECT_ROOT/android-v0-compose"
echo "   清理构建缓存..."
./gradlew clean > /dev/null 2>&1

echo "   构建Debug APK..."
./gradlew assembleDebug

if [ ! -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo "❌ APK构建失败！"
    exit 1
fi

# 6. 安装
echo ""
echo "6️⃣ 安装应用..."
ADB_DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)
if [ $ADB_DEVICES -eq 0 ]; then
    echo "❌ 未检测到Android设备！请连接设备或启动模拟器"
    exit 1
fi

adb install -r app/build/outputs/apk/debug/app-debug.apk

echo ""
echo "✅ 修复完成！"
echo "================================"
echo ""
echo "📱 下一步操作："
echo "   1. 启动应用并进入面试场景"
echo "   2. 点击语音输入按钮"
echo "   3. 在另一个终端查看日志："
echo ""
echo "      adb logcat -s RealtimeVoiceManager:D VolcAsrManager:D -v time"
echo ""
echo "   4. 查看关键信息："
echo ""
echo "      adb logcat | grep -E '(火山配置|配置ASR|Configuring ASR|设置appKey|不设置appKey|initEngine)'"
echo ""
echo "🔍 期望看到的日志："
echo "   ✅ 火山配置获取成功: tokenSource=env, hasAppKey=false"
echo "   ✅ 配置ASR引擎: finalAppKey=null"
echo "   ✅ 不设置appKey (appKey=null)"
echo "   ✅ 火山ASR引擎初始化成功"
echo ""

