# AI数字人面试系统 - 端到端测试指南

## 系统架构概览

### 前端组件
- **InterviewDigitalHumanActivity.kt**: 面试流程主界面
- **SpeechRecognitionService.kt**: 语音识别服务
- **DigitalHumanService.kt**: 数字人集成服务

### 后端API
- **POST /api/interview-plan/plan**: 生成面试计划
- **GET /api/interview-plan/templates**: 获取面试模板
- **POST /api/test/echo**: 回显测试

### 核心功能
1. **数字人介绍**: 自动介绍面试流程
2. **语音输入**: 通过语音收集用户求职目标和个人背景
3. **AI生成**: 使用DeepSeek API生成定制化面试问题
4. **面试执行**: 启动正式面试流程

## 测试环境准备

### 1. 后端环境配置
```bash
# 在 backend-api 目录下
npm install
npm run dev

# 环境变量配置 (.env)
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
DEEPSEEK_MODEL=deepseek-chat
```

### 2. Android环境配置
```bash
# 在 android-app 目录下
./gradlew assembleDebug
# 或使用 Android Studio 运行
```

### 3. 网络配置
- 后端API地址: `http://10.0.2.2:3000` (Android模拟器)
- 真机测试: 使用局域网IP地址

## 端到端测试步骤

### 步骤1: 系统健康检查
```bash
# 测试后端API
curl -X GET http://localhost:3000/api/test/health

# 期望响应:
{
  "success": true,
  "message": "AI面试系统健康检查",
  "services": {
    "deepseek": "configured",
    "database": "connected",
    "digitalHuman": "ready"
  }
}
```

### 步骤2: 面试计划生成测试
```bash
# 测试面试计划生成
curl -X POST http://localhost:3000/api/interview-plan/plan \
  -H "Content-Type: application/json" \
  -d '{
    "jobTarget": "Java后端开发工程师",
    "userBackground": "3年Java开发经验，熟悉Spring Boot、MySQL、Redis，有微服务架构经验",
    "experienceLevel": "中级",
    "skills": ["Java", "Spring Boot", "MySQL", "Redis", "微服务"],
    "questionCount": 8
  }'
```

### 步骤3: Android端功能测试

#### 3.1 启动应用
1. 打开应用 → 点击"面试数字人"
2. 检查数字人是否成功启动

#### 3.2 语音输入测试
1. 点击"语音回答"按钮
2. 说出测试内容："我想面试Java后端开发工程师"
3. 验证语音识别结果是否正确显示

#### 3.3 完整流程测试
1. **第一阶段**: 数字人介绍面试流程
2. **第二阶段**: 语音输入求职目标
3. **第三阶段**: 语音输入个人背景
4. **第四阶段**: 自动生成面试计划
5. **第五阶段**: 启动正式面试

### 步骤4: 集成测试用例

#### 测试用例1: 正常流程测试
```
输入:
- 职位: "前端开发工程师"
- 背景: "2年React开发经验，熟悉Vue、TypeScript"

期望:
- 生成8个定制化面试问题
- 预计时长约28分钟
- 重点涵盖: 技术能力、项目经验、团队协作
```

#### 测试用例2: 边界条件测试
```
输入:
- 职位: "" (空值)
- 背景: "" (空值)

期望:
- 返回400错误
- 提示"缺少必要参数"
```

#### 测试用例3: 网络异常测试
```
场景: 断开网络连接
期望:
- 显示错误提示
- 提供重试选项
- 优雅降级处理
```

## 调试信息

### Android日志
```bash
# 查看应用日志
adb logcat | grep InterviewDigitalHuman

# 查看网络请求
adb logcat | grep OkHttp
```

### 后端日志
```bash
# 查看DeepSeek API调用
npm run dev:debug

# 查看请求日志
# 日志包含: 面试计划生成、问题定制、响应时间
```

## 性能指标

### 响应时间
- 面试计划生成: < 30秒
- 语音识别: < 5秒
- 数字人启动: < 10秒

### 准确率
- 语音识别准确率: > 90%
- 问题相关性: > 85%
- 系统可用性: > 99%

## 常见问题解决

### 问题1: 语音识别失败
```
症状: 语音按钮无响应
解决:
1. 检查录音权限
2. 重启应用
3. 检查网络连接
```

### 问题2: 面试计划生成超时
```
症状: 30秒后无响应
解决:
1. 检查DeepSeek API配置
2. 验证网络连接
3. 查看后端日志
```

### 问题3: 数字人启动失败
```
症状: 显示"数字人未启动"
解决:
1. 检查配置文件
2. 验证阿里云凭证
3. 重启数字人服务
```

## 成功验证标准

### ✅ 功能验证
- [ ] 数字人成功启动并介绍面试流程
- [ ] 语音识别准确转换用户语音为文本
- [ ] 后端API成功生成定制化面试问题
- [ ] 面试计划显示完整信息（职位、重点、时长、问题）
- [ ] 可以无缝启动正式面试

### ✅ 性能验证
- [ ] 所有响应时间符合预期
- [ ] 系统在高负载下稳定运行
- [ ] 错误处理机制正常工作

### ✅ 用户体验验证
- [ ] 界面流畅，无卡顿
- [ ] 错误提示清晰友好
- [ ] 操作流程直观易懂

## 测试完成确认

当以下所有测试都通过时，系统可以认为是完整的：

1. ✅ 后端API健康检查通过
2. ✅ 面试计划生成功能正常
3. ✅ Android端语音识别准确
4. ✅ 端到端流程无缝集成
5. ✅ 错误处理机制有效
6. ✅ 性能指标达到预期

**测试状态**: 🔄 进行中 → ✅ 已完成