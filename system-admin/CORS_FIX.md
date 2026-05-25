# system-admin 跨域问题快速修复指南

## 🚨 问题症状

部署到服务器后，浏览器控制台出现以下错误：
```
Access to XMLHttpRequest at 'http://server:3001/api/...' from origin 'https://admin.aiinterview.com' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ✅ 快速修复（3 选 1）

### 修复方案 1：使用 Nginx 反向代理（⭐⭐⭐ 推荐）

**适合场景**：正式生产环境

**操作步骤**：

```bash
# 1. 在服务器上创建 Nginx 配置
sudo nano /etc/nginx/sites-available/system-admin

# 2. 复制以下内容（修改域名和路径）
```

```nginx
server {
    listen 80;
    server_name admin.aiinterview.com;  # 改成你的域名
    
    # 前端
    location / {
        root /var/www/system-admin/dist;  # 改成实际路径
        try_files $uri $uri/ /index.html;
    }
    
    # 后端 API 代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# 3. 启用配置
sudo ln -s /etc/nginx/sites-available/system-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

```bash
# 4. 构建前端（使用相对路径）
cd system-admin
echo "VITE_API_BASE_URL=/api" > .env.production
echo "VITE_UPLOAD_URL=/api/upload" >> .env.production
npm run build:prod

# 5. 部署到服务器
scp -r dist/* user@server:/var/www/system-admin/dist/
```

**✅ 优点**：
- 彻底解决跨域
- 性能更好
- 支持 HTTPS

---

### 修复方案 2：修改后端 CORS 配置（⭐⭐ 快速）

**适合场景**：快速测试、内网部署

**操作步骤**：

```bash
# 1. 修改后端配置
cd backend-api
nano .env

# 2. 添加或修改这行（改成你的前端域名）
CORS_ORIGINS=https://admin.aiinterview.com,http://your-server-ip:5175

# 3. 重启后端服务
# 如果使用 PM2
pm2 restart backend-api

# 如果使用 systemd
sudo systemctl restart backend-api
```

```bash
# 4. 重新构建前端（使用完整后端 URL）
cd system-admin
cat > .env.production << EOF
VITE_API_BASE_URL=http://your-backend-server:3001/api
VITE_UPLOAD_URL=http://your-backend-server:3001/api/upload
EOF

npm run build:prod

# 5. 部署到服务器
```

**⚠️ 注意**：
- 需要将 `your-backend-server` 替换为实际的后端服务器地址
- 确保后端端口 3001 可以被前端访问

---

### 修复方案 3：临时开发模式（⭐ 仅测试）

**适合场景**：临时调试、开发测试

**操作步骤**：

```bash
# 1. 修改后端代码（临时）
cd backend-api
nano src/app.ts

# 2. 找到 CORS 配置，临时改为：
const corsOptions = {
  origin: true,  // 允许所有源（仅测试用！）
  // ... 其他配置保持不变
};

# 3. 重启后端

# 4. 前端直接使用后端完整 URL
cd system-admin
cat > .env.production << EOF
VITE_API_BASE_URL=http://your-backend-server:3001/api
EOF
npm run build:prod
```

**🚨 警告**：
- **绝对不能用于生产环境**
- 存在安全风险
- 仅用于快速验证功能

---

## 🔍 验证修复

### 1. 检查后端日志
```bash
# 查看后端是否收到请求
tail -f /path/to/backend-api/logs/app.log

# 应该看到类似这样的日志：
# 2026-05-24T10:00:00.000Z - POST /api/auth/login/admin - Origin: https://admin.aiinterview.com
```

### 2. 检查浏览器控制台
打开开发者工具 → Console：
- ✅ 没有 CORS 错误
- ✅ 能看到 API 请求成功

### 3. 检查 Network 标签
打开开发者工具 → Network：
- 请求状态码应该是 200
- 响应头中应该包含 `Access-Control-Allow-Origin`

---

## 📋 检查清单

完成修复后，逐项检查：

- [ ] 后端服务正常运行
- [ ] 后端 CORS 配置包含前端域名
- [ ] 前端使用正确的 API 地址
- [ ] 防火墙开放必要端口
- [ ] 浏览器无 CORS 错误
- [ ] 可以正常登录
- [ ] 可以正常访问数据

---

## 🆘 仍然有问题？

### 收集以下信息：

1. **浏览器控制台错误**（完整截图）
2. **Network 请求详情**：
   - 请求 URL
   - 请求头（Request Headers）
   - 响应头（Response Headers）
3. **后端日志**（最近 50 行）
4. **Nginx 配置**（如果使用）
5. **环境变量配置**：
   - `system-admin/.env.production`
   - `backend-api/.env`

### 常见错误码

| 错误码 | 原因 | 解决方案 |
|--------|------|----------|
| CORS error | 跨域被阻止 | 配置 Nginx 或后端 CORS |
| 404 Not Found | API 路径错误 | 检查 API_BASE_URL |
| 502 Bad Gateway | 后端未启动 | 启动后端服务 |
| 504 Gateway Timeout | 后端响应超时 | 检查后端性能 |
| 401 Unauthorized | Token 无效 | 重新登录 |

---

## 💡 最佳实践

1. **生产环境务必使用 Nginx 反向代理**
2. **使用环境变量管理配置**
3. **不要在代码中硬编码 URL**
4. **配置 HTTPS 证书**
5. **定期备份配置文件**

---

## 📚 相关文档

- [完整部署指南](DEPLOYMENT.md)
- [Nginx 配置示例](nginx.conf.example)
- [生产环境配置示例](.env.production.example)
- [后端 CORS 配置示例](../backend-api/.env.cors.example)
