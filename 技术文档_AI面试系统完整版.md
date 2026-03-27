# AI 面试系统 - 完整技术文档

**版本**: v1.1.0  
**更新日期**: 2026-03-25  
**状态**: 已完成并投入生产使用

---

## 目录

1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [技术栈详解](#3-技术栈详解)
4. [数据库设计](#4-数据库设计)
5. [核心模块实现](#5-核心模块实现)
6. [API 接口文档](#6-api-接口文档)
7. [数字人系统](#7-数字人系统)
8. [移动端实现](#8-移动端实现)
9. [管理后台](#9-管理后台)
10. [部署指南](#10-部署指南)
11. [安全机制](#11-安全机制)
12. [性能优化](#12-性能优化)
13. [监控与日志](#13-监控与日志)
14. [故障排除](#14-故障排除)

---

## 1. 项目概述

### 1.1 项目简介

AI 面试系统是一套完整的智能面试解决方案，集成了数字人技术、AI 语音交互、视频录制分析和职场素质评估等功能。系统采用微服务架构，包含用户端 Android 应用、企业管理端、系统管理端和后端 API 服务，为企业和求职者提供专业的 AI 面试体验。

### 1.2 核心价值

| 核心价值 | 说明 |
|---------|------|
| **智能化面试** | 基于 AI 大模型（DeepSeek）的智能问题生成和回答分析 |
| **数字人交互** | 集成数字人技术，提供真实的面试体验 |
| **全流程管理** | 从职位发布到候选人评估的完整招聘流程 |
| **数据驱动决策** | 丰富的统计分析和可视化报表 |

### 1.3 系统组件

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI 面试系统架构                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Android App  │  │ Admin Portal │  │ System Admin │              │
│  │  (Kotlin/    │  │  (React/    │  │  (React/     │              │
│  │  Compose)    │  │   Ant Design)│  │   Ant Design)│              │
│  │  端口: -     │  │  端口: 5174 │  │  端口: 5175  │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                   │                     │
│         └──────────────────┼───────────────────┘                     │
│                            │                                         │
│                   ┌────────▼────────┐                               │
│                   │   Backend API    │                               │
│                   │  Node.js/Express │                               │
│                   │   端口: 3001     │                               │
│                   └────────┬────────┘                               │
│                            │                                         │
│         ┌──────────────────┼──────────────────┐                       │
│         │                  │                  │                       │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐                 │
│  │    MySQL    │  │    Redis    │  │  阿里云 OSS  │                 │
│  │   端口:3306 │  │   端口:6379 │  │    存储服务   │                 │
│  └─────────────┘  └─────────────┘  └──────────────┘                 │
│                            │                                         │
│                   ┌────────▼────────┐                               │
│                   │   AI 服务层     │                               │
│                   │ DeepSeek+Azure │                               │
│                   │  + 火山引擎    │                               │
│                   └─────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 系统架构

### 2.1 整体架构

系统采用典型的三层架构设计：

- **接入层**: Android App、Web 管理后台
- **业务层**: Node.js Backend API（Express + TypeScript）
- **数据层**: MySQL + Redis + 阿里云 OSS

### 2.2 模块职责

| 模块 | 技术栈 | 端口 | 职责 |
|------|--------|------|------|
| **后端 API** | Node.js + Express + TypeScript + Prisma | 3001 | 核心业务逻辑、认证、AI 服务编排 |
| **企业管理端** | React + TypeScript + Ant Design + Vite | 5174 | 企业用户管理、候选人管理、数据统计 |
| **系统管理端** | React + TypeScript + Ant Design + Vite | 5175 | 系统配置、用户权限、系统监控 |
| **Android 应用** | Kotlin + Jetpack Compose + Hilt + CameraX | - | 用户面试、视频录制、数字人交互 |
| **数字人服务** | DUIX SDK + WebSocket + Aliyun ASR/TTS | - | 实时语音交互、唇形同步 |

### 2.3 目录结构

```
AI-Interview-System/
├── backend-api/                    # 后端 API 服务
│   ├── src/
│   │   ├── controllers/           # 控制器层（32个控制器）
│   │   ├── services/               # 业务服务层（28个服务）
│   │   ├── routes/                 # 路由定义
│   │   ├── middleware/             # 中间件
│   │   ├── websocket/              # WebSocket 服务
│   │   ├── models/                # 数据模型
│   │   ├── utils/                  # 工具函数
│   │   ├── jobs/                   # 后台任务队列
│   │   └── index.ts               # 应用入口
│   ├── prisma/
│   │   └── schema.prisma          # 数据库 Schema（30+ 表）
│   └── package.json
│
├── admin-dashboard/                # 企业管理后台
│   └── src/
│       ├── pages/                  # 页面组件
│       ├── components/             # 通用组件
│       ├── services/               # API 服务
│       ├── contexts/               # React Context
│       └── App.tsx
│
├── system-admin/                   # 系统管理后台
│   └── (同 admin-dashboard 结构)
│
├── android-v0-compose/             # Android 应用（新架构）
│   ├── app/src/main/java/com/xlwl/AiMian/
│   │   ├── duix/                   # DUIX 数字人模块
│   │   ├── digitalhuman/           # 数字人控制器
│   │   ├── ai/                     # AI 面试模块
│   │   │   └── video/              # 视频录制
│   │   ├── data/                   # 数据层
│   │   │   ├── api/                # API 接口
│   │   │   ├── model/              # 数据模型
│   │   │   └── repository/         # 仓库模式
│   │   └── ui/                     # UI 层
│   │       ├── auth/               # 认证页面
│   │       ├── home/               # 首页
│   │       ├── jobs/               # 职位页面
│   │       ├── circle/             # 职圈页面
│   │       ├── profile/            # 个人中心
│   │       └── assessment/          # 测评页面
│   └── build.gradle.kts
│
├── harmony-v0-arkts/               # 鸿蒙应用（参考）
├── iOS-v0/                         # iOS 应用（参考）
├── duix-sdk/                       # DUIX SDK 集成
│
├── package.json                    # 根项目配置
├── docker-compose.yml              # Docker 容器编排
└── *.sh                           # 启动脚本
```

---

## 3. 技术栈详解

### 3.1 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | >= 16 | 运行时环境 |
| **Express.js** | 4.x | Web 框架 |
| **TypeScript** | 5.x | 类型安全 |
| **Prisma** | 5.x | ORM 数据库访问 |
| **MySQL** | 8.0 | 关系数据库 |
| **Redis** | 6.x | 缓存和会话 |
| **Socket.IO** | 4.x | WebSocket 通信 |
| **JWT** | - | 身份认证 |
| **Swagger** | - | API 文档 |

### 3.2 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 18.x | UI 框架 |
| **TypeScript** | 5.x | 类型安全 |
| **Ant Design** | 5.x | UI 组件库 |
| **Vite** | 5.x | 构建工具 |
| **Zustand** | - | 状态管理 |
| **React Query** | - | 数据获取 |
| **Recharts** | - | 图表可视化 |

### 3.3 移动端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Kotlin** | 1.9.x | 开发语言 |
| **Jetpack Compose** | 1.5.x | UI 框架 |
| **Hilt** | 2.48 | 依赖注入 |
| **CameraX** | 1.3.x | 相机录制 |
| **Retrofit** | 2.9.x | 网络请求 |
| **OkHttp** | 4.x | HTTP 客户端 |
| **Glide** | 4.x | 图片加载 |

### 3.4 AI 服务

| 服务 | 用途 | 集成方式 |
|------|------|----------|
| **DeepSeek** | 问题生成、回答分析 | REST API |
| **Azure Cognitive Services** | TTS 语音合成 | REST API |
| **阿里云 ASR** | 语音识别 | REST API |
| **火山引擎数字人** | 数字人渲染 | Android SDK |

---

## 4. 数据库设计

### 4.1 ER 图概述

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │────▶│  Interview  │◀────│   Company    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   ▼
       │           ┌─────────────┐
       │           │  Question   │
       │           └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│AIInterview  │────▶│AIInterview  │     │AIInterview  │
│  Session    │     │ Question    │     │   Report    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 4.2 核心数据表

#### 4.2.1 用户表 (users)

```prisma
model User {
  id          String    @id @default(uuid())
  email       String    @unique
  password    String
  name        String
  phone       String?
  gender      String?   // "MALE" | "FEMALE" | "OTHER"
  age         Int?
  education   String?
  experience  String?
  skills      String?   // JSON array
  avatar      String?
  isActive    Boolean   @default(true)
  isVerified  Boolean   @default(false)
  lastLoginAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // 关联
  interviews           Interview[]
  aiInterviews         AIInterviewSession[]
  digitalHumanSessions DigitalHumanSession[]
  // ...
}
```

#### 4.2.2 企业表 (companies)

```prisma
model Company {
  id                  String    @id @default(uuid())
  email               String    @unique
  password            String
  name                String
  description         String?   @db.Text
  industry            String?
  scale               String?   // "1-50" | "51-200" | ...
  isVerified          Boolean   @default(false)
  isActive            Boolean   @default(true)
  subscriptionEndDate DateTime?
  createdAt           DateTime  @default(now())

  jobs         Job[]
  interviews   Interview[]
}
```

#### 4.2.3 职位表 (jobs)

```prisma
model Job {
  id               String   @id @default(uuid())
  title            String
  description      String   @db.Text
  requirements     String   @db.Text
  salary           String?
  location         String?
  level            String?  // INTERN | JUNIOR | MIDDLE | SENIOR | LEAD | MANAGER
  skills           String?  // JSON array
  benefits         String?  @db.Text
  type             String   // "FULL_TIME" | "PART_TIME" | "INTERN"
  status           String   @default("ACTIVE")
  isPublished      Boolean  @default(false)
  createdAt        DateTime @default(now())

  companyId        String
  company          Company  @relation(...)
  applications     JobApplication[]
}
```

#### 4.2.4 AI 面试会话表 (ai_interview_sessions)

```prisma
model AIInterviewSession {
  id              String    @id @default(uuid())
  userId          String
  jobTarget       String    // 目标职位
  jobCategory     String?   // 职位大类
  jobSubCategory  String?   // 职位小类
  background      String?   // 用户背景
  prompt          String?    @db.Text  // AI prompt
  status          String    @default("PREPARING")
  // "PREPARING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  currentQuestion Int       @default(0)
  totalQuestions  Int       @default(0)
  startedAt       DateTime?
  completedAt     DateTime?
  duration        Int?      // 面试时长(秒)
  plannedDuration Int?      // 预估时长(分钟)
  createdAt       DateTime  @default(now())

  user            User      @relation(...)
  questions       AIInterviewQuestion[]
  analysisReport  AIInterviewAnalysisReport?
}
```

#### 4.2.5 AI 面试问题表 (ai_interview_questions)

```prisma
model AIInterviewQuestion {
  id              String    @id @default(uuid())
  sessionId       String
  questionIndex   Int       // 问题序号
  questionText    String
  audioUrl        String?    @db.Text
  audioPath       String?
  answerText      String?    @db.Text
  answerVideoUrl  String?    @db.Text
  answerVideoPath String?
  answerDuration  Int?      // 回答时长(秒)
  videoUrl        String?   // 题目视频URL（数字人）
  status          String?   // PREPARING | READY | FAILED
  answeredAt      DateTime?

  session         AIInterviewSession @relation(...)
}
```

#### 4.2.6 AI 面试分析报告表 (ai_interview_analysis_reports)

```prisma
model AIInterviewAnalysisReport {
  id                  String   @id @default(uuid())
  sessionId           String   @unique

  // 综合评分
  overallScore        Int      // 0-100

  // 各项能力评分 (0-1)
  communicationScore  Float
  technicalScore      Float
  problemSolvingScore Float
  teamworkScore       Float
  adaptabilityScore   Float
  learningScore       Float

  // 详细能力 JSON
  competenciesJson    String?  @db.Text

  // 优势和不足
  strengths           String?  @db.Text  // JSON array
  improvements        String?  @db.Text  // JSON array

  // 岗位匹配
  jobMatchTitle       String?
  jobMatchDescription String?  @db.Text
  jobMatchRatio       Float?

  // 职场建议
  tips                String?  @db.Text

  // 视频分析结果
  videoConfidenceScore Float?  // 综合自信度 0-100
  emotionDistribution  String? // JSON: 情绪分布
  speechQuality        Float?  // 语音质量 0-100
  bodyLanguageScore    Float?  // 肢体语言 0-100

  analysisStatus      String   @default("PENDING")
  analysisError       String?  @db.Text
  generatedAt         DateTime?

  session             AIInterviewSession @relation(...)
}
```

#### 4.2.7 数字人会话表 (digital_human_sessions)

```prisma
model DigitalHumanSession {
  id        String   @id @default(uuid())
  sessionId String   @unique
  userId    String
  status    String   @default("ACTIVE")
  type      String   @default("audio-driven")
  // "audio-driven" | "video" | "text"
  createdAt DateTime @default(now())

  user         User                     @relation(...)
  interactions DigitalHumanInteraction[]
}
```

#### 4.2.8 数字人交互记录表 (digital_human_interactions)

```prisma
model DigitalHumanInteraction {
  id        String   @id @default(uuid())
  sessionId String
  input     String?  // 用户输入
  response  String   // 数字人响应
  type      String   // "dialogue" | "listening" | "idle" | "custom"
  audioUrl  String?
  videoUrl  String?
  duration  Int?
  createdAt DateTime @default(now())

  session   DigitalHumanSession @relation(...)
}
```

### 4.3 数据库索引策略

```prisma
// 面试会话按用户索引
@@index([userId], map: "idx_ai_interview_sessions_user")

// 分析报告按状态索引
@@index([analysisStatus], map: "idx_analysis_tasks_status")

// 职位按字典职位索引
@@index([dictionaryPositionId], map: "idx_jobs_dictionary_position")
```

---

## 5. 核心模块实现

### 5.1 认证模块

#### 5.1.1 JWT Token 结构

```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "user|admin|company",
  "type": "access|refresh",
  "exp": 1234567890,
  "iat": 1234567890,
  "iss": "ai-interview-system",
  "aud": "ai-interview-api"
}
```

#### 5.1.2 认证流程

```
1. 用户登录 → /api/auth/login
2. 后端验证密码 → 生成 JWT Token
3. 客户端存储 Token
4. 后续请求携带: Authorization: Bearer <token>
5. 后端中间件验证 Token 有效性
6. Token 过期 → 返回 401 → 客户端刷新 Token
```

#### 5.1.3 核心代码

```typescript
// middleware/auth.ts
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: '令牌无效或已过期' });
  }
};
```

### 5.2 面试流程模块

#### 5.2.1 面试状态机

```
PREPARING → IN_PROGRESS → COMPLETED
                ↓
            CANCELLED
```

#### 5.2.2 面试流程时序

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Backend
    participant DeepSeek
    participant TTS

    User->>App: 选择职位和级别
    App->>Backend: POST /api/interview/sessions
    Backend->>DeepSeek: 生成面试问题
    DeepSeek->>Backend: 返回问题列表
    Backend->>Backend: 创建 AIInterviewSession
    Backend->>App: 返回 sessionId 和问题

    loop 每道题目
        Backend->>TTS: 合成问题语音
        TTS->>App: 返回音频
        App->>User: 播放问题 + 显示字幕
        User->>App: 录制回答
        App->>Backend: 上传回答视频
        Backend->>DeepSeek: 分析回答
        DeepSeek->>Backend: 返回评分和反馈
    end

    User->>App: 完成面试
    App->>Backend: POST /api/interview/sessions/:id/complete
    Backend->>Backend: 生成最终报告
    Backend->>App: 返回评估报告
```

### 5.3 AI 服务模块

#### 5.3.1 DeepSeek 服务

```typescript
// services/deepseekService.ts
export class DeepSeekService {
  async generateInterviewQuestions(
    jobPosition: string,
    jobLevel: string,
    count: number = 8
  ): Promise<string[]> {
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的面试官，生成 ${count} 道面试问题`
        },
        {
          role: 'user',
          content: `职位: ${jobPosition}, 级别: ${jobLevel}`
        }
      ]
    });

    return this.parseQuestions(response.choices[0].message.content);
  }

  async analyzeAnswer(
    question: string,
    answer: string
  ): Promise<AnswerAnalysis> {
    // 分析回答并评分
  }
}
```

#### 5.3.2 TTS 服务

```typescript
// services/ttsService.ts
export class TTSService {
  async synthesize(text: string, voice: string = 'zh-CN'): Promise<Buffer> {
    // Azure Cognitive Services TTS
    const response = await fetch(
      `https://${config.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': config.azureSpeechKey,
          'Content-Type': 'application/ssml+xml'
        },
        body: this.buildSSML(text, voice)
      }
    );

    return Buffer.from(await response.arrayBuffer());
  }
}
```

### 5.4 文件上传模块

#### 5.4.1 OSS 服务集成

```typescript
// services/ossService.ts
export class OSSService {
  async uploadVideo(
    file: Express.Multer.File,
    sessionId: string
  ): Promise<string> {
    const key = `interviews/${sessionId}/${Date.now()}.mp4`;

    await this.client.put(key, file.buffer, {
      headers: {
        'Content-Type': file.mimetype
      }
    });

    return `${this.config.bucketUrl}/${key}`;
  }

  async uploadAudio(
    file: Express.Multer.File,
    sessionId: string,
    questionIndex: number
  ): Promise<string> {
    const key = `audio/${sessionId}/q${questionIndex}_${Date.now()}.mp3`;
    // ... 上传逻辑
  }
}
```

### 5.5 WebSocket 实时通信

#### 5.5.1 实时语音管线

```typescript
// websocket/realtime-voice.websocket.ts
export class RealtimeVoiceWebSocketServer {
  handleJoinSession(socket, data: { sessionId: string }) {
    // 用户加入面试会话
    socket.join(`session:${data.sessionId}`);

    // 发送欢迎消息
    socket.emit('voice_response', {
      text: '欢迎参加 AI 面试...',
      ttsMode: 'client'  // 客户端本地 TTS
    });
  }

  handleTextMessage(socket, data: { sessionId: string; text: string }) {
    // 用户说话 → 文本消息
    const session = this.getSession(data.sessionId);

    // 调用 LLM 生成回复
    const response = await deepseekService.generateResponse(
      session.context,
      data.text
    );

    // 广播 AI 回复
    io.to(`session:${data.sessionId}`).emit('voice_response', {
      text: response,
      ttsMode: 'client'
    });
  }
}
```

---

## 6. API 接口文档

### 6.1 认证接口

#### POST /api/auth/login
用户登录

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "用户名",
      "role": "user"
    }
  }
}
```

#### POST /api/auth/register
用户注册

### 6.2 面试接口

#### POST /api/interview/sessions
创建面试会话

**请求头**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "jobPosition": "Java开发工程师",
  "jobLevel": "middle",
  "jobCategory": "技术类",
  "background": "3年Java开发经验..."
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "questions": [
      {
        "id": "uuid",
        "text": "请介绍一下你在项目中的主要贡献",
        "type": "behavioral",
        "timeLimit": 120
      }
    ],
    "totalQuestions": 8,
    "plannedDuration": 30
  }
}
```

#### GET /api/interview/sessions/:id
获取面试状态

#### GET /api/interview/sessions/:id/questions
获取面试问题列表

#### POST /api/interview/sessions/:id/answers
提交回答

**请求体**:
```json
{
  "questionId": "uuid",
  "videoUrl": "https://oss.example.com/video/xxx.mp4",
  "answerText": "我的回答是..."
}
```

#### POST /api/interview/sessions/:id/complete
完成面试

#### GET /api/interview/sessions/:id/report
获取评估报告

### 6.3 数字人接口

#### WebSocket /socket.io/
实时语音交互

**事件**:
| 事件名 | 方向 | 说明 |
|--------|------|------|
| `join_session` | client → server | 加入会话 |
| `voice_response` | server → client | AI 语音回复 |
| `text_message` | client → server | 用户文本消息 |
| `interruption` | client → server | 用户打断 |

### 6.4 管理接口

#### GET /api/admin/users
获取用户列表（管理员）

#### GET /api/admin/companies
获取企业列表

#### PUT /api/admin/jobs/:id
更新职位信息

---

## 7. 数字人系统

### 7.1 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│                    数字人系统架构                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐              ┌────────────┐                 │
│  │   Android  │              │  Backend   │                 │
│  │    App     │◀────────────▶│    API     │                 │
│  │            │   WebSocket  │            │                 │
│  └─────┬──────┘              └─────┬──────┘                 │
│        │                          │                         │
│        │                          ▼                         │
│        │                 ┌─────────────────┐                │
│        │                 │   DeepSeek LLM  │                │
│        │                 └─────────────────┘                │
│        │                                                  │
│        ▼                                                  │
│  ┌─────────────────────────────────────────┐              │
│  │              DUIX SDK                   │              │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  │              │
│  │  │ Live2D  │  │  音频   │  │  视频   │  │              │
│  │  │ 渲染    │  │ 分析    │  │ 合成    │  │              │
│  │  └─────────┘  └─────────┘  └─────────┘  │              │
│  └─────────────────────────────────────────┘              │
│                                                              │
│  ┌─────────────────────────────────────────┐              │
│  │           Aliyun ASR/TTS                 │              │
│  │  (客户端本地处理，节省带宽和成本)         │              │
│  └─────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 客户端 ASR/TTS 架构

**设计原则**: 应用端负责"感官"（听、说、看），服务端负责"大脑"（思考决策）。

```mermaid
sequenceDiagram
    participant User
    participant App as Android App
    participant ASR as Aliyun ASR
    participant WS as WebSocket
    participant Backend as Backend API
    participant LLM as DeepSeek

    Note over App,Backend: 阶段1: 初始化
    App->>WS: Connect & Emit 'join_session'
    WS->>App: 'voice_response' (Welcome, ttsMode='client')
    App->>ASR: TTS 合成语音
    ASR->>App: 返回音频
    App->>User: 播放音频 + 驱动数字人嘴型

    Note over App,Backend: 阶段2: 用户交互
    User->>App: 说话
    App->>ASR: VAD 检测语音结束
    ASR->>App: 返回识别文本
    App->>WS: Emit 'text_message' (用户文本)
    WS->>Backend: 处理文本
    Backend->>LLM: 生成回复
    LLM->>Backend: 返回回复文本
    Backend->>WS: 'voice_response' (AI文本, ttsMode='client')
    WS->>App: 收到 AI 回复
    App->>ASR: TTS 合成
    ASR->>App: 返回音频
    App->>User: 播放 + 驱动数字人
```

### 7.3 核心实现

#### 7.3.1 音频分析器

```kotlin
// AudioAnalyzer.kt
class AudioAnalyzer {
    fun analyze(pcmData: ByteArray): AudioFeatures {
        val rms = calculateRMS(pcmData)  // 音量 (0.0-1.0)
        val pitch = detectPitch(pcmData) // 基频 (Hz)
        val isSpeaking = rms > SPEAKING_THRESHOLD

        return AudioFeatures(
            volume = rms,
            pitch = pitch,
            isSpeaking = isSpeaking
        )
    }

    private fun calculateRMS(pcmData: ByteArray): Float {
        // PCM 16-bit: 每两个字节为一个采样
        var sum = 0.0
        for (i in 0 until pcmData.size - 1 step 2) {
            val sample = (pcmData[i].toInt() shl 8) or (pcmData[i + 1].toInt() and 0xFF)
            sum += sample * sample
        }
        return (sqrt(sum / (pcmData.size / 2)) / 32768.0).toFloat()
    }
}

data class AudioFeatures(
    val volume: Float,      // 0.0 - 1.0
    val pitch: Float,        // 频率 Hz
    val isSpeaking: Boolean  // 是否在说话
)
```

#### 7.3.2 Live2D 音频驱动

```kotlin
// Live2DAudioDriver.kt
class Live2DAudioDriver(private val controller: Live2DController) {

    fun updateAudioFeatures(features: AudioFeatures) {
        // 音量映射到嘴型开合度 (0.0 - 1.0)
        val mouthOpenY = features.volume * MAX_MOUTH_OPEN
        controller.setParam(ParamMouthOpenY, mouthOpenY)

        // 音调映射到嘴型形状 (高音圆，低音扁)
        val mouthForm = when {
            features.pitch > PITCH_HIGH -> 1.0f
            features.pitch < PITCH_LOW -> -1.0f
            else -> 0.0f
        }
        controller.setParam(ParamMouthForm, mouthForm)
    }

    fun reset() {
        controller.setParam(ParamMouthOpenY, 0.0f)
        controller.setParam(ParamMouthForm, 0.0f)
    }

    companion object {
        private const val MAX_MOUTH_OPEN = 0.8f
        private const val PITCH_HIGH = 300f  // Hz
        private const val PITCH_LOW = 100f   // Hz
    }
}
```

#### 7.3.3 实时音频采集

```kotlin
// RealtimeAudioCapture.kt
class RealtimeAudioCapture(
    private val sampleRate: Int = 16000,
    private val bufferSizeMs: Int = 20  // 20ms 低延迟
) {
    private val audioRecord by lazy {
        AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferSize
        )
    }

    fun startCapture(onAudioData: (ByteArray) -> Unit) {
        audioRecord.startRecording()

        val buffer = ByteArray(bufferSize)
        while (isCapturing) {
            val read = audioRecord.read(buffer, 0, buffer.size)
            if (read > 0) {
                onAudioData(buffer.copyOf(read))
            }
        }
    }
}
```

### 7.4 WebSocket 集成

```kotlin
// DigitalHumanWebSocketManager.kt
class DigitalHumanWebSocketManager {
    private val socket = SocketIOClient.Builder
        .builder()
        .serverUrl(AppConfig.apiBaseUrl)
        .build()

    fun connect() {
        socket.on(Socket.EVENT_CONNECT) {
            emitJoinSession()
        }

        socket.on("voice_response") { args ->
            val response = args[0] as VoiceResponse
            handleVoiceResponse(response)
        }

        socket.connect()
    }

    private fun handleVoiceResponse(response: VoiceResponse) {
        when (response.ttsMode) {
            "client" -> {
                // 客户端本地 TTS
                aliyunTTS.synthesize(response.text) { audioData ->
                    audioPlayer.play(audioData)
                    live2DDriver.updateAudio(audioData)
                }
            }
            "server" -> {
                // 服务端返回音频 URL
                audioPlayer.playFromUrl(response.audioUrl)
            }
        }
    }

    fun sendTextMessage(text: String) {
        socket.emit("text_message", mapOf(
            "sessionId" to sessionId,
            "text" to text
        ))
    }

    fun sendInterruption() {
        socket.emit("interruption", mapOf("sessionId" to sessionId))
    }
}
```

---

## 8. 移动端实现

### 8.1 项目结构

```
android-v0-compose/
├── app/src/main/java/com/xlwl/AiMian/
│   ├── duix/                    # DUIX 数字人
│   │   ├── DuixViewHost.kt      # DUIX View 封装
│   │   └── DuixCallback.kt      # 回调处理
│   │
│   ├── digitalhuman/            # 数字人模块
│   │   └── DigitalHumanController.kt
│   │
│   ├── ai/
│   │   └── video/
│   │       └── InterviewVideoRecorder.kt  # 面试视频录制
│   │
│   ├── data/
│   │   ├── api/                 # API 接口定义
│   │   │   └── ApiService.kt
│   │   ├── model/              # 数据模型
│   │   │   ├── User.kt
│   │   │   ├── Job.kt
│   │   │   ├── Interview.kt
│   │   │   └── InterviewReport.kt
│   │   └── repository/         # 仓库模式
│   │       ├── UserRepository.kt
│   │       ├── JobRepository.kt
│   │       └── InterviewRepository.kt
│   │
│   └── ui/
│       ├── auth/
│       ├── auth/                # 登录注册
│       ├── home/                # 首页
│       ├── jobs/                # 职位浏览
│       ├── circle/              # 职圈社区
│       ├── profile/             # 个人中心
│       └── assessment/          # 测评模块
│
├── build.gradle.kts
└── local.properties
```

### 8.2 核心页面

| 页面 | 文件 | 说明 |
|------|------|------|
| 登录 | `LoginScreen.kt` | 手机验证码登录 |
| 首页 | `HomeScreen.kt` | 职位推荐、热门面试 |
| 职位选择 | `JobSelectionScreen.kt` | AI 面试职位选择 |
| 数字人面试 | `DigitalInterviewScreen.kt` | 数字人 + 视频录制 |
| 面试报告 | `ResumeReportScreen.kt` | 评估结果展示 |

### 8.3 视频录制

```kotlin
// InterviewVideoRecorder.kt
class InterviewVideoRecorder(
    private val context: Context
) {
    private val cameraX = CameraX.Builder()
        .setVideoEncodingBitRate(5_000_000)  // 5 Mbps
        .build()

    private val file = File(cacheDir, "interview_${System.currentTimeMillis()}.mp4")

    fun startRecording() {
        val outputOptions = FileOutputOptions.Builder(file).build()

        cameraX.videoCaptureCase
            .prepareRecording(context, outputOptions)
            .start(ContextCompat.getMainExecutor(context)) { event ->
                when (event) {
                    is VideoRecordEvent.Start -> { /* 开始录制 */ }
                    is VideoRecordEvent.Finalize -> {
                        if (event.hasError()) {
                            // 处理错误
                        } else {
                            // 上传视频
                            uploadVideo(file)
                        }
                    }
                }
            }
    }

    private suspend fun uploadVideo(file: File): String {
        // 调用 OSS 上传
    }
}
```

### 8.4 API 服务

```kotlin
// ApiService.kt
interface ApiService {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): ApiResponse<LoginResponse>

    @POST("interview/sessions")
    suspend fun createSession(@Body request: CreateSessionRequest): ApiResponse<SessionResponse>

    @GET("interview/sessions/{id}")
    suspend fun getSession(@Path("id") id: String): ApiResponse<SessionResponse>

    @POST("interview/sessions/{id}/answers")
    suspend fun submitAnswer(
        @Path("id") sessionId: String,
        @Body answer: AnswerRequest
    ): ApiResponse<AnswerResponse>

    @POST("interview/sessions/{id}/complete")
    suspend fun completeSession(@Path("id") id: String): ApiResponse<ReportResponse>
}
```

---

## 9. 管理后台

### 9.1 企业管理端 (admin-dashboard)

#### 9.1.1 页面结构

```
admin-dashboard/src/pages/
├── Dashboard.tsx              # 数据仪表盘
├── JobList.tsx                # 职位列表
├── JobForm.tsx                # 职位表单
├── CandidateList.tsx           # 候选人列表
├── CandidateDetail.tsx        # 候选人详情
├── InterviewView.tsx          # 面试视频查看
├── ReportView.tsx              # 评估报告查看
└── Settings.tsx               # 企业设置
```

#### 9.1.2 核心功能

| 功能 | 说明 |
|------|------|
| **数据仪表盘** | 面试统计、候选人趋势、入职率 |
| **职位管理** | CRUD 职位、设置面试要求 |
| **候选人管理** | 查看候选人、面试视频、评估报告 |
| **消息中心** | 发送面试邀请、沟通记录 |

### 9.2 系统管理端 (system-admin)

#### 9.2.1 页面结构

```
system-admin/src/pages/
├── Dashboard.tsx               # 系统概览
├── UserManagement.tsx          # 用户管理
├── CompanyManagement.tsx       # 企业管理
├── JobTemplate.tsx             # 面试模板配置
├── QuestionBank.tsx            # 题库管理
├── Analytics.tsx               # 数据分析
└── SystemSettings.tsx          # 系统配置
```

#### 9.2.2 管理员角色

| 角色 | 权限 |
|------|------|
| **SUPER_ADMIN** | 系统全部权限 |
| **ADMIN** | 用户、企业、职位管理 |
| **MODERATOR** | 内容审核、投诉处理 |

---

## 10. 部署指南

### 10.1 环境要求

#### 开发环境
- Node.js >= 16.0.0
- MySQL >= 8.0
- Redis >= 6.0
- Android Studio >= 2022.3
- JDK >= 17

#### 生产环境
- Ubuntu 20.04+ / CentOS 8+
- 内存 >= 8GB RAM
- 存储 >= 100GB SSD
- 域名 + SSL 证书

### 10.2 Docker 部署（推荐）

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

  system-admin:
    build: ./system-admin
    ports:
      - "5175:80"

volumes:
  mysql_data:
```

```bash
# 启动所有服务
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f backend-api
```

### 10.3 环境变量配置

```bash
# backend-api/.env
NODE_ENV=production
PORT=3001

# 数据库
DATABASE_URL="mysql://user:password@localhost:3306/ai_interview_db"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRE="7d"

# 阿里云 OSS
OSS_ACCESS_KEY_ID="your-oss-key"
OSS_ACCESS_KEY_SECRET="your-oss-secret"
OSS_ENDPOINT="oss-cn-hangzhou.aliyuncs.com"
OSS_BUCKET_NAME="your-bucket"

# AI 服务
DEEPSEEK_API_KEY="your-deepseek-key"
AZURE_SPEECH_KEY="your-azure-key"
AZURE_SPEECH_REGION="eastasia"

# 火山引擎
VOLC_APP_ID="your-app-id"
VOLC_APP_KEY="your-app-key"
```

### 10.4 Nginx 配置

```nginx
server {
    listen 80;
    server_name aiinterview.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name aiinterview.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # API 服务
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 管理后台
    location /admin {
        proxy_pass http://localhost:5174;
    }

    location /system {
        proxy_pass http://localhost:5175;
    }

    # 静态资源
    location /uploads {
        alias /app/uploads;
        expires 1y;
    }
}
```

### 10.5 Android 应用构建

```bash
cd android-v0-compose

# 配置 API 地址 (local.properties)
echo "API_BASE_URL=https://api.aiinterview.com/api/" >> local.properties

# 构建 Debug 版本
./gradlew assembleDebug

# 构建 Release 版本
./gradlew assembleRelease

# 安装到设备
./gradlew installDebug
```

---

## 11. 安全机制

### 11.1 认证安全

| 措施 | 说明 |
|------|------|
| **JWT 令牌** | 7 天过期，支持刷新 |
| **bcrypt 加密** | 密码哈希存储 |
| **HTTPS** | 强制 SSL 传输 |
| **Token 黑名单** | 登出时加入黑名单 |

### 11.2 API 安全

```typescript
// 中间件: 限流
const rateLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 最多 100 请求
  message: '请求过于频繁'
});

// 中间件: 参数验证
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    next();
  };
};
```

### 11.3 数据安全

| 措施 | 说明 |
|------|------|
| **SQL 注入防护** | Prisma ORM 参数化查询 |
| **XSS 防护** | 输入验证 + HTML 转义 |
| **敏感数据加密** | JWT Secret、OSS Key 等 |
| **CORS 限制** | 仅允许授权域名 |

---

## 12. 性能优化

### 12.1 后端优化

| 优化项 | 实现方式 |
|--------|----------|
| **数据库索引** | 常用查询字段添加索引 |
| **Redis 缓存** | 会话、热门数据缓存 |
| **连接池** | 数据库连接复用 |
| **异步处理** | BullMQ 队列处理耗时任务 |

### 12.2 前端优化

| 优化项 | 实现方式 |
|--------|----------|
| **代码分割** | Vite 动态导入 |
| **懒加载** | React.lazy + Suspense |
| **缓存策略** | 浏览器缓存 + CDN |
| **Gzip 压缩** | Nginx 配置 |

### 12.3 移动端优化

| 优化项 | 实现方式 |
|--------|----------|
| **图片压缩** | WebP 格式 + 懒加载 |
| **视频压缩** | H.264 编码，5Mbps 码率 |
| **网络缓存** | OkHttp 缓存 + Retrofit |
| **内存管理** | Compose 状态回收 |

---

## 13. 监控与日志

### 13.1 日志级别

```typescript
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}
```

### 13.2 日志格式

```json
{
  "timestamp": "2026-03-25T10:00:00.000Z",
  "level": "INFO",
  "message": "用户登录成功",
  "userId": "uuid",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "requestId": "uuid"
}
```

### 13.3 健康检查

```
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2026-03-25T10:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

---

## 14. 故障排除

### 14.1 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 服务启动失败 | 端口被占用 | `netstat -tlnp \| grep 3001` |
| 数据库连接失败 | MySQL 未启动 | `systemctl start mysql` |
| CORS 错误 | 域名未在白名单 | 检查 `CORS_ORIGINS` 配置 |
| Token 过期 | 客户端未刷新 | 实现 Token 刷新逻辑 |
| 视频上传失败 | OSS 配置错误 | 检查 `OSS_*` 环境变量 |

### 14.2 调试命令

```bash
# 后端日志
tail -f backend-api/logs/app.log

# 数据库连接
mysql -u root -p -h localhost

# Redis 连接
redis-cli ping

# 检查端口
lsof -i :3001
lsof -i :3306

# Docker 日志
docker-compose logs -f backend-api
```

### 14.3 联系方式

- **项目地址**: https://github.com/your-repo/AI-Interview-System
- **技术支持**: support@aiinterview.com
- **文档**: https://docs.aiinterview.com

---

## 附录

### A. 技术依赖清单

| 依赖 | 版本 | 许可证 |
|------|------|--------|
| Express.js | 4.18.x | MIT |
| React | 18.2.x | MIT |
| Ant Design | 5.12.x | MIT |
| Kotlin | 1.9.x | Apache 2.0 |
| Jetpack Compose | 1.5.x | Apache 2.0 |
| Prisma | 5.x | Apache 2.0 |
| Socket.IO | 4.6.x | MIT |

### B. 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.1.0 | 2026-03 | 数字人系统升级为客户端 ASR/TTS 架构 |
| v1.0.0 | 2024-01 | 初始版本，完整 AI 面试功能 |

---

**文档编制**: AI Assistant  
**最后更新**: 2026-03-25
