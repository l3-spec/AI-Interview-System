# AI面试系统架构文档

## 系统概述

AI面试系统是一个完整的全栈应用，包含后端API服务、Web管理后台、系统管理后台和Android移动应用。系统采用微服务架构，各模块独立部署，通过RESTful API进行通信。

## 系统架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Android App   │    │ Admin Dashboard │    │ System Admin    │
│   (移动端)      │    │   (管理后台)    │    │   (系统管理)    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌───────────────────────────┐
                    │        Backend API        │
                    │   (Node.js + Express)     │
                    │        Port: 3001         │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │      Database             │
                    │   (MySQL/SQLite/Prisma)   │
                    └───────────────────────────┘
```

## 模块详细说明

### 1. 后端API服务 (backend-api)

**技术栈**: Node.js + Express + TypeScript + Prisma
**端口**: 3001
**主要功能**:
- 用户与企业认证、验证码登录
- 面试流程与数字人集成
- 文件与音视频上传、转码
- 第三方AI服务编排
- 系统与运营侧统计

**关键特性**:
- JWT令牌认证与角色鉴权
- CORS与速率限制
- Prisma 数据访问 + MySQL/SQLite 适配
- BullMQ 队列处理长耗时任务
- Swagger 文档与健康检查端点

### 2. 管理后台 (Admin Dashboard)

**技术栈**: React + TypeScript + Ant Design
**端口**: 5174
**主要功能**:
- 企业用户管理
- 面试流程管理
- 候选人管理
- 数据统计展示

**通信方式**:
- 通过Vite代理访问后端API
- JWT令牌认证
- 自动token刷新

### 3. 系统管理后台 (System Admin)

**技术栈**: React + TypeScript + Ant Design
**端口**: 5175
**主要功能**:
- 系统管理员管理
- 系统配置管理
- 用户权限管理
- 系统监控

**通信方式**:
- 通过Vite代理访问后端API
- JWT令牌认证
- 管理员权限验证

### 4. Android移动应用

**技术栈**: Kotlin + Retrofit + OkHttp
**主要功能**:
- 用户注册登录
- 数字人面试
- 视频录制上传
- 面试结果查看

**通信方式**:
- 直接HTTP请求到后端API
- JWT令牌认证
- 网络状态检测
- 自动重试机制

## 接口通信规范

### 1. 认证机制

**JWT令牌结构**:
```json
{
  "user_id": "用户ID",
  "user_role": "用户角色",
  "exp": "过期时间",
  "iat": "签发时间",
  "iss": "签发者",
  "aud": "接收者"
}
```

**认证流程**:
1. 用户登录获取JWT令牌
2. 后续请求在Header中携带 `Authorization: Bearer <token>`
3. 后端验证令牌有效性
4. 令牌过期时返回401状态码

### 2. API响应格式

**成功响应**:
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {},
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**错误响应**:
```json
{
  "success": false,
  "code": 400,
  "message": "操作失败",
  "errors": [],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 3. 分页响应格式

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [],
    "pagination": {
      "total": 100,
      "page": 1,
      "size": 20,
      "pages": 5
    }
  }
}
```

## 跨域配置

### 1. 后端CORS配置

```python
CORS(app, resources={
    r"/api/*": {
        "origins": [
          "http://localhost:5174",  # admin-dashboard
          "http://localhost:5175",  # system-admin
            "http://192.168.0.188:5174",  # Android开发环境
            "https://admin.aiinterview.com"  # 生产环境
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 86400
    }
})
```

### 2. 前端代理配置

**admin-dashboard (vite.config.ts)**:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    secure: false
  }
}
```

**system-admin (vite.config.ts)**:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    secure: false
  }
}
```

## 安全配置

### 1. 环境变量管理

**开发环境**:
```bash
FLASK_ENV=development
DEBUG=True
SECRET_KEY=dev-secret-key
```

**生产环境**:
```bash
FLASK_ENV=production
DEBUG=False
SECRET_KEY=production-secret-key
SESSION_COOKIE_SECURE=True
```

### 2. 权限控制

**角色定义**:
- `user`: 普通用户
- `admin`: 管理员
- `company`: 企业用户

**权限装饰器**:
```python
@role_required('admin')
def admin_only_function():
    pass
```

## 部署配置

### 1. 开发环境

**启动命令**:
```bash
# 启动所有服务
./start-system.sh

# 停止所有服务
./stop-system.sh
```

**服务地址**:
- 后端API: http://localhost:3001
- 管理后台: http://localhost:5174
- 系统管理: http://localhost:5175

### 2. 生产环境

**域名配置**:
- API服务: https://api.aiinterview.com
- 管理后台: https://admin.aiinterview.com
- 系统管理: https://system.aiinterview.com

**SSL证书**: 使用Let's Encrypt或商业SSL证书

## 监控与日志

### 1. 日志配置

**后端日志**:
- 级别: INFO/DEBUG
- 格式: 结构化JSON
- 存储: 文件 + 控制台

**前端日志**:
- 开发环境: 详细日志
- 生产环境: 错误日志

### 2. 健康检查

**健康检查接口**:
```
GET /health
```

**响应格式**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

## 故障排除

### 1. 常见问题

**跨域问题**:
- 检查CORS配置
- 确认前端代理设置
- 验证请求头设置

**认证失败**:
- 检查JWT令牌格式
- 验证令牌有效期
- 确认用户权限

**服务无法启动**:
- 检查端口占用
- 验证依赖安装
- 查看错误日志

### 2. 调试工具

**后端调试**:
- `npm run dev`（ts-node + nodemon 热重载）
- 应用日志（`logs/` 或控制台输出）
- Prisma 查询日志/`prisma studio`

**前端调试**:
- 浏览器开发者工具
- 网络请求监控
- 控制台日志

## 性能优化

### 1. 后端优化

- 数据库连接池
- Redis缓存
- API限流
- 异步处理

### 2. 前端优化

- 代码分割
- 懒加载
- 缓存策略
- 压缩优化

## 扩展性设计

### 1. 微服务架构

- 模块化设计
- 独立部署
- 服务发现
- 负载均衡

### 2. 数据库设计

- 分表策略
- 读写分离
- 缓存层
- 备份恢复

## 总结

AI面试系统采用现代化的微服务架构，各模块职责明确，通过标准化的API接口进行通信。系统具备良好的扩展性、安全性和可维护性，能够满足企业级应用的需求。

通过统一的认证机制、规范的API格式和完善的跨域配置，确保了各模块间的无缝协作。同时，完善的部署脚本和监控机制，为系统的稳定运行提供了保障。 
