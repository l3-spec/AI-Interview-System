# 使用官方的 Node.js Alpine 基础镜像
FROM node:18-alpine

# 安装系统依赖并全局安装 serve
# 合并 RUN 指令可以减少镜像层数
RUN apk add --no-cache xsel && \
    npm install -g serve

# 设置工作目录
WORKDIR /app

# 复制包管理文件并安装项目依赖
COPY package*.json ./
RUN npm install

# 复制构建产物
COPY dist/ ./dist/

# 暴露应用端口 (这只是一个声明，实际映射需要在运行容器时使用 -p 参数)
EXPOSE 3001

# 启动应用
#CMD ["serve", "-s", "dist", "-l", "3001"]
CMD ["npm", "run", "dev"]
