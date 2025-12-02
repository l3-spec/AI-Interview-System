# 🔑 API 服务开通完整指南

> 快速开通数字人系统所需的所有 API 服务

---

## 📋 必需服务清单

数字人系统需要以下服务（**至少选择一组配置**）：

| 服务类型 | 推荐方案 | 备选方案 | 说明 |
|---------|---------|---------|------|
| **LLM（必需）** | DeepSeek | - | 智能对话生成 |
| **ASR（选一）** | 火山引擎 | 声网 Agora | 语音识别 |
| **TTS（选一）** | 阿里云 | Azure | 语音合成 |

---

## 🚀 推荐配置方案

### 方案一：全国产方案（推荐）

```bash
✓ LLM: DeepSeek（中国）
✓ ASR: 火山引擎（中国）
✓ TTS: 阿里云（中国）

优点：
- 服务稳定，国内访问快
- 价格相对便宜
- 中文支持好
```

### 方案二：国际混合方案

```bash
✓ LLM: DeepSeek（中国）
✓ ASR: 声网 Agora（国际）
✓ TTS: Azure（国际）

优点：
- 服务质量高
- 全球覆盖
```

---

## 1️⃣ DeepSeek AI（必需）

### 服务说明
- **功能**: 智能对话生成（面试官回复）
- **官网**: https://platform.deepseek.com/
- **费用**: 按 Token 计费，约 ¥0.001/1K tokens
- **免费额度**: 新用户通常有免费试用额度

### 开通步骤

#### Step 1: 注册账号
1. 访问：https://platform.deepseek.com/
2. 点击右上角"注册"
3. 使用手机号或邮箱注册
4. 完成实名认证

#### Step 2: 创建 API Key
1. 登录后进入控制台
2. 点击左侧菜单"API Keys"
3. 点击"创建新的 API Key"
4. 输入名称（例如：AI面试系统）
5. **复制并保存 API Key**（只显示一次！）

#### Step 3: 充值（可选）
1. 点击"账户余额" → "充值"
2. 推荐充值：¥20-50（够用很久）
3. 支持支付宝/微信支付

### 配置示例

```bash
# DeepSeek 配置
DEEPSEEK_API_KEY="<your-deepseek-api-key>"
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

### 验证配置

```bash
# 测试 API 连接
curl -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer sk-your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

---

## 2️⃣ 火山引擎 ASR（推荐）

### 服务说明
- **功能**: 实时语音识别（用户说话转文字）
- **官网**: https://console.volcengine.com/
- **费用**: 按时长计费，约 ¥0.02/分钟
- **免费额度**: 新用户有 3000 分钟免费额度

### 开通步骤

#### Step 1: 注册账号
1. 访问：https://console.volcengine.com/
2. 点击"注册"
3. 使用手机号注册
4. 完成实名认证（必需）

#### Step 2: 开通语音识别服务
1. 登录控制台
2. 搜索"语音技术" 或访问：https://console.volcengine.com/speech
3. 点击"语音识别" → "立即开通"
4. 同意服务协议，完成开通

#### Step 3: 创建应用
1. 进入"语音识别"控制台
2. 点击"应用管理" → "创建应用"
3. 填写信息：
   - 应用名称：AI面试系统
   - 应用类型：通用
   - 场景：对话
4. 创建成功后，记录 **App ID**

#### Step 4: 获取访问密钥
1. 点击右上角头像 → "密钥管理"
2. 点击"新建密钥"
3. 记录：
   - **Access Key ID**
   - **Secret Access Key**

### 配置示例

