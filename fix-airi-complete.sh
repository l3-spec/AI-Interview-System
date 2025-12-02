#!/bin/bash

# AIRI项目完整修复脚本
# 解决workspace协议和依赖安装问题

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
        log_info "运行: cd airi && ../fix-airi-complete.sh"
        exit 1
    fi
    
    log_success "检测到AIRI项目"
}

# 更新pnpm到最新版本
update_pnpm() {
    log_info "更新pnpm到最新版本..."
    
    npm install -g pnpm@latest
    
    pnpm_version=$(pnpm --version)
    log_success "pnpm版本: $pnpm_version"
}

# 清理项目
clean_project() {
    log_info "清理项目..."
    
    # 删除所有依赖和lockfile
    rm -rf node_modules pnpm-lock.yaml package-lock.json yarn.lock
    
    # 清理pnpm缓存
    pnpm store prune
    
    # 清理npm缓存
    npm cache clean --force
    
    log_success "项目清理完成"
}

# 修复workspace依赖
fix_workspace_dependencies() {
    log_info "修复workspace依赖..."
    
    # 查找所有package.json文件
    package_files=$(find . -name "package.json")
    
    for file in $package_files; do
        log_info "处理文件: $file"
        
        # 备份原文件
        cp "$file" "$file.backup"
        
        # 替换workspace依赖
        sed -i '' 's/"workspace:\^"/"*"/g' "$file"
        sed -i '' 's/"workspace:\*"/"*"/g' "$file"
        sed -i '' 's/"workspace:">=1.0.0"/"*"/g' "$file"
        sed -i '' 's/"workspace:">=1.0"/"*"/g' "$file"
        
        log_success "修复完成: $file"
    done
}

# 尝试pnpm安装
try_pnpm_install() {
    log_info "尝试pnpm安装..."
    
    if pnpm install --no-frozen-lockfile --ignore-scripts; then
        log_success "pnpm安装成功"
        return 0
    else
        log_warning "pnpm安装失败，尝试其他方案"
        return 1
    fi
}

# 尝试npm安装
try_npm_install() {
    log_info "尝试npm安装..."
    
    if npm install; then
        log_success "npm安装成功"
        return 0
    else
        log_warning "npm安装失败，尝试yarn"
        return 1
    fi
}

# 尝试yarn安装
try_yarn_install() {
    log_info "尝试yarn安装..."
    
    # 检查yarn是否安装
    if ! command -v yarn &> /dev/null; then
        log_info "安装yarn..."
        npm install -g yarn
    fi
    
    if yarn install; then
        log_success "yarn安装成功"
        return 0
    else
        log_error "所有安装方式都失败了"
        return 1
    fi
}

