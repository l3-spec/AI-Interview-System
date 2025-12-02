# 🔊 TTS语音合成服务配置指南

## 📋 配置概述

目前系统支持三种TTS服务提供商，推荐使用阿里云TTS（性价比高，中文效果好）：

1. **阿里云TTS** (推荐) - 每月赠送10万字符，超出部分每千字符0.1元
2. **Azure TTS** (备用) - 每月赠送50万字符，超出部分每千字符0.016美元  
3. **百度TTS** (备用) - 每日赠送5万字符，QPS较低

## 🚀 推荐方案：阿里云TTS配置

### 第一步：开通阿里云TTS服务

1. 访问阿里云官网：https://www.aliyun.com/
2. 注册/登录阿里云账号
3. 进入产品页面：**智能语音交互** → **语音合成TTS**
4. 点击"立即开通"，选择按量付费模式
5. 完成实名认证（如未认证）

### 第二步：获取API密钥

1. 进入控制台：https://ram.console.aliyun.com/users
2. 创建RAM用户（子账号）：
   - 用户名：`ai-interview-tts`
   - 访问方式：勾选"编程访问"
   - 生成AccessKey ID和AccessKey Secret（重要：保存好！）

3. 为RAM用户授权：
   - 添加权限：`AliyunNlsFullAccess`（语音服务完全权限）

### 第三步：配置环境变量

在项目根目录的 `.env` 文件中添加：

\`\`\`bash
# TTS语音合成服务配置
TTS_PROVIDER=aliyun

# 阿里云TTS配置
ALIYUN_TTS_ACCESS_KEY_ID=你的AccessKey_ID
ALIYUN_TTS_ACCESS_KEY_SECRET=你的AccessKey_Secret  
ALIYUN_TTS_REGION=cn-shanghai
ALIYUN_TTS_VOICE=siqi
ALIYUN_TTS_FORMAT=mp3
ALIYUN_TTS_SAMPLE_RATE=16000
\`\`\`

### 第四步：验证配置

重启服务后，系统会自动检测配置并使用真实TTS服务。

## 🎵 语音选项配置

### 阿里云支持的语音（推荐）：

- **siqi** (思琪) - 女声，亲和力强，适合面试场景 ⭐
- **xiaoyun** (小云) - 女声，清晰自然
- **xiaogang** (小刚) - 男声，稳重专业
- **ruoxi** (若汐) - 女声，温和亲切
- **xiaowei** (小伟) - 男声，活力阳光

### Azure支持的语音：

- **zh-CN-XiaoxiaoNeural** - 女声，自然流畅
- **zh-CN-YunxiNeural** - 男声，成熟稳重
- **zh-CN-YunjianNeural** - 男声，专业权威

## 💰 费用预估

### 阿里云TTS费用：
- **免费额度**：每月10万字符
- **超出费用**：0.1元/千字符
- **预估使用**：
  - 每个面试问题约50字符
  - 每场面试5个问题 = 250字符
  - 1000场面试 = 25万字符/月
  - **月费用**：(250,000 - 100,000) × 0.1/1000 = **15元**

## 🔧 高级配置

### 自定义语音参数：

在代码中可以动态指定语音：

\`\`\`javascript
await ttsService.textToSpeech({
  text: "您的面试问题",
  voice: "siqi",  // 指定语音
  sessionId: "session-123"
});
\`\`\`

### 多提供商备用配置：

\`\`\`bash
# 主要服务商
TTS_PROVIDER=aliyun

# 备用服务商配置（当主服务不可用时自动切换）
AZURE_TTS_KEY=your_azure_key
AZURE_TTS_REGION=eastus

BAIDU_TTS_APP_ID=your_baidu_app_id
BAIDU_TTS_API_KEY=your_baidu_api_key
BAIDU_TTS_SECRET_KEY=your_baidu_secret_key
\`\`\`

## ⚠️ 注意事项

1. **密钥安全**：
   - 不要将密钥提交到代码仓库
   - 生产环境使用环境变量或密钥管理服务
   - 定期轮换密钥

2. **成本控制**：
   - 监控TTS使用量
   - 设置费用告警
   - 对异常使用设置限流

3. **音频缓存**：
   - 相同文本可以缓存音频文件
   - 减少重复调用TTS服务
   - 降低成本并提升响应速度

## 🚀 部署后验证

配置完成后，可以通过以下接口测试：

\`\`\`bash
POST /api/ai-interview/test-tts
{
  "text": "这是一个TTS测试，请验证语音合成是否正常工作。"
}
\`\`\`

如果配置正确，将返回真实的TTS音频文件！ 