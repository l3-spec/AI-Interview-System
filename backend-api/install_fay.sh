#!/bin/bash

# Fay数字人框架安装脚本
# 适用于AI面试系统集成

echo "🚀 开始安装Fay数字人框架..."

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Python版本
echo "📋 检查Python环境..."
python_version=$(python3 --version 2>/dev/null || echo "未找到")
if [[ $python_version == *"Python 3."* ]]; then
    echo -e "${GREEN}✅ Python 3已安装: $python_version${NC}"
else
    echo -e "${RED}❌ 需要Python 3${NC}"
    echo "请访问 https://www.python.org/downloads/ 安装Python 3"
    exit 1
fi

# 创建项目目录
PROJECT_DIR="$(pwd)/fay"
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠️ Fay目录已存在，将更新${NC}"
    cd "$PROJECT_DIR"
    git pull
else
    echo "📥 克隆Fay仓库..."
    git clone https://github.com/xszyou/Fay.git "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# 创建虚拟环境
echo "🐍 创建虚拟环境..."
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# source venv/Scripts/activate  # Windows

# 安装依赖
echo "📦 安装Python依赖..."
pip install --upgrade pip
pip install -r requirements.txt

# 检查系统依赖
echo "🔧 检查系统依赖..."

# 检查FFmpeg
if ! command -v ffmpeg >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ 未检测到FFmpeg，将安装...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update
        sudo apt-get install -y ffmpeg
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install ffmpeg
    elif [[ "$OSTYPE" == "msys" ]]; then
        echo "请手动安装FFmpeg: https://ffmpeg.org/download.html"
    fi
fi

# 安装额外依赖
echo "🔧 安装额外依赖..."
pip install flask flask-cors websockets requests

# 下载模型
echo "📥 下载必要模型..."
python tools/download_models.py || echo -e "${YELLOW}⚠️ 模型下载可能需要手动完成${NC}"

# 创建面试专用配置
echo "⚙️ 创建面试专用配置..."
cat > configs/interview.conf <<EOF
[SYSTEM]
mode = interview
port = 5001
host = 0.0.0.0

[LLM]
type = openai
api_key = your_openai_key_here
base_url = https://api.openai.com/v1
model = gpt-4o-mini
max_tokens = 512
temperature = 0.7

[TTS]
type = azure
voice = zh-CN-XiaoxiaoNeural
speed = 1.0

[ASR]
type = funasr
model = paraformer-zh
device = cpu

[DIGITAL_HUMAN]
type = metahuman_stream
character_path = ./characters/interviewer/
resolution = 720p
fps = 25

[INTERVIEW]
max_duration = 1800
auto_questions = true
allow_interruption = true
character_switch = true
EOF

# 创建角色目录
echo "🎭 设置数字人角色..."
mkdir -p characters/interviewer/{models,configs,voices}

# 创建启动脚本
cat > start_fay.sh <<'EOF'
#!/bin/bash
echo "🚀 启动Fay数字人服务..."
cd "$(dirname "$0")"
source venv/bin/activate
python main.py --config configs/interview.conf
EOF

chmod +x start_fay.sh

# 创建测试脚本
cat > test_fay.py <<'EOF'
#!/usr/bin/env python3
import requests
import json
import time

def test_fay():
    print("🧪 测试Fay服务...")
    
    try:
        # 测试健康检查
        response = requests.get("http://localhost:5001/health", timeout=5)
        if response.status_code == 200:
            print("✅ Fay服务正常运行")
        else:
            print("❌ Fay服务异常")
            return False
            
        # 测试角色列表
        response = requests.get("http://localhost:5001/characters")
        characters = response.json()
        print(f"✅ 可用角色: {len(characters)}个")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Fay服务未启动")
        return False

if __name__ == "__main__":
    test_fay()
EOF

chmod +x test_fay.py

# 创建Docker支持
cat > Dockerfile.fay <<'EOF'
FROM python:3.12-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    ffmpeg \
    portaudio19-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制项目文件
COPY . .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 暴露端口
EXPOSE 5001

# 启动命令
CMD ["python", "main.py", "--config", "configs/interview.conf"]
EOF

# 创建安装完成通知
echo -e "${GREEN}🎉 Fay安装完成！${NC}"
echo ""
echo "📋 后续步骤："
echo "1. 编辑 configs/interview.conf 配置API密钥"
echo "2. 运行 ./start_fay.sh 启动服务"
echo "3. 访问 http://localhost:5001 测试"
echo ""
echo "📁 安装位置: $PROJECT_DIR"
echo "🔧 配置文件: configs/interview.conf"
echo "🚀 启动脚本: ./start_fay.sh"
echo "🧪 测试脚本: ./test_fay.py"
echo ""
echo "💡 提示："
echo "- 需要OpenAI API密钥或Azure语音服务"
echo "- 首次启动会下载模型，需要稳定网络"
echo "- 支持Docker部署: docker build -f Dockerfile.fay -t fay-interview ."

# 保存环境信息
echo "$(date) - Fay安装完成" >> install.log
echo "Python: $(python3 --version)" >> install.log
echo "Path: $PROJECT_DIR" >> install.log

echo -e "${GREEN}✅ 安装脚本执行完毕！${NC}"

# 提供快速启动命令
echo ""
echo "🚀 快速启动："
echo "cd $PROJECT_DIR && ./start_fay.sh"