```bash
# 火山引擎 ASR 配置
VOLC_APP_ID=1234567890
VOLC_ACCESS_KEY=AKLTxxxxxxxxxxxxxxxx
VOLC_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 开通地址
- 控制台：https://console.volcengine.com/speech
- 文档：https://www.volcengine.com/docs/6561/79817

---

## 3️⃣ 阿里云 TTS（推荐）

### 服务说明
- **功能**: 语音合成（数字人说话）
- **官网**: https://www.aliyun.com/
- **费用**: 按字符计费，约 ¥0.00125/字符
- **免费额度**: 新用户有 100 万字符免费额度

### 开通步骤

#### Step 1: 注册阿里云账号
1. 访问：https://www.aliyun.com/
2. 点击"免费注册"
3. 使用手机号或邮箱注册
4. 完成实名认证（个人或企业）

#### Step 2: 开通智能语音交互服务
1. 登录阿里云控制台
2. 搜索"智能语音交互" 或访问：https://nls-portal.console.aliyun.com/
3. 点击"立即开通"
4. 选择"按量付费"
5. 同意服务协议，完成开通

#### Step 3: 创建项目
1. 进入智能语音交互控制台
2. 点击"项目管理" → "创建项目"
3. 填写信息：
   - 项目名称：AI面试系统
   - 项目类型：语音合成
4. 创建成功后，记录 **AppKey**

#### Step 4: 获取访问密钥
1. 点击右上角头像 → "AccessKey 管理"
2. 创建 AccessKey（建议使用子账户）
3. 记录：
   - **AccessKey ID**
   - **AccessKey Secret**

### 配置示例

```bash
# 阿里云 TTS 配置
ALIYUN_ACCESS_KEY_ID=LTAI5txxxxxxxxxxxxxxxxxx
ALIYUN_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ALIYUN_TTS_APP_KEY=xxxxxxxxxxxxxxxx

# TTS 音色配置（可选）
ALIYUN_TTS_VOICE=siqi        # 思琪（女声，推荐）
# 其他音色: xiaoyun(小云), xiaogang(小刚), ruoxi(若兮)
ALIYUN_TTS_FORMAT=mp3
ALIYUN_TTS_SAMPLE_RATE=16000
```

### 开通地址
- 控制台：https://nls-portal.console.aliyun.com/
- 文档：https://help.aliyun.com/document_detail/84435.html

---

## 备选方案

### 4️⃣ 声网 Agora ASR（备选）

#### 服务说明
- **功能**: 实时语音识别
- **官网**: https://www.agora.io/cn/
- **费用**: 按时长计费
- **免费额度**: 新用户有 10,000 分钟

#### 开通步骤
1. 访问：https://console.agora.io/
2. 注册并登录
3. 创建项目 → 启用"实时语音转文字"
4. 获取 App ID、API Key、API Secret

#### 配置示例
```bash
# 声网 ASR 配置
AGORA_APP_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AGORA_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AGORA_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 5️⃣ Azure TTS（备选）

#### 服务说明
- **功能**: 语音合成
- **官网**: https://azure.microsoft.com/
- **费用**: 按字符计费
- **免费额度**: 每月 50 万字符免费

#### 开通步骤
1. 访问：https://portal.azure.com/
2. 注册 Azure 账号（需要国际信用卡）
3. 创建"语音服务"资源
4. 获取密钥和区域

#### 配置示例
```bash
# Azure TTS 配置
AZURE_SPEECH_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZURE_SPEECH_REGION=eastasia
AZURE_TTS_VOICE=zh-CN-XiaoxiaoNeural  # 晓晓（女声）
```

---

## 📝 完整配置文件

创建 `backend-api/.env` 文件：

### 推荐配置（全国产）

```bash
# ============================================================================
# AI 数字人面试系统 - 环境配置
# ============================================================================

# Node 环境
NODE_ENV=development
PORT=3001

# ============================================================================
# DeepSeek AI（必需）
# ============================================================================
DEEPSEEK_API_KEY="<your-deepseek-api-key>"
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# ============================================================================
# 火山引擎 ASR（推荐）
# ============================================================================
VOLC_APP_ID=1234567890
VOLC_ACCESS_KEY=AKLTxxxxxxxxxxxxxxxx
VOLC_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================================================
# 阿里云 TTS（推荐）
# ============================================================================
ALIYUN_ACCESS_KEY_ID=LTAI5txxxxxxxxxxxxxxxxxx
ALIYUN_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ALIYUN_TTS_APP_KEY=xxxxxxxxxxxxxxxx
ALIYUN_TTS_VOICE=siqi
ALIYUN_TTS_FORMAT=mp3
ALIYUN_TTS_SAMPLE_RATE=16000

# ============================================================================
# 可选配置
# ============================================================================

# 数据库（可选）
# DATABASE_URL="postgresql://user:password@localhost:5432/ai_interview"

# 阿里云 OSS（可选）
# ALIYUN_OSS_REGION=oss-cn-beijing
# ALIYUN_OSS_BUCKET=your-bucket-name

# CORS 配置
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,http://localhost:8080
```

