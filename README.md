# AI面试系统 - 智能面试解决方案

## 项目概述

AI面试系统是一个完整的智能面试解决方案，包含用户端Android应用、企业管理端、系统管理端和后端API服务。系统使用AI技术进行面试问题生成、语音合成、视频分析和职场素质评估。

## 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Android App   │    │  企业管理端      │    │  系统管理端      │
│   (用户端)       │    │  (Web端)        │    │  (Web端)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   后端API服务    │
                    │   (Node.js)     │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MySQL数据库    │    │   OSS对象存储    │    │   第三方AI服务   │
│                 │    │   (视频/音频)    │    │  DeepSeek+Azure │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 核心功能

### 🤖 Android用户端

#### 面试流程
1. **用户引导**
   - 首次登录引导
   - 权限申请（摄像头、麦克风、存储）
   - 隐私保护声明
   - 仪表仪容准备提示

2. **职位选择**
   - 预设职位选项（Java开发、产品经理、UI设计师等）
   - 自定义职位输入
   - 职位级别选择（初级/中级/高级/资深/专家）
   - 语音描述职位意向（可选）

3. **AI面试过程**
   - 类似微信视频通话的UI界面
   - 主屏幕显示用户自拍画面
   - 右上角Labubu数字人小窗口
   - 底部问题字幕显示
   - 实时语音驱动口型同步
   - 倒计时器和进度显示

4. **智能问题生成**
   - 基于DeepSeek大模型生成专业面试问题
   - 根据职位和级别定制化问题
   - Azure TTS语音合成
   - 6-8个问题，涵盖多个维度

5. **视频录制与上传**
   - 高清视频录制
   - 实时压缩和上传
   - OSS云存储
   - 断点续传支持

6. **面试恢复机制**
   - 检测未完成面试
   - 自动恢复到中断位置
   - 状态持久化

#### 简历管理
- **结构化简历创建**
- **视频简历录制**
- **简历文件上传解析**
- **AI简历分析**

#### 职场素质评估
- **多维度评分**：沟通表达、技术能力、领导力、问题解决、团队协作、适应能力
- **AI智能分析**：基于面试表现和简历信息
- **个性化建议**：针对性改进建议
- **报告可视化**：图表展示评估结果

### 🌐 企业管理端

#### 职位管理
- 发布招聘职位
- 设置面试要求
- 管理应聘者

#### 候选人管理
- 查看面试视频
- 评估报告查看
- 筛选和排序
- 面试邀约发送

#### 数据分析
- 招聘数据统计
- 候选人质量分析
- 面试效果评估

### ⚙️ 系统管理端

#### 用户管理
- 用户账户管理
- 权限控制
- 数据统计

#### 内容管理
- 面试问题模板
- 评估标准配置
- 系统参数设置

#### 数据监控
- 系统性能监控
- API调用统计
- 错误日志管理

## 技术栈

### 后端技术
- **运行环境**: Node.js + TypeScript
- **Web框架**: Express.js
- **数据库**: MySQL + Sequelize ORM
- **认证**: JWT Token
- **文件存储**: 阿里云OSS
- **AI服务**: 
  - DeepSeek API (问题生成、回答分析)
  - Azure Cognitive Services (TTS语音合成)

### 前端技术
- **Android开发**: Kotlin + Android Jetpack
- **相机录制**: CameraX
- **网络请求**: Retrofit + OkHttp
- **语音驱动**: 自研音频分析 + Canvas绘制
- **UI设计**: Material Design + 自定义组件

### 数据库设计

#### 核心数据表
```sql
-- 面试会话表
interview_sessions (id, userId, jobPosition, jobLevel, status, currentQuestionIndex, analysisStatus...)

-- 面试问题表  
interview_questions (id, sessionId, questionIndex, questionText, questionAudioUrl, timeLimit...)

-- 面试回答表
interview_answers (id, sessionId, questionId, videoUrl, transcription, analysisScore...)

-- 用户简历表
user_resumes (id, userId, resumeType, resumeData, videoUrl, analysisResult...)

-- 职场素质评估表
career_assessments (id, userId, sessionId, overallScore, communicationScore, technicalScore...)
```

## 部署指南

### 环境要求
- Node.js 16+
- MySQL 8.0+
- Redis (可选，用于缓存)
- 阿里云OSS账户
- DeepSeek API密钥
- Azure Cognitive Services密钥

### 后端部署

1. **克隆项目**
```bash
git clone <repository-url>
cd AI-Interview-System/backend
```

2. **安装依赖**
```bash
npm install
```

