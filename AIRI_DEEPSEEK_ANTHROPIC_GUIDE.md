# AIRI项目 - DeepSeek & Anthropic API配置指南

## 🎯 支持的AI模型

AIRI项目支持多种AI模型，包括：

1. **OpenAI GPT** - 最常用
2. **DeepSeek** - 国内用户友好
3. **Anthropic Claude** - 高质量对话
4. **阿里云DashScope** - 国内服务

## 1️⃣ DeepSeek API配置

### 获取DeepSeek API密钥

#### 步骤1: 注册账号
1. **访问官网**：https://platform.deepseek.com/
2. **注册账号**：使用邮箱注册DeepSeek账号
3. **验证邮箱**：完成邮箱验证

#### 步骤2: 创建API密钥
1. **登录控制台**：https://platform.deepseek.com/api_keys
2. **创建密钥**：
   - 点击"Create API Key"
   - 输入密钥名称（如"airi-project"）
   - 复制生成的密钥（以`sk-`开头）

#### 步骤3: 查看免费额度
- **免费额度**：每月免费调用次数
- **付费价格**：按使用量计费

### DeepSeek配置格式

在`.env`文件中添加：

```bash
# DeepSeek配置
DEEPSEEK_API_KEY=<your-deepseek-api-key>
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

### 完整DeepSeek配置示例

```bash
# 基础配置
NODE_ENV=development
PORT=3000
HOST=localhost
DATABASE_URL=file:./data.db

# DeepSeek配置
DEEPSEEK_API_KEY=<your-deepseek-api-key>
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# 安全配置
JWT_SECRET=my-super-secret-jwt-key-123456789
CORS_ORIGIN=http://localhost:3000

# 数字人配置
CHARACTER_ID=interviewer
CHARACTER_NAME=AI面试官
CHARACTER_PERSONALITY=professional
```

## 2️⃣ Anthropic Claude API配置

### 获取Anthropic API密钥

#### 步骤1: 注册账号
1. **访问控制台**：https://console.anthropic.com/
2. **注册账号**：使用邮箱注册Anthropic账号
3. **验证邮箱**：完成邮箱验证

#### 步骤2: 创建API密钥
1. **登录控制台**：https://console.anthropic.com/
2. **创建密钥**：
   - 点击"Create Key"
   - 输入密钥名称（如"airi-project"）
   - 复制生成的密钥（以`sk-ant-`开头）

#### 步骤3: 查看免费额度
- **免费额度**：每月免费调用次数
- **付费价格**：按使用量计费

### Anthropic配置格式

在`.env`文件中添加：

```bash
# Anthropic Claude配置
ANTHROPIC_API_KEY=<your-anthropic-api-key>
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### 完整Anthropic配置示例

```bash
# 基础配置
NODE_ENV=development
PORT=3000
HOST=localhost
DATABASE_URL=file:./data.db

# Anthropic Claude配置
ANTHROPIC_API_KEY=<your-anthropic-api-key>
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# 安全配置
JWT_SECRET=my-super-secret-jwt-key-123456789
CORS_ORIGIN=http://localhost:3000

# 数字人配置
CHARACTER_ID=interviewer
CHARACTER_NAME=AI面试官
CHARACTER_PERSONALITY=professional
```

## 3️⃣ 多模型配置示例

### 同时配置多个模型

```bash
# 基础配置
NODE_ENV=development
PORT=3000
HOST=localhost
DATABASE_URL=file:./data.db

# 多个AI模型配置（选择一个作为默认）
# DeepSeek配置
DEEPSEEK_API_KEY=<your-deepseek-api-key>
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# Anthropic Claude配置
ANTHROPIC_API_KEY=<your-anthropic-api-key>
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# OpenAI配置（备选）
# OPENAI_API_KEY=sk-proj-your-openai-key-here
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_MODEL=gpt-4o-mini

# 默认使用的模型（取消注释选择）
DEFAULT_LLM_PROVIDER=deepseek
# DEFAULT_LLM_PROVIDER=anthropic
# DEFAULT_LLM_PROVIDER=openai

# 安全配置
JWT_SECRET=my-super-secret-jwt-key-123456789
CORS_ORIGIN=http://localhost:3000

# 数字人配置
CHARACTER_ID=interviewer
CHARACTER_NAME=AI面试官
CHARACTER_PERSONALITY=professional
```

