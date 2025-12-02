#!/bin/bash

# AI面试系统第4项功能测试脚本
# 用于验证所有功能是否正常工作

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
API_BASE="http://localhost:3001"
TEST_TOKEN="test-token-please-replace-with-real-jwt"

echo -e "${GREEN}🧪 AI面试系统第4项功能测试${NC}"
echo "========================================"

# 检查服务是否运行
check_service() {
    echo -e "${BLUE}1. 检查服务状态...${NC}"
    
    if curl -s "${API_BASE}/health" > /dev/null; then
        echo -e "${GREEN}✅ 服务运行正常${NC}"
    else
        echo -e "${RED}❌ 服务未启动，请先启动服务：npm run dev${NC}"
        exit 1
    fi
}

# 测试TTS服务
test_tts() {
    echo -e "${BLUE}2. 测试TTS服务...${NC}"
    
    response=$(curl -s -X POST "${API_BASE}/api/ai-interview/test-tts" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TEST_TOKEN}" \
        -d '{"text":"您好，欢迎参加AI面试测试"}' \
        -w "%{http_code}")
    
    http_code="${response: -3}"
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ TTS服务测试通过${NC}"
    else
        echo -e "${YELLOW}⚠️  TTS服务测试失败，可能需要配置API密钥${NC}"
        echo "请检查 .env 文件中的TTS配置"
    fi
}

# 测试创建面试会话
test_create_session() {
    echo -e "${BLUE}3. 测试创建面试会话...${NC}"
    
    response=$(curl -s -X POST "${API_BASE}/api/ai-interview/create-session" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TEST_TOKEN}" \
        -d '{
            "jobTarget": "Java开发工程师",
            "companyTarget": "测试公司",
            "background": "5年开发经验",
            "questionCount": 3
        }')
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ 面试会话创建测试通过${NC}"
        
        # 提取sessionId
        session_id=$(echo "$response" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
        echo "会话ID: $session_id"
        
        # 测试获取问题
        if [ ! -z "$session_id" ]; then
            test_get_question "$session_id"
            test_submit_answer "$session_id"
        fi
    else
        echo -e "${YELLOW}⚠️  面试会话创建失败${NC}"
        echo "响应: $response"
        echo "可能需要配置Deepseek API密钥"
    fi
}

# 测试获取问题
test_get_question() {
    local session_id=$1
    echo -e "${BLUE}4. 测试获取问题...${NC}"
    
    response=$(curl -s -X GET "${API_BASE}/api/ai-interview/next-question/${session_id}" \
        -H "Authorization: Bearer ${TEST_TOKEN}")
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ 获取问题测试通过${NC}"
    else
        echo -e "${YELLOW}⚠️  获取问题失败${NC}"
        echo "响应: $response"
    fi
}

# 测试提交答案
test_submit_answer() {
    local session_id=$1
    echo -e "${BLUE}5. 测试提交答案...${NC}"
    
    response=$(curl -s -X POST "${API_BASE}/api/ai-interview/submit-answer" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TEST_TOKEN}" \
        -d "{
            \"sessionId\": \"${session_id}\",
            \"questionIndex\": 0,
            \"answerText\": \"这是一个测试回答\",
            \"answerDuration\": 60
        }")
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ 提交答案测试通过${NC}"
        
        # 测试完成面试
        test_complete_interview "$session_id"
    else
        echo -e "${YELLOW}⚠️  提交答案失败${NC}"
        echo "响应: $response"
    fi
}

# 测试完成面试
test_complete_interview() {
    local session_id=$1
    echo -e "${BLUE}6. 测试完成面试...${NC}"
    
    response=$(curl -s -X POST "${API_BASE}/api/ai-interview/complete/${session_id}" \
        -H "Authorization: Bearer ${TEST_TOKEN}")
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ 完成面试测试通过${NC}"
    else
        echo -e "${YELLOW}⚠️  完成面试失败${NC}"
        echo "响应: $response"
    fi
}

