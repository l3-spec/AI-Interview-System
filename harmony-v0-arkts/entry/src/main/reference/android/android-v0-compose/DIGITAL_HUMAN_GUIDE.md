# 数字人功能说明

- 当前仅保留 **AIRI Web 数字人** 方案。客户端直接加载 AIRI 提供的 Web 页面，并通过 URL 参数传递岗位、题目与倒计时信息。
- 所有火山引擎（Volcengine）相关代码、脚本与文档已移除；`/api/digital-human/*` 接口不再提供。
- 如需体验数字人，只需：
  1. 在构建参数中设置 `AIRI_WEB_URL`（默认 `http://10.0.2.2:3000/avatar`）。
  2. 在 WebView 中加载该地址，AIRI 页面将展示数字人并播报传入的问题。
- ViewModel 负责拼接参数、管理倒计时与重试；Compose 层负责渲染 WebView 与摄像头画面。
