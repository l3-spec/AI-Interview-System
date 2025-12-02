# AI面试系统 - 完整项目说明书

## 📋 项目概述

AI面试系统是一个完整的智能面试解决方案，集成了数字人技术、AI语音交互、视频录制分析等先进功能。系统采用微服务架构，包含用户端Android应用、企业管理端、系统管理端和后端API服务，为企业和求职者提供专业的AI面试体验。

### 🎯 核心价值
- **智能化面试**：基于AI大模型的智能问题生成和回答分析
- **数字人交互**：集成AIRI数字人技术，提供真实的面试体验
- **全流程管理**：从职位发布到候选人评估的完整招聘流程
- **数据驱动决策**：丰富的统计分析和可视化报表

## 🏗️ 系统架构

### 整体架构图
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Android App   │    │  企业管理端      │    │  系统管理端      │
│   (用户端)       │    │  (Web端)        │    │  (Web端)        │
│   Kotlin+Jetpack│    │  React+TS+AntD  │    │  React+TS+AntD  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌───────────────────────────┐
                    │        Backend API        │
                    │   Node.js + TypeScript    │
                    │        Port: 3001         │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │      Database & Cache     │
                    │   MySQL + Redis + Prisma  │
                    └───────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  对旭云数字人    │    │  阿里云OSS存储   │    │   第三方AI服务   │
│   (语音交互)     │    │   (视频/音频)    │    │  DeepSeek+Azure │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 技术栈总览

| 组件 | 技术栈 | 端口 | 说明 |
|------|--------|------|------|
| **后端API** | Node.js + TypeScript + Express | 3001 | 核心业务逻辑和API服务 |
| **企业管理端** | React + TypeScript + Ant Design | 5174 | 企业用户管理界面 |
| **系统管理端** | React + TypeScript + Ant Design | 5175 | 系统管理员界面 |
| **Android应用** | Kotlin + Android Jetpack | - | 移动端用户应用 |
| **对旭云数字人** | Android SDK + WebRTC | - | 数字人交互服务 |
| **数据库** | MySQL + Prisma ORM | 3306 | 主数据库 |
| **缓存** | Redis | 6379 | 缓存和会话管理 |

## 📁 项目结构详解

### 根目录结构
```
AI-Interview-System/
├── 📁 backend-api/              # 后端API服务
├── 📁 admin-dashboard/          # 企业管理后台
├── 📁 system-admin/             # 系统管理后台
├── 📁 ai-interview-app/         # Android移动应用
├── 📁 backend/                  # 后端服务（Python版本）
├── 📁 android-app/              # Android应用（旧版）
├── 📁 logs/                     # 系统日志
├── 📁 pr/                       # 项目演示页面
├── 📄 docker-compose.yml        # Docker容器编排
├── 📄 package.json              # 根项目配置
├── 📄 README.md                 # 项目说明
└── 📄 *.sh                      # 各种启动脚本
```

### 后端API服务 (backend-api/)
```
backend-api/
├── 📁 src/
│   ├── 📁 controllers/          # 控制器层
│   │   ├── authController.ts    # 认证控制器
│   │   ├── interviewController.ts # 面试控制器
│   │   ├── avatar.controller.ts  # AIRI数字人控制器
│   │   ├── openSourceAvatarController.ts # 开源数字人控制器
│   │   └── ...
│   ├── 📁 models/               # 数据模型
│   ├── 📁 routes/               # 路由定义
│   │   ├── auth.ts              # 认证路由
│   │   ├── interview.ts         # 面试路由
│   │   ├── avatar.routes.ts       # 数字人管理路由
│   │   ├── openSourceAvatar.routes.ts # 开源数字人路由
│   │   └── ...
│   ├── 📁 services/             # 业务服务层
│   ├── 📁 middleware/           # 中间件
│   ├── 📁 utils/                # 工具函数
│   └── 📄 index.ts              # 应用入口
├── 📁 prisma/                   # 数据库模式
│   └── 📄 schema.prisma         # Prisma数据模型
├── 📄 package.json              # 依赖配置
├── 📄 tsconfig.json             # TypeScript配置
└── 📄 Dockerfile                # Docker配置
```

