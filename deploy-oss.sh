#!/bin/bash

# AI面试系统 - OSS视频上传功能部署脚本
# 本脚本将自动配置OSS相关功能，包括依赖安装、环境配置等

set -e  # 遇到错误立即退出

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

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安装，请先安装"
        return 1
    fi
}

# 主函数
main() {
    log_info "开始部署AI面试系统OSS视频上传功能..."
    
    # 检查系统环境
    check_environment
    
    # 安装后端依赖
    install_backend_dependencies
    
    # 配置环境变量
    setup_environment
    
    # 编译Android应用
    build_android_app
    
    # 启动后端服务
    start_backend_service
    
    # 验证部署
    verify_deployment
    
    log_success "OSS视频上传功能部署完成！"
    show_usage_info
}

# 检查系统环境
check_environment() {
    log_info "检查系统环境..."
    
    # 检查Node.js
    if ! check_command "node"; then
        log_error "请先安装Node.js 18或更高版本"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js版本过低，需要18或更高版本，当前版本: $(node -v)"
        exit 1
    fi
    
    # 检查npm
    check_command "npm" || exit 1
    
    # 检查Java（用于Android编译）
    if ! check_command "java"; then
        log_warning "未检测到Java，Android应用编译可能失败"
    fi
    
    log_success "系统环境检查通过"
}

# 安装后端依赖
install_backend_dependencies() {
    log_info "安装后端依赖..."
    
    cd backend-api
    
    # 安装npm依赖
    npm install
    
    # 检查是否安装了阿里云OSS SDK
    if ! npm list ali-oss &> /dev/null; then
        log_info "安装阿里云OSS SDK..."
        npm install ali-oss@^6.20.0
    fi
    
    # 编译TypeScript
    npm run build
    
    cd ..
    log_success "后端依赖安装完成"
}

# 配置环境变量
setup_environment() {
    log_info "配置环境变量..."
    
    ENV_FILE="backend-api/.env"
    
    if [ ! -f "$ENV_FILE" ]; then
        log_info "创建环境变量文件..."
        cp backend-api/env.example "$ENV_FILE"
    fi
    
    # 检查OSS配置
    if ! grep -q "OSS_ACCESS_KEY_ID=" "$ENV_FILE" || grep -q "your-access-key-id" "$ENV_FILE"; then
        log_warning "请配置阿里云OSS访问密钥"
        echo ""
        echo "请在 $ENV_FILE 文件中配置以下OSS参数："
        echo "  OSS_REGION=oss-cn-hangzhou"
        echo "  OSS_ACCESS_KEY_ID=your-actual-access-key-id"
        echo "  OSS_ACCESS_KEY_SECRET=your-actual-access-key-secret"
        echo "  OSS_BUCKET=ai-interview-videos"
        echo ""
        read -p "配置完成后按Enter继续..."
    fi
    
    log_success "环境变量配置完成"
}

# 编译Android应用
build_android_app() {
    log_info "编译Android应用..."
    
    if [ ! -d "android-app" ]; then
        log_warning "未找到Android应用目录，跳过编译"
        return
    fi
    
    cd android-app
    
    # 检查Gradle Wrapper
    if [ ! -f "gradlew" ]; then
        log_warning "未找到Gradle Wrapper，跳过Android编译"
        cd ..
        return
    fi
    
    # 授予执行权限
    chmod +x gradlew
    
    # 编译APK（Debug版本）
    if ./gradlew assembleDebug; then
        log_success "Android应用编译成功"
        
        # 显示APK位置
        APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
        if [ -f "$APK_PATH" ]; then
            log_info "APK文件位置: android-app/$APK_PATH"
        fi
    else
        log_warning "Android应用编译失败，请检查环境配置"
    fi
    
    cd ..
}

