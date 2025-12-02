#!/bin/bash

# AI面试系统第4项功能快速设置脚本
# 用于快速配置和启动AI面试功能

set -e  # 遇到错误时退出

echo "🚀 开始设置AI面试系统第4项功能..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查函数
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}错误: $1 未安装，请先安装 $1${NC}"
        exit 1
    fi
}

# 安装依赖包
install_dependencies() {
    echo -e "${BLUE}📦 安装依赖包...${NC}"
    
    # 检查package.json是否存在
    if [ ! -f "package.json" ]; then
        echo -e "${RED}错误: 请在backend-api目录下运行此脚本${NC}"
        exit 1
    fi
    
    # 安装依赖
    npm install
    
    echo -e "${GREEN}✅ 依赖包安装完成${NC}"
}

# 创建必要目录
create_directories() {
    echo -e "${BLUE}📁 创建必要目录...${NC}"
    
    mkdir -p uploads/audio
    mkdir -p uploads/videos
    mkdir -p logs
    
    # 设置权限
    chmod 755 uploads/audio
    chmod 755 uploads/videos
    chmod 755 logs
    
    echo -e "${GREEN}✅ 目录创建完成${NC}"
}

# 检查环境变量配置
check_env_config() {
    echo -e "${BLUE}🔧 检查环境变量配置...${NC}"
    
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️  .env 文件不存在，从示例文件复制...${NC}"
        cp env.example .env
        echo -e "${YELLOW}请编辑 .env 文件，配置以下必要参数:${NC}"
        echo "- DEEPSEEK_API_KEY"
        echo "- TTS_PROVIDER (推荐使用 'aliyun')"
        echo "- ALIYUN_TTS_ACCESS_KEY_ID (如果使用阿里云TTS)"
        echo "- ALIYUN_TTS_ACCESS_KEY_SECRET (如果使用阿里云TTS)"
        echo ""
        echo -e "${YELLOW}配置完成后请重新运行此脚本${NC}"
        exit 0
    fi
    
    # 检查关键配置
    source .env
    
    if [ -z "$DEEPSEEK_API_KEY" ]; then
        echo -e "${RED}❌ DEEPSEEK_API_KEY 未配置${NC}"
        echo "请在 .env 文件中配置 DEEPSEEK_API_KEY"
        exit 1
    fi
    
    if [ -z "$TTS_PROVIDER" ]; then
        echo -e "${YELLOW}⚠️  TTS_PROVIDER 未配置，使用默认值 'aliyun'${NC}"
        echo "TTS_PROVIDER=aliyun" >> .env
    fi
    
    echo -e "${GREEN}✅ 环境变量配置检查完成${NC}"
}

# 数据库设置
setup_database() {
    echo -e "${BLUE}🗄️  设置数据库...${NC}"
    
    # 生成Prisma客户端
    echo "生成Prisma客户端..."
    npm run prisma:generate
    
    # 执行数据库迁移
    echo "执行数据库迁移..."
    npm run prisma:migrate || {
        echo -e "${YELLOW}⚠️  数据库迁移失败，请检查数据库连接配置${NC}"
        echo "请确保DATABASE_URL配置正确并且数据库服务正在运行"
    }
    
    echo -e "${GREEN}✅ 数据库设置完成${NC}"
}

# 初始化职位模板数据
init_job_templates() {
    echo -e "${BLUE}📋 初始化职位模板数据...${NC}"
    
    if [ -f "prisma/seeds/jobTemplates.ts" ]; then
        npx ts-node prisma/seeds/jobTemplates.ts || {
            echo -e "${YELLOW}⚠️  职位模板初始化失败，将在服务启动时自动创建默认模板${NC}"
        }
    else
        echo -e "${YELLOW}⚠️  职位模板文件不存在，跳过初始化${NC}"
    fi
    
    echo -e "${GREEN}✅ 职位模板初始化完成${NC}"
}