### 企业管理端 (admin-dashboard/)
```
admin-dashboard/
├── 📁 src/
│   ├── 📁 components/           # 通用组件
│   │   ├── 📁 Layout/           # 布局组件
│   │   ├── 📁 Dashboard/        # 仪表盘组件
│   │   └── ...
│   ├── 📁 pages/                # 页面组件
│   │   ├── Dashboard.tsx        # 仪表盘
│   │   ├── JobList.tsx          # 职位列表
│   │   ├── CandidateList.tsx    # 候选人列表
│   │   └── ...
│   ├── 📁 contexts/             # React上下文
│   ├── 📁 hooks/                # 自定义Hooks
│   ├── 📁 services/             # API服务
│   ├── 📁 types/                # TypeScript类型
│   └── 📄 App.tsx               # 应用入口
├── 📄 package.json              # 依赖配置
├── 📄 vite.config.ts            # Vite配置
└── 📄 tsconfig.json             # TypeScript配置
```

### Android应用 (ai-interview-app/)
```
ai-interview-app/
├── 📁 app/
│   ├── 📁 src/main/
│   │   ├── 📁 java/com/aiinterview/app/
│   │   │   ├── 📁 ui/           # UI层
│   │   │   │   ├── 📁 main/     # 主界面
│   │   │   │   ├── 📁 home/     # 首页
│   │   │   │   ├── 📁 jobs/     # 职位
│   │   │   │   ├── 📁 interview/ # 面试
│   │   │   │   ├── 📁 video/    # 视频通话
│   │   │   │   └── 📁 profile/  # 个人中心
│   │   │   ├── 📁 data/         # 数据层
│   │   │   ├── 📁 network/      # 网络层
│   │   │   └── 📁 utils/        # 工具类
│   │   ├── 📁 res/              # 资源文件
│   │   └── 📄 AndroidManifest.xml
│   └── 📄 build.gradle          # 构建配置
├── 📄 build.gradle              # 项目构建配置
└── 📄 settings.gradle           # 项目设置
```

## 🚀 快速开始

### 环境要求

#### 开发环境
- **Node.js**: >= 16.0.0
- **Python**: >= 3.8
- **MySQL**: >= 8.0
- **Redis**: >= 6.0
- **Android Studio**: >= 2022.3
- **JDK**: >= 8

#### 生产环境
- **服务器**: Ubuntu 20.04+ / CentOS 8+
- **内存**: >= 8GB RAM
- **存储**: >= 100GB SSD
- **网络**: 稳定的互联网连接

### 一键启动（推荐）

```bash
# 克隆项目
git clone <repository-url>
cd AI-Interview-System

# 一键启动所有服务
chmod +x start-system.sh
./start-system.sh
```

启动完成后访问：
- **企业管理端**: http://localhost:5174
- **系统管理端**: http://localhost:5175
- **后端API**: http://localhost:3001
- **对旭云数字人**: 集成在Android应用中

### 分步启动

#### 1. 启动后端服务
```bash
cd backend-api
npm install
npm run dev
```

#### 2. 启动企业管理端
```bash
cd admin-dashboard
npm install
npm run dev
```

#### 3. 启动系统管理端
```bash
cd system-admin
npm install
npm run dev
```

#### 4. 配置对旭云数字人服务
```bash
# 对旭云数字人服务已集成在Android应用中
# 无需单独启动服务
```

#### 5. 构建Android应用
```bash
cd ai-interview-app
./gradlew assembleDebug
```

## 🔧 详细配置指南

### 后端API配置

