#!/bin/bash

# AIRI项目workspace依赖问题修复脚本

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
        log_info "运行: cd airi && ../fix-airi-workspace.sh"
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
    
    # 删除node_modules和lockfile
    rm -rf node_modules pnpm-lock.yaml package-lock.json yarn.lock
    
    # 清理pnpm缓存
    pnpm store prune
    
    log_success "项目清理完成"
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
    log_info "开始修复AIRI项目workspace依赖问题..."
    
    # 检查目录
    check_airi_directory
    
    # 更新pnpm
    update_pnpm
    
    # 清理项目
    clean_project
    
    # 尝试pnpm安装
    if try_pnpm_install; then
        log_success "使用pnpm安装成功"
    else
        # 修复workspace依赖
        fix_workspace_dependencies
        
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
    
    # 创建启动脚本
    create_startup_script
    
    log_success "AIRI项目修复完成！"
    log_info ""
    log_info "🎉 修复成功！下一步："
    log_info "1. 编辑 airi/.env 文件，配置API密钥"
    log_info "2. 运行: ./start-airi.sh 启动服务"
    log_info "3. 访问 http://localhost:3000 查看效果"
    log_info ""
    log_info "💡 提示："
    log_info "- 如果启动失败，请检查端口是否被占用"
    log_info "- 确保已配置正确的API密钥"
    log_info "- 使用Chrome或Edge浏览器获得最佳体验"
}

# 运行主函数
main "$@"
