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
