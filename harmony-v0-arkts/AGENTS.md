# HarmonyOS 负责人 - 开发规范

## 职责

- 负责 AI面试系统 HarmonyOS 端开发
- 维护 `harmony-v0-arkts/` 目录
- 与 Android/iOS 负责人协调确保功能一致性
- 确保数字人交互体验与 Android/iOS 端一致

## 当前状态

### 初始阶段
- 已创建基础项目结构（ArkTS + ArkUI）
- 使用 npm workspace 管理依赖
- node_modules 已安装

### 目标
- 与 iOS 同步开发
- 数字人模块与 Android/iOS 端对标

## 技术栈

| 组件 | 技术 |
|------|------|
| 语言 | ArkTS |
| UI | ArkUI |
| 数字人 | 统一方案（待与 Android 对齐） |
| 语音 | 统一方案（待定） |
| 网络 | HarmonyOS HTTP API |
| 架构 | MVVM + Clean Architecture |

## 开发规范

### 代码规范
- 遵循 HarmonyOS 开发规范
- 使用中文注释
- ArkTS 严格模式

### 分支策略
```
main          # 稳定版本
├── develop    # 开发分支
│   └── feature/*  # 功能分支
```

### PR 要求
- 必须包含测试截图
- 必须说明影响范围
- 必须通过 CI（build）

## 项目结构

```
harmony-v0-arkts/
├── entry/                  # 应用入口模块
│   └── src/main/
│       ├── ets/
│       │   ├── pages/       # 页面
│       │   ├── components/  # 组件
│       │   └── ability/     # Ability
│       └── module.json5
├── AppScope/               # 应用配置
├── node_modules/           # 依赖
└── package.json
```

## 关键参考

| 文件 | 说明 |
|------|------|
| `RUN_SETUP_GUIDE.md` | 运行环境配置指南 |
| `README.md` | 项目说明 |
| `../android-v0-compose/AGENTS.md` | Android 开发规范（对标） |
| `../iOS-v0/AGENTS.md` | iOS 开发规范（对标） |
| `../docs/DIGITAL_HUMAN_SPEC.md` | 数字人集成规范（必须对齐） |

## 测试要求

### 性能基准
- 冷启动时间：< 1.5秒
- 内存占用：< 150MB
- 数字人响应延迟：< 300ms（与 Android/iOS 一致）

## 当前任务

1. 完善项目配置（build-profile.json5, hvigorfile.ts）
2. 实现基础网络层（对标 backend-api）
3. 集成数字人 SDK（与 Android/iOS 方案对齐）
4. 实现面试流程 UI

## 与其他平台协作

- **Android**: 数字人 SDK 方案需要对齐，确保交互体验一致
- **iOS**: UI 设计规范需要统一
- **后端**: API 规范在 `docs/API_SPEC.md`，有问题找架构师

---

最后更新: 2026-04-14