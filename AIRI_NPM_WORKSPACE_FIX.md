# AIRI项目 - npm workspace协议问题修复指南

## 🚨 问题分析

您遇到的错误：
```
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "workspace:": workspace:^
```

这是因为AIRI项目使用了pnpm的workspace功能，而npm不支持`workspace:`协议。

## 🔧 解决方案

### 方案1: 强制使用pnpm（推荐）

```bash
# 1. 确保pnpm版本是最新的
npm install -g pnpm@latest

# 2. 验证pnpm版本
pnpm --version  # 应该显示 10.x.x

# 3. 清理项目
cd airi
rm -rf node_modules pnpm-lock.yaml

# 4. 使用pnpm安装（强制忽略lockfile）
pnpm install --no-frozen-lockfile --ignore-scripts
```

### 方案2: 修改package.json移除workspace依赖

```bash
# 1. 备份原始package.json
cp package.json package.json.backup

# 2. 查找并替换workspace:依赖
# 使用sed命令替换workspace:协议
find . -name "package.json" -exec sed -i '' 's/"workspace:\^"/"*"/g' {} \;
find . -name "package.json" -exec sed -i '' 's/"workspace:\*"/"*"/g' {} \;

# 3. 使用npm安装
npm install
```

### 方案3: 使用yarn（支持workspace）

```bash
# 1. 安装yarn
npm install -g yarn

# 2. 清理项目
cd airi
rm -rf node_modules pnpm-lock.yaml

# 3. 使用yarn安装
yarn install
```

## 🚀 完整修复步骤

### 步骤1: 强制使用pnpm

```bash
# 更新pnpm到最新版本
npm install -g pnpm@latest

# 验证版本
pnpm --version
```

### 步骤2: 清理并重新安装

```bash
# 进入AIRI项目目录
cd airi

# 清理所有依赖和缓存
rm -rf node_modules pnpm-lock.yaml
pnpm store prune

# 强制重新安装（忽略lockfile和脚本）
pnpm install --no-frozen-lockfile --ignore-scripts
```

### 步骤3: 如果仍有问题，手动修复workspace依赖

```bash
# 查找所有package.json文件中的workspace依赖
find . -name "package.json" -exec grep -l "workspace:" {} \;

# 手动编辑这些文件，将workspace:替换为*
# 例如：将 "workspace:^" 替换为 "*"
```

### 步骤4: 启动服务

```bash
# 检查可用的启动脚本
cat package.json | grep -A 5 '"scripts"'

# 启动开发服务器
pnpm run dev
```

## 🔍 详细故障排除

### 问题1: pnpm安装失败

```bash
# 尝试不同的安装选项
pnpm install --no-frozen-lockfile --ignore-scripts --shamefully-hoist

# 或者跳过可选依赖
pnpm install --no-optional --no-frozen-lockfile
```

### 问题2: 特定包安装失败

```bash
# 查看具体错误信息
pnpm install --verbose

# 跳过有问题的包
pnpm install --no-frozen-lockfile --ignore-scripts --filter=!@airi/component-calling
```

### 问题3: 网络问题

```bash
# 使用国内镜像
pnpm config set registry https://registry.npmmirror.com/

# 或者使用npm镜像
npm config set registry https://registry.npmmirror.com/
```

## 📋 手动修复workspace依赖

如果自动修复不成功，可以手动编辑package.json文件：

### 1. 查找workspace依赖

```bash
# 查找所有包含workspace的package.json
find . -name "package.json" -exec grep -l "workspace:" {} \;
```

### 2. 手动替换

对于每个找到的文件，将：
```json
{
  "dependencies": {
    "@airi/some-package": "workspace:^"
  }
}
```

替换为：
```json
{
  "dependencies": {
    "@airi/some-package": "*"
  }
}
```

### 3. 批量替换命令

```bash
# 使用sed批量替换（macOS）
find . -name "package.json" -exec sed -i '' 's/"workspace:\^"/"*"/g' {} \;
find . -name "package.json" -exec sed -i '' 's/"workspace:\*"/"*"/g' {} \;
find . -name "package.json" -exec sed -i '' 's/"workspace:">=1.0.0"/"*"/g' {} \;
```

## 🎯 快速修复脚本

创建一个快速修复脚本：

```bash
cat > fix-airi-workspace.sh << 'EOF'
#!/bin/bash

echo "修复AIRI项目workspace依赖问题..."

# 更新pnpm
echo "1. 更新pnpm..."
npm install -g pnpm@latest

# 进入项目目录
cd airi

# 清理
echo "2. 清理项目..."
rm -rf node_modules pnpm-lock.yaml
pnpm store prune

# 尝试pnpm安装
echo "3. 尝试pnpm安装..."
if pnpm install --no-frozen-lockfile --ignore-scripts; then
    echo "✅ pnpm安装成功"
else
    echo "❌ pnpm安装失败，尝试修复workspace依赖..."
    
    # 修复workspace依赖
    find . -name "package.json" -exec sed -i '' 's/"workspace:\^"/"*"/g' {} \;
    find . -name "package.json" -exec sed -i '' 's/"workspace:\*"/"*"/g' {} \;
    
    # 尝试npm安装
    echo "4. 尝试npm安装..."
    if npm install; then
        echo "✅ npm安装成功"
    else
        echo "❌ npm安装也失败，尝试yarn..."
        npm install -g yarn
        yarn install
    fi
fi

echo "修复完成！"
EOF

chmod +x fix-airi-workspace.sh
./fix-airi-workspace.sh
```

## 💡 建议

1. **优先使用pnpm**：AIRI项目设计为使用pnpm
2. **更新到最新版本**：避免版本兼容性问题
3. **使用--no-frozen-lockfile**：允许更新依赖版本
4. **备用方案**：如果pnpm有问题，手动修复workspace依赖

## 🎉 成功标志

当您看到以下输出时，说明修复成功：

```
✓  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

然后就可以在浏览器中访问 `http://localhost:3000` 体验AIRI数字人了！

## 📞 如果仍有问题

如果以上方案都不行，可以：

1. **查看详细日志**：`pnpm install --verbose`
2. **跳过有问题的包**：使用`--filter`选项
3. **使用Docker**：如果项目提供Docker支持
4. **联系项目维护者**：在GitHub上提交Issue
