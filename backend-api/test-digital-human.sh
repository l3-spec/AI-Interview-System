#!/bin/bash

echo "🧪 测试数字人对话接口..."
echo ""

# 测试对话接口
curl -X POST http://localhost:3001/api/digital-human/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-'$(date +%s)'",
    "text": "你好，我想应聘软件工程师",
    "userId": "test-user",
    "jobPosition": "软件工程师"
  }' | python3 -m json.tool 2>/dev/null || cat

echo ""
echo "✅ 测试完成！"
echo ""
echo "如果看到 audioUrl，说明接口正常！"
