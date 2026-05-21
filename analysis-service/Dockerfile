FROM node:18-bullseye-slim AS builder
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# 复制 package 文件并安装全量依赖（含 devDependencies 用于编译）
COPY package*.json ./
RUN npm ci

# 复制 Prisma schema 并生成客户端
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npx prisma generate

# 复制 TypeScript 源码并编译
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# ---- 生产镜像 ----
FROM node:18-bullseye-slim
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# 只安装 production 依赖
COPY package*.json ./
RUN npm ci --omit=dev

# 复制 Prisma 相关文件
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 复制编译产物
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3005

CMD ["node", "dist/index.js"]
