# 🤖 AI解析服务配置指南

## 📋 配置概述

AI解析服务用于将用户的自然语言描述（如"我想面试阿里巴巴的Java开发工程师，我有3年经验"）智能转换为结构化的面试会话数据。

支持三种AI服务提供商：

1. **DeepSeek** (推荐) - 国产AI，中文理解强，性价比高
2. **OpenAI** (ChatGPT) - 国际主流，需要科学上网
3. **Azure OpenAI** - 微软提供，稳定可靠

## 🚀 推荐方案：DeepSeek配置

### 第一步：注册DeepSeek账号

1. 访问DeepSeek官网：https://platform.deepseek.com/
2. 注册账号并完成实名认证
3. 进入控制台：https://platform.deepseek.com/api_keys
4. 创建API密钥并复制保存

### 第二步：配置环境变量

在项目根目录的 `.env` 文件中添加：

\`\`\`bash
# AI解析服务配置
AI_PROVIDER=deepseek

# DeepSeek配置
DEEPSEEK_API_KEY=你的DeepSeek_API_Key
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
\`\`\`

### 第三步：验证配置

重启服务后，访问配置检查接口：

\`\`\`bash
GET /api/nlp/config-status
\`\`\`

如果配置正确，将返回：

\`\`\`json
{
  "success": true,
  "data": {
    "aiProvider": "deepseek",
    "isConfigured": true,
    "configDetails": {
      "provider": "DeepSeek",
      "apiUrl": "https://api.deepseek.com/v1/chat/completions",
      "model": "deepseek-chat"
    }
  },
  "message": "DeepSeek AI解析服务已配置"
}
\`\`\`

## 💰 费用预估

### DeepSeek费用（推荐）：
- **模型**：deepseek-chat
- **价格**：0.14元/M tokens（输入）+ 0.28元/M tokens（输出）
- **预估使用**：
  - 每次解析约使用200-500 tokens
  - 1000次解析约0.5M tokens
  - **月费用**：约0.2-0.5元

### OpenAI费用：
- **模型**：gpt-3.5-turbo
- **价格**：$0.0015/K tokens（输入）+ $0.002/K tokens（输出）
- **月费用**：约$1-2美元

### Azure OpenAI费用：
- **模型**：gpt-35-turbo
- **价格**：类似OpenAI，但计费更稳定
- **月费用**：约$1-2美元

## 🔧 替代方案配置

### OpenAI配置：

\`\`\`bash
# AI解析服务配置
AI_PROVIDER=openai

# OpenAI配置
OPENAI_API_KEY=你的OpenAI_API_Key
\`\`\`

### Azure OpenAI配置：

\`\`\`bash
# AI解析服务配置
AI_PROVIDER=azure

# Azure OpenAI配置
AZURE_OPENAI_API_KEY=你的Azure_OpenAI_API_Key
AZURE_OPENAI_ENDPOINT=https://你的资源名.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-35-turbo
\`\`\`

## 🧪 测试解析功能

### 1. 基础测试

\`\`\`bash
POST /api/nlp/test-parse
\`\`\`

将自动测试多个预设场景，验证解析功能是否正常。

### 2. 自定义测试

\`\`\`bash
POST /api/nlp/parse-job-description
{
  "userInput": "我想面试阿里巴巴的Java开发工程师，我有3年Java经验，熟悉Spring框架"
}
\`\`\`

期望返回：

\`\`\`json
{
  "success": true,
  "data": {
    "jobTarget": "Java开发工程师",
    "companyTarget": "阿里巴巴",
    "background": "3年Java开发经验，熟悉Spring框架",
    "questionCount": 8,
    "confidence": 0.95,
    "parsedElements": {
      "position": "Java开发工程师",
      "company": "阿里巴巴",
      "experience": "3年",
      "skills": ["Java", "Spring"],
      "seniority": "中级"
    }
  },
  "message": "解析成功 (置信度: 95%)"
}
\`\`\`

## 🛡️ 兜底机制

如果AI服务不可用，系统会自动使用**规则引擎**作为兜底方案：

- 基于关键词匹配进行解析
- 置信度较低（0.6左右）
- 确保基本功能可用

## 📊 使用示例

### 支持的输入格式：

1. **标准格式**：
   - "我想面试阿里巴巴的Java开发工程师，我有3年Java经验"
   - "应聘腾讯前端开发，会React和Vue，有2年工作经验"

2. **简化格式**：
   - "Java开发，3年经验"
   - "前端工程师，刚毕业"

3. **详细格式**：
   - "我是一名有5年Python后端开发经验的工程师，熟悉Django、Flask框架，使用过MySQL、Redis等数据库，希望能够应聘字节跳动的高级Python开发工程师职位"

### 返回的结构化数据：

\`\`\`json
{
  "jobTarget": "标准化职位名称",
  "companyTarget": "目标公司或公司类型",
  "background": "格式化的个人背景描述",
  "questionCount": 5-15,
  "confidence": 0.3-1.0,
  "parsedElements": {
    "position": "提取的职位",
    "company": "提取的公司",
    "experience": "工作年限",
    "skills": ["技能列表"],
    "seniority": "技能级别"
  }
}
\`\`\`

## 🔍 API接口说明

### 主要接口：

1. **解析用户描述**：`POST /api/nlp/parse-job-description`
2. **批量解析**：`POST /api/nlp/batch-parse`
3. **获取解析示例**：`GET /api/nlp/parse-examples`
4. **配置状态检查**：`GET /api/nlp/config-status`
5. **功能测试**：`POST /api/nlp/test-parse`
6. **支持关键词**：`GET /api/nlp/supported-keywords`

## ⚠️ 注意事项

1. **API密钥安全**：
   - 不要将密钥提交到代码仓库
   - 生产环境使用环境变量
   - 定期轮换密钥

2. **成本控制**：
   - 监控API调用量和费用
   - 设置费用告警
   - 合理设置超时时间

3. **错误处理**：
   - 网络超时处理
   - API限流处理
   - 兜底机制确保服务可用

4. **性能优化**：
   - 可以添加解析结果缓存
   - 批量处理减少API调用
   - 异步处理提升响应速度

## 🚀 部署建议

### 生产环境：
- 推荐使用DeepSeek（成本低，中文效果好）
- 配置Redis缓存减少重复解析
- 设置API调用监控和告警

### 测试环境：
- 可以只使用规则引擎，无需AI服务
- 适合功能测试和集成测试

### 开发环境：
- 建议配置AI服务进行完整测试
- 可以使用较小的token限制控制成本 