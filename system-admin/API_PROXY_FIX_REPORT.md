# system-admin API 请求问题修复报告

## 问题描述
system-admin 无法请求 Docker 部署的 backend-api（127.0.0.1:3001），而 admin-dashboard 可以正常工作。

## 根本原因

### 配置差异对比

| 配置项 | admin-dashboard | system-admin（修复前） |
|--------|----------------|----------------------|
| `.env` 中的 `VITE_API_BASE_URL` | `http://localhost:3001/api` | `http://localhost:3001/api` |
| 实际请求 URL | `http://localhost:3001/api/...` | `http://localhost:3001/api/...` |
| Vite proxy 是否生效 | ✅ 是 | ❌ 否 |

### 为什么 system-admin 的 proxy 不生效？

1. **admin-dashboard** 的工作流程：
   ```
   前端请求: /api/auth/login/admin
   ↓
   Vite proxy 拦截 /api 前缀
   ↓
   转发到: http://localhost:3001/api/auth/login/admin
   ✅ 成功
   ```

2. **system-admin**（修复前）的工作流程：
   ```
   axios baseURL = http://localhost:3001/api
   前端请求: http://localhost:3001/api/auth/login/admin
   ↓
   完整 URL 已包含域名，Vite proxy 不拦截
   ↓
   直接请求: http://localhost:3001/api/auth/login/admin
   ❌ 跨域问题 / Docker 网络问题
   ```

3. **关键代码**（`src/config/config.ts` 第 1 行）：
   ```typescript
   const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
   ```
   - 当 `.env` 设置为 `http://localhost:3001/api` 时
   - axios 的 `baseURL` 变成绝对路径
   - **Vite proxy 只对相对路径生效**

### 为什么 nginx 配置不生效？

- **开发环境**使用的是 Vite dev server（端口 5175），不是 nginx
- nginx 配置只在**生产环境部署**后生效
- 开发环境的代理完全依赖 `vite.config.ts` 中的 proxy 配置

## 修复方案

### 已实施的修改

#### 1. 修改 `.env` 文件
```diff
- VITE_API_BASE_URL=http://localhost:3001/api
+ VITE_API_BASE_URL=/api

- VITE_UPLOAD_URL=http://localhost:3001/api/upload
+ VITE_UPLOAD_URL=/api/upload
```

#### 2. 修改 `.env.example` 文件
同步更新示例配置，添加注释说明开发/生产环境的区别。

### 修复后的工作流程

```
前端请求: /api/auth/login/admin
↓
Vite proxy 拦截 /api 前缀（vite.config.ts）
↓
转发到: http://localhost:3001/api/auth/login/admin
↓
✅ 成功访问 Docker 中的 backend-api
```

## 验证步骤

1. **重启开发服务器**：
   ```bash
   cd system-admin
   npm run dev
   ```

2. **检查浏览器控制台**：
   - 打开 Network 标签
   - 查看请求 URL 应该是 `http://localhost:5175/api/...`
   - 不应该出现 `http://localhost:3001/api/...`

3. **检查 Vite 终端日志**：
   应该看到类似输出：
   ```
   Sending Request to the Target: GET /api/auth/verify
   Received Response from the Target: 200 /api/auth/verify
   ```

4. **测试登录功能**：
   - 访问 http://localhost:5175
   - 尝试登录
   - 应该能正常请求 backend-api

## 生产环境部署说明

### 使用 nginx 部署时的配置

生产环境中，需要修改 `.env.production`：
```env
VITE_API_BASE_URL=http://your-domain.com/api
# 或
VITE_API_BASE_URL=https://your-domain.com/api
```

nginx 配置（`nginx.conf.example`）已提供，关键配置：
```nginx
location /api {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    # ... 其他配置
}
```

### 前端构建命令
```bash
cd system-admin
npm run build
# 输出到 dist/ 目录
```

## 技术要点总结

### Vite Proxy 工作原理

1. **仅对相对路径生效**：
   - ✅ `/api/users` → 会被 proxy 拦截
   - ❌ `http://localhost:3001/api/users` → 直接请求，不经过 proxy

2. **配置位置**：`vite.config.ts` 的 `server.proxy`

3. **开发环境专用**：
   - 仅在 `npm run dev` 时生效
   - 构建后的生产代码不包含 proxy

### 环境变量加载规则

1. `.env` → 开发环境
2. `.env.production` → 生产环境构建
3. `.env.local` → 本地覆盖（不提交 git）

### 最佳实践

**开发环境**：
```env
VITE_API_BASE_URL=/api
```

**生产环境**：
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

**代码中**：
```typescript
// config.ts
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
```

## 相关文件清单

- ✅ `system-admin/.env` - 已修改
- ✅ `system-admin/.env.example` - 已修改
- `system-admin/vite.config.ts` - proxy 配置（无需修改）
- `system-admin/src/config/config.ts` - 环境变量读取（无需修改）
- `system-admin/src/services/api.ts` - axios 实例（无需修改）
- `system-admin/nginx.conf.example` - 生产环境 nginx 配置（参考）

## 修复时间
2026-05-25

## 状态
✅ 已修复，等待验证
