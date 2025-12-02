# 环境配置模板

## 创建配置文件

在 `backend-api` 目录下创建 `.env` 文件，并填写以下内容：

```bash
# ============================================================================
# 必需配置
# ============================================================================

# DeepSeek AI (必需)
DEEPSEEK_API_KEY=<your-deepseek-api-key>
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# ASR 服务 - 火山引擎（选择一个）
VOLC_APP_ID=your-volc-app-id
VOLC_ACCESS_KEY=your-volc-access-key
VOLC_SECRET_KEY=your-volc-secret-key
VOLC_CLUSTER=volcengine_streaming_common
VOLC_TTS_CLUSTER=volcano_tts
# 如果有专用资源ID，请按需填写
# VOLC_ASR_RESOURCE_ID=your-asr-resource-id
# VOLC_TTS_RESOURCE_ID=your-tts-resource-id

# TTS 服务 - 阿里云（选择一个）
ALIYUN_ACCESS_KEY_ID=your-aliyun-access-key-id
ALIYUN_ACCESS_KEY_SECRET=your-aliyun-access-key-secret
ALIYUN_TTS_APP_KEY=your-aliyun-tts-app-key

# ============================================================================
# 可选配置
# ============================================================================

# 数据库（可选）
# DATABASE_URL="postgresql://user:password@localhost:5432/ai_interview"

# OSS（可选）
# ALIYUN_OSS_REGION=oss-cn-beijing
# ALIYUN_OSS_BUCKET=your-bucket-name

# 其他
NODE_ENV=development
PORT=3001
```

## API 密钥获取

### 1. DeepSeek API Key
- 访问: https://platform.deepseek.com/
- 注册并创建 API Key
- 复制密钥到配置文件

### 2. 火山引擎 ASR
- 访问: https://console.volcengine.com/
- 开通"语音识别"服务
- 创建应用获取 App ID 和密钥

### 3. 阿里云 TTS
- 访问: https://nls-portal.console.aliyun.com/
- 开通"智能语音交互"服务
- 创建项目获取 Access Key

## 快速配置

```bash
# 1. 进入后端目录
cd backend-api

# 2. 创建配置文件
cat > .env << 'EOF'
DEEPSEEK_API_KEY=your-deepseek-key
VOLC_APP_ID=your-volc-app-id
VOLC_ACCESS_KEY=your-volc-access-key
VOLC_SECRET_KEY=your-volc-secret-key
VOLC_CLUSTER=volcengine_streaming_common
VOLC_TTS_CLUSTER=volcano_tts
ALIYUN_ACCESS_KEY_ID=your-aliyun-key-id
ALIYUN_ACCESS_KEY_SECRET=your-aliyun-key-secret
ALIYUN_TTS_APP_KEY=your-aliyun-tts-key
EOF

# 3. 编辑配置文件，填写实际的密钥
vi .env

# 4. 检查配置
cd ..
./check-digital-human-config.sh
```

## 配置验证

运行配置检查脚本：
```bash
./check-digital-human-config.sh
```

如果所有检查通过，即可启动系统：
```bash
./start-digital-human-test.sh
```

