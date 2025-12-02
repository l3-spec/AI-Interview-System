# 🎭 数字人使用指南（AIRI 方案）

## 当前状态
- ✅ 火山引擎相关代码、脚本与 `/api/digital-human/*` 接口已全部移除。
- 🌐 数字人体验依托开源项目 [AIRI](https://github.com/moeru-ai/airi)，通过 Web 页面直接渲染。
- ⚙️ 客户端仅需配置数字人页面地址（`AIRI_WEB_URL` / `VITE_AIRI_WEB_URL` / `NEXT_PUBLIC_AIRI_WEB_URL`）。

## 快速开始

### 1. 获取或部署 AIRI
- 本地调试：参考仓库根目录的 `AIRI_QUICK_START.md`，启动 `http://localhost:3000/avatar`。
- 生产环境：可将 AIRI 前端部署到自己的域名，例如 `https://avatar.example.com`。

### 2. 配置客户端
- **Android（Compose App）**：在构建参数中设置 `AIRI_WEB_URL`，ViewModel 会自动拼接岗位、题目等参数并在 WebView 中加载。
- **Web 前端（Vite 管理后台）**：在 `.env` / `.env.local` 中设置 `VITE_AIRI_WEB_URL`，页面以 iframe 形式嵌入数字人。

### 3. 体验数字人
AIRI 页面会根据 URL 查询参数展示上下文信息，例如：
```
https://avatar.example.com?position=产品经理&question=请做自我介绍&currentQuestion=1&totalQuestions=15&countdownSeconds=180
```

## 扩展建议
- **多问题刷新**：客户端更换题目时重新生成 URL，AIRI 页面即可更新播报内容。
- **自定义主题**：AIRI 支持根据 Query 参数切换皮肤、语言或背景，可结合自身业务扩展。
- **语音分析**：如需回传候选人语音，可在客户端独立录制并上传，不再依赖旧的火山引擎 API。
- **环境区分**：建议在 CI/CD 中注入不同的 `AIRI_WEB_URL`，便于测试与生产隔离。

> 如需再次集成其他云厂商数字人，可在新的分支中恢复相应模块，本指南仅针对 AIRI 方案。