#### 环境变量配置 (.env)
```bash
# 数据库配置
DATABASE_URL="mysql://username:password@localhost:3306/ai_interview_db"

# JWT配置
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRE="7d"

# 服务器配置
PORT=3001
NODE_ENV="development"

# Redis配置
REDIS_URL="redis://localhost:6379"

# 邮件配置
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# 文件上传配置
UPLOAD_DIR="uploads"
MAX_FILE_SIZE=100MB

# AI服务配置
DEEPSEEK_API_KEY="your-deepseek-api-key"
AZURE_SPEECH_KEY="your-azure-speech-key"
AZURE_SPEECH_REGION="eastasia"

# 阿里云OSS配置
OSS_ACCESS_KEY_ID="your-oss-access-key-id"
OSS_ACCESS_KEY_SECRET="your-oss-access-key-secret"
OSS_ENDPOINT="oss-cn-hangzhou.aliyuncs.com"
OSS_BUCKET_NAME="your-bucket-name"
```

#### 数据库初始化
```bash
cd backend-api
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

### 前端配置

#### 企业管理端配置 (admin-dashboard/.env)
```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_UPLOAD_URL=http://localhost:3001/uploads
```

#### 系统管理端配置 (system-admin/.env)
```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_UPLOAD_URL=http://localhost:3001/uploads
```

### 对旭云数字人配置

#### Android应用配置 (ai-interview-app/app/build.gradle)
```gradle
dependencies {
    // 对旭云数字人SDK
    implementation fileTree(include: ['*.jar', '*.aar'], dir: 'libs')
    implementation 'org.eclipse.paho:org.eclipse.paho.client.mqttv3:1.2.5'
    implementation 'androidx.localbroadcastmanager:localbroadcastmanager:1.0.0'
    implementation "org.webrtc:google-webrtc:1.0.32006"
    implementation 'com.auth0:java-jwt:3.18.1'
}
```

#### 权限配置 (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />
```

#### 应用配置 (AppConfig.kt)
```kotlin
object AppConfig {
    val apiBaseUrl: String by lazy {
        val value = BuildConfig.API_BASE_URL.ifBlank { "http://10.0.2.2:3001/api/" }
        if (value.endsWith("/")) value else "$value/"
    }

    val airiWebUrl: String by lazy {
        BuildConfig.AIRI_WEB_URL.ifBlank { "http://10.0.2.2:3000/avatar" }
    }
}
```

### Android应用配置

#### 数字人面试 ViewModel (DigitalInterviewViewModel.kt)
```kotlin
class DigitalInterviewViewModel(
    application: Application,
    private val position: String,
    private val questionText: String,
    private val currentQuestion: Int,
    private val totalQuestions: Int,
    private val countdownSeconds: Int,
    private val airiWebUrl: String = AppConfig.airiWebUrl
) : AndroidViewModel(application) {
    // 构建AIRI URL，追加岗位、题目、题号等参数
}
```

## 🎯 核心功能详解

### 1. 用户端Android应用

#### 主要功能模块
- **首页**: 职业测评、用户分享、大咖分享
- **好工作**: 职位浏览和搜索
- **AI面试**: 核心功能，数字人面试体验
- **职场圈**: 用户分享平台
- **我的**: 个人中心和面试报告

#### 技术特性
- **架构**: MVVM + Repository模式
- **依赖注入**: Hilt
- **网络请求**: Retrofit + OkHttp
- **图片加载**: Glide
- **权限管理**: PermissionX
- **相机录制**: CameraX

### 2. 企业管理端

#### 核心功能
- **仪表盘**: 数据统计和可视化
- **职位管理**: 发布和管理招聘职位
- **候选人管理**: 查看和管理候选人信息
- **面试管理**: 面试流程和结果管理
- **数据报表**: 招聘数据分析和报告

#### 技术特性
- **UI框架**: Ant Design
- **状态管理**: Zustand
- **数据获取**: React Query
- **图表**: Recharts
- **路由**: React Router

### 3. 系统管理端

