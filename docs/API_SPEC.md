# API 规范文档 - 三端共享契约

## Base URL

```
开发环境: http://localhost:3001
生产环境: https://api.ai-interview-system.com  # 待定
```

## 认证

### 登录
```
POST /api/auth/login
Request: { phone: string, password: string }
Response: { token: string, user: User }
```

### 注册
```
POST /api/auth/register
Request: { phone: string, password: string, name: string, role: 'candidate' | 'hr' }
Response: { token: string, user: User }
```

---

## 面试相关

### 创建面试
```
POST /api/interview/create
Headers: Authorization: Bearer <token>
Request: { positionId: string, difficulty: 'easy' | 'medium' | 'hard' }
Response: { interviewId: string, status: 'pending' }
```

### 获取面试题目
```
GET /api/interview/:id/questions
Headers: Authorization: Bearer <token>
Response: { questions: Question[], currentIndex: number }
```

### 提交回答
```
POST /api/interview/:id/answer
Headers: Authorization: Bearer <token>
Request: { questionId: string, audioUrl: string, textAnswer?: string }
Response: { nextQuestion: Question | null, analysis: AnswerAnalysis }
```

### 完成面试
```
POST /api/interview/:id/complete
Headers: Authorization: Bearer <token>
Response: { report: InterviewReport }
```

---

## 数字人相关

### 获取数字人配置
```
GET /api/avatar/config
Headers: Authorization: Bearer <token>
Response: { 
  provider: 'airi' | 'open-source',
  avatarId: string,
  voiceId: string,
  serverUrl: string
}
```

### 连接数字人 WebSocket
```
WS /ws/avatar/:avatarId
Headers: Authorization: Bearer <token>
Events:
  - send: audio (ArrayBuffer)
  - receive: text, emotion, animation
```

---

## 数据类型

### User
```typescript
interface User {
  id: string;
  phone: string;
  name: string;
  role: 'candidate' | 'hr' | 'admin';
  avatar?: string;
}
```

### Question
```typescript
interface Question {
  id: string;
  content: string;
  type: 'behavioral' | 'technical' | 'situational';
  expectedDuration: number; // 秒
}
```

### InterviewReport
```typescript
interface InterviewReport {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  detailedAnalysis: {
    communication: number;
    problemSolving: number;
    technicalSkills: number;
  };
}
```

---

## 错误处理

所有 API 错误响应格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "人类可读的错误信息"
  }
}
```

常见错误码：
- `UNAUTHORIZED`: 401 未授权
- `FORBIDDEN`: 403 禁止访问
- `NOT_FOUND`: 404 资源不存在
- `VALIDATION_ERROR`: 422 参数错误
- `SERVER_ERROR`: 500 服务器错误

---

最后更新: 2026-04-14