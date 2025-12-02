# AIRI手动部署指南（解决pnpm版本问题）

## 🚨 问题分析

您遇到的问题是：
1. **pnpm版本不兼容**：当前pnpm 8.4.0，项目需要更新版本
2. **lockfile损坏**：pnpm-lock.yaml文件不兼容
3. **依赖解析失败**：某些包无法正确解析

## 🔧 解决方案

### 方案1: 更新pnpm版本（推荐）

```bash
# 1. 更新pnpm到最新版本
npm install -g pnpm@latest

# 2. 验证版本
pnpm --version  # 应该显示 10.x.x

# 3. 清理AIRI项目
cd airi
rm -rf node_modules pnpm-lock.yaml

# 4. 重新安装依赖
pnpm install
```

### 方案2: 使用npm替代pnpm

```bash
# 1. 进入AIRI项目目录
cd airi

# 2. 清理pnpm相关文件
rm -rf node_modules pnpm-lock.yaml

# 3. 使用npm安装依赖
npm install

# 4. 启动服务
npm run dev
```

### 方案3: 使用yarn

```bash
# 1. 安装yarn（如果没有）
npm install -g yarn

# 2. 进入AIRI项目目录
cd airi

# 3. 清理pnpm相关文件
rm -rf node_modules pnpm-lock.yaml

# 4. 使用yarn安装依赖
yarn install

# 5. 启动服务
yarn dev
```

## 🚀 完整手动部署步骤

### 步骤1: 准备环境

```bash
# 检查Node.js版本（需要16+）
node --version

# 更新pnpm到最新版本
npm install -g pnpm@latest

# 验证pnpm版本
pnpm --version
```

### 步骤2: 清理并重新安装

```bash
# 进入AIRI项目目录
cd airi

# 清理所有依赖和缓存
rm -rf node_modules pnpm-lock.yaml
pnpm store prune

# 重新安装依赖
pnpm install --no-frozen-lockfile
```

### 步骤3: 配置环境变量

```bash
# 创建环境配置文件
cat > .env << EOF
# AIRI基础配置
NODE_ENV=development
PORT=3000
HOST=localhost

# 数据库配置
DATABASE_URL=file:./data.db

# AI模型配置 - 选择一个即可
# OpenAI GPT（推荐）
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# 或者使用阿里云DashScope
# DASHSCOPE_API_KEY=your_dashscope_api_key
# DASHSCOPE_MODEL=qwen-turbo

# 语音服务配置
# Azure Speech Services
# AZURE_SPEECH_KEY=your_azure_speech_key
# AZURE_SPEECH_REGION=eastasia
# AZURE_SPEECH_VOICE=zh-CN-XiaoxiaoNeural

# 安全配置
JWT_SECRET=your-super-secret-jwt-key-change-this
CORS_ORIGIN=http://localhost:3000

# 数字人配置
CHARACTER_ID=interviewer
CHARACTER_NAME=AI面试官
CHARACTER_PERSONALITY=professional
EOF
```

### 步骤4: 启动服务

```bash
# 检查可用的启动脚本
cat package.json | grep -A 5 '"scripts"'

# 启动开发服务器
pnpm run dev

# 或者使用npm
npm run dev

# 或者使用yarn
yarn dev
```

### 步骤5: 访问服务

打开浏览器访问：`http://localhost:3000`

## 🔍 故障排除

### 问题1: pnpm版本不兼容

```bash
# 解决方案：更新pnpm
npm install -g pnpm@latest

# 或者使用npm替代
npm install
npm run dev
```

### 问题2: 依赖安装失败

```bash
# 清理缓存
pnpm store prune
npm cache clean --force

# 删除node_modules和lockfile
rm -rf node_modules pnpm-lock.yaml package-lock.json

# 重新安装
pnpm install --no-frozen-lockfile
```

### 问题3: 端口被占用

```bash
# 查看端口占用
lsof -i :3000

# 杀死占用进程
kill -9 <PID>

# 或者修改端口
# 编辑 .env 文件，修改 PORT=3001
```

### 问题4: 权限问题

```bash
# 修复文件权限
sudo chown -R $USER:$USER airi/
chmod +x start-airi.sh
```

## 📱 创建启动脚本

```bash
# 回到项目根目录
cd ..

# 创建启动脚本
cat > start-airi.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/airi"
echo "启动AIRI服务..."

# 检查是否有package.json
if [ ! -f "package.json" ]; then
    echo "错误: package.json文件不存在"
    exit 1
fi

# 检查可用的启动脚本
if grep -q '"dev"' package.json; then
    echo "使用 pnpm run dev 启动..."
    pnpm run dev
elif grep -q '"start"' package.json; then
    echo "使用 pnpm start 启动..."
    pnpm start
else
    echo "错误: 未找到可用的启动脚本"
    exit 1
fi
EOF

chmod +x start-airi.sh
```

## 🎯 快速修复命令

如果您想快速修复当前问题，运行以下命令：

```bash
# 1. 更新pnpm
npm install -g pnpm@latest

# 2. 清理AIRI项目
cd airi
rm -rf node_modules pnpm-lock.yaml

# 3. 重新安装依赖
pnpm install --no-frozen-lockfile

# 4. 启动服务
pnpm run dev
```

## 💡 建议

1. **使用最新版本的pnpm**：避免版本兼容性问题
2. **定期清理缓存**：`pnpm store prune`
3. **使用--no-frozen-lockfile**：允许更新依赖版本
4. **备用方案**：如果pnpm有问题，使用npm或yarn

## 🎉 成功标志

当您看到以下输出时，说明部署成功：

```
✓  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

然后就可以在浏览器中访问 `http://localhost:3000` 体验AIRI数字人了！
