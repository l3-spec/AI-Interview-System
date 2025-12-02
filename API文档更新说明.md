# 🎉 AI面试系统API文档完整更新

## 🆕 更新内容

已将原有的简单HTML页面升级为**功能完整的Swagger UI文档**，提供以下新功能：

### ✨ 新增功能

#### 1. **完整的Swagger UI界面**
- 📖 详细的接口说明和参数描述
- 🧪 可直接在页面中测试所有API
- 📋 丰富的请求示例和响应示例
- 🎨 美观的现代化界面

#### 2. **测试令牌生成器 🧪**
- **新接口**: `POST /api/auth/test-token`
- 无需注册即可生成测试JWT令牌
- 支持生成用户、企业、管理员三种类型的令牌
- 一键复制，快速设置认证

#### 3. **完整的认证文档 🔑**
- 详细的登录、注册接口说明
- 包含测试账号信息
- 清晰的使用步骤指导

#### 4. **AI面试核心功能文档 🤖**
- 详细的面试会话创建流程
- 问题获取和答案提交说明
- TTS语音测试功能
- 断点续传功能说明

## 🚀 使用方法

### 第一步：获取测试令牌
访问：http://localhost:3001/api/docs

1. 找到 **🧪 测试工具** 分组
2. 点击 `POST /api/auth/test-token`
3. 点击 "Try it out"
4. 选择用户类型（推荐选择 `user`）
5. 点击 "Execute"
6. **复制返回的token值**

### 第二步：设置认证
1. 点击页面右上角的 **🔒 Authorize** 按钮
2. 在弹窗中输入：`Bearer <刚复制的token>`
3. 点击 "Authorize"
4. 点击 "Close"

### 第三步：测试API接口
现在您可以测试所有需要认证的接口：

#### 测试创建AI面试会话
1. 找到 **🤖 AI面试系统** 分组
2. 点击 `POST /api/ai-interview/create-session`
3. 点击 "Try it out"
4. 使用预设示例或修改参数：
   ```json
   {
     "jobTarget": "Java开发工程师",
     "questionCount": 3
   }
   ```
5. 点击 "Execute"
6. 查看返回的面试问题和语音文件

#### 测试TTS语音服务
1. 点击 `POST /api/ai-interview/test-tts`
2. 测试文本转语音功能：
   ```json
   {
     "text": "您好，欢迎参加AI面试"
   }
   ```

## 💡 如果需要测试真实登录

**测试账号信息**：
- 用户登录：`user@aiinterview.com` / `12345678`
- 企业登录：`hr@techcorp.com` / `12345678`

## 📋 接口分组说明

### 🧪 测试工具
- `POST /api/auth/test-token` - 生成测试令牌（开发专用）

### 🔑 认证管理
- `POST /api/auth/login/user` - 用户登录
- `POST /api/auth/register/user` - 用户注册
- `POST /api/auth/login/company` - 企业登录
- `GET /api/auth/me` - 获取当前用户信息
- `GET /api/auth/verify` - 验证令牌有效性

### 🤖 AI面试系统（第4项功能）
- `POST /api/ai-interview/create-session` - 创建面试会话
- `GET /api/ai-interview/next-question/{sessionId}` - 获取下一题
- `POST /api/ai-interview/submit-answer` - 提交答案
- `POST /api/ai-interview/complete/{sessionId}` - 完成面试
- `GET /api/ai-interview/resume` - 恢复未完成面试
- `POST /api/ai-interview/test-tts` - 测试TTS语音
- `GET /api/ai-interview/supported-voices` - 获取支持的语音

## 💡 特色功能

### 1. **智能示例**
每个接口都提供多个实用示例：
- Java工程师面试示例
- 前端工程师面试示例
- 产品经理面试示例
- 最简参数测试示例

### 2. **详细说明**
- 接口功能详细描述
- 参数说明和约束
- 错误码说明
- 使用注意事项

### 3. **即时测试**
- 在线测试所有接口
- 实时查看请求和响应
- 自动格式化JSON
- 错误信息提示

### 4. **开发友好**
- 测试令牌快速生成
- 认证状态可视化
- 接口搜索功能
- 响应时间显示

## 🎯 测试建议

### 完整测试流程
1. **生成令牌** → 设置认证
2. **创建面试会话** → 获取sessionId
3. **获取问题** → 查看生成的问题和语音
4. **提交答案** → 模拟用户回答
5. **完成面试** → 结束面试流程

### 高级测试
- 测试不同职位的面试会话
- 测试TTS语音生成
- 测试断点续传功能
- 测试各种错误场景

## 🔧 技术特点

- **OpenAPI 3.0** 标准
- **JWT认证** 集成
- **响应式设计** 
- **多环境支持**（开发/生产）
- **自动参数验证**
- **实时API测试**

## 📞 支持

如有问题：
1. 查看接口的详细说明和示例
2. 检查认证设置是否正确
3. 查看控制台的错误信息
4. 参考简化启动指南进行配置

---

**🎉 现在您可以享受完整的API文档体验，直接在浏览器中测试所有AI面试功能！** 