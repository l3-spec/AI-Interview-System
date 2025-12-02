#!/bin/bash

###############################################################################
# 数字人系统配置检查脚本
# 检查所有必需的配置和依赖是否正确设置
###############################################################################

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# 检查结果计数
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# 打印标题
print_header() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                       ║${NC}"
    echo -e "${BLUE}║       🔍 数字人系统配置检查 v1.0                     ║${NC}"
    echo -e "${BLUE}║                                                       ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# 检查函数
check() {
    local name=$1
    local result=$2
    local message=$3
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ "$result" = "pass" ]; then
        echo -e "${GREEN}✓${NC} ${name}: ${message}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    elif [ "$result" = "warn" ]; then
        echo -e "${YELLOW}⚠${NC} ${name}: ${message}"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
    else
        echo -e "${RED}✗${NC} ${name}: ${message}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# 检查 Node.js
check_nodejs() {
    echo -e "\n${BLUE}━━━ 检查 Node.js 环境 ━━━${NC}"
    
    if command -v node &> /dev/null; then
        local version=$(node --version)
        local major_version=$(echo $version | cut -d'.' -f1 | sed 's/v//')
        
        if [ "$major_version" -ge 16 ]; then
            check "Node.js" "pass" "版本 $version (推荐 ≥16.x)"
        else
            check "Node.js" "warn" "版本 $version (建议升级到 ≥16.x)"
        fi
    else
        check "Node.js" "fail" "未安装 Node.js"
    fi
    
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        check "npm" "pass" "版本 $npm_version"
    else
        check "npm" "fail" "未安装 npm"
    fi
}

# 检查环境变量
check_env_vars() {
    echo -e "\n${BLUE}━━━ 检查环境变量配置 ━━━${NC}"
    
    if [ ! -f "$PROJECT_ROOT/backend-api/.env" ]; then
        check "环境配置" "fail" "未找到 backend-api/.env 文件"
        return
    fi
    
    check "环境配置" "pass" "找到 .env 文件"
    
    source "$PROJECT_ROOT/backend-api/.env"
    
    # 检查 DeepSeek API Key
    if [ -n "$DEEPSEEK_API_KEY" ]; then
        local masked_key="${DEEPSEEK_API_KEY:0:10}...${DEEPSEEK_API_KEY: -4}"
        check "DeepSeek API" "pass" "已配置 ($masked_key)"
    else
        check "DeepSeek API" "fail" "未配置 DEEPSEEK_API_KEY"
    fi
    
    # 检查 TTS 配置
    if [ -n "$ALIYUN_TTS_ACCESS_KEY_ID" ] || [ -n "$ALIYUN_ACCESS_KEY_ID" ]; then
        check "阿里云 TTS" "pass" "已配置阿里云 TTS"
    elif [ -n "$AZURE_TTS_KEY" ] || [ -n "$AZURE_SPEECH_KEY" ]; then
        check "Azure TTS" "pass" "已配置 Azure TTS"
    else
        check "TTS 服务" "fail" "未配置 TTS 服务（阿里云或 Azure）"
    fi
    
    # 检查 ASR 配置（可选）
    if [ -n "$VOLC_APP_ID" ]; then
        check "火山引擎 ASR" "pass" "已配置火山引擎 ASR"
    elif [ -n "$AGORA_APP_ID" ]; then
        check "声网 ASR" "pass" "已配置声网 ASR"
    else
        check "ASR 服务" "warn" "未配置 ASR 服务（仅文本输入可用，语音输入不可用）"
    fi
    
    # 检查数据库配置
    if [ -n "$DATABASE_URL" ]; then
        check "数据库" "pass" "已配置数据库连接"
    else
        check "数据库" "warn" "未配置 DATABASE_URL（部分功能可能受限）"
    fi
}

# 检查依赖
check_dependencies() {
    echo -e "\n${BLUE}━━━ 检查项目依赖 ━━━${NC}"
    
    # 检查 backend-api 依赖
    if [ -d "$PROJECT_ROOT/backend-api/node_modules" ]; then
        check "backend-api 依赖" "pass" "已安装"
        
        # 检查关键依赖
        local packages=("socket.io" "@prisma/client" "express")
        for package in "${packages[@]}"; do
            if [ -d "$PROJECT_ROOT/backend-api/node_modules/$package" ]; then
                check "  ├─ $package" "pass" "已安装"
            else
                check "  ├─ $package" "fail" "未安装"
            fi
        done
    else
        check "backend-api 依赖" "fail" "未安装，请运行: cd backend-api && npm install"
    fi
    
    # 检查 admin-dashboard 依赖
    if [ -d "$PROJECT_ROOT/admin-dashboard/node_modules" ]; then
        check "admin-dashboard 依赖" "pass" "已安装"
    else
        check "admin-dashboard 依赖" "warn" "未安装（非必需，用于管理界面）"
    fi
}

# 检查端口占用
check_ports() {
    echo -e "\n${BLUE}━━━ 检查端口占用 ━━━${NC}"
    
    local ports=(3000 3001 5173)
    local port_names=("后端主服务" "WebSocket服务" "前端开发服务器")
    
    for i in "${!ports[@]}"; do
        local port=${ports[$i]}
        local name=${port_names[$i]}
        
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            local pid=$(lsof -ti:$port)
            check "端口 $port ($name)" "warn" "已被占用 (PID: $pid)"
        else
            check "端口 $port ($name)" "pass" "可用"
        fi
    done
}

