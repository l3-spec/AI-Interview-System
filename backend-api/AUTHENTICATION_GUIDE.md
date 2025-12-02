# 🔐 AI面试系统认证方式详解

## 📋 系统架构概览

AI面试系统包含以下四个主要组件：
1. **backend-api** (后端API服务) - 端口 3001
2. **admin-dashboard** (企业管理后台) - 端口 5174
3. **system-admin** (系统管理后台) - 端口 5175
4. **android-app** (移动端应用)

## 🔑 认证方式对比

### 1. 后端API服务 (backend-api)

**认证方式**: JWT Token + 角色验证
**端口**: 3001
**密钥**: `JWT_SECRET` 环境变量

#### 认证流程:
```typescript
// 1. 生成Token
const token = jwt.sign({
  id: user.id,
  email: user.email,
  type: 'user|admin|company', // 用户类型
  role: user.role
}, JWT_SECRET, { expiresIn: '24h' });

// 2. 验证Token
const decoded = jwt.verify(token, JWT_SECRET);
if (decoded.type !== expectedType) {
  throw new Error('无效的Token类型');
}
```

#### 支持的Token类型:
- `user`: 普通用户/求职者
- `admin`: 系统管理员
- `company`: 企业用户

### 2. 企业管理后台 (admin-dashboard)

**认证方式**: JWT Token (type: 'company')
**端口**: 5174
**默认账号**: 
- 邮箱: `company@example.com`
- 密码: `company123`

#### 认证特点:
- 只能访问企业相关API
- Token类型必须是 `company`
- 权限范围: 企业管理、职位管理、候选人管理等

#### 前端配置:
```typescript
// config/constants.ts
export const AUTH_CONSTANTS = {
  TOKEN_KEY: 'company_token',
  USER_KEY: 'company_user',
  API_BASE_URL: '/api'
};
```

### 3. 系统管理后台 (system-admin)

**认证方式**: JWT Token (type: 'admin')
**端口**: 5175
**默认账号**:
- 邮箱: `superadmin@aiinterview.com`
- 密码: `superadmin123`

#### 认证特点:
- 只能访问管理员相关API
- Token类型必须是 `admin`
- 权限范围: 系统管理、用户管理、企业管理等

#### 前端配置:
```typescript
// config/config.ts
export const config = {
  TOKEN_KEY: 'admin_token',
  USER_KEY: 'admin_user',
  AUTH_HEADER_PREFIX: 'Bearer'
};
```

### 4. 移动端应用 (android-app)

**认证方式**: JWT Token (type: 'user')
**默认账号**: 需要注册或使用企业提供的账号

#### 认证特点:
- 只能访问用户相关API
- Token类型必须是 `user`
- 权限范围: 面试、个人信息管理等

## 🚨 当前问题分析

### 问题现象:
- system-admin 访问 `/api/admin/dashboard/stats` 返回 401 错误
- 错误信息: "令牌验证失败"

### 可能原因:

#### 1. Token类型不匹配
```typescript
// 后端期望的Token类型
decoded.type === 'admin'  // 系统管理后台需要admin类型

// 但前端可能发送的是
decoded.type === 'user'   // 普通用户类型
```

#### 2. Token过期
```typescript
// Token过期时间检查
const now = Math.floor(Date.now() / 1000);
if (decoded.exp < now) {
  throw new Error('Token已过期');
}
```

#### 3. Token格式错误
```typescript
// 正确的格式
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// 错误的格式
Authorization: Bearer  // 空Token
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  // 缺少Bearer前缀
```

#### 4. 前端存储问题
```typescript
// 检查localStorage中的Token
const token = localStorage.getItem('admin_token');
if (!token) {
  // Token不存在，需要重新登录
}
```

## 🔧 解决方案

### 1. 立即修复 (推荐)
```javascript
// 在浏览器控制台执行
// 清除错误的Token
localStorage.removeItem('admin_token');
localStorage.removeItem('admin_user');

// 重新登录系统管理后台
// 使用正确的账号: superadmin@aiinterview.com / superadmin123
```

### 2. 手动设置正确Token
```javascript
// 在浏览器控制台执行
const correctToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkMzJmOTAzLTcyNjEtNGEzYS1iYTg4LTRjODFjYzRkYjlhYSIsImVtYWlsIjoic3VwZXJhZG1pbkBhaWludGVydmlldy5jb20iLCJ0eXBlIjoiYWRtaW4iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJpYXQiOjE3NTUwMTI5MzAsImV4cCI6MTc1NTA5OTMzMH0.QkwdLAlh-_LF2cCoJliokbkdheS21POCFXpOpJIZ9go';
localStorage.setItem('admin_token', correctToken);
```

### 3. 检查前端登录逻辑
确保前端登录时正确设置了Token类型：
```typescript
// 登录成功后应该设置
localStorage.setItem('admin_token', response.data.token);
localStorage.setItem('admin_user', JSON.stringify(response.data.admin));
```

## 📊 各端账号对照表

| 端 | 默认邮箱 | 默认密码 | Token类型 | 权限范围 |
|---|---------|---------|-----------|----------|
| admin-dashboard | company@example.com | company123 | company | 企业管理 |
| system-admin | superadmin@aiinterview.com | superadmin123 | admin | 系统管理 |
| android-app | 需要注册 | 需要注册 | user | 用户功能 |

## 🔍 调试命令

### 1. 检查Token内容
```javascript
// 在浏览器控制台执行
const token = localStorage.getItem('admin_token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token内容:', payload);
}
```

### 2. 测试API请求
```bash
# 使用curl测试
curl -H "Authorization: Bearer <your-token>" \
     http://localhost:3001/api/admin/dashboard/stats
```

### 3. 检查后端日志
```bash
# 查看后端认证日志
tail -f backend-api/logs/app.log | grep "Token验证"
```

## ✅ 验证步骤

1. **清除浏览器缓存**
2. **使用正确账号登录**
3. **检查Network面板中的Authorization头**
4. **验证Token类型和内容**
5. **确认API响应状态**

按照以上步骤操作，应该能够解决Token验证失败的问题。 