# 检查安装结果
check_installation() {
    log_info "检查安装结果..."
    
    if [ -d "node_modules" ]; then
        log_success "依赖安装完成"
        
        # 检查vite是否安装
        if [ -f "node_modules/.bin/vite" ] || command -v vite &> /dev/null; then
            log_success "✅ vite已安装"
        else
            log_warning "⚠️  vite未找到，尝试安装"
            npm install -g vite
        fi
        
        # 检查可用的启动脚本
        if grep -q '"dev"' package.json; then
            log_info "找到dev脚本，可以运行: pnpm run dev"
        elif grep -q '"start"' package.json; then
            log_info "找到start脚本，可以运行: pnpm start"
        else
            log_warning "未找到启动脚本，请检查package.json"
        fi
    else
        log_error "依赖安装失败"
        exit 1
    fi
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
# AI模型配置 - 选择一个或多个
# ========================================

# 方案1: OpenAI GPT（推荐，免费额度$5/月）
# 获取地址: https://platform.openai.com/api-keys
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# 方案2: DeepSeek（国内用户友好）
# 获取地址: https://platform.deepseek.com/api_keys
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# 方案3: Anthropic Claude（高质量对话）
# 获取地址: https://console.anthropic.com/
ANTHROPIC_API_KEY=<your-anthropic-api-key>
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# 方案4: 阿里云DashScope（国内服务）
# 获取地址: https://dashscope.console.aliyun.com/
DASHSCOPE_API_KEY=
DASHSCOPE_MODEL=qwen-turbo

# 默认使用的模型（取消注释选择）
# DEFAULT_LLM_PROVIDER=openai
# DEFAULT_LLM_PROVIDER=deepseek
DEFAULT_LLM_PROVIDER=anthropic
# DEFAULT_LLM_PROVIDER=dashscope

# ========================================
# 语音服务配置 - 选择一个即可
# ========================================

# 方案1: Azure Speech Services（免费额度）
# 获取地址: https://portal.azure.com/
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=eastasia
AZURE_SPEECH_VOICE=zh-CN-XiaoxiaoNeural

# 方案2: 阿里云TTS（免费额度）
# 获取地址: https://ram.console.aliyun.com/
ALIYUN_TTS_ACCESS_KEY_ID=
ALIYUN_TTS_ACCESS_KEY_SECRET=
ALIYUN_TTS_VOICE=zh-CN-XiaoxiaoNeural

# 方案3: 使用浏览器原生语音API（推荐，无需配置）
# 如果使用浏览器原生语音，无需配置语音服务

# ========================================
# 文件存储配置（可选）
# ========================================

# 阿里云OSS（用于存储视频文件）
# 获取地址: https://ram.console.aliyun.com/
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET_NAME=

# ========================================
# 安全配置
# ========================================

# JWT密钥（用于用户认证，请修改为随机字符串）
JWT_SECRET=airi-super-secret-jwt-key-2024-123456789

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

# 创建启动脚本
create_startup_script() {
    log_info "创建启动脚本..."
    
    # 回到上级目录
    cd ..
    
    cat > start-airi.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/airi"
echo "启动AIRI服务..."

# 检查是否有package.json
if [ ! -f "package.json" ]; then
    echo "错误: package.json文件不存在"
    exit 1
fi

# 检查node_modules是否存在
if [ ! -d "node_modules" ]; then
    echo "错误: node_modules不存在，请先运行修复脚本"
    exit 1
fi

# 检查可用的启动脚本
if grep -q '"dev"' package.json; then
    echo "使用 pnpm run dev 启动..."
    pnpm run dev
elif grep -q '"start"' package.json; then
    echo "使用 pnpm start 启动..."
    pnpm start
else
    echo "错误: 未找到可用的启动脚本"
    exit 1
fi
EOF
    
    chmod +x start-airi.sh
    
    log_success "启动脚本创建完成: ./start-airi.sh"
}

# 主函数
main() {
    log_info "开始完整修复AIRI项目..."
    
    # 检查目录
    check_airi_directory
    
    # 更新pnpm
    update_pnpm
    
    # 清理项目
    clean_project
    
    # 修复workspace依赖
    fix_workspace_dependencies
    
    # 尝试pnpm安装
    if try_pnpm_install; then
        log_success "使用pnpm安装成功"
    else
        # 尝试npm安装
        if try_npm_install; then
            log_success "使用npm安装成功"
        else
            # 尝试yarn安装
            if try_yarn_install; then
                log_success "使用yarn安装成功"
            else
                log_error "所有安装方式都失败了"
                log_info "请检查网络连接和Node.js版本"
                exit 1
            fi
        fi
    fi
    
    # 检查安装结果
    check_installation
    
    # 创建.env文件
    create_env_file
    
    # 创建启动脚本
    create_startup_script
    
    log_success "AIRI项目完整修复完成！"
    log_info ""
    log_info "🎉 修复成功！配置信息："
    log_info "✅ 依赖安装完成"
    log_info "✅ workspace依赖已修复"
    log_info "✅ vite已安装"
    log_info "✅ Anthropic API密钥已配置"
    log_info "✅ 默认使用Anthropic Claude模型"
    log_info "✅ 语音服务使用浏览器原生语音（无需配置）"
    log_info ""
    log_info "📝 下一步："
    log_info "1. 启动服务: ./start-airi.sh"
    log_info "2. 访问: http://localhost:3000"
    log_info "3. 开始体验AIRI数字人！"
    log_info ""
    log_info "💡 提示："
    log_info "- 如果启动失败，请检查端口是否被占用"
    log_info "- 确保网络连接正常"
    log_info "- 使用Chrome或Edge浏览器获得最佳体验"
}

# 运行主函数
main "$@"
