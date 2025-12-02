#!/bin/bash

# 创建.env模板（不包含真实密钥）

echo "创建AIRI项目的.env配置文件（请自行填写API密钥）..."

# 检查是否在AIRI项目目录
if [ ! -f "package.json" ]; then
    echo "错误: 请在AIRI项目根目录运行此脚本"
    echo "运行: cd airi && ../create-airi-env-with-key.sh"
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
ANTHROPIC_API_KEY=<your-anthropic-api-key>
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# 方案4: 阿里云DashScope（国内服务）
# 获取地址: https://dashscope.console.aliyun.com/
DASHSCOPE_API_KEY=
DASHSCOPE_MODEL=qwen-turbo

# 默认使用的模型（取消注释选择）
# DEFAULT_LLM_PROVIDER=openai
# DEFAULT_LLM_PROVIDER=deepseek
DEFAULT_LLM_PROVIDER=anthropic
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
JWT_SECRET=airi-super-secret-jwt-key-2024-123456789

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
echo "🎉 配置信息："
echo "✅ 已生成.env模板，API密钥需手动填写"
echo "✅ 默认使用Anthropic Claude模型（可修改DEFAULT_LLM_PROVIDER）"
echo "✅ 语音服务使用浏览器原生语音（无需配置）"
echo "✅ JWT密钥已设置"
echo ""
echo "📝 下一步："
echo "1. 启动服务: pnpm run dev"
echo "2. 访问: http://localhost:3000"
echo "3. 开始体验AIRI数字人！"
echo ""
echo "💡 提示："
echo "- 如果启动失败，请检查依赖是否安装完成"
echo "- 确保网络连接正常"
echo "- 使用Chrome或Edge浏览器获得最佳体验"
