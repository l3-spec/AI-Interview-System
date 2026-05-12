# AI面试系统 - 多代理开发团队 Harness 规范

## 概述

本项目是一个 AI 面试系统，支持 Android、iOS、鸿蒙三端应用，核心是 AI 数字人作为虚拟面试官提供实时语音交互体验。

## 团队结构

```
架构师（主代理）
├── Android 负责人
├── iOS 负责人
├── HarmonyOS 负责人
└── 共享资源/规范
```

## 核心原则

### 1. 数字人优先
- 数字人实时交互是核心功能，必须在三端都实现流畅的体验
- 延迟要求：端到端 < 300ms（语音输入到数字人响应）
- 数字人风格：卡通/真人/2D 可选，但绝对不能卡顿、死板

### 2. 架构约束
- 三端共享同一套 API 规范（backend-api）
- 数字人 SDK 集成方案需要统一
- UI 设计规范需要跨端一致

### 3. PR Review 流程
- 所有代码必须通过 PR 合并
- PR 需要包含：功能说明、测试截图/日志、影响范围
- 架构师负责最终合并决策

## 技术决策

### 移动端技术选型

| 平台 | 语言 | UI框架 | 数字人方案 |
|------|------|--------|-----------|
| Android | Kotlin | Jetpack Compose | DUIX SDK + Live2D |
| iOS | Swift | SwiftUI | 统一方案（待定） |
| HarmonyOS | ArkTS | ArkUI | 统一方案（待定） |

### 跨平台考虑
- 是否使用 Flutter/React Native 统一三端？
- 关键问题：数字人实时交互对性能要求极高，跨平台方案是否能满足？

**结论**：数字人模块保持原生实现，UI 层可以考虑跨平台

## 开发流程

### Issue 创建
1. 架构师创建 Feature Issue
2. 指定负责人（Android/iOS/Harmony）
3. 明确 Acceptance Criteria

### 代码提交
1. 负责人从 main 创建 feature branch
2. 开发完成后提交 PR
3. 架构师 review 并合并

### 测试要求
- 功能测试截图/日志
- 性能测试（启动时间、内存占用）
- 数字人交互延迟测试

## 文件结构

```
AI-Interview-System/
├── AGENTS.md                    # 总体架构规范（本文件）
├── CLAUDE.md                    # Claude Code 指南
├── android-v0-compose/          # Android 开发目录
│   └── AGENTS.md                # Android 负责人规范
├── iOS-v0/                      # iOS 开发目录
│   └── AGENTS.md                # iOS 负责人规范
├── harmony-v0-arkts/            # HarmonyOS 开发目录
│   └── AGENTS.md                # HarmonyOS 负责人规范
└── docs/
    ├── API_SPEC.md              # API 规范文档
    ├── DIGITAL_HUMAN_SPEC.md    # 数字人集成规范
    └── UI_DESIGN.md             # UI 设计规范
```

## 沟通机制

- 所有决策通过 OpenClaw 会话进行
- 重要决策记录到相关 AGENTS.md 文件
- **核心沟通规范：所有沟通（AI与用户之间）以及代码中的注释必须使用全中文。**
- 代码注释使用中文（便于多语言团队协作，但本项目以中文为主）

## 初始任务

1. [ ] 确认数字人跨平台统一方案
2. [ ] 制定 UI 设计规范（确保三端一致）
3. [ ] 建立 API 契约文档
4. [ ] Android 负责人：完善现有 Compose 实现
5. [ ] iOS 负责人：从零开始搭建 Swift 项目
6. [ ] Harmony 负责人：从零开始搭建 ArkTS 项目

---

最后更新: 2026-04-14