#!/bin/bash

# AIRI轻量级本地部署脚本
# 适用于个人电脑，资源需求极低
# 修复macOS兼容性问题

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# 检查系统要求（修复macOS兼容性）
check_system_requirements() {
    log_info "检查系统要求..."
    
    # 检查操作系统
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_success "操作系统: Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        log_success "操作系统: macOS"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        log_success "操作系统: Windows (WSL)"
    else
        log_warning "未知操作系统: $OSTYPE，但可以尝试继续"
    fi
    
    # 检查内存（修复macOS兼容性）
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS内存检测
        total_mem=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024/1024)}')
        if [ $total_mem -lt 2 ]; then
            log_warning "内存较低: ${total_mem}GB，建议至少2GB"
        else
            log_success "内存: ${total_mem}GB"
        fi
    elif command -v free &> /dev/null; then
        # Linux内存检测
        total_mem=$(free -m | awk 'NR==2{printf "%.0f", $2/1024}')
        if [ $total_mem -lt 2 ]; then
            log_warning "内存较低: ${total_mem}GB，建议至少2GB"
        else
            log_success "内存: ${total_mem}GB"
        fi
    else
        log_warning "无法检测内存，请确保至少2GB可用内存"
    fi
    
    # 检查磁盘空间（修复macOS兼容性）
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS磁盘空间检测
        free_space=$(df -g . | awk 'NR==2{print $4}' | sed 's/Gi//')
        if [ -z "$free_space" ] || [ "$free_space" -lt 5 ]; then
            log_warning "磁盘空间较低: ${free_space}GB，建议至少5GB"
        else
            log_success "可用磁盘空间: ${free_space}GB"
        fi
    elif command -v df &> /dev/null; then
        # Linux磁盘空间检测
        free_space=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
        if [ -z "$free_space" ] || [ "$free_space" -lt 5 ]; then
            log_warning "磁盘空间较低: ${free_space}GB，建议至少5GB"
        else
            log_success "可用磁盘空间: ${free_space}GB"
        fi
    else
        log_warning "无法检测磁盘空间，请确保至少5GB可用空间"
    fi
}

# 安装Node.js（简化版本）
install_nodejs() {
    log_info "检查Node.js..."
    
    if command -v node &> /dev/null; then
        node_version=$(node --version | sed 's/v//')
        major_version=$(echo $node_version | cut -d. -f1)
        
        if [ $major_version -ge 16 ]; then
            log_success "Node.js版本: $node_version"
            return 0
        else
            log_warning "Node.js版本过低: $node_version，需要16+"
        fi
    fi
    
    log_info "安装Node.js..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # 使用NodeSource仓库
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install node
        else
            log_info "安装Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            brew install node
        fi
    else
        log_warning "请手动安装Node.js 16+"
        log_info "下载地址: https://nodejs.org/"
        exit 1
    fi
    
    log_success "Node.js安装完成: $(node --version)"
}

# 安装pnpm
install_pnpm() {
    log_info "安装pnpm..."
    
    if ! command -v pnpm &> /dev/null; then
        npm install -g pnpm
        log_success "pnpm安装完成"
    else
        pnpm_version=$(pnpm --version)
        log_success "pnpm已安装: $pnpm_version"
        
        # 检查是否需要更新pnpm
        if [[ "$OSTYPE" == "darwin"* ]]; then
            log_info "建议更新pnpm到最新版本"
            log_info "运行: npm install -g pnpm@latest"
        fi
    fi
}

# 克隆AIRI项目
clone_airi_project() {
    log_info "克隆AIRI项目..."
    
    if [ -d "airi" ]; then
        log_warning "AIRI项目已存在，跳过克隆"
        return 0
    fi
    
    git clone https://github.com/moeru-ai/airi.git
    log_success "AIRI项目克隆完成"
}

# 安装项目依赖（修复pnpm版本问题）
install_project_dependencies() {
    log_info "安装项目依赖..."
    
    if [ ! -d "airi" ]; then
        log_error "AIRI项目目录不存在"
        exit 1
    fi
    
    cd airi
    
    # 清理可能损坏的lockfile
    if [ -f "pnpm-lock.yaml" ]; then
        log_info "清理旧的lockfile..."
        rm -f pnpm-lock.yaml
    fi
    
    # 尝试安装依赖
    log_info "安装项目依赖（这可能需要几分钟）..."
    
    # 使用--no-frozen-lockfile避免lockfile问题
    if pnpm install --no-frozen-lockfile; then
        log_success "项目依赖安装完成"
    else
        log_warning "pnpm安装失败，尝试使用npm..."
        if npm install; then
            log_success "使用npm安装依赖完成"
        else
            log_error "依赖安装失败，请检查网络连接和Node.js版本"
            exit 1
        fi
    fi
}

