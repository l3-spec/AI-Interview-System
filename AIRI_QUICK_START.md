# AIRI数字人项目 - 快速开始指南

## 🎯 项目概述

AIRI是一个**轻量级**的开源数字人项目，主要特点：

- ✅ **资源占用极低**：2GB内存 + 5GB磁盘空间即可运行
- ✅ **纯API驱动**：不运行本地AI模型，只调用第三方API
- ✅ **支持语音驱动**：完整的语音输入输出功能
- ✅ **易于部署**：一键部署脚本，5分钟即可运行
- ✅ **免费额度**：支持多种免费API服务

## 📊 真实硬件要求

### 🖥️ 本地部署（个人电脑）
```
最低配置：
- CPU: 2核（任何现代CPU）
- 内存: 2GB RAM
- 存储: 5GB 可用空间
- 网络: 稳定的互联网连接
- 浏览器: Chrome/Edge/Safari

推荐配置：
- CPU: 4核
- 内存: 4GB RAM
- 存储: 10GB 可用空间
- 网络: 50Mbps以上
```

### ☁️ 云服务器部署
```
最低配置：
- CPU: 1核 vCPU
- 内存: 2GB RAM
- 存储: 20GB SSD
- 带宽: 1Mbps

推荐配置：
- CPU: 2核 vCPU
- 内存: 4GB RAM
- 存储: 50GB SSD
- 带宽: 5Mbps
```

## 🚀 5分钟快速部署

### 步骤1: 下载部署脚本
```bash
# 给脚本执行权限
chmod +x deploy-airi-lightweight.sh

# 运行部署脚本
./deploy-airi-lightweight.sh
```

### 步骤2: 配置API密钥
编辑 `airi/.env` 文件，配置以下任一API服务：

#### 方案A: OpenAI GPT（推荐，免费额度$5/月）
```bash
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

#### 方案B: 阿里云DashScope（免费额度）
```bash
DASHSCOPE_API_KEY=sk-your-dashscope-api-key
DASHSCOPE_MODEL=qwen-turbo
```

#### 方案C: Azure Speech（免费额度）
```bash
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=eastasia
```

### 步骤3: 启动服务
```bash
# 启动AIRI服务
./start-airi.sh

# 或手动启动
cd airi
pnpm run dev
```

### 步骤4: 访问服务
打开浏览器访问：`http://localhost:3000`

## 🎤 语音驱动功能

### ✅ 支持的语音功能
1. **实时语音识别**：麦克风输入 → 文字转换
2. **语音合成**：文字 → 数字人语音输出
3. **实时对话**：完整的语音交互体验
4. **表情同步**：数字人表情随语音变化
5. **动作驱动**：数字人动作与对话同步

### 🔧 语音技术栈
- **语音识别**：Web Speech API + Azure Speech
- **语音合成**：Azure TTS + 阿里云TTS
- **实时通信**：WebRTC + WebSocket
- **数字人渲染**：Three.js + Live2D

## 📱 Android应用集成

### 1. 更新配置
编辑 `ai-interview-app/app/src/main/java/com/aiinterview/app/config/AIRIConfig.kt`：

```kotlin
object AIRIConfig {
    // 更新为您的AIRI服务地址
    const val AIRI_WEB_URL = "http://localhost:3000"  // 本地部署
    // const val AIRI_WEB_URL = "https://your-domain.com"  // 云服务器部署
}
```

### 2. 测试集成
```bash
cd ai-interview-app
chmod +x test_airi_integration.sh
./test_airi_integration.sh
```

## 💰 成本分析

### 免费额度（每月）
- **OpenAI GPT**: $5 免费额度
- **阿里云DashScope**: 免费调用次数
- **Azure Speech**: 免费语音服务
- **服务器费用**: 本地部署免费

### 付费使用（每月）
- **OpenAI GPT-4o**: $0.01/1K tokens
- **阿里云DashScope**: 按量付费
- **Azure Speech**: 按量付费
- **云服务器**: $10-50/月

## 🔍 功能测试

### 运行测试脚本
```bash
chmod +x test-airi-voice.sh
./test-airi-voice.sh
```

### 手动测试步骤
1. 访问 `http://localhost:3000`
2. 点击麦克风按钮开始语音输入
3. 说出测试语句："你好，我是测试用户"
4. 检查语音识别和合成效果
5. 进行完整的语音对话测试

## 🛠️ 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 查看端口占用
lsof -i :3000

# 修改端口
# 编辑 airi/.env 文件，修改 PORT=3001
```

#### 2. API调用失败
```bash
# 检查API密钥配置
cat airi/.env | grep API_KEY

# 测试API连接
curl -H "Authorization: Bearer your-api-key" \
     https://api.openai.com/v1/models
```

#### 3. 语音功能不工作
- 确保浏览器支持Web Speech API
- 检查麦克风权限设置
- 使用Chrome或Edge浏览器

#### 4. 内存不足
```bash
# 增加swap空间
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 📈 性能优化

### 1. 系统优化
```bash
# 优化Node.js内存
export NODE_OPTIONS="--max-old-space-size=2048"

# 清理缓存
pnpm store prune
```

### 2. 网络优化
- 使用CDN加速静态资源
- 配置HTTP/2支持
- 启用Gzip压缩

### 3. 缓存策略
- 启用浏览器缓存
- 配置API响应缓存
- 使用Redis缓存热点数据

## 🎯 总结

AIRI项目是一个**非常适合个人使用**的数字人解决方案：

### ✅ 优势
- **资源占用极低**：2GB内存即可运行
- **部署简单**：5分钟一键部署
- **功能完整**：支持语音对话、表情同步
- **成本可控**：大量免费额度可用
- **易于集成**：完美适配Android应用

### 🚀 推荐使用场景
1. **个人学习**：了解数字人技术
2. **项目演示**：快速搭建演示环境
3. **开发测试**：Android应用集成测试
4. **小规模应用**：个人或小团队使用

### 📞 技术支持
- 项目文档：https://github.com/moeru-ai/airi
- 问题反馈：GitHub Issues
- 社区讨论：GitHub Discussions

**立即开始体验AIRI数字人项目，享受AI面试的乐趣！** 🎉
