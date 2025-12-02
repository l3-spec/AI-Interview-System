# Fay数字人服务启动指南

## 🎯 系统架构

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Node.js后端   │ ←──────────────→ │   Fay数字人     │
│   (端口3001)    │                 │   (端口5001)    │
└─────────────────┘                 └─────────────────┘
         │                                   │
         │ HTTP                              │ WebSocket
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│   前端界面      │                 │   语音交互      │
│   (浏览器)      │                 │   (TTS/STT)     │
└─────────────────┘                 └─────────────────┘
```

## 🚀 启动步骤

### 1. 启动Node.js后端
```bash
cd backend-api
npm run dev
```

### 2. 启动Fay数字人服务
```bash
cd backend-api
python start_fay_system.py
```

### 3. 测试系统
```bash
cd backend-api
python test_fay_integration.py
```

## 📊 服务状态检查

### 检查Node.js后端
```bash
curl http://localhost:3001/health
```

### 检查Fay服务
```bash
curl http://127.0.0.1:5001/health
```

### 检查WebSocket连接
```bash
# 使用wscat工具测试
wscat -c ws://127.0.0.1:5001
```

## 🎭 使用Fay数字人

### 访问地址
- **主界面**: http://localhost:3001
- **Fay数字人**: http://localhost:3001/fay
- **Live2D备用**: http://localhost:3001/avatar

### 面试官角色
1. **技术面试官** - 专业严谨的技术面试风格
2. **HR面试官** - 亲切友好的HR面试风格  
3. **压力面试官** - 挑战性的压力面试风格

### 使用流程
1. 访问 http://localhost:3001/fay
2. 选择面试官角色
3. 点击"开始面试"
4. 允许麦克风权限
5. 开始语音对话

## 🔧 调试工具

### 端口检查
```bash
# 检查端口占用
lsof -i :3001  # Node.js后端
lsof -i :5001  # Fay服务
```

### 日志查看
```bash
# 查看Fay服务日志
tail -f fay_simulation.log

# 查看后端日志
npm run dev  # 在另一个终端运行
```

### 进程管理
```bash
# 查看Python进程
ps aux | grep python | grep fay

# 查看Node.js进程
ps aux | grep node
```

## 🛠️ 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 查找占用端口的进程
lsof -i :3001
lsof -i :5001

# 杀死进程
kill -9 <PID>
```

#### 2. 依赖缺失
```bash
# 安装Python依赖
pip install flask flask-cors websockets

# 安装Node.js依赖
npm install
```

#### 3. WebSocket连接失败
- 检查防火墙设置
- 确保使用正确的地址 (127.0.0.1 而不是 localhost)
- 检查端口是否被占用

#### 4. 麦克风权限问题
- 确保浏览器允许麦克风访问
- 检查系统麦克风设置
- 尝试刷新页面重新授权

## 📝 配置文件

### 环境变量
创建 `.env` 文件（可选）：
```env
# 服务器配置
PORT=3001
FAY_PORT=5001

# 调试模式
DEBUG=true

# TTS配置
TTS_PROVIDER=aliyun
```

### Fay服务配置
在 `fay_simulation.py` 中可以调整：
- 端口号 (默认5001)
- 角色配置
- 问题库
- 响应模板

## 🎯 测试验证

### 自动化测试
```bash
python test_fay_integration.py
```

### 手动测试
1. 启动两个服务
2. 运行测试脚本
3. 检查所有测试通过
4. 在浏览器中测试界面

## 💡 最佳实践

1. **启动顺序**: 先启动Node.js后端，再启动Fay服务
2. **端口管理**: 确保端口3001和5001未被占用
3. **日志监控**: 关注服务启动日志，及时发现问题
4. **定期测试**: 使用测试脚本验证服务状态
5. **优雅停止**: 使用Ctrl+C停止服务，避免强制终止

## 🔄 更新维护

### 更新Fay服务
```bash
# 停止服务
Ctrl+C

# 更新代码
git pull

# 重新启动
python start_fay_system.py
```

### 更新后端
```bash
# 停止服务
Ctrl+C

# 更新依赖
npm install

# 重新启动
npm run dev
```

---

**注意**: 本指南适用于开发环境。生产环境部署请参考相应的部署文档。 