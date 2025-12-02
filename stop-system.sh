#!/bin/bash

# AI面试系统停止脚本
# 安全停止所有服务

echo "🛑 停止AI面试系统..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 停止后端服务
stop_backend() {
    echo -e "${BLUE}停止后端服务...${NC}"
    
    if [ -f "backend-api/backend.pid" ]; then
        BACKEND_PID=$(cat backend-api/backend.pid)
        if ps -p $BACKEND_PID > /dev/null; then
            echo -e "${YELLOW}停止Flask服务 (PID: $BACKEND_PID)...${NC}"
            kill -TERM $BACKEND_PID
            
            # 等待进程结束
            for i in {1..10}; do
                if ! ps -p $BACKEND_PID > /dev/null; then
                    echo -e "${GREEN}✓ 后端服务已停止${NC}"
                    break
                fi
                sleep 1
            done
            
            # 如果进程仍在运行，强制终止
            if ps -p $BACKEND_PID > /dev/null; then
                echo -e "${YELLOW}强制终止后端服务...${NC}"
                kill -KILL $BACKEND_PID
            fi
        else
            echo -e "${YELLOW}后端服务进程不存在${NC}"
        fi
        
        # 删除PID文件
        rm -f backend-api/backend.pid
    else
        echo -e "${YELLOW}后端服务PID文件不存在${NC}"
    fi
}

# 停止前端服务
stop_frontend() {
    echo -e "${BLUE}停止前端服务...${NC}"
    
    # 停止admin-dashboard
    if [ -f "admin-dashboard/admin.pid" ]; then
        ADMIN_PID=$(cat admin-dashboard/admin.pid)
        if ps -p $ADMIN_PID > /dev/null; then
            echo -e "${YELLOW}停止admin-dashboard (PID: $ADMIN_PID)...${NC}"
            kill -TERM $ADMIN_PID
            rm -f admin-dashboard/admin.pid
        fi
    fi
    
    # 停止system-admin
    if [ -f "system-admin/system.pid" ]; then
        SYSTEM_PID=$(cat system-admin/system.pid)
        if ps -p $SYSTEM_PID > /dev/null; then
            echo -e "${YELLOW}停止system-admin (PID: $SYSTEM_PID)...${NC}"
            kill -TERM $SYSTEM_PID
            rm -f system-admin/system.pid
        fi
    fi
    
    # 等待前端服务停止
    sleep 3
    
    # 检查是否还有相关进程
    check_remaining_processes
}

# 检查剩余进程
check_remaining_processes() {
    echo -e "${BLUE}检查剩余进程...${NC}"
    
    # 查找可能的Node.js进程
    NODE_PIDS=$(ps aux | grep "npm run dev" | grep -v grep | awk '{print $2}')
    if [ ! -z "$NODE_PIDS" ]; then
        echo -e "${YELLOW}发现剩余Node.js进程，正在停止...${NC}"
        echo $NODE_PIDS | xargs kill -TERM
    fi
    
    # 查找可能的Python进程
    PYTHON_PIDS=$(ps aux | grep "python3 app.py" | grep -v grep | awk '{print $2}')
    if [ ! -z "$PYTHON_PIDS" ]; then
        echo -e "${YELLOW}发现剩余Python进程，正在停止...${NC}"
        echo $PYTHON_PIDS | xargs kill -TERM
    fi
}

# 清理端口占用
cleanup_ports() {
    echo -e "${BLUE}清理端口占用...${NC}"
    
    # 检查端口3001 (后端)
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}端口3001仍被占用，正在清理...${NC}"
        lsof -Pi :3001 -sTCP:LISTEN -t | xargs kill -KILL
    fi
    
    # 检查端口5174 (admin-dashboard)
    if lsof -Pi :5174 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}端口5174仍被占用，正在清理...${NC}"
        lsof -Pi :5174 -sTCP:LISTEN -t | xargs kill -KILL
    fi
    
    # 检查端口5175 (system-admin)
    if lsof -Pi :5175 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}端口5175仍被占用，正在清理...${NC}"
        lsof -Pi :5175 -sTCP:LISTEN -t | xargs kill -KILL
    fi
}

# 显示停止状态
show_stop_status() {
    echo -e "\n${GREEN}✅ AI面试系统已停止！${NC}"
    echo -e "\n${BLUE}服务状态:${NC}"
    echo -e "  ${RED}✗ 后端API服务: 已停止${NC}"
    echo -e "  ${RED}✗ 管理后台: 已停止${NC}"
    echo -e "  ${RED}✗ 系统管理: 已停止${NC}"
    echo -e "\n${YELLOW}重新启动: ./start-system.sh${NC}"
}

# 主函数
main() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}    AI面试系统停止脚本${NC}"
    echo -e "${BLUE}================================${NC}\n"
    
    # 停止服务
    stop_backend
    stop_frontend
    
    # 清理端口占用
    cleanup_ports
    
    # 显示状态
    show_stop_status
}

# 运行主函数
main 