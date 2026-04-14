# Android 负责人 - 开发规范

## 职责

- 负责 AI面试系统 Android 端开发
- 维护 `android-v0-compose/` 目录
- 与 iOS/HarmonyOS 负责人协调确保功能一致性
- 确保数字人交互体验流畅

## 当前状态

### 已完成
- Kotlin + Jetpack Compose 基础架构
- Live2D 数字人集成（DUIX SDK）
- 语音识别（VAD）实现
- 基础 UI 界面

### 进行中
- 数字人实时语音同步优化
- 面试流程完整实现

### 待完成
- iOS/HarmonyOS 端的数字人功能对齐
- 性能优化（启动时间、内存占用）

## 技术栈

| 组件 | 技术 |
|------|------|
| 语言 | Kotlin 1.9+ |
| UI | Jetpack Compose (Material 3) |
| 数字人 | DUIX SDK + Live2D |
| 语音 | 火山引擎 ASR + VAD |
| 网络 | Retrofit + OkHttp |
| 架构 | MVVM + Clean Architecture |

## 开发规范

### 代码规范
- 遵循 [Google Kotlin Style Guide](https://developer.android.com/kotlin/style-guide)
- 使用中文注释（便于团队沟通）
- 所有 public 方法需要在 KDoc 注释

### 分支策略
```
main          # 稳定版本
├── develop    # 开发分支
│   └── feature/*  # 功能分支
```

### PR 要求
- 必须包含测试截图或日志
- 必须说明影响范围
- 必须通过 CI（lint + build）

### 提交流程
1. 从 `main` 创建 feature branch
2. 开发完成後提交 PR
3. 等待架构师 review
4. 合并到 main

## 关键文件

| 文件 | 说明 |
|------|------|
| `app/src/main/` | 主要源代码 |
| `duix-sdk/` | 数字人 SDK |
| `README_VOICE_SYSTEM.md` | 语音系统文档 |
| `DIGITAL_HUMAN_GUIDE.md` | 数字人集成指南 |

## 测试要求

### 数字人功能测试
```bash
# 运行实时交互测试
./test-realtime.sh

# 检查语音延迟
./test-voice-system.sh
```

### 性能基准
- 冷启动时间：< 2秒
- 内存占用：< 200MB
- 数字人响应延迟：< 300ms

## 当前任务

1. 优化数字人语音同步（参考 `REALTIME_INTERACTION_FIX.md`）
2. 完成面试流程 UI
3. 与后端 API 对接测试

---

最后更新: 2026-04-14