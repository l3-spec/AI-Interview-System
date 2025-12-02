# AIRI项目 - API密钥获取和配置指南

## 🎯 必需配置

您需要至少配置一个AI模型的API密钥才能使用AIRI项目。

## 1️⃣ OpenAI GPT（推荐，最简单）

### 获取步骤：
1. **访问官网**：https://platform.openai.com/api-keys
2. **注册账号**：使用邮箱注册OpenAI账号
3. **创建API密钥**：
   - 点击"Create new secret key"
   - 输入密钥名称（如"airi-project"）
   - 复制生成的密钥（以`sk-`开头）
4. **免费额度**：每月$5免费额度

### 配置格式：
```bash
OPENAI_API_KEY=sk-proj-your-actual-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

## 2️⃣ 阿里云DashScope（国内用户推荐）

### 获取步骤：
1. **访问控制台**：https://dashscope.console.aliyun.com/
2. **注册阿里云账号**：如果没有账号需要先注册
3. **开通DashScope服务**：
   - 搜索"DashScope"
   - 点击开通服务
4. **创建API密钥**：
   - 在控制台创建API密钥
   - 复制密钥（以`sk-`开头）
5. **免费额度**：每月免费调用次数

### 配置格式：
```bash
DASHSCOPE_API_KEY=sk-your-dashscope-key-here
DASHSCOPE_MODEL=qwen-turbo
```

## 3️⃣ Anthropic Claude（备选方案）

### 获取步骤：
1. **访问控制台**：https://console.anthropic.com/
2. **注册账号**：使用邮箱注册
3. **创建API密钥**：
   - 点击"Create Key"
   - 复制生成的密钥（以`sk-ant-`开头）
4. **免费额度**：每月免费调用次数

### 配置格式：
```bash
ANTHROPIC_API_KEY=<your-anthropic-api-key>
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

## 🎤 语音服务配置（可选）

### 方案1: 浏览器原生语音（推荐，无需配置）
- **无需任何API密钥**
- **使用浏览器内置语音功能**
- **支持Chrome、Edge、Safari**

### 方案2: Azure Speech Services

#### 获取步骤：
1. **访问Azure门户**：https://portal.azure.com/
2. **创建Azure账号**：如果没有账号需要先注册
3. **创建Speech Services资源**：
   - 搜索"Speech Services"
   - 点击"创建"
   - 选择订阅、资源组、区域
   - 输入资源名称
4. **获取密钥和区域**：
   - 在资源页面找到"密钥和终结点"
   - 复制密钥1和区域

#### 配置格式：
```bash
AZURE_SPEECH_KEY=your-azure-speech-key-here
AZURE_SPEECH_REGION=eastasia
AZURE_SPEECH_VOICE=zh-CN-XiaoxiaoNeural
```

### 方案3: 阿里云TTS

#### 获取步骤：
1. **访问RAM控制台**：https://ram.console.aliyun.com/
2. **创建AccessKey**：
   - 点击"创建AccessKey"
   - 选择"编程访问"
   - 复制AccessKey ID和Secret
3. **开通语音服务**：
   - 访问阿里云语音服务
   - 开通语音合成服务

#### 配置格式：
```bash
ALIYUN_TTS_ACCESS_KEY_ID=your-access-key-id-here
ALIYUN_TTS_ACCESS_KEY_SECRET=your-access-key-secret-here
ALIYUN_TTS_VOICE=zh-CN-XiaoxiaoNeural
```

## 📝 完整配置示例

### 最小配置（仅OpenAI）：
```bash
# 基础配置
NODE_ENV=development
PORT=3000
HOST=localhost
DATABASE_URL=file:./data.db

# OpenAI配置
OPENAI_API_KEY=sk-proj-your-actual-openai-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# 安全配置
JWT_SECRET=my-super-secret-jwt-key-123456789
CORS_ORIGIN=http://localhost:3000

# 数字人配置
CHARACTER_ID=interviewer
CHARACTER_NAME=AI面试官
CHARACTER_PERSONALITY=professional
```

### 完整配置（包含语音服务）：
```bash
# 基础配置
NODE_ENV=development
PORT=3000
HOST=localhost
DATABASE_URL=file:./data.db

# OpenAI配置
OPENAI_API_KEY=sk-proj-your-actual-openai-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Azure语音服务
AZURE_SPEECH_KEY=your-azure-speech-key-here
AZURE_SPEECH_REGION=eastasia
AZURE_SPEECH_VOICE=zh-CN-XiaoxiaoNeural

# 安全配置
JWT_SECRET=my-super-secret-jwt-key-123456789
CORS_ORIGIN=http://localhost:3000

# 数字人配置
CHARACTER_ID=interviewer
CHARACTER_NAME=AI面试官
CHARACTER_PERSONALITY=professional
```

## 🚀 快速配置步骤

### 步骤1: 创建配置文件
```bash
# 进入AIRI项目目录
cd airi

# 运行配置脚本
chmod +x ../create-airi-env.sh
../create-airi-env.sh
```

### 步骤2: 获取API密钥
1. 访问 https://platform.openai.com/api-keys
2. 注册账号并创建API密钥
3. 复制密钥（以`sk-`开头）

### 步骤3: 编辑配置文件
```bash
# 编辑.env文件
nano .env

# 将your_openai_api_key_here替换为您的实际密钥
OPENAI_API_KEY=sk-proj-your-actual-key-here
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

## 💰 成本分析

### 免费额度：
- **OpenAI GPT**: $5/月免费额度
- **阿里云DashScope**: 每月免费调用次数
- **Azure Speech**: 每月免费语音服务
- **Anthropic Claude**: 每月免费调用次数

### 付费使用（每月）：
- **OpenAI GPT-4o**: $0.01/1K tokens
- **阿里云DashScope**: 按量付费
- **Azure Speech**: 按量付费

## 🔧 故障排除

### 问题1: API密钥无效
```bash
# 检查密钥格式
# OpenAI密钥应该以sk-开头
# 阿里云密钥应该以sk-开头
# Anthropic密钥应该以sk-ant-开头
```

### 问题2: 网络连接问题
```bash
# 使用国内镜像（如果在中国大陆）
npm config set registry https://registry.npmmirror.com/
pnpm config set registry https://registry.npmmirror.com/
```

### 问题3: 权限问题
```bash
# 修复文件权限
chmod 600 .env
```

## 🎯 推荐配置

### 新手用户（推荐）：
1. **AI模型**: OpenAI GPT（最简单）
2. **语音服务**: 浏览器原生语音（无需配置）
3. **总成本**: $0（使用免费额度）

### 国内用户：
1. **AI模型**: 阿里云DashScope
2. **语音服务**: 阿里云TTS
3. **总成本**: $0（使用免费额度）

### 企业用户：
1. **AI模型**: OpenAI GPT-4o
2. **语音服务**: Azure Speech Services
3. **总成本**: 按使用量计费

## 📞 技术支持

如果遇到问题：
1. **查看日志**: `tail -f airi/logs/app.log`
2. **检查配置**: 确保API密钥格式正确
3. **网络测试**: 确保能访问API服务
4. **联系支持**: 在GitHub上提交Issue

**立即开始配置，享受AIRI数字人的乐趣！** 🎉