# 启动后端服务
start_backend_service() {
    log_info "启动后端服务..."
    
    cd backend-api
    
    # 检查PM2是否安装
    if ! command -v pm2 &> /dev/null; then
        log_info "安装PM2进程管理器..."
        npm install -g pm2
    fi
    
    # 停止现有服务
    pm2 stop ai-interview-api 2>/dev/null || true
    pm2 delete ai-interview-api 2>/dev/null || true
    
    # 启动服务
    pm2 start dist/index.js --name "ai-interview-api" --env production
    
    # 保存PM2配置
    pm2 save
    
    cd ..
    log_success "后端服务启动成功"
}

# 验证部署
verify_deployment() {
    log_info "验证部署状态..."
    
    # 等待服务启动
    sleep 5
    
    # 检查服务状态
    if pm2 list | grep -q "ai-interview-api.*online"; then
        log_success "后端服务运行正常"
    else
        log_error "后端服务启动失败"
        pm2 logs ai-interview-api --lines 10
        return 1
    fi
    
    # 测试API接口
    if command -v curl &> /dev/null; then
        log_info "测试API接口..."
        
        if curl -s http://localhost:3001/api/health > /dev/null; then
            log_success "API接口响应正常"
        else
            log_warning "API接口无响应，请检查服务状态"
        fi
        
        # 测试OSS配置接口
        if curl -s http://localhost:3001/api/oss/config > /dev/null; then
            log_success "OSS配置接口正常"
        else
            log_warning "OSS配置接口异常，请检查环境变量"
        fi
    fi
}

# 显示使用说明
show_usage_info() {
    echo ""
    echo "==============================================="
    echo "🎉 AI面试系统OSS功能部署完成！"
    echo "==============================================="
    echo ""
    echo "📋 服务信息："
    echo "  - 后端API: http://localhost:3001"
    echo "  - API文档: http://localhost:3001/api/docs"
    echo "  - 健康检查: http://localhost:3001/api/health"
    echo ""
    echo "🔧 常用命令："
    echo "  - 查看服务状态: pm2 status"
    echo "  - 查看服务日志: pm2 logs ai-interview-api"
    echo "  - 重启服务: pm2 restart ai-interview-api"
    echo "  - 停止服务: pm2 stop ai-interview-api"
    echo ""
    echo "📱 Android应用："
    echo "  - 应用路径: android-app/app/build/outputs/apk/debug/"
    echo "  - 安装到设备: adb install app-debug.apk"
    echo ""
    echo "⚠️  重要提醒："
    echo "  1. 请确保已配置正确的阿里云OSS访问密钥"
    echo "  2. 在生产环境中请使用HTTPS和域名访问"
    echo "  3. 建议配置CDN加速提升视频访问速度"
    echo "  4. 定期检查OSS存储用量和费用"
    echo ""
    echo "📖 相关文档："
    echo "  - OSS配置指南: ./OSS配置指南.md"
    echo "  - 阿里云部署指南: ./阿里云部署指南.md"
    echo ""
    echo "如有问题，请查看文档或联系技术支持。"
    echo "==============================================="
}

# 清理函数
cleanup() {
    if [ $? -ne 0 ]; then
        log_error "部署过程中出现错误，正在清理..."
        # 这里可以添加清理逻辑
    fi
}

# 设置错误处理
trap cleanup EXIT

# 检查参数
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "check")
        check_environment
        ;;
    "backend")
        install_backend_dependencies
        setup_environment
        start_backend_service
        ;;
    "android")
        build_android_app
        ;;
    "verify")
        verify_deployment
        ;;
    "--help"|"-h")
        echo "AI面试系统OSS功能部署脚本"
        echo ""
        echo "用法: $0 [选项]"
        echo ""
        echo "选项:"
        echo "  deploy    完整部署（默认）"
        echo "  check     仅检查环境"
        echo "  backend   仅部署后端"
        echo "  android   仅编译Android应用"
        echo "  verify    仅验证部署状态"
        echo "  --help    显示此帮助信息"
        echo ""
        ;;
    *)
        log_error "未知选项: $1"
        echo "使用 '$0 --help' 查看帮助信息"
        exit 1
        ;;
esac 