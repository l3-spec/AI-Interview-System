# AI Interview System - 角色规则使用指南

## 📚 概述

本目录包含了 7 个专业角色的开发规范文件，帮助你在不同开发场景下快速切换到对应的专业角色。

## 🎭 角色列表

| 角色 | 文件名 | 简称 | 适用场景 |
|------|--------|------|---------|
| 🎯 产品经理 | `pm.mdc` | `@pm` | 需求分析、产品规划、用户体验设计 |
| 🎨 UI/UX 设计师 | `ui.mdc` | `@ui` | 界面设计、交互设计、设计系统 |
| 🤖 Android 开发 | `android.mdc` | `@android` | Kotlin/Jetpack Compose 开发 |
| 🍎 iOS 开发 | `ios.mdc` | `@ios` | Swift/SwiftUI 开发 |
| 🌐 Web 前端开发 | `web.mdc` | `@web` | React/TypeScript 开发 |
| ⚙️ 后端开发 | `api.mdc` | `@api` | Node.js/TypeScript/Prisma 开发 |
| 🧪 测试工程师 | `qa.mdc` | `@qa` | 测试策略、自动化测试 |

## 🚀 如何使用

### 方法一：通过 @ 符号唤起（推荐）

在 Cursor 中输入 `@` 符号，然后选择对应的规则文件（使用简短名称）：

```
@pm        # 产品经理（Product Manager）
@ui        # UI/UX 设计师
@android   # Android 开发
@ios       # iOS 开发
@web       # Web 前端开发
@api       # 后端 API 开发
@qa        # 测试工程师（Quality Assurance）
```

### 方法二：在对话中明确说明

直接告诉 AI 你需要哪个角色：

```
"请以产品经理的角色，帮我分析这个功能的需求"
"请以 UI/UX 设计师的角色，优化这个页面的交互设计"
"请以后端开发工程师的角色，设计这个 API 接口"
```

### 方法三：自动触发（基于文件类型）

某些角色规则已配置 `globs` 模式，会在编辑特定文件时自动激活：

- **Android 开发**：编辑 `.kt`、`.xml`、`build.gradle` 文件时
- **iOS 开发**：编辑 `.swift` 文件时
- **Web 前端**：编辑 `admin-dashboard/**/*.tsx`、`v0/**/*.tsx` 时
- **后端开发**：编辑 `backend-api/**/*.ts`、`**/*.prisma` 时
- **测试工程师**：编辑 `.test.ts`、`.spec.ts`、`e2e/**/*` 时

## 💡 使用示例

### 示例 1：产品需求分析

```
我：@pm 我想做一个用户管理功能，包括增删改查，请帮我写一份 PRD

AI：[以产品经理角色]
# 产品需求文档 - 用户管理功能

## 1. 概述
产品名称：AI 面试系统 - 用户管理模块
版本号：v1.0
...
```

### 示例 2：UI/UX 设计

```
我：@ui 这个登录页面的交互体验不够好，帮我优化一下

AI：[以 UI/UX 设计师角色]
我会从以下几个方面优化登录页面的用户体验：

1. **视觉层级优化**
   - 主标题使用 28px semibold
   - 表单标签 14px regular
   ...
```

### 示例 3：后端 API 开发

```
我：@api 帮我实现一个用户注册的 API 接口

AI：[以后端开发工程师角色]
我会按照 MVVM 架构为你实现用户注册功能，包括 Controller、Service、Repository 三层：

```typescript
// controllers/authController.ts
export class AuthController {
  async register(req: Request, res: Response) {
    ...
  }
}
```
...
```

### 示例 4：前端组件开发

```
我：@web 创建一个用户列表组件，支持搜索、分页和删除

AI：[以 Web 前端开发工程师角色]
我会创建一个完整的用户列表组件，遵循 React 最佳实践：

```typescript
interface UserListProps {
  users: User[];
  onDelete: (id: string) => void;
}

export const UserList: FC<UserListProps> = ({ users, onDelete }) => {
  ...
}
```
...
```

### 示例 5：测试用例编写

```
我：@qa 为用户登录功能编写测试用例

AI：[以测试工程师角色]
我会为用户登录功能编写完整的测试用例，包括单元测试、集成测试和 E2E 测试：

## 测试用例：用户登录

### 1. 单元测试
...
```

## 🎯 角色能力对照表

| 能力 | 产品经理 | UI/UX | Android | iOS | Web前端 | 后端 | 测试 |
|------|---------|-------|---------|-----|---------|------|------|
| 需求分析 | ✅✅✅ | ✅ | - | - | - | - | ✅ |
| 原型设计 | ✅✅ | ✅✅✅ | - | - | - | - | - |
| 界面设计 | ✅ | ✅✅✅ | ✅ | ✅ | ✅ | - | - |
| Android 开发 | - | - | ✅✅✅ | - | - | - | ✅ |
| iOS 开发 | - | - | - | ✅✅✅ | - | - | ✅ |
| Web 前端 | - | ✅ | - | - | ✅✅✅ | - | ✅ |
| API 设计 | ✅ | - | ✅ | ✅ | ✅ | ✅✅✅ | ✅ |
| 数据库设计 | - | - | - | - | - | ✅✅✅ | - |
| 测试策略 | ✅ | - | ✅ | ✅ | ✅ | ✅ | ✅✅✅ |
| 性能优化 | - | ✅ | ✅✅ | ✅✅ | ✅✅ | ✅✅ | ✅✅✅ |

说明：✅ 表示具备该能力，数量越多表示专业程度越高

## 🔄 跨角色协作示例

### 场景：开发一个新功能

1. **产品经理**（@pm.mdc）
   - 编写 PRD 文档
   - 定义用户故事和验收标准

2. **UI/UX 设计师**（@ui.mdc）
   - 设计交互原型
   - 制定设计规范

3. **后端开发**（@api.mdc）
   - 设计 API 接口
   - 实现业务逻辑

4. **前端开发**（@web.mdc / @android.mdc / @ios.mdc）
   - 实现界面和交互
   - 对接后端 API

5. **测试工程师**（@qa.mdc）
   - 编写测试用例
   - 执行测试并反馈问题

## 📝 注意事项

1. **角色切换**：可以随时切换角色，AI 会根据当前角色调整回答风格和专业深度
2. **多角色结合**：可以同时 @ 多个角色文件，让 AI 从多个角度分析问题
3. **自定义扩展**：可以基于现有规则文件创建自己的专属角色规则
4. **持续更新**：随着项目发展，可以不断补充和完善角色规则

## 🆘 常见问题

**Q: 如何知道当前是哪个角色在回答？**
A: AI 会在回答开头标注当前角色，如 "[以产品经理角色]"

**Q: 可以同时使用多个角色吗？**
A: 可以，用 `@` 符号选择多个规则文件即可

**Q: 角色规则可以修改吗？**
A: 可以，`.mdc` 文件是纯文本文件，可以根据团队需求自定义修改

**Q: 如何创建新的角色？**
A: 参考现有文件格式，创建新的 `.mdc` 文件并放在此目录下

## 🎓 学习资源

- [Cursor Rules 文档](https://docs.cursor.com/context/rules-for-ai)
- [产品经理知识体系](https://www.woshipm.com)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Android Material Design](https://m3.material.io)
- [React 最佳实践](https://react.dev)
- [Node.js 最佳实践](https://github.com/goldbergyoni/nodebestpractices)

---

**提示**：建议将本目录加入到你的工作流程中，让专业角色助力高效开发！🚀