## 🚀 快速配置步骤

### 步骤1: 获取API密钥

#### DeepSeek API密钥：
1. 访问：https://platform.deepseek.com/api_keys
2. 注册账号并创建API密钥
3. 复制密钥（以`sk-`开头）

#### Anthropic API密钥：
1. 访问：https://console.anthropic.com/
2. 注册账号并创建API密钥
3. 复制密钥（以`sk-ant-`开头）

### 步骤2: 创建配置文件

```bash
# 进入AIRI项目目录
cd airi

# 创建.env文件
cat > .env << 'EOF'
# 基础配置
NODE_ENV=development
PORT=3000
HOST=localhost
DATABASE_URL=file:./data.db

# DeepSeek配置
DEEPSEEK_API_KEY=<your-deepseek-api-key>
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# Anthropic Claude配置
ANTHROPIC_API_KEY=<your-anthropic-api-key>
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# 默认使用的模型
DEFAULT_LLM_PROVIDER=deepseek

# 安全配置
JWT_SECRET=my-super-secret-jwt-key-123456789
CORS_ORIGIN=http://localhost:3000

# 数字人配置
CHARACTER_ID=interviewer
CHARACTER_NAME=AI面试官
CHARACTER_PERSONALITY=professional
EOF
```

### 步骤3: 编辑配置文件

```bash
# 编辑.env文件
nano .env

# 将以下占位符替换为您的实际密钥：
# sk-your-deepseek-api-key-here → 您的DeepSeek密钥
# sk-ant-your-claude-api-key-here → 您的Anthropic密钥
```

### 步骤4: 启动服务

```bash
# 启动开发服务器
pnpm run dev

# 或使用npm
npm run dev
```

### 步骤5: 访问服务

打开浏览器访问：http://localhost:3000

## 💰 成本对比

### 免费额度：
- **DeepSeek**：每月免费调用次数
- **Anthropic Claude**：每月免费调用次数
- **OpenAI GPT**：$5/月免费额度

### 付费价格（每1K tokens）：
- **DeepSeek**：约$0.001-0.002
- **Anthropic Claude**：约$0.003-0.015
- **OpenAI GPT-4o**：约$0.01

## 🎯 推荐配置

### 国内用户推荐：
1. **主要模型**：DeepSeek（国内访问快）
2. **备选模型**：Anthropic Claude（高质量）
3. **语音服务**：浏览器原生语音（无需配置）

### 配置示例：
```bash
# 使用DeepSeek作为主要模型
DEEPSEEK_API_KEY=<your-deepseek-api-key>
DEFAULT_LLM_PROVIDER=deepseek

# 使用Anthropic作为备选
ANTHROPIC_API_KEY=<your-anthropic-api-key>
```

## 🔧 故障排除

### 问题1: API密钥无效
```bash
# 检查密钥格式
# DeepSeek密钥应该以sk-开头
# Anthropic密钥应该以sk-ant-开头
```

### 问题2: 网络连接问题
```bash
# DeepSeek和Anthropic在国内访问可能需要代理
# 确保网络连接正常
```

### 问题3: 模型切换
```bash
# 在.env文件中修改DEFAULT_LLM_PROVIDER
# 可选值：deepseek, anthropic, openai
```

## 📊 模型特点对比

| 特性 | DeepSeek | Anthropic Claude | OpenAI GPT |
|------|----------|------------------|------------|
| **中文支持** | ✅ 优秀 | ✅ 优秀 | ✅ 优秀 |
| **国内访问** | ✅ 快速 | ⚠️ 需要代理 | ⚠️ 需要代理 |
| **对话质量** | ✅ 高 | ✅ 很高 | ✅ 高 |
| **免费额度** | ✅ 有 | ✅ 有 | ✅ $5/月 |
| **价格** | ✅ 便宜 | ⚠️ 中等 | ⚠️ 较贵 |

## 🎉 总结

**推荐配置方案**：

1. **国内用户**：DeepSeek + 浏览器原生语音
2. **国际用户**：Anthropic Claude + 浏览器原生语音
3. **预算充足**：OpenAI GPT-4o + Azure Speech

**立即开始配置，享受AIRI数字人的乐趣！** 🚀
