FROM node:18-bullseye-slim AS builder
WORKDIR /app
COPY package*.json prisma ./
RUN npm ci
COPY tsconfig*.json ./
COPY src ./src
COPY public ./public
RUN npx prisma generate
RUN npm run build

FROM node:18-bullseye-slim
WORKDIR /app
ENV NODE_ENV=production
# 使用阿里云镜像源加速（解决国内网络 deb.debian.org 连接失败问题）
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list && \
    sed -i 's|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends --fix-missing openssl ffmpeg && \
    rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/node_modules ./node_modules
COPY /prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
EXPOSE 3001
CMD ["node","dist/index.js"]
