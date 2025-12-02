#!/bin/bash

# AIRI项目环境配置文件生成脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否在AIRI项目目录
check_airi_directory() {
    if [ ! -f "package.json" ]; then
        log_error "请在AIRI项目根目录运行此脚本"
        log_info "运行: cd airi && ../create-airi-env.sh"
        exit 1
    fi
    
    log_success "检测到AIRI项目"
}

# 创建.env文件
create_env_file() {
    log_info "创建.env配置文件..."
    
    cat > .env << 'EOF'
# ========================================
# AIRI数字人项目环境配置
# ========================================

# 基础配置
NODE_ENV=development
PORT=3000
HOST=localhost

# 数据库配置（使用SQLite，无需额外安装）
DATABASE_URL=file:./data.db

# ========================================
# AI模型配置 - 选择一个即可
# ========================================

# 方案1: OpenAI GPT（推荐，免费额度$5/月）
# 获取地址: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# 方案2: 阿里云DashScope（免费额度）
# 获取地址: https://dashscope.console.aliyun.com/
# DASHSCOPE_API_KEY=your_dashscope_api_key_here
# DASHSCOPE_MODEL=qwen-turbo

# 方案3: Anthropic Claude（免费额度）
# 获取地址: https://console.anthropic.com/
# ANTHROPIC_API_KEY=<your-anthropic-api-key>
# ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# ========================================
# 语音服务配置 - 选择一个即可
# ========================================

# 方案1: Azure Speech Services（免费额度）
# 获取地址: https://portal.azure.com/
# AZURE_SPEECH_KEY=your_azure_speech_key_here
# AZURE_SPEECH_REGION=eastasia
# AZURE_SPEECH_VOICE=zh-CN-XiaoxiaoNeural

# 方案2: 阿里云TTS（免费额度）
# 获取地址: https://ram.console.aliyun.com/
# ALIYUN_TTS_ACCESS_KEY_ID=your_access_key_id_here
# ALIYUN_TTS_ACCESS_KEY_SECRET=your_access_key_secret_here
# ALIYUN_TTS_VOICE=zh-CN-XiaoxiaoNeural

# 方案3: 使用浏览器原生语音API（无需配置）
# 如果使用浏览器原生语音，无需配置语音服务

# ========================================
# 文件存储配置（可选）
# ========================================

# 阿里云OSS（用于存储视频文件）
# 获取地址: https://ram.console.aliyun.com/
# OSS_ACCESS_KEY_ID=your_oss_access_key_id_here
# OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret_here
# OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
# OSS_BUCKET_NAME=your_bucket_name_here

# ========================================
# 安全配置
# ========================================

# JWT密钥（用于用户认证，请修改为随机字符串）
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string

# CORS配置
CORS_ORIGIN=http://localhost:3000

# ========================================
# 数字人配置
# ========================================

# 数字人角色配置
CHARACTER_ID=interviewer
CHARACTER_NAME=AI面试官
CHARACTER_PERSONALITY=professional

# 面试配置
DEFAULT_QUESTION_TIME_LIMIT=60
MAX_QUESTIONS_PER_SESSION=8
INTERVIEW_CONTEXT=面试官

# ========================================
# 调试配置
# ========================================

# 日志级别
LOG_LEVEL=info

# 调试模式
DEBUG=false
EOF
    
    log_success ".env文件创建完成"
}

# 显示API密钥获取指南
show_api_guide() {
    log_info "API密钥获取指南："
    echo ""
    echo "🎯 必需配置（至少选择一个）："
    echo ""
    echo "1️⃣ OpenAI GPT（推荐）："
    echo "   - 访问: https://platform.openai.com/api-keys"
    echo "   - 注册账号并创建API密钥"
    echo "   - 免费额度: $5/月"
    echo "   - 将密钥填入: OPENAI_API_KEY=<your-openai-api-key>"
    echo ""
    echo "2️⃣ 阿里云DashScope："
    echo "   - 访问: https://dashscope.console.aliyun.com/"
    echo "   - 注册阿里云账号"
    echo "   - 开通DashScope服务"
    echo "   - 创建API密钥"
    echo "   - 免费额度: 每月免费调用次数"
    echo "   - 将密钥填入: DASHSCOPE_API_KEY=<your-dashscope-api-key>"
    echo ""
    echo "🎤 语音服务（可选，选择一个）："
    echo ""
    echo "1️⃣ Azure Speech Services："
    echo "   - 访问: https://portal.azure.com/"
    echo "   - 创建Azure账号"
    echo "   - 创建Speech Services资源"
    echo "   - 获取密钥和区域"
    echo "   - 免费额度: 每月免费语音服务"
    echo ""
    echo "2️⃣ 阿里云TTS："
    echo "   - 访问: https://ram.console.aliyun.com/"
    echo "   - 创建AccessKey ID和Secret"
    echo "   - 开通语音合成服务"
    echo "   - 免费额度: 每月免费调用次数"
    echo ""
    echo "3️⃣ 浏览器原生语音（推荐）："
    echo "   - 无需配置任何API密钥"
    echo "   - 使用浏览器内置的语音功能"
    echo "   - 支持Chrome、Edge、Safari"
    echo ""
}

