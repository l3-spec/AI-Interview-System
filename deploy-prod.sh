#!/bin/bash
# ============================================================
# AI 面试系统 - 服务器一键部署脚本
# 使用方式：chmod +x deploy-prod.sh && ./deploy-prod.sh
# ============================================================

set -e  # 遇到错误立即退出

# ── 颜色定义 ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# ── 工具函数 ──────────────────────────────────────────────────
log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $1"; }
log_error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── 检查前置条件 ───────────────────────────────────────────────
check_requirements() {
    log_info "检查部署环境..."

    command -v docker >/dev/null 2>&1 || log_error "未安装 Docker，请先安装 Docker"
    command -v docker-compose >/dev/null 2>&1 || \
        docker compose version >/dev/null 2>&1 || \
        log_error "未安装 Docker Compose"

    log_success "Docker 环境检查通过"
}

# ── 检查环境变量文件 ───────────────────────────────────────────
check_env_file() {
    log_info "检查生产环境变量文件..."

    if [ ! -f ".env.prod" ]; then
        if [ -f ".env.prod.example" ]; then
            log_warning ".env.prod 不存在，从模板创建..."
            cp .env.prod.example .env.prod
            log_warning "请编辑 .env.prod 填入正确的生产环境值后重新运行此脚本"
            exit 1
        else
            log_error "缺少 .env.prod 文件，请参考 .env.prod.example 创建"
        fi
    fi

    log_success "环境变量文件检查通过"
}

# ── 运行数据库迁移 ─────────────────────────────────────────────
run_migrations() {
    log_info "运行数据库迁移..."

    # backend-api 迁移
    log_info "→ backend-api 数据库迁移"
    docker compose -f docker-compose.prod.yml run --rm \
        -e DATABASE_URL="$(grep DATABASE_URL .env.prod | cut -d= -f2-)" \
        backend-api \
        npx prisma migrate deploy
    log_success "backend-api 数据库迁移完成"

    # interview-service 迁移
    log_info "→ interview-service 数据库迁移"
    docker compose -f docker-compose.prod.yml run --rm \
        -e DATABASE_URL="$(grep DATABASE_URL .env.prod | cut -d= -f2-)" \
        interview-service \
        npx prisma migrate deploy
    log_success "interview-service 数据库迁移完成"
}

# ── 构建镜像 ──────────────────────────────────────────────────
build_images() {
    log_info "构建所有服务镜像（可能需要几分钟）..."

    docker compose -f docker-compose.prod.yml build \
        --no-cache \
        --parallel

    log_success "所有镜像构建完成"
}

# ── 启动服务 ──────────────────────────────────────────────────
start_services() {
    log_info "启动所有服务..."

    # 先停止旧容器（如果存在）
    docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

    # 启动新容器
    docker compose -f docker-compose.prod.yml up -d

    log_success "所有服务已启动"
}

# ── 健康检查 ──────────────────────────────────────────────────
health_check() {
    log_info "等待服务启动（30秒）..."
    sleep 30

    log_info "执行健康检查..."

    services=(
        "backend-api:3001"
        "asr-service:3002"
        "tts-service:3003"
        "interview-service:3004"
        "analysis-service:3005"
    )

    all_ok=true
    for svc in "${services[@]}"; do
        name="${svc%%:*}"
        port="${svc##*:}"
        if curl -sf "http://localhost:${port}/health" > /dev/null 2>&1; then
            log_success "${name} (端口 ${port}) - 运行正常"
        else
            log_warning "${name} (端口 ${port}) - 健康检查未响应（服务可能仍在启动中）"
            all_ok=false
        fi
    done

    if $all_ok; then
        log_success "所有服务健康检查通过！"
    else
        log_warning "部分服务未通过健康检查，请用 'docker compose -f docker-compose.prod.yml logs' 查看详情"
    fi
}

# ── 显示状态 ──────────────────────────────────────────────────
show_status() {
    echo ""
    echo "============================================"
    echo "  AI 面试系统部署完成！"
    echo "============================================"
    docker compose -f docker-compose.prod.yml ps
    echo ""
    echo "常用命令："
    echo "  查看日志：    docker compose -f docker-compose.prod.yml logs -f [服务名]"
    echo "  重启服务：    docker compose -f docker-compose.prod.yml restart [服务名]"
    echo "  停止所有：    docker compose -f docker-compose.prod.yml down"
    echo "  查看状态：    docker compose -f docker-compose.prod.yml ps"
}

# ── 主流程 ────────────────────────────────────────────────────
main() {
    echo "================================================"
    echo "  AI 面试系统 - 生产环境部署"
    echo "================================================"

    check_requirements
    check_env_file
    build_images
    start_services
    run_migrations
    health_check
    show_status
}

main "$@"
