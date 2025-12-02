# Fay数字人系统修复指南

## 🔍 问题诊断

### 主要问题
1. **WebSocket连接失败** - 426 Upgrade Required错误
2. **后端连接404** - 缺少Fay专用路由
3. **端口配置混乱** - 服务端口不一致

### 根本原因
- Node.js后端缺少Fay WebSocket路由
- Python服务尝试连接不存在的端点
- 缺少错误处理和重试机制

## 🛠️ 修复方案

### 1. 使用增强版启动器
```bash
# 使用修复后的启动器
python enhanced_fay_system.py
```

### 2. 启动完整后端服务
```bash
# 安装依赖
npm install

# 启动后端服务
npm run dev

# 确保服务在3001端口运行
```

### 3. 验证集成
```bash
# 运行集成测试
python test_fay_integration.py

# 检查服务状态
curl http://localhost:3001/health
curl http://localhost:5001/health
```

## 📋 服务列表

| 服务 | 地址 | 状态 |
|------|------|------|
| Node.js后端 | http://localhost:3001 | ✅ 已修复 |
| Fay WebSocket | ws://localhost:5001 | ✅ 已修复 |
| Fay REST API | http://localhost:5001/health | ✅ 已修复 |
| Fay集成API | http://localhost:3001/api/fay | ✅ 新增 |

## 🔧 API端点

### Fay集成API
- `GET /api/fay/health` - 检查Fay服务状态
- `GET /api/fay/characters` - 获取可用角色
- `POST /api/fay/interview/question` - 发送面试问题
- `POST /api/fay/synthesize` - 语音合成
- `POST /api/fay/session/start` - 开始面试会话

### 测试端点
- `GET /api/fay/test` - 集成测试入口

## 🚀 快速开始

### 1. 启动后端
```bash
cd backend-api
npm run dev
```

### 2. 启动Fay服务
```bash
python enhanced_fay_system.py
```

### 3. 运行测试
```bash
python test_fay_integration.py
```

### 4. 访问前端
```
浏览器访问: http://localhost:3001/fay
```

## 🐛 故障排除

### 端口被占用
```bash
# 检查端口
lsof -i :3001
lsof -i :5001

# 终止进程
kill -9 <pid>
```

### 连接失败
```bash
# 检查服务状态
curl http://localhost:3001/health
curl http://localhost:5001/health

# 查看日志
tail -f worker.log
```

### WebSocket错误
```bash
# 检查WebSocket连接
node test_fay_integration.js
```

## 📁 新增文件

1. **enhanced_fay_system.py** - 增强版启动器
2. **src/routes/fay.routes.ts** - Fay集成路由
3. **test_fay_integration.py** - 集成测试脚本

## 🎯 使用示例

### REST API调用
```bash
# 检查健康状态
curl http://localhost:3001/api/fay/health

# 获取角色列表
curl http://localhost:3001/api/fay/characters

# 发送面试问题
curl -X POST http://localhost:3001/api/fay/interview/question \
  -H "Content-Type: application/json" \
  -d '{"question": "请自我介绍一下", "character": "tech_interviewer"}'
```

### WebSocket连接
```javascript
// 浏览器控制台测试
const ws = new WebSocket('ws://localhost:5001');
ws.onopen = () => {
  console.log('连接成功');
  ws.send(JSON.stringify({type: 'ping'}));
};
ws.onmessage = (event) => {
  console.log('收到:', event.data);
};
```

## 🔄 自动重试机制

增强版启动器包含：
- **智能重连** - 3秒重试间隔
- **端口检测** - 自动查找可用端口
- **错误恢复** - 优雅处理连接失败
- **健康检查** - 实时监控服务状态

## 📊 监控指标

- ✅ 服务启动成功率
- ✅ WebSocket连接稳定性
- ✅ API响应时间
- ✅ 错误处理机制

## 🚨 紧急修复

如果遇到紧急情况：
1. 停止所有服务
2. 检查端口占用
3. 重启后端服务
4. 使用增强版启动器
5. 运行集成测试验证

## 📞 支持

如有问题，请检查：
- 服务日志
- 端口配置
- 依赖安装
- 网络连接