#### 核心功能
- **用户管理**: 系统用户和权限管理
- **企业管理**: 企业用户管理
- **系统配置**: 系统参数和配置管理
- **数据监控**: 系统性能和数据监控
- **日志管理**: 系统日志查看和分析

### 4. 后端API服务

#### 核心模块
- **认证模块**: JWT Token认证和权限控制
- **面试模块**: 面试流程管理和问题生成
- **数字人模块**: 数字人服务集成
- **文件管理**: 文件上传和OSS存储
- **数据分析**: 面试数据分析和统计

#### 技术特性
- **Web框架**: Express.js
- **ORM**: Prisma
- **认证**: JWT + bcrypt
- **文件上传**: Multer
- **API文档**: Swagger
- **缓存**: Redis

### 5. 对旭云数字人服务

#### 核心功能
### AIRI 数字人集成详解

#### 集成架构
```
Android 应用 (android-v0-compose)
    ↓ WebView (DigitalInterviewScreen)
AIRI Web 页面 (/avatar)
    ↓ AIRI 内部 WebSocket/LLM
数字人渲染与交互
```

#### 核心实现要点
1. **AIRI URL 构建** – `DigitalInterviewViewModel` 根据岗位、题目、题号等上下文拼接查询参数：
```kotlin
private fun buildAiriUrl(): String? {
    val uri = Uri.parse(AppConfig.airiWebUrl).buildUpon()
    uri.appendQueryParameter("position", position)
    uri.appendQueryParameter("question", questionText)
    uri.appendQueryParameter("currentQuestion", currentQuestion.toString())
    uri.appendQueryParameter("totalQuestions", totalQuestions.toString())
    uri.appendQueryParameter("countdownSeconds", countdownSeconds.toString())
    return uri.build().toString()
}
```

2. **WebView 托管** – `DigitalInterviewScreen` 使用 `AndroidView` 内嵌 `WebView`，并在 `retry` 时递增 `reloadKey` 触发重新加载。

3. **权限与预览** – CameraX 负责用户画面预览，数字人画面来自 AIRI 页面；双击可切换主画面与悬浮窗。

4. **管理后台嵌入** – `admin-dashboard` 通过 `<iframe>` 加载同一 `AIRI_WEB_URL`，并提供手动刷新与超时提示。

3. **多模态交互**
- **语音驱动**: 实时语音识别和数字人响应
- **文本驱动**: 文本输入转换为数字人语音
- **音频驱动**: 音频文件播放驱动数字人
- **问答驱动**: 智能问答交互

4. **视频渲染**
```kotlin
// 数字人视频渲染
override fun onVideoTrack(track: VideoTrack) {
    track.addSink(binding.render)
}
```

#### 权限和配置
- **麦克风权限**: 语音交互必需
- **相机权限**: 多模态交互支持
- **网络权限**: 云端服务连接
- **存储权限**: 音频文件缓存

#### 错误处理
```kotlin
override fun onError(msgType: Int, msgSubType: Int, msg: String?) {
    // 处理各种错误类型
    when (msgType) {
        1000 -> // 授权异常
        1001 -> // 会话创建异常
        1010 -> // IM连接失败
        1020 -> // RTC状态异常
        // ... 其他错误类型
    }
}
```

## 🗄️ 数据库设计

### 核心数据表

#### 用户相关表
```sql
-- 用户表
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    role ENUM('user', 'admin', 'company') NOT NULL,
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 企业表
CREATE TABLE companies (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    size ENUM('startup', 'small', 'medium', 'large', 'enterprise'),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 面试相关表
```sql
-- 面试会话表
CREATE TABLE interview_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    company_id VARCHAR(36),
    job_position VARCHAR(100) NOT NULL,
    job_level ENUM('junior', 'middle', 'senior', 'expert') NOT NULL,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    current_question_index INT DEFAULT 0,
    total_questions INT DEFAULT 8,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    analysis_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- 面试问题表