# 配置环境变量（简化版）
setup_environment() {
    log_info "配置环境变量..."
    
    if [ ! -d "airi" ]; then
        log_error "AIRI项目目录不存在"
        exit 1
    fi
    
    cd airi
    
    # 创建简化的环境配置文件
    cat > .env << EOF
# AIRI基础配置
NODE_ENV=development
PORT=3000
HOST=localhost

# 数据库配置（使用SQLite，无需额外安装）
DATABASE_URL=file:./data.db

# AI模型配置 - 选择一个即可
# OpenAI GPT（推荐，免费额度每月$5）
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# 或者使用阿里云DashScope（免费额度）
# DASHSCOPE_API_KEY=your_dashscope_api_key
# DASHSCOPE_MODEL=qwen-turbo

# 语音服务配置 - 选择一个即可
# Azure Speech Services（免费额度）
# AZURE_SPEECH_KEY=your_azure_speech_key
# AZURE_SPEECH_REGION=eastasia
# AZURE_SPEECH_VOICE=zh-CN-XiaoxiaoNeural

# 或者使用阿里云TTS（免费额度）
# ALIYUN_TTS_ACCESS_KEY_ID=your_access_key_id
# ALIYUN_TTS_ACCESS_KEY_SECRET=your_access_key_secret
# ALIYUN_TTS_VOICE=zh-CN-XiaoxiaoNeural

# 安全配置
JWT_SECRET=your-super-secret-jwt-key-change-this
CORS_ORIGIN=http://localhost:3000

# 数字人配置
CHARACTER_ID=interviewer
CHARACTER_NAME=AI面试官
CHARACTER_PERSONALITY=professional
EOF
    
    log_warning "请编辑 .env 文件，配置您的API密钥"
    log_info "获取免费API密钥："
    log_info "1. OpenAI: https://platform.openai.com/api-keys"
    log_info "2. 阿里云DashScope: https://dashscope.console.aliyun.com/"
    log_info "3. Azure Speech: https://portal.azure.com/"
    log_success "环境配置文件创建完成"
}

# 启动服务
start_service() {
    log_info "启动AIRI服务..."
    
    if [ ! -d "airi" ]; then
        log_error "AIRI项目目录不存在"
        exit 1
    fi
    
    cd airi
    
    # 检查是否有package.json
    if [ ! -f "package.json" ]; then
        log_error "package.json文件不存在，项目可能损坏"
        exit 1
    fi
    
    # 检查可用的启动脚本
    if grep -q '"dev"' package.json; then
        log_info "使用 pnpm run dev 启动服务..."
        pnpm run dev &
    elif grep -q '"start"' package.json; then
        log_info "使用 pnpm start 启动服务..."
        pnpm start &
    else
        log_error "未找到可用的启动脚本"
        exit 1
    fi
    
    local pid=$!
    echo $pid > .airi.pid
    
    log_success "AIRI服务已启动，PID: $pid"
    log_info "访问地址: http://localhost:3000"
    log_info "停止服务: kill $pid 或 Ctrl+C"
    
    # 等待服务启动
    sleep 5
    
    # 检查服务是否启动成功
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        log_success "服务启动成功！"
        log_info "现在可以在浏览器中访问 http://localhost:3000"
    else
        log_warning "服务可能还在启动中，请稍等片刻再访问"
        log_info "如果长时间无法访问，请检查端口是否被占用"
    fi
}

# 创建启动脚本
create_startup_script() {
    log_info "创建启动脚本..."
    
    # 回到项目根目录
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
    log_info "开始轻量级部署AIRI数字人项目..."
    log_info "资源需求: 2GB内存 + 5GB磁盘空间"
    
    # 检查系统要求
    check_system_requirements
    
    # 安装依赖
    install_nodejs
    install_pnpm
    
    # 克隆和配置项目
    clone_airi_project
    install_project_dependencies
    setup_environment
    
    # 启动服务
    start_service
    
    # 创建启动脚本
    create_startup_script
    
    log_success "AIRI项目轻量级部署完成！"
    log_info ""
    log_info "🎉 部署成功！下一步："
    log_info "1. 编辑 airi/.env 文件，配置API密钥"
    log_info "2. 访问 http://localhost:3000 查看效果"
    log_info "3. 下次启动: ./start-airi.sh"
    log_info ""
    log_info "💡 提示："
    log_info "- 首次使用需要配置API密钥"
    log_info "- 支持语音对话和数字人交互"
    log_info "- 可以集成到您的Android应用中"
    log_info ""
    log_info "🔧 故障排除："
    log_info "- 如果端口被占用，修改 .env 中的 PORT"
    log_info "- 如果API调用失败，检查密钥配置"
    log_info "- 查看日志: tail -f airi/logs/app.log"
}

# 运行主函数
main "$@"
