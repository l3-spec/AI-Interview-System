# AI 面试系统服务启动清单

本清单说明如何在本地同时启动企业管理端、系统管理端以及所需的后端 API 服务，并明确各模块依赖关系。

## 1. 后端服务

### backend-api（核心业务 API，端口 3001）

1. 复制环境变量模板：
   ```bash
   cd backend-api
   cp env.example .env
   ```
   - 开发阶段可直接使用 SQLite：`DATABASE_URL="file:./dev.db"`
   - 如需 MySQL，请修改 `DATABASE_URL`，随后执行 `npm run prisma:migrate`。
2. 安装依赖并启动：
   ```bash
   npm install
   npm run dev
   ```
3. 验证服务：访问 `http://localhost:3001/health` 或 Swagger 文档 `http://localhost:3001/api/docs`。

> 企业端、系统管理端以及短信验证码接口都依赖 `backend-api`。生产部署时也应暴露 `backend-api` 给管理端使用。

### backend（面向移动端的轻量 API，端口 3000，可选）

1. 复制环境变量：`cp backend/.env.example backend/.env`（若存在）。
2. 安装依赖并启动：
   ```bash
   cd backend
   npm install
   npm run dev
   ```
3. Android 客户端默认访问 `http://<server>:3000/api/`。

## 2. 前端应用

### 企业管理端（admin-dashboard，端口 5174）

1. 如果需要自定义 API 地址，复制模板：
   ```bash
   cd admin-dashboard
   cp .env.example .env
   # 根据环境设置 VITE_API_BASE_URL，例如 http://localhost:3001/api
   ```
2. 安装依赖并启动：
   ```bash
   npm install
   npm run dev
   ```
3. 访问 `http://localhost:5174`，并使用企业账号登录（默认账号见 `backend-api/.env`）。

### 系统管理端（system-admin，端口 5175）

1. 配置环境变量：
   ```bash
   cd system-admin
   cp .env.example .env
   # 如需更改 API/上传地址，可编辑 VITE_API_BASE_URL、VITE_UPLOAD_URL 等
   ```
2. 安装依赖并启动：
   ```bash
   npm install
   npm run dev
   ```
3. 访问 `http://localhost:5175`，使用系统管理员账号登录。

## 3. 一键启动（可选）

根目录提供 `start-all-services.sh`，会按以下流程启动：

- backend-api（端口 3001）
- admin-dashboard（端口 5174）
- system-admin（端口 5175）

脚本会自动创建最小 `.env`，输出日志到 `logs/`。在首次运行前仍建议手动检查并完善 `backend-api/.env` 中的数据库、短信等配置。

## 4. 端口与依赖关系概览

| 模块 | 端口 | 依赖 | 说明 |
| --- | --- | --- | --- |
| backend-api | 3001 | Prisma 数据库、可选 Redis | 管理端与验证码等核心接口 |
| backend | 3000 | Sequelize 数据库 | 移动端/对外轻量接口 |
| admin-dashboard | 5174 | backend-api | 企业侧后台（登录 `/auth/login/company`） |
| system-admin | 5175 | backend-api | 系统运营后台（登录 `/auth/login/admin`） |

## 5. 调试建议

- 如管理端请求报错，首先检查 `backend-api` 日志与 `/health` 接口。
- 构建模式下需显式配置 `VITE_API_BASE_URL` 指向真实后端地址，例如 `https://api.example.com/api`。
- Android 调试如需访问管理接口，可将 `RetrofitClient` 指向 `backend-api` 或在 `backend` 中透传相关路由。
- 使用短信服务前，确认 `backend-api/.env` 中的 `SMS_PROVIDER` 及相应密钥已配置，并重启服务。

按照此清单逐项完成，即可在本地同时运行企业端、系统管理端与各自对应的后端服务。

