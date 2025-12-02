#!/bin/bash

###############################################################################
# 数字人实时语音测试系统启动脚本
# 功能：启动完整的数字人面试系统，包括后端服务和测试工具
###############################################################################

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

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

# 打印欢迎信息
print_banner() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                       ║${NC}"
    echo -e "${GREEN}║       🤖 AI 数字人实时语音测试系统 v1.0             ║${NC}"
    echo -e "${GREEN}║                                                       ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# 检查环境变量
check_environment() {
    log_info "检查环境配置..."
    
    # 检查 .env 文件
    if [ ! -f "$PROJECT_ROOT/backend-api/.env" ]; then
        log_error "未找到 backend-api/.env 文件"
        log_info "请先创建环境配置文件"
        exit 1
    fi
    
    # 检查必需的环境变量
    source "$PROJECT_ROOT/backend-api/.env"
    
    local missing_vars=()
    
    # 检查 DeepSeek API Key（必需）
    if [ -z "$DEEPSEEK_API_KEY" ]; then
        missing_vars+=("DEEPSEEK_API_KEY")
    fi
    
    # 检查 TTS 配置（必需）
    if [ -z "$ALIYUN_TTS_ACCESS_KEY_ID" ] && [ -z "$ALIYUN_ACCESS_KEY_ID" ] && [ -z "$AZURE_TTS_KEY" ] && [ -z "$AZURE_SPEECH_KEY" ]; then
        missing_vars+=("ALIYUN_TTS_ACCESS_KEY_ID 或 AZURE_TTS_KEY")
    fi
    
    # 检查 ASR 配置（可选 - 仅语音输入需要）
    if [ -z "$VOLC_APP_ID" ] && [ -z "$AGORA_APP_ID" ]; then
        log_warning "未配置 ASR 服务（语音识别），系统将支持文本输入模式"
        log_info "如需语音输入功能，请配置 VOLC_APP_ID 或 AGORA_APP_ID"
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "缺少必需的环境变量:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        log_info "请在 backend-api/.env 中配置这些变量"
        exit 1
    fi
    
    log_success "环境配置检查通过 ✓"
}

# 检查 Node.js 和依赖
check_dependencies() {
    log_info "检查依赖..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "未安装 Node.js"
        exit 1
    fi
    
    log_info "Node.js 版本: $(node --version)"
    
    # 检查 backend-api 依赖
    if [ ! -d "$PROJECT_ROOT/backend-api/node_modules" ]; then
        log_warning "backend-api 依赖未安装，正在安装..."
        cd "$PROJECT_ROOT/backend-api"
        npm install
        cd "$PROJECT_ROOT"
    fi
    
    log_success "依赖检查通过 ✓"
}

# 停止现有服务
stop_existing_services() {
    log_info "停止现有服务..."
    
    # 查找并停止占用端口的进程
    local ports=(3000 3001 5173)
    
    for port in "${ports[@]}"; do
        local pid=$(lsof -ti:$port)
        if [ ! -z "$pid" ]; then
            log_warning "停止端口 $port 上的进程 (PID: $pid)"
            kill -9 $pid 2>/dev/null || true
        fi
    done
    
    sleep 2
    log_success "现有服务已停止 ✓"
}

# 启动后端服务
start_backend() {
    log_info "启动后端服务..."
    
    cd "$PROJECT_ROOT/backend-api"
    
    # 清理旧日志
    rm -f digital-human-backend.log
    
    # 启动后端
    npm run dev > digital-human-backend.log 2>&1 &
    BACKEND_PID=$!
    
    log_info "后端服务 PID: $BACKEND_PID"
    
    # 等待后端启动
    log_info "等待后端服务启动..."
    sleep 5
    
    # 检查后端是否启动成功
    if ! ps -p $BACKEND_PID > /dev/null; then
        log_error "后端服务启动失败"
        log_info "查看日志: tail -f backend-api/digital-human-backend.log"
        exit 1
    fi
    
    # 检查健康状态
    local max_attempts=10
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:3001/health > /dev/null 2>&1; then
            log_success "后端服务启动成功 ✓"
            log_info "后端地址: http://localhost:3001"
            return 0
        fi
        
        attempt=$((attempt + 1))
        log_info "等待后端响应... ($attempt/$max_attempts)"
        sleep 2
    done
    
    log_error "后端服务健康检查失败"
    exit 1
}

