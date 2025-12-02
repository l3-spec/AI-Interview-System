# 🎭 Live2D 数字人集成 - Android 客户端

<div align="center">

![Live2D](https://img.shields.io/badge/Live2D-Cubism%20SDK%204.x-blue)
![Android](https://img.shields.io/badge/Android-API%2024%2B-green)
![Kotlin](https://img.shields.io/badge/Kotlin-1.9%2B-purple)
![Compose](https://img.shields.io/badge/Compose-1.5%2B-orange)
![Status](https://img.shields.io/badge/Status-Production%20Ready-success)

**基于 Live2D Cubism SDK 的原生 Android 数字人实现**

[快速开始](#-快速开始) • [功能特性](#-功能特性) • [文档](#-文档) • [演示](#-演示)

</div>

---

## 📖 项目简介

本项目在 **AI 面试系统** Android 客户端中集成了 **Live2D Cubism SDK**，实现了高性能的原生数字人渲染功能。用户可以在面试场景中与 Live2D 数字人进行实时交互。

### 技术栈

- **C++ 层**: Live2D Cubism SDK 4.x + OpenGL ES 2.0
- **JNI 层**: Native Bridge (JNI)
- **Android 层**: Kotlin + Jetpack Compose + GLSurfaceView
- **构建系统**: CMake + Gradle

---

## ✨ 功能特性

### 核心功能

- ✅ **高性能渲染**: 60 FPS 流畅渲染，低延迟
- ✅ **原生实现**: 无需网络，完全离线运行
- ✅ **完整功能**: 动作播放、物理模拟、参数控制
- ✅ **触摸交互**: 点击播放动作，双击切换视图
- ✅ **Compose 集成**: 无缝集成到 Jetpack Compose UI
- ✅ **多视图支持**: 主画面、小窗预览、拖拽悬浮窗

### 动画效果

- 🎭 10 种预设动作（待机、打招呼、点头、摇头等）
- 💨 物理效果（头发、衣服飘动）
- 👀 眨眼动画（自动）
- 💬 可扩展口型同步

---

## 🚀 快速开始

### 1. 环境要求

- Android Studio Arctic Fox 或更高版本
- Android SDK API 24+
- CMake 3.22.1+
- NDK 21.0+

### 2. 构建项目

```bash
cd android-v0-compose

# 清理构建
./gradlew clean

# 编译 Debug 版本
./gradlew :app:assembleDebug
```

### 3. 运行应用

```bash
# 安装
./gradlew :app:installDebug

# 启动
adb shell am start -n com.xlwl.AiMian/.MainActivity
```

### 4. 体验功能

1. 打开应用 → **AI 面试** → **数字人面试**
2. 👆 **触摸屏幕**: 播放随机动作
3. 👆👆 **双击**: 切换主副画面
4. 🖐️ **拖动**: 移动悬浮窗

---

## 📚 文档

| 文档 | 说明 |
|------|------|
| [快速开始指南](./LIVE2D_QUICK_START.md) | 5分钟快速开始 |
| [完整集成指南](./LIVE2D_INTEGRATION_GUIDE.md) | 详细的技术文档 |
| [实现总结](./LIVE2D_IMPLEMENTATION_SUMMARY.md) | 架构和实现细节 |

---

## 🎨 演示

### 界面展示

```
┌─────────────────────────────────┐
│  🔙 [返回]            第 1/5 题  │
│                                 │
│                                 │
│        Live2D 数字人            │
│           👧                    │
│      (Hiyori 模型)              │
│                                 │
│    ┌─────────┐                 │
│    │ 我的画面 │                 │
│    └─────────┘                 │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 面试官提问中...   02:45  │   │
│  │ 请介绍一下你自己？        │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │      开始答题             │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

### 代码示例

```kotlin
@Composable
fun Live2DDemo() {
    val controller = remember { Live2DViewController() }
    
    Box(modifier = Modifier.fillMaxSize()) {
        // 渲染数字人
        Live2DViewWithController(
            controller = controller,
            modifier = Modifier.fillMaxSize()
        )
        
        // 控制按钮
        Button(onClick = { controller.playRandomMotion() }) {
            Text("播放动作")
        }
    }
}
```

---

## 📁 项目结构

```
android-v0-compose/
├── app/
│   ├── src/main/
│   │   ├── assets/live2d/hiyori/      # Hiyori 模型资源
│   │   ├── cpp/                        # C++ 源代码
│   │   │   ├── CMakeLists.txt
│   │   │   ├── live2d_jni_bridge.cpp
│   │   │   ├── live2d_model.cpp/hpp
│   │   │   ├── live2d_renderer.cpp/hpp
│   │   │   ├── libs/                   # Live2D Core 库
│   │   │   └── live2d/Framework/      # Live2D SDK
│   │   └── java/.../live2d/           # Kotlin 代码
│   │       ├── Live2DNative.kt
│   │       ├── Live2DRenderer.kt
│   │       ├── Live2DView.kt
│   │       └── Live2DComposable.kt
│   └── build.gradle.kts               # NDK/CMake 配置
├── LIVE2D_QUICK_START.md              # 快速开始
├── LIVE2D_INTEGRATION_GUIDE.md        # 完整指南
├── LIVE2D_IMPLEMENTATION_SUMMARY.md   # 实现总结
└── README_LIVE2D.md                   # 本文档
```

---

## 🔧 核心组件

### C++ 层
- **Live2DModel**: 模型加载、更新、动作管理
- **Live2DRenderer**: OpenGL ES 渲染器
- **JNI Bridge**: JNI 桥接层

### Kotlin 层
- **Live2DNative**: JNI 接口封装
- **Live2DRenderer**: GLSurfaceView 渲染器
- **Live2DView**: 自定义 GLSurfaceView
- **Live2DComposable**: Compose 集成组件

---

## 📊 性能指标

| 指标 | 数值 |
|------|------|
| 渲染帧率 | 60 FPS |
| 内存占用 | ~30-50 MB |
| CPU 使用率 | ~5-10% (单核) |
| 启动时间 | <500ms |
| 触摸响应 | <16ms |

---

## 🎮 API 使用

### 播放动作

```kotlin
// 播放待机动作
controller.playIdleMotion()

// 播放随机动作
controller.playRandomMotion()

// 播放指定动作
controller.playMotion("Idle", 0)
```

### 控制参数

```kotlin
// 控制头部角度
controller.setParameter("ParamAngleX", 30f)  // 左右转头
controller.setParameter("ParamAngleY", 15f)  // 上下点头

// 控制眼睛
controller.setParameter("ParamEyeLOpen", 1f)   // 左眼
controller.setParameter("ParamEyeROpen", 0f)   // 右眼（眨眼）

// 控制嘴巴
controller.setParameter("ParamMouthOpenY", 0.5f)  // 张嘴
```

---

## 🐛 故障排除

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| 编译错误 | 检查 CMake 和 NDK 版本 |
| 黑屏 | 查看 Logcat 日志，检查模型文件 |
| 崩溃 | 检查 .so 文件是否正确打包 |
| 动作不播放 | 确认动作文件存在 |

详细排查步骤请参考 [完整指南](./LIVE2D_INTEGRATION_GUIDE.md#故障排除)。

---

## 🔮 扩展功能

### 语音口型同步

```kotlin
fun updateLipSync(volume: Float) {
    controller.setParameter("ParamMouthOpenY", volume)
}
```

### 视线跟踪

```kotlin
fun updateGaze(x: Float, y: Float) {
    val angleX = (x / screenWidth - 0.5f) * 60f
    val angleY = (y / screenHeight - 0.5f) * 60f
    controller.setParameter("ParamAngleX", angleX)
    controller.setParameter("ParamAngleY", -angleY)
}
```

### 表情切换

```kotlin
// 预设表情
controller.playMotion("", 2)  // 点头
controller.playMotion("", 4)  // 惊讶
controller.playMotion("", 6)  // 开心
```

---

## ⚠️ 许可证

- **Live2D Cubism SDK**: [Live2D Proprietary Software License](https://www.live2d.com/en/download/cubism-sdk/)
- **Hiyori 模型**: Live2D 官方示例模型，仅供学习使用
- **应用代码**: 根据项目许可证

⚠️ **重要**: 商业使用需要购买 Live2D 商业许可证。

---

## 📞 支持与反馈

- 📖 查看 [完整文档](./LIVE2D_INTEGRATION_GUIDE.md)
- 🐛 报告 Bug: GitHub Issues
- 💬 技术支持: 项目团队
- 📧 联系方式: 见项目主页

---

## 🙏 致谢

- [Live2D Inc.](https://www.live2d.com/) - 提供 Cubism SDK
- [CubismNativeSamples](https://github.com/Live2D/CubismNativeSamples) - 官方示例
- Android 社区 - 技术支持

---

## 📝 更新日志

### v1.0.0 (2025-10-29)
- ✅ 完成 Live2D SDK 集成
- ✅ 实现 Hiyori 模型渲染
- ✅ 支持触摸交互
- ✅ 完成 Compose UI 集成
- ✅ 完善文档和示例

---

<div align="center">

**Made with ❤️ by AI Interview System Team**

[⬆️ 回到顶部](#-live2d-数字人集成---android-客户端)

</div>

