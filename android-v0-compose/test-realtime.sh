#!/bin/bash

echo "🚀 开始实时语音交互测试"
echo ""

# 检查设备连接
if ! adb devices | grep -q "device$"; then
    echo "❌ 未检测到Android设备"
    echo "请确保："
    echo "  1. 设备已通过USB连接"
    echo "  2. 已启用USB调试"
    echo "  3. 已授权此电脑进行调试"
    exit 1
fi

DEVICE=$(adb devices | grep "device$" | awk '{print $1}')
echo "✅ 检测到设备: $DEVICE"
echo ""

# 清除日志
echo "🧹 清除旧日志..."
adb logcat -c

# 卸载旧版本
echo "📦 卸载旧版本..."
adb uninstall com.xlwl.AiMian 2>/dev/null
sleep 1

# 编译安装
echo "🔨 编译安装新版本..."
./gradlew assembleDebug

if [ $? -ne 0 ]; then
    echo "❌ 编译失败"
    exit 1
fi

echo "📲 安装APK..."
adb install -r app/build/outputs/apk/debug/app-debug.apk

if [ $? -ne 0 ]; then
    echo "❌ 安装失败"
    exit 1
fi

echo "✅ 安装成功"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 请在设备上完成以下操作："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1️⃣  打开 AiMian App"
echo "  2️⃣  进入数字人面试界面"
echo "  3️⃣  等待2-3秒，应自动播放欢迎语"
echo "  4️⃣  欢迎语播放完，应自动开始录音"
echo "  5️⃣  开始说话测试VAD检测"
echo "  6️⃣  停止说话2秒，应自动识别"
echo "  7️⃣  等待数字人回复"
echo "  8️⃣  回复播放完，应再次自动开始录音"
echo "  9️⃣  继续对话，无需点击按钮"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 实时监控日志..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "关键日志说明："
echo "  🔗 WebSocket连接成功"
echo "  📨 收到语音响应 (欢迎语)"
echo "  🎵 MediaPlayer准备完成"
echo "  👄 Live2D嘴型更新 (嘴型同步)"
echo "  🔄 TTS播放完成，VAD模式自动重新开始录音 (核心功能)"
echo "  🎤 录音已启动"
echo "  🗣️  检测到说话，开始录音缓冲"
echo "  ⏹️  检测到说话结束"
echo "  ✅ ASR成功 (识别结果)"
echo ""
echo "按 Ctrl+C 停止监控"
echo ""

# 等待用户启动App
sleep 3

# 监控日志（带颜色高亮）
adb logcat | grep -E "RealtimeVoiceManager|Live2DRenderer|Visualizer|AliyunSpeechService" --color=always | \
while IFS= read -r line; do
    # 高亮关键事件
    if echo "$line" | grep -q "自动重新开始录音"; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ 核心功能触发：自动重新开始录音"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    elif echo "$line" | grep -q "收到语音响应"; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📨 收到服务器响应"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    elif echo "$line" | grep -q "检测到说话结束"; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⏹️  VAD检测：说话结束"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    elif echo "$line" | grep -q "ASR成功"; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ ASR识别成功"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    fi
    
    echo "$line"
done

