# 数字人功能落地说明

## 方案概述
- **全新：TaoAvatar MNN Runtime（默认）**  
  Android 端内置 `TaoAvatarRuntime`，直接调用阿里巴巴开源的 `MNN` 渲染、`UniTalker` A2BS 与 `bert-vits2` TTS 模块，实现完全本地的 3D 数字人。当前实现会在 `DigitalInterviewScreen` 中通过 `AvatarTextureView` 渲染 TaoAvatar，语音由 `RealtimeVoiceManager` 驱动同时回传到自研后端。模型文件需提前从 ModelScope 下载，并通过 `adb push` 放到 `/sdcard/Android/data/com.xlwl.AiMian/files/mnn-assets/`（详见下方“模型部署”）。
- **备用：AIRI Web 数字人**  
  若需要轻量回退，可继续使用 [AIRI](https://github.com/moeru-ai/airi) Web 页面在 `WebView` 中展示数字人。问题、岗位等上下文通过 URL 参数透传。
- **已移除能力**  
  火山引擎（Volcengine）实时数字人 API、后台会话管理与 HLS/WebRTC 播流逻辑仍保持下线状态，相关脚本与配置不再启用。

## 模型部署（TaoAvatar）
1. 从 ModelScope 下载三个模型：
   - `MNN/TaoAvatar-NNR-MNN`
   - `MNN/UniTalker-MNN`
   - `MNN/bert-vits2-MNN`
2. 建议将下载结果放在仓库内 `android-v0-compose/downloads/` 目录，便于统一管理。
3. 将模型目录推送至真机/模拟器的数据目录（一次即可，后续覆盖更新即可）：
   ```bash
   adb shell mkdir -p /sdcard/Android/data/com.xlwl.AiMian/files/mnn-assets
   adb push android-v0-compose/downloads/UniTalker-MNN \
     /sdcard/Android/data/com.xlwl.AiMian/files/mnn-assets/
   adb push android-v0-compose/downloads/bert-vits2-MNN \
     /sdcard/Android/data/com.xlwl.AiMian/files/mnn-assets/
   adb push /path/to/TaoAvatar-NNR-MNN \
     /sdcard/Android/data/com.xlwl.AiMian/files/mnn-assets/
   ```
4. 首次进入「数字人面试」页面时，UI 中若提示“模型缺失”，请确认上述目录完整存在且包含 `configuration.json`、`.mnn`、`.nnr` 等文件。

运行期会自动检查 `mnn-assets` 目录，若缺失将给出路径提示；所有必需的 JNI 库（`libMNN.so`、`libnnrruntime.so`、`libsherpa-mnn-jni.so`）已经预置在 `app/src/main/jniLibs/arm64-v8a/`。

## Android 端实现要点
- `TaoAvatarRuntime` 负责：
  - 校验模型目录并初始化 `TtsService` + `A2BSService`。
  - 将 `AvatarTextureView` 嵌入 Compose（通过 `AndroidView`）。
  - 使用 `AudioBlendShapePlayer` 驱动嘴形和音频播放。
- `TaoAvatarController` 已扩展支持本地 runtime：实时语音完成后会触发 `runtime.playUtterance(text)` 并继续向后端回传。
- `DigitalInterviewScreen` 仍保留原有的小窗/大窗逻辑，数字人画面现在由 TaoAvatar 渲染，用户画面使用 CameraX。

## 配置与运行
1. （TaoAvatar）按照“模型部署”章节推送模型，并确认真机/模拟器为 `arm64-v8a` 架构。
2. （可选 Web 方案）若仍需使用 AIRI，请在 `gradle.properties` 设置 `AIRI_WEB_URL`，并在 Web/后台项目中同步更新。
3. 构建 Android 客户端：`cd android-v0-compose && ./gradlew :app:assembleDebug`。
4. 进入「AI 面试 → 数字人面试」，默认会加载本地 TaoAvatar。若模型缺失，界面会提示目标路径；若环境变量配置了 `AIRI_WEB_URL`，可在设置页切换至 Web 数字人。

## 拓展建议
- **题目透传**：`DigitalInterviewViewModel` 会在 URL 中附带 `position`、`question`、`currentQuestion`、`totalQuestions`、`countdownSeconds` 等参数，可在 AIRI 端自定义渲染策略（如开场白、字幕）。
- **多环境切换**：若需要区分测试/生产，可在打包前通过 `-PAIRI_WEB_URL=https://your-domain/avatar` 覆盖默认地址。
- **可选音频回传**：若未来需要将用户语音回传至后端分析，可在现有 CameraX 流程上增加录音与上传逻辑；数字人仍可保持 Web 端呈现。

> 本地 TaoAvatar 与 Web AIRI 可并行存在，后续如需接入其他供应商，可在新的分支扩展对应 runtime。