CREATE TABLE interview_questions (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    question_index INT NOT NULL,
    question_text TEXT NOT NULL,
    question_audio_url VARCHAR(500),
    question_type ENUM('technical', 'behavioral', 'situational', 'general') NOT NULL,
    time_limit INT DEFAULT 120,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
);

-- 面试回答表
CREATE TABLE interview_answers (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    question_id VARCHAR(36) NOT NULL,
    video_url VARCHAR(500),
    transcription TEXT,
    analysis_score DECIMAL(3,1),
    analysis_feedback TEXT,
    answer_duration INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES interview_sessions(id),
    FOREIGN KEY (question_id) REFERENCES interview_questions(id)
);
```

#### 评估相关表
```sql
-- 职场素质评估表
CREATE TABLE career_assessments (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    overall_score DECIMAL(3,1) NOT NULL,
    communication_score DECIMAL(3,1) NOT NULL,
    technical_score DECIMAL(3,1) NOT NULL,
    leadership_score DECIMAL(3,1) NOT NULL,
    problem_solving_score DECIMAL(3,1) NOT NULL,
    teamwork_score DECIMAL(3,1) NOT NULL,
    adaptability_score DECIMAL(3,1) NOT NULL,
    analysis_summary TEXT,
    improvement_suggestions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
);
```

## 🔐 认证和权限

### JWT Token结构
```json
{
  "user_id": "用户ID",
  "email": "用户邮箱",
  "role": "用户角色",
  "type": "token类型",
  "exp": "过期时间",
  "iat": "签发时间",
  "iss": "签发者",
  "aud": "接收者"
}
```

### 角色权限矩阵

| 功能 | 普通用户 | 企业用户 | 系统管理员 |
|------|----------|----------|------------|
| 创建面试 | ✅ | ❌ | ✅ |
| 查看面试结果 | ✅ | ✅ | ✅ |
| 管理职位 | ❌ | ✅ | ✅ |
| 管理候选人 | ❌ | ✅ | ✅ |
| 系统配置 | ❌ | ❌ | ✅ |
| 用户管理 | ❌ | ❌ | ✅ |

### 认证流程
1. 用户登录获取JWT Token
2. 后续请求在Header中携带 `Authorization: Bearer <token>`
3. 后端验证Token有效性和权限
4. Token过期时返回401状态码

## 📊 API接口文档

### 认证接口
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "用户名",
      "role": "user"
    }
  }
}
```

### 面试接口
```http
POST /api/interview/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobPosition": "Java开发工程师",
  "jobLevel": "middle"
}

Response:
{
  "success": true,
  "data": {
    "sessionId": "session-id",
    "questions": [
      {
        "id": "question-id",
        "text": "请介绍一下你的项目经验",
        "type": "technical",
        "timeLimit": 120
      }
    ]
  }
}
```

### 数字人接口（已废弃）

原火山引擎数字人接口已移除，客户端改为直接加载 AIRI Web 数字人页面，通过 URL 参数传递岗位与题目信息。如需接入新的数字人供应商，请在独立分支上重新集成。

## 🚀 部署指南

### Docker部署（推荐）

#### 1. 使用Docker Compose
```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 2. 服务配置
```yaml
# docker-compose.yml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword123
      MYSQL_DATABASE: ai_interview_db
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend-api:
    build: ./backend-api
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: "mysql://root:rootpassword123@mysql:3306/ai_interview_db"
      REDIS_URL: "redis://redis:6379"
    depends_on:
      - mysql
      - redis

  admin-dashboard:
    build: ./admin-dashboard
    ports:
      - "5174:80"
    depends_on:
      - backend-api
```

### 云服务器部署

#### 1. 阿里云ECS部署
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 克隆项目
git clone <repository-url>
cd AI-Interview-System

# 配置环境变量
cp .env.example .env
# 编辑.env文件配置数据库和API密钥

# 启动服务
docker-compose up -d
```