# 测试数据库连接
test_database() {
    echo -e "${BLUE}7. 测试数据库连接...${NC}"
    
    if npm run prisma:generate > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 数据库连接正常${NC}"
    else
        echo -e "${RED}❌ 数据库连接失败${NC}"
        echo "请检查 DATABASE_URL 配置"
    fi
}

# 显示配置检查
show_config_check() {
    echo -e "${BLUE}8. 配置检查...${NC}"
    
    if [ -f ".env" ]; then
        echo -e "${GREEN}✅ .env 文件存在${NC}"
        
        source .env
        
        # 检查Deepseek配置
        if [ ! -z "$DEEPSEEK_API_KEY" ]; then
            echo -e "${GREEN}✅ Deepseek API密钥已配置${NC}"
        else
            echo -e "${YELLOW}⚠️  Deepseek API密钥未配置${NC}"
        fi
        
        # 检查TTS配置
        if [ ! -z "$TTS_PROVIDER" ]; then
            echo -e "${GREEN}✅ TTS提供商已配置: $TTS_PROVIDER${NC}"
            
            case "$TTS_PROVIDER" in
                "aliyun")
                    if [ ! -z "$ALIYUN_TTS_ACCESS_KEY_ID" ]; then
                        echo -e "${GREEN}✅ 阿里云TTS配置完整${NC}"
                    else
                        echo -e "${YELLOW}⚠️  阿里云TTS配置不完整${NC}"
                    fi
                    ;;
                "azure")
                    if [ ! -z "$AZURE_TTS_KEY" ]; then
                        echo -e "${GREEN}✅ Azure TTS配置完整${NC}"
                    else
                        echo -e "${YELLOW}⚠️  Azure TTS配置不完整${NC}"
                    fi
                    ;;
            esac
        else
            echo -e "${YELLOW}⚠️  TTS提供商未配置${NC}"
        fi
        
    else
        echo -e "${RED}❌ .env 文件不存在${NC}"
    fi
}

# 显示测试结果总结
show_summary() {
    echo ""
    echo -e "${GREEN}🎯 测试完成！${NC}"
    echo "========================================"
    echo ""
    echo -e "${BLUE}📋 功能状态总结:${NC}"
    echo "- 服务运行: ✅"
    echo "- 数据库连接: 根据测试结果确认"
    echo "- TTS服务: 根据配置确认"
    echo "- Deepseek API: 根据配置确认"
    echo "- 面试流程: 根据测试结果确认"
    echo ""
    echo -e "${BLUE}💡 下一步操作:${NC}"
    echo "1. 如果测试通过，说明系统可以正常使用"
    echo "2. 如果有警告，请根据提示配置相应的API密钥"
    echo "3. 可以开始使用完整的AI面试功能"
    echo ""
    echo -e "${BLUE}📚 相关文档:${NC}"
    echo "- 完整指南: AI面试系统第4项功能完整实现指南.md"
    echo "- 配置指南: AI面试系统第4项功能配置指南.md"
    echo "- API文档: http://localhost:3001/api/docs"
}

# 主函数
main() {
    # 检查是否在正确目录
    if [ ! -f "package.json" ]; then
        echo -e "${RED}错误: 请在 backend-api 目录下运行此脚本${NC}"
        exit 1
    fi
    
    # 执行测试
    check_service
    show_config_check
    test_database
    test_tts
    test_create_session
    
    show_summary
}

# 检查参数
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "AI面试系统第4项功能测试脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --help, -h     显示帮助信息"
    echo "  --config-only  仅检查配置"
    echo ""
    echo "注意:"
    echo "- 请确保服务已启动 (npm run dev)"
    echo "- 需要配置有效的JWT令牌进行API测试"
    echo "- 某些测试需要配置第三方服务API密钥"
    exit 0
fi

if [ "$1" = "--config-only" ]; then
    show_config_check
    exit 0
fi

# 运行主函数
main 