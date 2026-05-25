# system-admin 部署指南

## 问题说明

本地开发正常，但部署到服务器后出现跨域错误。这是因为：
- **本地开发**：使用 Vite 的 proxy 功能，将 `/api` 请求代理到后端，不存在跨域
- **服务器部署**：构建后的静态文件直接请求后端 API，浏览器会检查 CORS

## 解决方案（二选一）

### 方案一：Nginx 反向代理（推荐 ⭐）

**优点**：
- 前端和后端在同一域名下，完全避免跨域
- 更好的性能和安全性
- 支持 HTTPS

**步骤**：

1. **构建前端项目**
```bash
cd system-admin
npm run build
```

2. **配置 Nginx**

参考 `nginx.conf.example` 文件，配置示例：

```nginx
server {
    listen 80;
    server_name admin.aiinterview.com;  # 你的域名
    
    # 前端静态文件
    location / {
        root /path/to/system-admin/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # 反向代理后端 API
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. **创建生产环境配置文件**
```bash
cp .env.production.example .env.production
# 编辑 .env.production，确保使用相对路径
```

`.env.production` 内容：
```env
VITE_API_BASE_URL=/api
VITE_UPLOAD_URL=/api/upload
```

4. **使用生产环境配置构建**
```bash
# 方式1：直接指定环境
npm run build -- --mode production

# 方式2：修改 package.json 中的 build 脚本
# "build": "tsc && vite build --mode production"
```

5. **重启 Nginx**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### 方案二：配置后端 CORS（快速方案）

**优点**：
- 配置简单，不需要 Nginx
- 适合快速测试

**缺点**：
- 仍然存在跨域请求
- 需要正确配置 CORS 允许的源

**步骤**：

1. **配置后端环境变量**

在后端（backend-api）的 `.env` 文件中添加：

```env
# 允许的系统管理后台域名
CORS_ORIGINS=https://admin.aiinterview.com,http://your-server-ip:5175
```

2. **前端使用完整后端 URL**

创建 `system-admin/.env.production`：

```env
VITE_API_BASE_URL=http://your-backend-server:3001/api
VITE_UPLOAD_URL=http://your-backend-server:3001/api/upload
VITE_SERVER_HOST=your-backend-server
VITE_SERVER_PORT=3001
```

3. **构建并部署**
```bash
npm run build
```

4. **将 dist 目录部署到服务器**

可以使用任何静态文件服务器（Nginx、Apache、Node.js 等）

---

## 验证部署

### 1. 检查前端是否正常加载
```bash
curl -I https://admin.aiinterview.com
# 应该返回 200
```

### 2. 检查 API 请求是否正常
打开浏览器开发者工具，查看 Network 标签：
- 请求 URL 应该是 `https://admin.aiinterview.com/api/...`（方案一）
- 或者 `http://backend-server:3001/api/...`（方案二）
- 不应该有 CORS 错误

### 3. 检查后端 CORS 日志
后端已添加请求日志中间件，会输出：
```
2026-05-24T10:00:00.000Z - POST /api/auth/login/admin - Origin: https://admin.aiinterview.com - Auth: Bearer ***
```

---

## 常见问题

### Q1: 部署后登录失败，提示 Network Error
**原因**：前端无法连接到后端 API

**解决**：
1. 检查 `.env.production` 中的 API URL 是否正确
2. 检查后端服务是否正常运行
3. 检查防火墙是否开放相应端口

### Q2: 登录成功但其他接口报 CORS 错误
**原因**：后端 CORS 配置不包含当前域名

**解决**：
1. 在后端 `.env` 中添加 `CORS_ORIGINS=https://your-domain.com`
2. 重启后端服务

### Q3: 使用 Nginx 方案但 API 请求 404
**原因**：Nginx 配置不正确

**解决**：
1. 检查 `proxy_pass` 地址是否正确
2. 检查后端是否监听在正确的地址和端口
3. 查看 Nginx 错误日志：`sudo tail -f /var/log/nginx/error.log`

### Q4: 静态资源加载失败（404）
**原因**：Vite 构建的 base path 配置问题

**解决**：
确保 `vite.config.ts` 中没有设置错误的 base：
```typescript
export default defineConfig({
  // 不要设置 base，或者设置为 '/'
  // base: '/',
  ...
})
```

---

## 生产环境检查清单

- [ ] 前端使用 `.env.production` 构建
- [ ] Nginx 配置正确（方案一）或后端 CORS 配置正确（方案二）
- [ ] 后端服务正常运行
- [ ] 数据库连接正常
- [ ] HTTPS 证书配置（如果使用域名）
- [ ] 防火墙开放必要端口（80/443）
- [ ] 测试登录功能
- [ ] 测试主要业务功能
- [ ] 检查浏览器控制台无 CORS 错误

---

## 回滚方案

如果部署后出现问题，可以快速回滚：

1. **保留旧版本**
```bash
cp -r /path/to/system-admin/dist /path/to/system-admin/dist.backup
```

2. **回滚**
```bash
rm -rf /path/to/system-admin/dist
cp -r /path/to/system-admin/dist.backup /path/to/system-admin/dist
sudo systemctl reload nginx
```

---

## 技术支持

如遇到其他问题，请：
1. 查看浏览器开发者工具的 Console 和 Network 标签
2. 查看后端日志
3. 查看 Nginx 访问和错误日志
4. 提供完整的错误信息和复现步骤
