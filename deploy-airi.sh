#!/bin/bash

# AIRI数字人项目部署脚本
# 支持本地部署和云服务器部署

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 检查系统要求
check_system_requirements() {
    log_info "检查系统要求..."
    
    # 检查操作系统
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_success "操作系统: Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        log_success "操作系统: macOS"
    else
        log_error "不支持的操作系统: $OSTYPE"
        exit 1
    fi
    
    # 检查内存
    total_mem=$(free -m | awk 'NR==2{printf "%.0f", $2/1024}')
    if [ $total_mem -lt 4 ]; then
        log_error "内存不足，需要至少4GB内存，当前: ${total_mem}GB"
        exit 1
    else
        log_success "内存: ${total_mem}GB"
    fi
    
    # 检查磁盘空间
    free_space=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
    if [ $free_space -lt 10 ]; then
        log_error "磁盘空间不足，需要至少10GB，当前: ${free_space}GB"
        exit 1
    else
        log_success "可用磁盘空间: ${free_space}GB"
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装系统依赖..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Ubuntu/Debian
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y curl wget git build-essential python3 python3-pip nodejs npm
        # CentOS/RHEL
        elif command -v yum &> /dev/null; then
            sudo yum update -y
            sudo yum install -y curl wget git gcc gcc-c++ python3 python3-pip nodejs npm
        else
            log_error "不支持的Linux发行版"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if ! command -v brew &> /dev/null; then
            log_info "安装Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        brew install curl wget git python3 node
    fi
    
    log_success "系统依赖安装完成"
}

# 安装Node.js 18+
install_nodejs() {
    log_info "检查Node.js版本..."
    
    if command -v node &> /dev/null; then
        node_version=$(node --version | sed 's/v//')
        major_version=$(echo $node_version | cut -d. -f1)
        
        if [ $major_version -ge 18 ]; then
            log_success "Node.js版本: $node_version"
            return 0
        else
            log_warning "Node.js版本过低: $node_version，需要18+"
        fi
    fi
    
    log_info "安装Node.js 18..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # 使用NodeSource仓库
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install node@18
        brew link node@18 --force
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
        log_success "pnpm已安装: $(pnpm --version)"
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
    cd airi
    
    log_success "AIRI项目克隆完成"
}

# 安装项目依赖
install_project_dependencies() {
    log_info "安装项目依赖..."
    
    cd airi
    
    # 安装依赖
    pnpm install
    
    log_success "项目依赖安装完成"
}

# 配置环境变量
setup_environment() {
    log_info "配置环境变量..."
    
    cd airi
    
    # 创建环境配置文件
    cat > .env << EOF
# AIRI配置
NODE_ENV=production
PORT=3000

# 数据库配置（可选）
DATABASE_URL=file:./data.db

# AI模型配置
# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1

# Anthropic Claude
ANTHROPIC_API_KEY=your_anthropic_api_key

# 阿里云DashScope
DASHSCOPE_API_KEY=your_dashscope_api_key

# 语音服务配置
# Azure Speech Services
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_azure_region

# 阿里云TTS
ALIYUN_TTS_ACCESS_KEY_ID=your_aliyun_access_key_id
ALIYUN_TTS_ACCESS_KEY_SECRET=your_aliyun_access_key_secret

# 文件存储配置
# 阿里云OSS
OSS_ACCESS_KEY_ID=your_oss_access_key_id
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET_NAME=your_bucket_name

# 安全配置
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=http://localhost:3000
EOF
    
    log_warning "请编辑 .env 文件，配置您的API密钥"
    log_success "环境配置文件创建完成"
}

# 构建项目
build_project() {
    log_info "构建项目..."
    
    cd airi
    
    # 构建前端
    pnpm run build
    
    log_success "项目构建完成"
}

# 启动服务
start_service() {
    log_info "启动AIRI服务..."
    
    cd airi
    
    # 启动开发服务器
    pnpm run dev &
    
    local pid=$!
    echo $pid > .airi.pid
    
    log_success "AIRI服务已启动，PID: $pid"
    log_info "访问地址: http://localhost:3000"
    log_info "停止服务: kill $pid"
}

# 创建systemd服务（Linux）
create_systemd_service() {
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        return 0
    fi
    
    log_info "创建systemd服务..."
    
    local service_file="/etc/systemd/system/airi.service"
    local current_dir=$(pwd)
    
    sudo tee $service_file > /dev/null << EOF
[Unit]
Description=AIRI Digital Human Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$current_dir/airi
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable airi.service
    
    log_success "systemd服务创建完成"
    log_info "启动服务: sudo systemctl start airi"
    log_info "查看状态: sudo systemctl status airi"
}

# 创建Nginx配置
create_nginx_config() {
    log_info "创建Nginx配置..."
    
    local nginx_conf="/etc/nginx/sites-available/airi"
    
    sudo tee $nginx_conf > /dev/null << EOF
server {
    listen 80;
    server_name your_domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket支持
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # 启用站点
    sudo ln -sf $nginx_conf /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    
    log_success "Nginx配置创建完成"
}

# 主函数
main() {
    log_info "开始部署AIRI数字人项目..."
    
    # 检查系统要求
    check_system_requirements
    
    # 安装依赖
    install_dependencies
    install_nodejs
    install_pnpm
    
    # 克隆和配置项目
    clone_airi_project
    install_project_dependencies
    setup_environment
    
    # 构建项目
    build_project
    
    # 启动服务
    start_service
    
    # 创建系统服务（可选）
    read -p "是否创建systemd服务？(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_systemd_service
    fi
    
    # 创建Nginx配置（可选）
    read -p "是否创建Nginx配置？(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_nginx_config
    fi
    
    log_success "AIRI项目部署完成！"
    log_info "下一步："
    log_info "1. 编辑 airi/.env 文件，配置API密钥"
    log_info "2. 访问 http://localhost:3000 测试服务"
    log_info "3. 配置域名和SSL证书（生产环境）"
}

# 运行主函数
main "$@"


