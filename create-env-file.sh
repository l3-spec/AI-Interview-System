#!/bin/bash

# 创建AIRI项目的.env配置文件

echo "创建AIRI项目的.env配置文件..."

# 检查是否在AIRI项目目录
if [ ! -f "package.json" ]; then
    echo "错误: 请在AIRI项目根目录运行此脚本"
    echo "运行: cd airi && ../create-env-file.sh"
    exit 1
fi

# 创建.env文件
cat > .env << 'EOF'
# ========================================
# AIRI数字人项目环境配置
# ========================================

# 基础配置
NODE_ENV=development
PORT=3000
HOST=localhost

# 数据库配置（使用SQLite，无需额外安装）
DATABASE_URL=file:./data.db

# ========================================
# AI模型配置 - 选择一个或多个
# ========================================

# 方案1: OpenAI GPT（推荐，免费额度$5/月）
# 获取地址: https://platform.openai.com/api-keys
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# 方案2: DeepSeek（国内用户友好）
# 获取地址: https://platform.deepseek.com/api_keys
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# 方案3: Anthropic Claude（高质量对话）
# 获取地址: https://console.anthropic.com/
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# 方案4: 阿里云DashScope（国内服务）
# 获取地址: https://dashscope.console.aliyun.com/
DASHSCOPE_API_KEY=
DASHSCOPE_MODEL=qwen-turbo

# 默认使用的模型（取消注释选择）
# DEFAULT_LLM_PROVIDER=openai
# DEFAULT_LLM_PROVIDER=deepseek
# DEFAULT_LLM_PROVIDER=anthropic
# DEFAULT_LLM_PROVIDER=dashscope

# ========================================
# 语音服务配置 - 选择一个即可
# ========================================

# 方案1: Azure Speech Services（免费额度）
# 获取地址: https://portal.azure.com/
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=eastasia
AZURE_SPEECH_VOICE=zh-CN-XiaoxiaoNeural

# 方案2: 阿里云TTS（免费额度）
# 获取地址: https://ram.console.aliyun.com/
ALIYUN_TTS_ACCESS_KEY_ID=
ALIYUN_TTS_ACCESS_KEY_SECRET=
ALIYUN_TTS_VOICE=zh-CN-XiaoxiaoNeural

# 方案3: 使用浏览器原生语音API（推荐，无需配置）
# 如果使用浏览器原生语音，无需配置语音服务

# ========================================
# 文件存储配置（可选）
# ========================================

# 阿里云OSS（用于存储视频文件）
# 获取地址: https://ram.console.aliyun.com/
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET_NAME=

# ========================================
# 安全配置
# ========================================

# JWT密钥（用于用户认证，请修改为随机字符串）
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string

# CORS配置
CORS_ORIGIN=http://localhost:3000

# ========================================
# 数字人配置
# ========================================

# 数字人角色配置
CHARACTER_ID=interviewer
CHARACTER_NAME=AI面试官
CHARACTER_PERSONALITY=professional

# 面试配置
DEFAULT_QUESTION_TIME_LIMIT=60
MAX_QUESTIONS_PER_SESSION=8
INTERVIEW_CONTEXT=面试官

# ========================================
# 调试配置
# ========================================

# 日志级别
LOG_LEVEL=info

# 调试模式
DEBUG=false
EOF

echo "✅ .env文件创建完成！"
echo ""
echo "📝 接下来您需要："
echo ""
echo "1️⃣ 获取API密钥："
echo "   - OpenAI: https://platform.openai.com/api-keys"
echo "   - DeepSeek: https://platform.deepseek.com/api_keys"
echo "   - Anthropic: https://console.anthropic.com/"
echo "   - 阿里云DashScope: https://dashscope.console.aliyun.com/"
echo ""
echo "2️⃣ 编辑.env文件："
echo "   - 将对应的API密钥填入相应字段"
echo "   - 至少配置一个AI模型"
echo "   - 语音服务可选（推荐使用浏览器原生语音）"
echo ""
echo "3️⃣ 启动服务："
echo "   - 运行: pnpm run dev"
echo "   - 访问: http://localhost:3000"
echo ""
echo "💡 提示："
echo "- 如果不想配置语音API，可以使用浏览器原生语音（无需配置）"
echo "- 建议先配置一个AI模型进行测试"
echo "- 确保网络连接正常"