---

## 💰 费用估算

### 测试阶段（100次对话）

| 服务 | 用量 | 费用 | 说明 |
|------|------|------|------|
| DeepSeek | ~10万 tokens | ¥0.1 | 输入+输出 |
| 火山引擎 ASR | ~50 分钟 | ¥1.0 | 有免费额度 |
| 阿里云 TTS | ~5000 字符 | ¥6.25 | 有免费额度 |
| **总计** | - | **¥7.35** | 非常便宜！ |

### 生产环境（1000次对话/天）

| 服务 | 月用量 | 月费用 |
|------|--------|--------|
| DeepSeek | ~300万 tokens | ¥30 |
| 火山引擎 ASR | ~1500 分钟 | ¥30 |
| 阿里云 TTS | ~15万 字符 | ¥187.5 |
| **总计** | - | **¥247.5/月** |

---

## ✅ 配置验证

### 方法一：使用检查脚本

```bash
cd /Users/linxiong/Documents/dev/AI-Interview-System
./check-digital-human-config.sh
```

### 方法二：手动测试

```bash
# 1. 加载环境变量
cd backend-api
source .env

# 2. 验证 DeepSeek
echo "DeepSeek Key: ${DEEPSEEK_API_KEY:0:10}...${DEEPSEEK_API_KEY: -4}"

# 3. 验证火山引擎
echo "Volc App ID: $VOLC_APP_ID"
echo "Volc Access Key: ${VOLC_ACCESS_KEY:0:10}..."

# 4. 验证阿里云
echo "Aliyun Key ID: ${ALIYUN_ACCESS_KEY_ID:0:10}..."
echo "Aliyun TTS AppKey: ${ALIYUN_TTS_APP_KEY:0:8}..."
```

### 方法三：API 测试

#### 测试 DeepSeek
```bash
curl -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

成功返回示例：
```json
{
  "choices": [
    {
      "message": {
        "content": "你好！有什么我可以帮助你的吗？"
      }
    }
  ]
}
```

---

## 🔒 安全建议

### 1. 密钥管理
- ❌ **不要**将 `.env` 文件提交到 Git
- ✅ 使用 `.gitignore` 忽略 `.env`
- ✅ 在生产环境使用环境变量或密钥管理服务

### 2. 权限控制
- ✅ 使用子账户/RAM角色（阿里云）
- ✅ 最小权限原则
- ✅ 定期轮换密钥

### 3. 费用控制
- ✅ 设置费用预警
- ✅ 设置API调用限制
- ✅ 监控使用量

---

## 📞 支持联系方式

### DeepSeek
- 官网：https://platform.deepseek.com/
- 文档：https://platform.deepseek.com/api-docs/

### 火山引擎
- 控制台：https://console.volcengine.com/
- 文档：https://www.volcengine.com/docs/6561/79817
- 工单支持

### 阿里云
- 控制台：https://nls-portal.console.aliyun.com/
- 文档：https://help.aliyun.com/document_detail/84435.html
- 客服：95187

---

## 🎯 快速开始检查清单

配置完成后，按顺序检查：

- [ ] 1. 已注册所有必需服务账号
- [ ] 2. 已完成实名认证
- [ ] 3. 已创建 API Keys/应用
- [ ] 4. 已充值或有免费额度
- [ ] 5. 已创建 `backend-api/.env` 文件
- [ ] 6. 已填写所有必需的环境变量
- [ ] 7. 运行 `./check-digital-human-config.sh` 通过
- [ ] 8. 运行 `./start-digital-human-test.sh` 成功启动

---

## 🚀 下一步

配置完成后：

```bash
# 1. 检查配置
./check-digital-human-config.sh

# 2. 启动系统
./start-digital-human-test.sh

# 3. 打开浏览器
# 访问: http://localhost:3001/test/digital-human

# 4. 开始测试！
```

---

**🎉 配置完成后，你就可以开始与数字人进行实时语音沟通了！**

有任何问题，请参考《数字人沟通测试完整指南.md》或提交 Issue。