# 测试服务连接
test_services() {
    echo -e "${BLUE}🧪 测试第三方服务连接...${NC}"
    
    # 测试Deepseek API
    echo "测试Deepseek API连接..."
    curl -s -X POST "https://api.deepseek.com/v1/chat/completions" \
        -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"hello"}],"max_tokens":10}' \
        > /dev/null && echo -e "${GREEN}✅ Deepseek API 连接正常${NC}" || echo -e "${YELLOW}⚠️  Deepseek API 连接失败，请检查API密钥${NC}"
    
    echo -e "${GREEN}✅ 服务连接测试完成${NC}"
}

# 构建项目
build_project() {
    echo -e "${BLUE}🏗️  构建项目...${NC}"
    
    npm run build || {
        echo -e "${YELLOW}⚠️  项目构建失败，将使用开发模式启动${NC}"
        return 1
    }
    
    echo -e "${GREEN}✅ 项目构建完成${NC}"
    return 0
}

# 启动服务
start_service() {
    echo -e "${BLUE}🚀 启动AI面试服务...${NC}"
    
    echo "启动模式选择:"
    echo "1. 开发模式 (npm run dev)"
    echo "2. 生产模式 (npm start)"
    read -p "请选择启动模式 [1]: " mode
    
    mode=${mode:-1}
    
    if [ "$mode" = "2" ]; then
        if build_project; then
            echo -e "${GREEN}使用生产模式启动...${NC}"
            npm start
        else
            echo -e "${YELLOW}构建失败，使用开发模式启动...${NC}"
            npm run dev
        fi
    else
        echo -e "${GREEN}使用开发模式启动...${NC}"
        npm run dev
    fi
}

# 显示使用说明
show_usage() {
    echo -e "${GREEN}🎉 AI面试系统第4项功能设置完成！${NC}"
    echo ""
    echo -e "${BLUE}📖 使用说明:${NC}"
    echo ""
    echo "1. API接口地址: http://localhost:3001/api/ai-interview"
    echo ""
    echo "2. 主要接口:"
    echo "   - POST /api/ai-interview/create-session    # 创建面试会话"
    echo "   - GET  /api/ai-interview/next-question/:id # 获取下一题"
    echo "   - POST /api/ai-interview/submit-answer     # 提交答案"
    echo "   - POST /api/ai-interview/test-tts          # 测试TTS"
    echo ""
    echo "3. 测试命令:"
    echo "   curl -X POST http://localhost:3001/api/ai-interview/test-tts \\"
    echo "     -H \"Content-Type: application/json\" \\"
    echo "     -H \"Authorization: Bearer YOUR_TOKEN\" \\"
    echo "     -d '{\"text\":\"您好，欢迎参加AI面试\"}'"
    echo ""
    echo "4. 文档地址: http://localhost:3001/api/docs"
    echo ""
    echo -e "${BLUE}💡 提示:${NC}"
    echo "- 确保已配置正确的API密钥"
    echo "- 生产环境部署前请阅读配置指南"
    echo "- 如遇问题请查看日志文件: logs/"
}

# 主函数
main() {
    echo -e "${GREEN}=== AI面试系统第4项功能设置 ===${NC}"
    echo ""
    
    # 检查必要工具
    check_command "node"
    check_command "npm"
    check_command "curl"
    
    # 执行设置步骤
    install_dependencies
    create_directories
    check_env_config
    setup_database
    init_job_templates
    test_services
    
    echo ""
    echo -e "${GREEN}🎯 设置完成！${NC}"
    echo ""
    
    # 询问是否启动服务
    read -p "是否现在启动服务？[y/N]: " start_now
    if [[ $start_now =~ ^[Yy]$ ]]; then
        start_service
    else
        show_usage
        echo ""
        echo "手动启动命令:"
        echo "  npm run dev    # 开发模式"
        echo "  npm start      # 生产模式"
    fi
}

# 检查参数
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "AI面试系统第4项功能设置脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --help, -h     显示帮助信息"
    echo "  --test-only    仅运行测试，不启动服务"
    echo ""
    exit 0
fi

if [ "$1" = "--test-only" ]; then
    check_env_config
    test_services
    exit 0
fi

# 运行主函数
main 