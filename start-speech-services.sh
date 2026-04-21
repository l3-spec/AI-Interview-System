#!/bin/bash
# =============================================================================
# Qwen3 ASR/TTS 微服务启动脚本
# 启动独立的语音识别和语音合成微服务
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASR_DIR="$SCRIPT_DIR/asr-service"
TTS_DIR="$SCRIPT_DIR/tts-service"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Qwen3 ASR/TTS 微服务启动器${NC}"
echo -e "${BLUE}  双轨混合流式架构 (Dual-Track Hybrid)${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# 检查 DASHSCOPE_API_KEY
if [ -z "$DASHSCOPE_API_KEY" ]; then
  # 尝试从 backend-api/.env 读取
  if [ -f "$SCRIPT_DIR/backend-api/.env" ]; then
    DASHSCOPE_API_KEY=$(grep -E "^DASHSCOPE_API_KEY=" "$SCRIPT_DIR/backend-api/.env" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
    if [ -n "$DASHSCOPE_API_KEY" ]; then
      export DASHSCOPE_API_KEY
      echo -e "${GREEN}✅ 从 backend-api/.env 加载 DASHSCOPE_API_KEY${NC}"
    fi
  fi
fi

if [ -z "$DASHSCOPE_API_KEY" ]; then
  echo -e "${RED}❌ 未设置 DASHSCOPE_API_KEY 环境变量${NC}"
  echo -e "${YELLOW}   请在 backend-api/.env 或系统环境变量中配置 DASHSCOPE_API_KEY${NC}"
  exit 1
fi

# 安装依赖
install_deps() {
  local dir=$1
  local name=$2
  if [ ! -d "$dir/node_modules" ]; then
    echo -e "${YELLOW}📦 安装 $name 依赖...${NC}"
    cd "$dir" && npm install
    cd "$SCRIPT_DIR"
  fi
}

# 设置共享环境变量（如果 .env 不存在则从 backend-api/.env 继承）
setup_env() {
  local dir=$1
  if [ ! -f "$dir/.env" ] && [ -f "$SCRIPT_DIR/backend-api/.env" ]; then
    echo -e "${YELLOW}📋 为 $(basename $dir) 创建 .env（从 backend-api/.env 继承 DASHSCOPE_API_KEY）${NC}"
    cat > "$dir/.env" << EOF
# 从 backend-api/.env 继承的配置
DASHSCOPE_API_KEY=$DASHSCOPE_API_KEY
REDIS_URL=$(grep -E "^REDIS_URL=" "$SCRIPT_DIR/backend-api/.env" 2>/dev/null | cut -d'=' -f2 || echo "redis://localhost:6379")
EOF
  fi
}

# 安装依赖
install_deps "$ASR_DIR" "ASR Service"
install_deps "$TTS_DIR" "TTS Service"

# 设置环境
setup_env "$ASR_DIR"
setup_env "$TTS_DIR"

echo ""
echo -e "${GREEN}🚀 启动 ASR 微服务 (端口 3002)...${NC}"
cd "$ASR_DIR" && npm run dev &
ASR_PID=$!

echo -e "${GREEN}🚀 启动 TTS 微服务 (端口 3003)...${NC}"
cd "$TTS_DIR" && npm run dev &
TTS_PID=$!

cd "$SCRIPT_DIR"

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}  微服务已启动:${NC}"
echo -e "  🎙️ ASR: ws://localhost:3002/ws/asr (PID: $ASR_PID)"
echo -e "  🔊 TTS: ws://localhost:3003/ws/tts (PID: $TTS_PID)"
echo -e ""
echo -e "  健康检查:"
echo -e "    curl http://localhost:3002/health"
echo -e "    curl http://localhost:3003/health"
echo -e ""
echo -e "  客户端配置端点:"
echo -e "    GET http://localhost:3001/api/voice/qwen3-config"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止所有微服务${NC}"

# 等待子进程
wait
