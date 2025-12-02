#!/bin/bash

# 数字人语音系统测试脚本
# 用于快速验证ASR+TTS+VAD功能

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}数字人语音系统测试脚本${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# 检查ADB连接
echo -e "${YELLOW}[1/6] 检查ADB连接...${NC}"
if ! adb devices | grep -q "device$"; then
    echo -e "${RED}❌ 未检测到Android设备，请确保设备已连接并开启USB调试${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Android设备已连接${NC}"
echo ""

# 检查Backend服务
echo -e "${YELLOW}[2/6] 检查Backend服务...${NC}"
BACKEND_URL="http://192.168.1.6:3001"
if ! curl -s "${BACKEND_URL}/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend服务未运行或无法访问${NC}"
    echo -e "${YELLOW}请在另一个终端运行: cd backend-api && npm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend服务运行中${NC}"
echo ""

# 测试阿里云Token API
echo -e "${YELLOW}[3/6] 测试阿里云Token API...${NC}"
TOKEN_RESPONSE=$(curl -s "${BACKEND_URL}/api/voice/aliyun-token")
if echo "$TOKEN_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ 阿里云Token API正常${NC}"
    echo "$TOKEN_RESPONSE" | jq -r '.data | "Region: \(.region), ASR Endpoint: \(.asr.endpoint)"' 2>/dev/null || true
else
    echo -e "${RED}❌ 阿里云Token API失败${NC}"
    echo "$TOKEN_RESPONSE"
    exit 1
fi
echo ""

# 清空日志
echo -e "${YELLOW}[4/6] 清空Android日志...${NC}"
adb logcat -c
echo -e "${GREEN}✅ 日志已清空${NC}"
echo ""

# 启动日志监控
echo -e "${YELLOW}[5/6] 启动日志监控...${NC}"
echo -e "${BLUE}请在App中进行以下操作：${NC}"
echo -e "  1. 进入数字人面试界面"
echo -e "  2. 等待WebSocket连接成功（约2-3秒）"
echo -e "  3. 点击\"开始答题\""
echo -e "  4. 说话2-3秒"
echo -e "  5. 点击\"结束回答\""
echo -e "  6. 观察日志输出"
echo ""
echo -e "${YELLOW}按Ctrl+C停止日志监控${NC}"
echo ""

# 显示过滤后的日志
adb logcat | grep -E "RealtimeVoiceManager|AliyunSpeechService" --line-buffered | while read -r line; do
    # 高亮显示不同级别的日志
    if echo "$line" | grep -q " E/"; then
        echo -e "${RED}$line${NC}"
    elif echo "$line" | grep -q " W/"; then
        echo -e "${YELLOW}$line${NC}"
    elif echo "$line" | grep -q " I/"; then
        echo -e "${GREEN}$line${NC}"
    else
        echo "$line"
    fi
    
    # 检测关键事件
    if echo "$line" | grep -q "WebSocket连接成功"; then
        echo -e "${GREEN}✅ WebSocket已连接${NC}"
    fi
    
    if echo "$line" | grep -q "录音已启动"; then
        echo -e "${GREEN}✅ 录音已开始${NC}"
    fi
    
    if echo "$line" | grep -q "ASR成功"; then
        echo -e "${GREEN}✅ ASR识别成功${NC}"
    fi
    
    if echo "$line" | grep -q "TTS成功"; then
        echo -e "${GREEN}✅ TTS合成成功${NC}"
    fi
done

echo ""
echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}测试完成${NC}"
echo -e "${BLUE}=====================================${NC}"