# 检查文件结构
check_file_structure() {
    echo -e "\n${BLUE}━━━ 检查文件结构 ━━━${NC}"
    
    local required_files=(
        "backend-api/src/index.ts"
        "backend-api/src/websocket/realtime-voice.websocket.ts"
        "backend-api/src/services/realtime-voice-pipeline.service.ts"
        "backend-api/src/services/rtc-asr.service.ts"
        "backend-api/src/services/ttsService.ts"
        "backend-api/src/services/deepseekService.ts"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            check "  ├─ $(basename $file)" "pass" "存在"
        else
            check "  ├─ $(basename $file)" "fail" "缺失"
        fi
    done
}

# 检查网络连接
check_network() {
    echo -e "\n${BLUE}━━━ 检查网络连接 ━━━${NC}"
    
    # 检查 DeepSeek API
    if curl -s --max-time 5 https://api.deepseek.com > /dev/null 2>&1; then
        check "DeepSeek API" "pass" "可访问"
    else
        check "DeepSeek API" "warn" "无法访问（请检查网络）"
    fi
    
    # 检查阿里云
    if curl -s --max-time 5 https://aliyun.com > /dev/null 2>&1; then
        check "阿里云服务" "pass" "可访问"
    else
        check "阿里云服务" "warn" "无法访问（请检查网络）"
    fi
}

# 检查 Android 配置
check_android_config() {
    echo -e "\n${BLUE}━━━ 检查 Android 配置 ━━━${NC}"
    
    local android_config="$PROJECT_ROOT/android-v0-compose/app/src/main/java/com/xlwl/AiMian/config/AppConfig.kt"
    
    if [ -f "$android_config" ]; then
        check "Android 配置文件" "pass" "存在"
        
        # 检查 WebSocket URL 配置
        if grep -q "realtimeVoiceWsUrl" "$android_config"; then
            local ws_url=$(grep "realtimeVoiceWsUrl" "$android_config" | head -1)
            check "WebSocket URL" "pass" "已配置"
            echo "       ${YELLOW}提示: $ws_url${NC}"
        else
            check "WebSocket URL" "warn" "未找到配置"
        fi
    else
        check "Android 配置" "warn" "未找到 Android 项目（如仅测试 Web 端可忽略）"
    fi
}

# 生成配置建议
generate_recommendations() {
    echo -e "\n${BLUE}━━━ 配置建议 ━━━${NC}"
    
    if [ $FAILED_CHECKS -gt 0 ]; then
        echo -e "${RED}发现 $FAILED_CHECKS 个严重问题，请先修复：${NC}"
        echo ""
        
        if [ ! -f "$PROJECT_ROOT/backend-api/.env" ]; then
            echo "  1. 创建环境配置文件:"
            echo "     cp backend-api/.env.example backend-api/.env"
            echo ""
        fi
        
        if ! command -v node &> /dev/null; then
            echo "  2. 安装 Node.js:"
            echo "     访问 https://nodejs.org/ 下载安装"
            echo ""
        fi
        
        if [ ! -d "$PROJECT_ROOT/backend-api/node_modules" ]; then
            echo "  3. 安装依赖:"
            echo "     cd backend-api && npm install"
            echo ""
        fi
    fi
    
    if [ $WARNING_CHECKS -gt 0 ]; then
        echo -e "${YELLOW}发现 $WARNING_CHECKS 个警告，建议优化：${NC}"
        echo ""
        
        echo "  • 确保配置了所有必需的 API 密钥"
        echo "  • 检查端口占用情况"
        echo "  • 验证网络连接"
        echo ""
    fi
}

# 打印总结
print_summary() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                   检查总结                             ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  总计检查项: $TOTAL_CHECKS"
    echo -e "  ${GREEN}✓ 通过: $PASSED_CHECKS${NC}"
    
    if [ $WARNING_CHECKS -gt 0 ]; then
        echo -e "  ${YELLOW}⚠ 警告: $WARNING_CHECKS${NC}"
    fi
    
    if [ $FAILED_CHECKS -gt 0 ]; then
        echo -e "  ${RED}✗ 失败: $FAILED_CHECKS${NC}"
    fi
    
    echo ""
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        if [ $WARNING_CHECKS -eq 0 ]; then
            echo -e "${GREEN}🎉 所有检查通过！系统已准备就绪${NC}"
            echo ""
            echo "可以运行以下命令启动系统:"
            echo -e "${YELLOW}./start-digital-human-test.sh${NC}"
        else
            echo -e "${YELLOW}⚠️  基本配置完成，但有一些警告项${NC}"
            echo "系统可以运行，但建议优化配置"
        fi
    else
        echo -e "${RED}❌ 发现严重问题，请先修复后再启动系统${NC}"
    fi
    
    echo ""
}

# 主函数
main() {
    print_header
    
    check_nodejs
    check_env_vars
    check_dependencies
    check_ports
    check_file_structure
    check_network
    check_android_config
    
    generate_recommendations
    print_summary
}

# 执行主函数
main

