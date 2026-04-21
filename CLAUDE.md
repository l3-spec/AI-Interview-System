# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI面试系统是一个完整的智能面试解决方案，包含用户端Android应用、企业管理端、系统管理端和后端API服务。系统使用AI技术进行面试问题生成、语音合成、视频分析和职场素质评估。

## Architecture

### System Components

| Component | Technology | Port | Purpose |
|-----------|------------|------|---------|
| **backend-api** | Node.js + Express + TypeScript + Prisma | 3001 | Core API service, business logic, database access |
| **asr-service** | Node.js + TypeScript + WebSocket | 3002 | Qwen3-ASR 实时语音识别微服务 |
| **tts-service** | Node.js + TypeScript + WebSocket | 3003 | Qwen3-TTS 双轨混合流式语音合成微服务 |
| **admin-dashboard** | React + TypeScript + Ant Design + Vite | 5174 | Enterprise management UI for companies |
| **system-admin** | React + TypeScript + Ant Design + Vite | 5175 | System administration UI |
| **android-v0-compose** | Kotlin + Jetpack Compose | - | Mobile app for job seekers |

### Key Directories

- `backend-api/` - Backend API service with Prisma ORM
- `asr-service/` - Qwen3-ASR realtime speech recognition microservice
- `tts-service/` - Qwen3-TTS dual-track hybrid streaming TTS microservice
- `admin-dashboard/` - Enterprise management frontend
- `system-admin/` - System administration frontend  
- `android-v0-compose/` - Android mobile application
- `docs/` - Project documentation

## Common Commands

### Backend API (backend-api/)

```bash
# Development
npm run dev              # Start dev server with hot reload

# Build
npm run build            # TypeScript compilation

# Production
npm start                # Start production server

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio (DB GUI)
npm run seed             # Seed database

# Testing
npm test                 # Run Jest tests
npm run test:interview   # Run interview flow integration tests

# Code Quality
npm run lint             # ESLint check
npm run format           # Prettier formatting
```

### Admin Dashboard (admin-dashboard/)

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # ESLint check
npm run lint:fix         # Fix ESLint issues
```

### System Admin (system-admin/)

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # ESLint check
npm run lint:fix         # Fix ESLint issues
```

### Root Directory Helper Scripts

```bash
./start-dev.sh           # Start all services
./stop-system.sh         # Stop all services
./start-system.sh        # Alternative start script
```

## Configuration & Environment

### Required Environment Variables (backend-api/.env)

```
DATABASE_URL="mysql://user:password@localhost:3306/ai_interview"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-jwt-secret"
DEEPSEEK_API_KEY="your-deepseek-key"
AZURE_TTS_KEY="your-azure-key"
ALIYUN_OSS_ACCESS_KEY_ID="your-oss-key"
ALIYUN_OSS_ACCESS_KEY_SECRET="your-oss-secret"
ALIYUN_OSS_BUCKET="your-bucket-name"
```

### Database

- **ORM**: Prisma
- **Schema**: `backend-api/prisma/schema.prisma`
- **Migrations**: `backend-api/prisma/migrations/`

## Key Services & Integrations

- **DeepSeek API**: AI question generation and answer analysis
- **Qwen3-ASR (DashScope)**: Realtime speech recognition via WebSocket (asr-service)
- **Qwen3-TTS (DashScope)**: Dual-track hybrid streaming TTS via WebSocket (tts-service)
- **阿里云OSS**: Video and file storage
- **Redis Pub/Sub**: Cross-service communication between backend-api and ASR/TTS services
- **Socket.IO**: Real-time communication for interview flow control

## Development Workflow

1. **Database changes**: Modify Prisma schema, run `npm run prisma:migrate`
2. **API development**: Work in `backend-api/src/`, uses Express + TypeScript
3. **Frontend development**: React + Ant Design in `admin-dashboard/` or `system-admin/`
4. **Code quality**: Run lint before commits, follow TypeScript strict mode

## API Documentation

Swagger UI available at `http://localhost:3001/api-docs` when backend is running.

## Cursor Rules

This project has `.cursor/` rules that provide additional context for AI assistants. Key rules include:
- `.cursor/rules/project-overview.mdc` - High-level project overview
- `.cursor/rules/backend-conventions.mdc` - Backend coding conventions
- `.cursor/rules/frontend-conventions.mdc` - Frontend coding conventions
- `.cursor/rules/api.mdc` - API design guidelines
