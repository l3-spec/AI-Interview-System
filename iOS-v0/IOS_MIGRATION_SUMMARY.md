# iOS 版本迁移总结

本文档总结了根据 Android 版本（android-v0-compose）复刻到 iOS 版本（iOS-v0）的迁移工作。

## 已完成的核心迁移

### 1. 存储层（AuthStore）✅
- **对齐 Android AuthManager 功能**
  - JWT token 过期检查（自动清理过期 token）
  - 面试引导状态（interviewGuideSeen）
  - 最后选择的 AI 岗位（lastAiJobId, lastAiCategoryId）
  - 清空认证信息（clear）

### 2. 网络层（APIClient）✅
- **对齐 Android RetrofitClient 功能**
  - 401 未授权错误处理（自动触发清理和重新登录）
  - Token 自动注入（Bearer token）
  - 错误处理和通知机制

### 3. 导航系统（Routes）✅
- **对齐 Android Routes 和 NavGraph**
  - 完整的路由定义（AppRoute enum）
  - 底栏隐藏逻辑（shouldHideBottomBar）
  - AI 路由判断（isAiRoute）
  - 路由到标签索引映射（routeToTabIndex）

### 4. 主题和样式（Theme）✅
- **对齐 Android V0Theme**
  - 橙色主色调（#FF8C42 / #EC7C38）
  - 底栏背景色和边框色
  - 底栏选中/未选中文字颜色
  - 背景渐变

### 5. UI 组件 ✅
- **FrostedTabBar（毛玻璃底栏）**
  - 对齐 Android FrostedGlassBottomBar 设计
  - 深色半透明背景，圆角矩形，无缺口
  - 左右下有间距，中间留空（AI 按钮位置）
  
- **AiEntryButton（AI 入口按钮）**
  - 对齐 Android AIInterviewFab 设计
  - 72dp 大小，选中时橙色渐变，未选中时白色渐变+橙色边框
  - 阴影效果

### 6. 根视图和导航（RootView, AppState）✅
- **对齐 Android V0App 和 MainActivity**
  - 支持根据路由隐藏底栏
  - AI 按钮悬浮在底栏上方
  - 路由状态管理
  - 401 未授权自动处理

### 7. 应用入口（AppMain）✅
- 默认深色模式
- 环境对象注入

## 数据模型状态

数据模型已基本对齐 Android 版本：
- ✅ AuthModels（登录、注册、用户）
- ✅ AiInterviewModels（AI 面试相关）
- ✅ ContentModels（内容、帖子、Banner）
- ✅ JobModels（岗位、公司）
- ✅ AssessmentModels（测评）
- ✅ MessageModels（消息）
- ✅ JobPreferenceModels（岗位偏好）
- ✅ JobDictionaryModels（岗位词典）

## 待完成的工作

### 1. Service 层更新 ⏳
需要确保所有 Service 层与 Android Repository 功能一致：
- [ ] AuthService
- [ ] JobsService
- [ ] ContentService
- [ ] AiInterviewService
- [ ] MessagingService
- [ ] AssessmentService
- [ ] AppUpdateService

### 2. Feature 页面更新 ⏳
需要确保所有页面 UI 和功能与 Android 一致：
- [ ] HomeView（首页）
- [ ] JobsView（职岗）
- [ ] CircleView（职圈）
- [ ] ProfileView（个人中心）
- [ ] LoginView（登录）
- [ ] AiInterviewEntryView（AI 面试入口）
- [ ] InterviewHistoryView（面试历史）
- [ ] 其他详情页面

### 3. 导航实现 ⏳
- [ ] 实现完整的导航栈管理
- [ ] 实现路由参数传递
- [ ] 实现页面间的数据传递

### 4. 数字人和实时语音 ⏳
- [ ] 数字人集成（DUIX SDK）
- [ ] 实时语音（Socket.IO + VAD/TTS/ASR）
- [ ] 视频录制和上传

## 关键设计对齐点

### 颜色系统
- 橙色主色调：`#FF8C42` / `#EC7C38`
- 底栏背景：深色半透明 `rgba(60, 60, 60, 0.7)`
- 底栏边框：`rgba(255, 255, 255, 0.08)`
- 选中文字：`#EC7C38`
- 未选中文字：`#B5B7B8`

### 布局系统
- 底栏高度：86dp
- AI 按钮大小：72dp
- 底栏圆角：24dp
- 底栏左右间距：12dp
- AI 按钮偏移：底栏上方 32dp

### 导航逻辑
- 隐藏底栏的路由：登录、注册、创建帖子、AI 面试、数字人面试、岗位详情、帖子详情等
- AI 按钮选中状态：在 AI 相关路由时显示为选中状态

## 技术栈对比

| 功能 | Android | iOS |
|------|---------|-----|
| UI 框架 | Jetpack Compose | SwiftUI |
| 导航 | Navigation Compose | NavigationStack |
| 网络 | Retrofit + OkHttp | URLSession |
| 存储 | DataStore | UserDefaults |
| 状态管理 | ViewModel + StateFlow | @StateObject + @Published |
| 依赖注入 | 手动注入 | 手动注入 |

## 下一步建议

1. **优先完成 Service 层更新**：确保 API 调用与 Android 版本一致
2. **逐步更新 Feature 页面**：从首页开始，逐个页面对齐 UI 和功能
3. **实现完整导航**：确保页面间的跳转和数据传递正常工作
4. **测试和调试**：确保所有功能在 iOS 上正常工作

## 注意事项

1. **JWT 过期检查**：iOS 版本已实现自动检查，但需要确保与后端 token 格式一致
2. **401 处理**：已实现自动清理和通知，但需要确保导航到登录页的逻辑正确
3. **路由管理**：当前使用简单的路由枚举，后续可能需要更复杂的导航栈管理
4. **异步处理**：注意 Swift 的并发模型，确保所有异步操作正确使用 @MainActor

---

**迁移日期**：2024年
**迁移状态**：核心架构已完成，功能页面待完善