3. **环境配置**
```bash
cp .env.example .env
# 编辑.env文件，配置数据库和API密钥
```

4. **数据库初始化**
```bash
npm run db:migrate
npm run db:seed
```

5. **启动服务**
```bash
npm run dev  # 开发环境
npm start    # 生产环境
```

### Android应用构建

1. **环境准备**
- Android Studio 2022.3+
- Android SDK 33+
- Kotlin 1.8+

2. **项目配置**
```bash
cd android-app
# 在local.properties中配置API_BASE_URL
```

3. **构建应用**
```bash
./gradlew assembleDebug    # 调试版本
./gradlew assembleRelease  # 发布版本
```

### 生产环境部署

#### Docker部署
```bash
# 后端服务
docker-compose up -d

# 数据库备份
docker exec mysql mysqldump -u root -p ai_interview > backup.sql
```

#### Nginx配置
```nginx
server {
    listen 80;
    server_name api.aiinterview.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /uploads/ {
        alias /app/uploads/;
        expires 1y;
    }
}
```

## API文档

### 认证接口
```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
```

### 面试相关接口
```http
POST /api/interview/sessions              # 创建面试会话
GET  /api/interview/sessions/:id          # 获取面试状态
GET  /api/interview/sessions/:id/questions # 获取面试问题
POST /api/interview/sessions/:id/answers   # 提交回答
POST /api/interview/sessions/:id/complete  # 完成面试
GET  /api/interview/sessions/:id/report    # 获取评估报告
```

### 简历管理接口
```http
POST /api/resume/upload                   # 上传简历文件
POST /api/resume/video                    # 上传视频简历
GET  /api/resume/analysis                 # 获取简历分析
```

## 开发指南

### 代码规范
- TypeScript严格模式
- ESLint + Prettier格式化
- 统一的错误处理
- 详细的代码注释
- 单元测试覆盖

### 项目结构
```
backend/
├── src/
│   ├── controllers/     # 控制器
│   ├── models/         # 数据模型
│   ├── services/       # 业务服务
│   ├── routes/         # 路由配置
│   ├── middleware/     # 中间件
│   └── utils/          # 工具函数
├── tests/              # 测试文件
└── docs/               # API文档

android-app/
├── app/src/main/
│   ├── java/com/aiinterview/assistant/
│   │   ├── ui/         # UI组件
│   │   ├── data/       # 数据层
│   │   ├── network/    # 网络层
│   │   └── utils/      # 工具类
│   └── res/            # 资源文件
```

### 测试策略
- 单元测试：Jest + Supertest
- 集成测试：数据库操作测试
- Android测试：Espresso UI测试
- API测试：Postman集合

## 性能优化

### 后端优化
- 数据库查询优化
- Redis缓存策略
- 文件压缩和CDN
- API限流和熔断

### Android优化
- 图片压缩和缓存
- 网络请求优化
- 内存泄漏防护
- 电池使用优化

## 安全措施

### 数据安全
- JWT Token认证
- HTTPS传输加密
- 敏感数据加密存储
- SQL注入防护

### 隐私保护
- 视频文件自动删除
- 用户数据匿名化
- GDPR合规性
- 权限最小化原则

## 监控和日志

### 系统监控
- 服务器性能监控
- 数据库性能监控
- API响应时间监控
- 错误率统计

### 日志管理
- 结构化日志格式
- 日志级别分类
- 日志轮转策略
- 实时日志分析

## 常见问题

### Q: 语音合成失败怎么办？
A: 系统会自动降级到文本显示，不影响面试流程。

### Q: 视频上传失败如何处理？
A: 支持断点续传，网络恢复后自动重试。

### Q: 如何自定义面试问题？
A: 在系统管理端可以配置问题模板和评估标准。

### Q: 支持多语言吗？
A: 目前支持中文，后续版本将支持英文。

## 更新日志

### v1.0.0 (2024-01-XX)
- ✅ 完整的面试流程实现
- ✅ AI问题生成和语音合成
- ✅ 真实语音驱动口型同步
- ✅ 视频录制和分析
- ✅ 职场素质评估系统
- ✅ 企业和系统管理端

## 贡献指南

1. Fork项目
2. 创建特性分支
3. 提交代码变更
4. 推送到分支
5. 创建Pull Request

## 许可证

MIT License - 详见LICENSE文件

## 联系我们

- 项目地址：[GitHub Repository]
- 技术支持：support@aiinterview.com
- 商务合作：business@aiinterview.com

---

**AI面试系统 - 让面试更智能，让招聘更高效** 🚀 