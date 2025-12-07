# AI Interview System — iOS v0 (SwiftUI)

This folder contains a SwiftUI-first iOS implementation mirroring the Android Compose app in `android-v0-compose`. It keeps the same product areas: AI 面试入口、首页内容流、职岗、职圈、消息中心、个人中心，并复用同一套后端接口。

## 项目结构
- `Package.swift` — SwiftPM 可直接在 Xcode 15+ 打开，目标为 `AIInterviewApp`
- `Sources/App` — 入口、主题、RootView 与底部导航
- `Sources/Core` — 基础组件、网络层、存储
- `Sources/Models` — 与 Android 模型一一对应的 Codable 结构体
- `Sources/Services` — API 调用封装（Auth/Jobs/Content/AI Interview/Message 等）
- `Sources/Features` — 各功能页面 (Home/Jobs/Circle/Profile/Auth/AIInterview)
- `Sources/Resources/Assets.xcassets` — App 图标与主题色

## 运行方式
1. 打开 `Package.swift`（Xcode > File > Open），选择 `AIInterviewApp` 运行。
2. 配置后端地址（默认 `http://192.168.1.7:3001/api/`）：
   - 在 Scheme 环境变量添加 `API_BASE_URL=https://your-host:3001/api/`
3. 需要登录的接口（AI 面试、消息中心等）请先用手机号验证码登录。

## 已复刻的核心能力
- 首页：AI 面试入口、Banner 轮播、热门职岗、热门/大咖分享列表。
- 职岗：搜索/列表、岗位详情展示（JD/职责/要求）。
- 职圈：热门帖子与大咖分享列表，帖子详情。
- AI 面试：创建会话（岗位/公司/背景/题量），问答式面试流程，完成态提醒；历史列表页。
- 账号与消息：手机号验证码登录、个人中心、消息中心列表与详情。
- 设计语言：沿用 Android 的橙色高光 + 毛玻璃底栏 + 中央 AI FAB，统一的卡片/Tag 组件。

## 与 Android 版本的差异/待办
- 数字人/实时语音 (Socket.IO + VAD/TTS/ASR) 暂未移植；当前 AI 面试以文本问答为主。
- 视频/音频录制、OSS 上传、Live2D 相关能力未接入。
- 发表帖子（含图片上传）仅保留阅读能力，未实现多段表单+Multipart 上传。
- App 图标仅提供单张占位 PNG，如需上架请补充完整尺寸。

## 关键文件速览
- 入口与导航：`Sources/App/AppMain.swift`, `Sources/App/RootView.swift`
- UI 主题：`Sources/App/Theme.swift`, `Sources/Core/Components/*`
- 网络层：`Sources/Core/Networking/APIClient.swift`, `APIConfig.swift`
- 主要页面：`Sources/Features/Home/HomeView.swift`, `Sources/Features/Jobs/JobsView.swift`, `Sources/Features/Circle/CircleView.swift`, `Sources/Features/Profile/ProfileView.swift`
- AI 面试：`Sources/Features/AIInterview/AiInterviewEntryView.swift`, `InterviewHistoryView.swift`

## 下一步建议
1. 接入实时语音：引入 `socket.io-client-swift`，对接后端 `text_message/voice_response` 事件，复刻 Android 的 VAD/TTS 流程。
2. 摄像头/音频上传：用 `AVCaptureSession` 与 `URLSessionUploadTask` 对接 OSS 上传 API。
3. 设计完善：补齐 AppIcon 全尺寸、适配深浅色与动态字体。
4. 自动化验证：添加 `XCTest` 覆盖登录、岗位列表、AI 问答 happy-path。
