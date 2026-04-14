# iOS 负责人 - 开发规范

## 职责

- 负责 AI面试系统 iOS 端开发
- 维护 `iOS-v0/` 目录
- 与 Android/HarmonyOS 负责人协调确保功能一致性
- 确保数字人交互体验与 Android 端一致

## 当前状态

### 初始阶段
- 已创建基础项目结构（Swift + Xcode）
- Package.swift 已配置
- 尚未开始核心功能开发

### 目标
- 3个月内完成基础功能开发
- 数字人模块与 Android 端对标

## 技术栈

| 组件 | 技术 |
|------|------|
| 语言 | Swift 5.9+ |
| UI | SwiftUI |
| 数字人 | 统一方案（待与 Android 对齐） |
| 语音 | 统一方案（待定） |
| 网络 | URLSession + Alamofire |
| 架构 | MVVM + Clean Architecture |

## 开发规范

### 代码规范
- 遵循 [Swift Style Guide](https://google.github.io/swift/)
- 使用中文注释
- 所有 public 方法需要文档注释

### 分支策略
```
main          # 稳定版本
├── develop    # 开发分支
│   └── feature/*  # 功能分支
```

### PR 要求
- 必须包含测试截图
- 必须说明影响范围
- 必须通过 CI（lint + build）

## 项目结构

```
iOS-v0/
├── Sources/
│   ├── App/              # 应用入口
│   ├── Features/         # 功能模块
│   │   ├── Interview/    # 面试模块
│   │   ├── DigitalHuman/ # 数字人模块
│   │   └── ...
│   ├── Core/             # 核心组件
│   │   ├── Network/      # 网络层
│   │   ├── Storage/      # 存储
│   │   └── ...
│   └── Resources/        # 资源文件
├── project.yml           # XcodeGen 配置
└── Package.swift         # Swift Package
```

## 关键参考

| 文件 | 说明 |
|------|------|
| `IOS_MIGRATION_SUMMARY.md` | iOS 技术选型总结 |
| `../android-v0-compose/AGENTS.md` | Android 开发规范（对标） |
| `../docs/DIGITAL_HUMAN_SPEC.md` | 数字人集成规范（必须对齐） |

## 测试要求

### 性能基准
- 冷启动时间：< 1.5秒
- 内存占用：< 150MB
- 数字人响应延迟：< 300ms（与 Android 一致）

## 当前任务

1. 搭建完整的 SwiftUI 项目结构
2. 实现基础网络层（对标 backend-api）
3. 集成数字人 SDK（与 Android 方案对齐）
4. 实现面试流程 UI

## 与其他平台协作

- **Android**: 数字人 SDK 方案需要对齐，确保交互体验一致
- **HarmonyOS**: UI 设计规范需要统一
- **后端**: API 规范在 `docs/API_SPEC.md`，有问题找架构师

---

最后更新: 2026-04-14