# 显示配置示例
show_config_example() {
    log_info "配置示例："
    echo ""
    echo "📝 最小配置（仅使用OpenAI）："
    cat > .env.example << 'EOF'
NODE_ENV=development
PORT=3000
HOST=localhost
DATABASE_URL=file:./data.db

# OpenAI配置
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# 安全配置
JWT_SECRET=my-super-secret-jwt-key-123456789
CORS_ORIGIN=http://localhost:3000

# 数字人配置
CHARACTER_ID=interviewer
CHARACTER_NAME=AI面试官
CHARACTER_PERSONALITY=professional
EOF
    
    log_success "配置示例已保存到 .env.example"
}

# 验证配置
validate_config() {
    log_info "验证配置..."
    
    if [ -f ".env" ]; then
        log_success ".env文件存在"
        
        # 检查是否配置了API密钥
        if grep -qE "^OPENAI_API_KEY=[^<]+$" .env; then
            log_success "✅ OpenAI API密钥已配置"
        elif grep -qE "^DASHSCOPE_API_KEY=[^<]+$" .env; then
            log_success "✅ 阿里云DashScope API密钥已配置"
        elif grep -qE "^ANTHROPIC_API_KEY=[^<]+$" .env; then
            log_success "✅ Anthropic Claude API密钥已配置"
        else
            log_warning "⚠️  未配置AI模型API密钥，请编辑.env文件"
        fi
        
        # 检查JWT密钥
        if grep -q "JWT_SECRET=your-super-secret" .env; then
            log_warning "⚠️  请修改JWT_SECRET为随机字符串"
        else
            log_success "✅ JWT密钥已配置"
        fi
    else
        log_error ".env文件不存在"
    fi
}

# 显示下一步操作
show_next_steps() {
    log_info "下一步操作："
    echo ""
    echo "1️⃣ 获取API密钥："
    echo "   - 按照上面的指南获取API密钥"
    echo "   - 编辑 .env 文件，填入您的密钥"
    echo ""
    echo "2️⃣ 启动服务："
    echo "   - 运行: pnpm run dev"
    echo "   - 或运行: npm run dev"
    echo "   - 或运行: yarn dev"
    echo ""
    echo "3️⃣ 访问服务："
    echo "   - 打开浏览器访问: http://localhost:3000"
    echo "   - 开始体验AIRI数字人"
    echo ""
    echo "4️⃣ 集成到Android应用："
    echo "   - 修改Android应用中的AIRI_WEB_URL"
    echo "   - 测试集成效果"
    echo ""
}

# 主函数
main() {
    log_info "创建AIRI项目环境配置文件..."
    
    # 检查目录
    check_airi_directory
    
    # 创建.env文件
    create_env_file
    
    # 显示API获取指南
    show_api_guide
    
    # 显示配置示例
    show_config_example
    
    # 验证配置
    validate_config
    
    # 显示下一步操作
    show_next_steps
    
    log_success "环境配置完成！"
    log_info ""
    log_info "🎯 快速开始："
    log_info "1. 获取API密钥（推荐OpenAI）"
    log_info "2. 编辑 .env 文件填入密钥"
    log_info "3. 运行: pnpm run dev"
    log_info "4. 访问: http://localhost:3000"
    log_info ""
    log_info "💡 提示："
    log_info "- 如果不想配置语音API，可以使用浏览器原生语音"
    log_info "- OpenAI有$5免费额度，足够测试使用"
    log_info "- 确保网络连接正常"
}

# 运行主函数
main "$@"
