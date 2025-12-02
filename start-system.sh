#!/bin/bash

# AI面试系统启动脚本
# 一键启动所有服务

echo "🚀 启动AI面试系统..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查Python环境
check_python() {
    echo -e "${BLUE}检查Python环境...${NC}"
    if command -v python3 &> /dev/null; then
        echo -e "${GREEN}✓ Python3 已安装${NC}"
    else
        echo -e "${RED}✗ Python3 未安装，请先安装Python3${NC}"
        exit 1
    fi
}

# 检查Node.js环境
check_node() {
    echo -e "${BLUE}检查Node.js环境...${NC}"
    if command -v node &> /dev/null; then
        echo -e "${GREEN}✓ Node.js 已安装${NC}"
    else
        echo -e "${RED}✗ Node.js 未安装，请先安装Node.js${NC}"
        exit 1
    fi
}

# 检查依赖
check_dependencies() {
    echo -e "${BLUE}检查项目依赖...${NC}"
    
    # 检查后端依赖
    if [ ! -f "backend-api/requirements.txt" ]; then
        echo -e "${RED}✗ 后端依赖文件不存在${NC}"
        exit 1
    fi
    
    # 检查前端依赖
    if [ ! -f "admin-dashboard/package.json" ] || [ ! -f "system-admin/package.json" ]; then
        echo -e "${RED}✗ 前端依赖文件不存在${NC}"
        exit 1
    fi
}

# 安装后端依赖
install_backend_deps() {
    echo -e "${BLUE}安装后端依赖...${NC}"
    cd backend-api
    
    # 检查虚拟环境
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}创建Python虚拟环境...${NC}"
        python3 -m venv venv
    fi
    
    # 激活虚拟环境
    source venv/bin/activate
    
    # 安装依赖
    echo -e "${YELLOW}安装Python依赖...${NC}"
    pip install -r requirements.txt
    
    cd ..
}

# 安装前端依赖
install_frontend_deps() {
    echo -e "${BLUE}安装前端依赖...${NC}"
    
    # 安装admin-dashboard依赖
    if [ ! -d "admin-dashboard/node_modules" ]; then
        echo -e "${YELLOW}安装admin-dashboard依赖...${NC}"
        cd admin-dashboard
        npm install
        cd ..
    fi
    
    # 安装system-admin依赖
    if [ ! -d "system-admin/node_modules" ]; then
        echo -e "${YELLOW}安装system-admin依赖...${NC}"
        cd system-admin
        npm install
        cd ..
    fi
}

# 启动后端服务
start_backend() {
    echo -e "${BLUE}启动后端服务...${NC}"
    cd backend-api
    
    # 激活虚拟环境
    source venv/bin/activate
    
    # 检查环境变量文件
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}创建环境变量文件...${NC}"
        cp env.example .env
        echo -e "${YELLOW}请编辑 .env 文件配置数据库等信息${NC}"
    fi
    
    # 启动服务
    echo -e "${GREEN}启动Flask服务 (端口: 3001)...${NC}"
    python3 app.py &
    BACKEND_PID=$!
    echo $BACKEND_PID > backend.pid
    
    cd ..
}

# 启动前端服务
start_frontend() {
    echo -e "${BLUE}启动前端服务...${NC}"
    
    # 启动admin-dashboard
    echo -e "${GREEN}启动admin-dashboard (端口: 5174)...${NC}"
    cd admin-dashboard
    npm run dev &
    ADMIN_PID=$!
    echo $ADMIN_PID > admin.pid
    cd ..
    
    # 启动system-admin
    echo -e "${GREEN}启动system-admin (端口: 5175)...${NC}"
    cd system-admin
    npm run dev &
    SYSTEM_PID=$!
    echo $SYSTEM_PID > system.pid
    cd ..
}

# 等待服务启动
wait_for_services() {
    echo -e "${BLUE}等待服务启动...${NC}"
    
    # 等待后端服务
    echo -e "${YELLOW}等待后端服务启动...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:3001/health > /dev/null; then
            echo -e "${GREEN}✓ 后端服务已启动${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}✗ 后端服务启动超时${NC}"
            exit 1
        fi
        sleep 1
    done
    
    # 等待前端服务
    echo -e "${YELLOW}等待前端服务启动...${NC}"
    sleep 5
}

# 显示服务状态
show_status() {
    echo -e "\n${GREEN}🎉 AI面试系统启动完成！${NC}"
    echo -e "\n${BLUE}服务状态:${NC}"
    echo -e "  ${GREEN}✓ 后端API服务: http://localhost:3001${NC}"
    echo -e "  ${GREEN}✓ 管理后台: http://localhost:5174${NC}"
    echo -e "  ${GREEN}✓ 系统管理: http://localhost:5175${NC}"
    echo -e "\n${BLUE}使用说明:${NC}"
    echo -e "  1. 管理后台: http://localhost:5174 (企业用户登录)"
    echo -e "  2. 系统管理: http://localhost:5175 (管理员登录)"
    echo -e "  3. API文档: http://localhost:3001/api/docs"
    echo -e "\n${YELLOW}停止服务: ./stop-system.sh${NC}"
}

# 主函数
main() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}    AI面试系统启动脚本${NC}"
    echo -e "${BLUE}================================${NC}\n"
    
    # 检查环境
    check_python
    check_node
    check_dependencies
    
    # 安装依赖
    install_backend_deps
    install_frontend_deps
    
    # 启动服务
    start_backend
    start_frontend
    
    # 等待服务启动
    wait_for_services
    
    # 显示状态
    show_status
}

# 运行主函数
main 