#### 2. Nginx反向代理配置
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 管理后台
    location /admin {
        proxy_pass http://localhost:5174;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # 系统管理
    location /system {
        proxy_pass http://localhost:5175;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # API服务
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # 对旭云数字人服务已集成在Android应用中
    # 无需配置反向代理
}
```

### Android应用发布

#### 1. 构建发布版本
```bash
cd ai-interview-app

# 生成签名密钥
keytool -genkey -v -keystore release-key.keystore -alias ai-interview -keyalg RSA -keysize 2048 -validity 10000

# 配置签名
# 在app/build.gradle中添加签名配置

# 构建发布版本
./gradlew assembleRelease
```

#### 2. 应用商店发布
- 准备应用图标和截图
- 编写应用描述
- 配置应用权限说明
- 提交到Google Play Store

## 🔍 测试指南

### 单元测试
```bash
# 后端API测试
cd backend-api
npm test

# 前端测试
cd admin-dashboard
npm test

# Android测试
cd ai-interview-app
./gradlew test
```

### 集成测试
```bash
# 面试流程测试
cd backend-api
npm run test:interview

# 数字人集成测试
npm run test:digital-human

# 完整系统测试
./test-services.sh
```

### 性能测试
```bash
# API性能测试
npm run test:load

# 数据库性能测试
npm run test:db
```

## 🛠️ 开发指南

### 代码规范
- **TypeScript**: 严格模式，统一类型定义
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Git Hooks**: 提交前自动检查

### 项目结构规范
```
src/
├── components/          # 通用组件
├── pages/              # 页面组件
├── hooks/              # 自定义Hooks
├── services/           # API服务
├── types/              # TypeScript类型
├── utils/              # 工具函数
└── constants/          # 常量定义
```

### Git工作流
```bash
# 创建功能分支
git checkout -b feature/new-feature

# 提交代码
git add .
git commit -m "feat: add new feature"

# 推送分支
git push origin feature/new-feature

# 创建Pull Request
```

### 代码审查清单
- [ ] 代码符合项目规范
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 没有引入安全漏洞
- [ ] 性能影响评估

## 🔒 安全配置

### 数据安全
- **HTTPS**: 强制使用HTTPS传输
- **JWT**: 安全的Token认证
- **密码加密**: bcrypt哈希加密
- **SQL注入防护**: Prisma ORM保护
- **XSS防护**: 输入验证和转义

### 隐私保护
- **数据最小化**: 只收集必要数据
- **数据加密**: 敏感数据加密存储
- **访问控制**: 基于角色的权限控制
- **审计日志**: 完整的操作日志记录

### 安全最佳实践
```bash
# 定期更新依赖
npm audit
npm audit fix

# 检查安全漏洞
npm run security-check

# 配置防火墙
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 📈 性能优化

### 后端优化
- **数据库优化**: 索引优化、查询优化
- **缓存策略**: Redis缓存热点数据
- **API限流**: 防止API滥用
- **连接池**: 数据库连接池管理

### 前端优化
- **代码分割**: 按需加载
- **图片优化**: 压缩和懒加载
- **缓存策略**: 浏览器缓存配置
- **CDN**: 静态资源CDN加速

### Android优化
- **内存管理**: 防止内存泄漏
- **网络优化**: 请求合并和缓存
- **图片优化**: 图片压缩和缓存
- **电池优化**: 后台任务优化

## 📊 监控和日志

### 系统监控
```bash
# 系统资源监控
htop
iostat -x 1

# 应用性能监控
pm2 monit

# 数据库监控
mysqladmin processlist
```

### 日志管理
```bash
# 应用日志
tail -f logs/app.log

# 系统日志
sudo journalctl -u ai-interview -f

# 错误日志
grep ERROR logs/app.log
```

### 告警配置
- **CPU使用率**: > 80%
- **内存使用率**: > 85%
- **磁盘使用率**: > 90%
- **API响应时间**: > 5秒
- **错误率**: > 5%

## 🆘 故障排除

### 常见问题

#### 1. 服务启动失败
```bash
# 检查端口占用
sudo netstat -tlnp | grep :3001

# 检查进程
ps aux | grep node

# 查看错误日志
tail -f logs/error.log
```

#### 2. 数据库连接失败
```bash
# 检查MySQL服务
sudo systemctl status mysql

# 测试数据库连接
mysql -u root -p -h localhost

# 检查防火墙
sudo ufw status
```

#### 3. 前端构建失败
```bash
# 清理缓存
rm -rf node_modules
npm cache clean --force
npm install

# 检查Node.js版本
node -v
npm -v
```

#### 4. Android编译失败
```bash
# 清理项目
./gradlew clean

# 检查Android SDK
echo $ANDROID_HOME

# 更新依赖
./gradlew --refresh-dependencies
```

### 调试工具
- **后端调试**: Node.js Inspector
- **前端调试**: Chrome DevTools
- **Android调试**: Android Studio Debugger
- **网络调试**: Charles Proxy

## 📚 扩展开发

### 添加新功能模块
1. 创建数据库表
2. 定义API接口
3. 实现业务逻辑
4. 开发前端界面
5. 编写测试用例
6. 更新文档

### 集成第三方服务
1. 注册服务账号
2. 获取API密钥
3. 安装SDK/库
4. 实现集成代码
5. 配置环境变量
6. 测试集成功能

### 自定义数字人
1. 在对旭云平台创建数字人
2. 配置数字人参数和对话能力
3. 获取AppId、AppSecret和ConversationId
4. 在Android应用中集成SDK
5. 测试交互效果和性能

## 📞 技术支持

### 联系方式
- **项目地址**: [GitHub Repository]
- **技术文档**: [Documentation Site]
- **问题反馈**: [GitHub Issues]
- **社区讨论**: [GitHub Discussions]

### 贡献指南
1. Fork项目
2. 创建功能分支
3. 提交代码变更
4. 推送到分支
5. 创建Pull Request

### 许可证
MIT License - 详见LICENSE文件

---

## 🎯 总结

AI面试系统是一个功能完整、技术先进的智能面试解决方案。通过现代化的技术栈和微服务架构，为企业和求职者提供了专业的AI面试体验。

### 核心优势
- **技术先进**: 集成对旭云数字人技术和AI大模型
- **架构清晰**: 微服务架构，易于维护和扩展
- **功能完整**: 覆盖面试全流程的管理功能
- **用户体验**: 直观的界面设计和流畅的交互体验
- **安全可靠**: 完善的安全机制和数据保护

### 适用场景
- **企业招聘**: 大规模招聘的初筛和评估
- **教育培训**: 面试技能培训和练习
- **人才评估**: 职场素质评估和能力分析
- **研究应用**: AI面试技术的研究和验证

通过本说明书，您可以快速了解项目的整体架构、技术实现和部署方式，为项目的开发、部署和维护提供全面的指导。

**AI面试系统 - 让面试更智能，让招聘更高效** 🚀

---

## 📝 更新说明

### 版本更新记录
- **v1.1.0**: 将AIRI数字人服务替换为对旭云数字人服务
- **v1.0.0**: 初始版本，包含完整的AI面试系统功能

### 主要变更
1. **数字人服务**: 从AIRI Web版本改为对旭云Android SDK集成
2. **技术架构**: 简化了数字人服务架构，直接集成在Android应用中
3. **配置方式**: 更新了数字人相关的配置和部署方式
4. **API接口**: 调整了数字人相关的API接口定义

### 迁移指南
如果您正在从AIRI版本迁移到对旭云版本，请参考以下步骤：

1. **移除AIRI相关配置**
   - 删除`airi/`目录
   - 移除AIRI相关的环境变量配置
   - 更新Docker配置

2. **集成对旭云SDK**
   - 添加对旭云SDK依赖
   - 配置AppId、AppSecret和ConversationId
   - 更新Android应用权限配置

3. **测试验证**
   - 运行数字人功能测试
   - 验证多模态交互功能
   - 检查错误处理机制
