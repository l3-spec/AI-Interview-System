#!/bin/bash

echo "🧪 测试AI面试系统各个服务..."

# 测试后端API服务
echo "📡 测试后端API服务 (localhost:3001)..."
response=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:3001/health)
if [ "$response" = "200" ]; then
    echo "✅ 后端API服务正常运行"
else
    echo "❌ 后端API服务异常 (HTTP: $response)"
fi

# 测试管理员登录API
echo "🔑 测试管理员登录API..."
login_response=$(curl -s -X POST http://localhost:3001/api/admin/login \
    -H "Content-Type: application/json" \
    -d '{"email":"superadmin@aiinterview.com","password":"superadmin123"}')

if echo "$login_response" | grep -q '"success":true'; then
    echo "✅ 管理员登录API正常"
else
    echo "❌ 管理员登录API异常"
    echo "响应: $login_response"
fi

# 测试企业登录API
echo "🏢 测试企业登录API..."
company_login_response=$(curl -s -X POST http://localhost:3001/api/auth/login/company \
    -H "Content-Type: application/json" \
    -d '{"email":"company@aiinterview.com","password":"company123456"}')

if echo "$company_login_response" | grep -q '"success":true'; then
    echo "✅ 企业登录API正常"
else
    echo "❌ 企业登录API异常"
    echo "响应: $company_login_response"
fi

# 检查前端服务
echo "🌐 检查前端服务..."

# 检查系统管理端
system_response=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:5175 2>/dev/null || echo "000")
if [ "$system_response" = "200" ]; then
    echo "✅ 系统管理端 (localhost:5175) 正常运行"
else
    echo "⚠️  系统管理端 (localhost:5175) 可能未启动"
fi

# 检查企业管理端
admin_response=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:5174 2>/dev/null || echo "000")
if [ "$admin_response" = "200" ]; then
    echo "✅ 企业管理端 (localhost:5174) 正常运行"
else
    echo "⚠️  企业管理端 (localhost:5174) 可能未启动"
fi

echo ""
echo "🎯 服务地址汇总:"
echo "   📊 系统管理端: http://localhost:5175"
echo "   🏢 企业管理端: http://localhost:5174"
echo "   🔧 后端API: http://localhost:3001"
echo "   📚 API文档: http://localhost:3001/api/docs"
echo ""
echo "🔐 测试账号:"
echo "   👑 超级管理员: superadmin@aiinterview.com / superadmin123"
echo "   🏢 测试企业: company@aiinterview.com / company123456"
echo "   👤 测试用户: user@aiinterview.com / user123456" 