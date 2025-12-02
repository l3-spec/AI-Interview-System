# AI面试系统第4项功能配置指南

## 功能概述

第4项功能实现了以下核心能力：
1. **Deepseek大模型集成** - 根据职位意向智能生成面试问题
2. **TTS语音合成** - 将问题文本转换为语音包
3. **面试会话管理** - 完整的面试流程管理
4. **职位模板系统** - 支持不同职位的专业化问题生成

## 第三方服务配置

### 1. Deepseek 大模型配置

#### 获取 Deepseek API Key

1. 访问 [Deepseek 官网](https://platform.deepseek.com/)
2. 注册账号并完成实名认证
3. 进入控制台，创建API Key
4. 充值账户（建议先充值100元用于测试）

#### 配置环境变量

```bash
# Deepseek大模型配置
DEEPSEEK_API_KEY="<your-deepseek-api-key>"
DEEPSEEK_API_URL="https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL="deepseek-chat"
DEEPSEEK_MAX_TOKENS=2000
DEEPSEEK_TEMPERATURE=0.7
```

#### 费用说明
- Deepseek 按 token 计费，大约 0.002元/1000 token
- 每个面试问题生成大约消耗 500-1000 tokens
- 预计每次面试（5个问题）成本约 0.01-0.02元

### 2. TTS 语音服务配置

我们推荐使用阿里云TTS服务，同时提供 Azure 和百度云作为备选方案。

#### 方案A：阿里云 TTS（推荐）

##### 开通服务
1. 登录 [阿里云控制台](https://ecs.console.aliyun.com/)
2. 搜索"语音合成TTS"并开通服务
3. 创建 AccessKey（建议使用子账号）
4. 配置权限策略：`AliyunNlsFullAccess`

##### 配置环境变量
```bash
# 阿里云TTS配置
TTS_PROVIDER="aliyun"
ALIYUN_TTS_ACCESS_KEY_ID="LTAI5t8nxxxxxxxxxxxxxxxxx"
ALIYUN_TTS_ACCESS_KEY_SECRET="kGpKtxxxxxxxxxxxxxxxxxxxxxxxxxxx"
ALIYUN_TTS_REGION="cn-shanghai"
ALIYUN_TTS_VOICE="siqi"  # 可选：siqi, xiaoyun, xiaogang
ALIYUN_TTS_FORMAT="mp3"
ALIYUN_TTS_SAMPLE_RATE=16000
```

##### 费用说明
- 阿里云TTS按字符数计费
- 标准版：4元/万字符
- 每个面试问题约50-100字符
- 预计每次面试成本约 0.01-0.04元

##### 推荐语音类型
- **siqi（思琪）**: 成熟女声，适合正式面试
- **xiaoyun（小云）**: 温柔女声，适合友好面试
- **xiaogang（小刚）**: 成熟男声，适合技术面试

#### 方案B：Azure TTS（备选）

##### 开通服务
1. 访问 [Azure Portal](https://portal.azure.com/)
2. 创建"语音服务"资源
3. 获取密钥和区域信息

##### 配置环境变量
```bash
TTS_PROVIDER="azure"
AZURE_TTS_KEY="your-azure-tts-key"
AZURE_TTS_REGION="eastus"
AZURE_TTS_VOICE="zh-CN-XiaoxiaoNeural"
```

#### 方案C：百度 TTS（备选）

##### 开通服务
1. 访问 [百度智能云](https://cloud.baidu.com/)
2. 开通"语音技术"服务
3. 创建应用获取 API Key

##### 配置环境变量
```bash
TTS_PROVIDER="baidu"
BAIDU_TTS_APP_ID="your-app-id"
BAIDU_TTS_API_KEY="your-api-key"
BAIDU_TTS_SECRET_KEY="your-secret-key"
```

## 系统配置

### 1. 安装依赖

```bash
cd backend-api
npm install
```

新增的主要依赖包：
- `axios` - HTTP 客户端
- `@alicloud/nls-tts20190625` - 阿里云TTS SDK
- `microsoft-cognitiveservices-speech-sdk` - Azure TTS SDK
- `fs-extra` - 文件系统扩展
- `fluent-ffmpeg` - 音频处理（可选）

### 2. 数据库迁移

```bash
# 生成 Prisma 客户端
npm run prisma:generate

# 执行数据库迁移
npm run prisma:migrate

# 初始化职位模板数据
npx ts-node prisma/seeds/jobTemplates.ts
```

### 3. 创建必要目录

```bash
mkdir -p uploads/audio
mkdir -p uploads/videos
chmod 755 uploads/audio
chmod 755 uploads/videos
```

### 4. 环境变量完整配置

创建 `.env` 文件：

```bash
# 复制示例配置
cp env.example .env

# 编辑配置文件
nano .env
```

必要的配置项：
```bash
# 基础配置
NODE_ENV=development
PORT=3001
DATABASE_URL="mysql://username:password@localhost:3306/ai_interview_db"
JWT_SECRET="your-jwt-secret"

# Deepseek配置
DEEPSEEK_API_KEY="<your-deepseek-api-key>"

# TTS配置（选择其中一种）
TTS_PROVIDER="aliyun"
ALIYUN_TTS_ACCESS_KEY_ID="your-access-key-id"
ALIYUN_TTS_ACCESS_KEY_SECRET="your-access-key-secret"

# 文件上传配置
AUDIO_UPLOAD_DIR="uploads/audio"
VIDEO_UPLOAD_DIR="uploads/videos"
```

## API 接口使用

### 1. 创建面试会话

```bash
curl -X POST http://localhost:3001/api/ai-interview/create-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "jobTarget": "高级Java开发工程师",
    "companyTarget": "腾讯",
    "background": "5年Java开发经验，熟悉Spring框架",
    "questionCount": 5
  }'
```

### 2. 获取下一个问题

```bash
curl -X GET http://localhost:3001/api/ai-interview/next-question/{sessionId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. 提交答案

```bash
curl -X POST http://localhost:3001/api/ai-interview/submit-answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "sessionId": "session-uuid",
    "questionIndex": 0,
    "answerText": "用户的回答内容",
    "answerVideoUrl": "视频文件URL",
    "answerDuration": 120
  }'
```

### 4. 测试TTS服务

```bash
curl -X POST http://localhost:3001/api/ai-interview/test-tts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "text": "您好，欢迎参加AI面试"
  }'
```

## 功能特点

### 1. 智能问题生成
- 支持9个职位分类的专业模板
- 根据用户背景个性化生成问题
- 自动适配不同职位级别

### 2. 多语音提供商支持
- 阿里云TTS（推荐）
- Azure TTS（备选）
- 百度TTS（备选）
- 自动故障转移

### 3. 完整面试流程
- 会话创建和管理
- 问题逐一推送
- 答案收集和存储
- 面试进度跟踪
- 未完成面试恢复

### 4. 数据统计
- TTS使用量统计
- API调用记录
- 成本分析
- 性能监控

## 部署建议

### 1. 生产环境配置

```bash
# 生产环境变量
NODE_ENV=production
DEEPSEEK_API_KEY="生产环境API密钥"
TTS_PROVIDER="aliyun"
ALIYUN_TTS_ACCESS_KEY_ID="生产环境AccessKey"
ALIYUN_TTS_ACCESS_KEY_SECRET="生产环境Secret"
```

### 2. 安全建议
- 使用阿里云子账号配置最小权限
- 定期轮换API密钥
- 启用API调用监控和告警
- 配置防刷机制

### 3. 性能优化
- 启用Redis缓存常用问题模板
- 配置CDN加速音频文件访问
- 使用消息队列处理批量TTS转换
- 监控第三方API响应时间

## 故障排除

### 1. Deepseek API 常见问题

**问题**: API调用失败
```
解决方案:
1. 检查API密钥是否正确
2. 确认账户余额充足
3. 验证网络连接
4. 查看API限流设置
```

**问题**: 生成的问题质量不高
```
解决方案:
1. 优化职位模板的prompt
2. 增加用户背景信息的详细度
3. 调整temperature参数
4. 使用更高级的模型版本
```

### 2. TTS 服务常见问题

**问题**: 语音生成失败
```
解决方案:
1. 检查TTS服务商配置
2. 验证访问权限
3. 确认文本长度限制
4. 切换到备用TTS提供商
```

**问题**: 音频质量问题
```
解决方案:
1. 调整采样率设置
2. 选择更适合的语音类型
3. 优化文本内容格式
4. 使用专业语音模型
```

### 3. 系统性能问题

**问题**: 响应时间过长
```
解决方案:
1. 启用异步处理
2. 实现问题预生成
3. 优化数据库查询
4. 增加缓存层
```

## 监控和维护

### 1. 关键指标监控
- API调用成功率
- 平均响应时间
- 第三方服务可用性
- 音频文件生成成功率

### 2. 日志配置
```javascript
// 建议的日志配置
console.log('AI面试会话创建:', { sessionId, jobTarget, timestamp });
console.log('TTS转换:', { provider, textLength, duration, success });
console.log('Deepseek调用:', { model, tokens, cost, latency });
```

### 3. 告警设置
- API调用失败率超过5%
- 响应时间超过10秒
- 第三方服务费用异常
- 存储空间不足

## 成本估算

### 月度成本预估（1000次面试）

| 服务 | 用量 | 单价 | 月成本 |
|------|------|------|--------|
| Deepseek API | 5000次调用 | 0.02元/次 | 100元 |
| 阿里云TTS | 25万字符 | 4元/万字符 | 100元 |
| 存储费用 | 100GB音频 | 0.12元/GB | 12元 |
| **总计** | | | **约212元** |

### 成本优化建议
1. 缓存常用问题和语音
2. 压缩音频文件大小
3. 定期清理过期文件
4. 使用预付费套餐获得优惠

## 后续扩展

### 1. 功能增强
- 支持多语言面试
- 实时语音识别
- 智能打分系统
- 面试视频分析

### 2. 技术升级
- 集成更多TTS提供商
- 支持语音克隆技术
- 实现分布式处理
- 添加AI面试官对话

这个配置指南提供了完整的第4项功能实现方案，包括所有必要的第三方服务配置和使用说明。 