# 启动 Admin Dashboard
start_admin_dashboard() {
    log_info "启动 Admin Dashboard..."
    
    cd "$PROJECT_ROOT/admin-dashboard"
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        log_warning "Admin Dashboard 依赖未安装，正在安装..."
        npm install
    fi
    
    # 清理旧日志
    rm -f digital-human-dashboard.log
    
    # 启动 Dashboard
    npm run dev > digital-human-dashboard.log 2>&1 &
    DASHBOARD_PID=$!
    
    log_info "Admin Dashboard PID: $DASHBOARD_PID"
    
    # 等待启动
    sleep 3
    
    log_success "Admin Dashboard 启动成功 ✓"
    log_info "Dashboard 地址: http://localhost:5173"
}

# 创建测试会话
create_test_session() {
    log_info "创建测试会话..."
    
    local session_id="test-session-$(date +%s)"
    
    # 调用 API 创建会话
    local response=$(curl -s -X POST http://localhost:3001/api/interviews \
        -H "Content-Type: application/json" \
        -d "{
            \"userId\": \"test-user\",
            \"position\": \"软件工程师\",
            \"difficulty\": \"medium\",
            \"questionCount\": 5
        }" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        log_success "测试会话创建成功 ✓"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    else
        log_warning "无法创建测试会话，但服务已启动"
    fi
}

# 打印访问信息
print_access_info() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           🎉 数字人系统启动成功！                     ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📌 访问地址：${NC}"
    echo -e "   🌐 Web 测试页面: ${GREEN}http://localhost:3001/test/digital-human${NC}"
    echo -e "   📊 Admin Dashboard: ${GREEN}http://localhost:5173${NC}"
    echo -e "   🔌 WebSocket 端点: ${GREEN}ws://localhost:3001${NC}"
    echo ""
    echo -e "${BLUE}📱 Android 配置：${NC}"
    echo -e "   在 AppConfig.kt 中设置："
    echo -e "   ${YELLOW}realtimeVoiceWsUrl = \"ws://你的IP:3001\"${NC}"
    echo ""
    echo -e "${BLUE}📋 测试步骤：${NC}"
    echo -e "   1. 打开 Web 测试页面进行快速测试"
    echo -e "   2. 或在 Android 应用中测试数字人面试"
    echo -e "   3. 点击"开始答题"按钮开始语音交互"
    echo -e "   4. 说话后系统会自动识别并回复"
    echo ""
    echo -e "${BLUE}📝 查看日志：${NC}"
    echo -e "   后端日志: ${YELLOW}tail -f backend-api/digital-human-backend.log${NC}"
    echo -e "   前端日志: ${YELLOW}tail -f admin-dashboard/digital-human-dashboard.log${NC}"
    echo ""
    echo -e "${BLUE}🛑 停止服务：${NC}"
    echo -e "   ${YELLOW}按 Ctrl+C 或运行: ./stop-digital-human-test.sh${NC}"
    echo ""
}

# 监听服务
monitor_services() {
    log_info "监听服务状态（按 Ctrl+C 停止）..."
    echo ""
    
    # 创建停止脚本
    cat > "$PROJECT_ROOT/stop-digital-human-test.sh" << 'EOF'
#!/bin/bash
echo "正在停止数字人测试系统..."

# 停止后端
if [ -f "backend-api/.backend.pid" ]; then
    kill $(cat backend-api/.backend.pid) 2>/dev/null || true
    rm -f backend-api/.backend.pid
fi

# 停止 Dashboard
if [ -f "admin-dashboard/.dashboard.pid" ]; then
    kill $(cat admin-dashboard/.dashboard.pid) 2>/dev/null || true
    rm -f admin-dashboard/.dashboard.pid
fi

# 停止占用端口的进程
for port in 3000 3001 5173; do
    pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        kill -9 $pid 2>/dev/null || true
    fi
done

echo "✓ 数字人测试系统已停止"
EOF
    chmod +x "$PROJECT_ROOT/stop-digital-human-test.sh"
    
    # 保存 PID
    echo $BACKEND_PID > "$PROJECT_ROOT/backend-api/.backend.pid"
    echo $DASHBOARD_PID > "$PROJECT_ROOT/admin-dashboard/.dashboard.pid"
    
    # 监听日志
    trap "bash $PROJECT_ROOT/stop-digital-human-test.sh; exit" INT TERM
    
    tail -f "$PROJECT_ROOT/backend-api/digital-human-backend.log" &
    
    wait
}

# 主函数
main() {
    print_banner
    
    check_environment
    check_dependencies
    stop_existing_services
    
    start_backend
    start_admin_dashboard
    
    create_test_session
    print_access_info
    
    monitor_services
}

# 执行主函数
main
