# Live2D 数字人快速开始指南

## 🚀 快速开始（5分钟）

### 1. 准备工作

确保你已经有：
- ✅ Android Studio Arctic Fox 或更高版本
- ✅ Android SDK API 24+
- ✅ CMake 3.22.1+
- ✅ NDK 21.0+

### 2. 检查文件

确认以下文件已就位：

```bash
# 检查模型文件
ls app/src/main/assets/live2d/hiyori/

# 应该看到：
# hiyori_pro_t11.model3.json
# hiyori_pro_t11.moc3
# hiyori_pro_t11.physics3.json
# hiyori_pro_t11.pose3.json
# hiyori_pro_t11.2048/
# motion/

# 检查 SDK 文件
ls app/src/main/cpp/live2d/Framework/

# 检查 Core 库
ls app/src/main/cpp/libs/arm64-v8a/
# 应该看到: libLive2DCubismCore.a
```

### 3. 构建项目

```bash
cd android-v0-compose

# 清理旧的构建文件
./gradlew clean

# 构建 Debug 版本
./gradlew :app:assembleDebug

# 或者在 Android Studio 中点击 Build > Make Project
```

### 4. 运行应用

```bash
# 安装到设备
./gradlew :app:installDebug

# 启动应用
adb shell am start -n com.xlwl.AiMian/.MainActivity
```

### 5. 体验功能

1. **进入数字人面试**
   - 打开应用
   - 点击「AI 面试」
   - 选择「数字人面试」

2. **交互测试**
   - 👆 **触摸屏幕**: 播放随机动作
   - 👆👆 **双击屏幕**: 切换主副画面
   - 🖐️ **拖动小窗**: 移动悬浮窗位置

## 🐛 遇到问题？

### 问题 1: 编译错误

```bash
# 检查 CMake
cmake --version  # 应该 >= 3.22.1

# 检查 NDK
ls $ANDROID_SDK_ROOT/ndk/
```

### 问题 2: 黑屏

查看日志：
```bash
adb logcat | grep -E "Live2D|GL"
```

常见原因：
- 模型文件未打包 → 检查 `assets` 目录
- OpenGL 不支持 → 检查设备是否支持 OpenGL ES 2.0
- Native 库未加载 → 检查 `liblive2d_native.so` 是否存在

### 问题 3: 崩溃

```bash
# 查看崩溃日志
adb logcat | grep -E "FATAL|AndroidRuntime"

# 检查 .so 文件
unzip -l app/build/outputs/apk/debug/app-debug.apk | grep .so
```

## 📝 下一步

- 📖 阅读完整文档：[LIVE2D_INTEGRATION_GUIDE.md](./LIVE2D_INTEGRATION_GUIDE.md)
- 🎨 自定义模型：替换 Hiyori 为你自己的 Live2D 模型
- 🔧 性能优化：调整渲染参数和纹理大小
- 🎮 添加更多交互：视线跟踪、语音口型同步等

## 💡 代码示例

### 最小示例

```kotlin
@Composable
fun SimpleLive2DDemo() {
    Box(modifier = Modifier.fillMaxSize()) {
        val controller = remember { Live2DViewController() }
        
        Live2DViewWithController(
            controller = controller,
            modifier = Modifier.fillMaxSize()
        )
    }
}
```

### 带控制的示例

```kotlin
@Composable
fun Live2DWithControls() {
    val controller = remember { Live2DViewController() }
    
    Column(modifier = Modifier.fillMaxSize()) {
        // Live2D 视图
        Box(modifier = Modifier.weight(1f)) {
            Live2DViewWithController(controller, Modifier.fillMaxSize())
        }
        
        // 控制按钮
        Row(modifier = Modifier.fillMaxWidth()) {
            Button(onClick = { controller.playIdleMotion() }) {
                Text("待机")
            }
            Button(onClick = { controller.playRandomMotion() }) {
                Text("随机动作")
            }
        }
    }
}
```

## 🎉 完成！

现在你已经成功运行了 Live2D 数字人！

如需更多帮助，请查看：
- [完整集成指南](./LIVE2D_INTEGRATION_GUIDE.md)
- [Live2D 官方文档](https://docs.live2d.com/)
- [项目 GitHub](https://github.com/your-repo)

---

**Enjoy coding with Live2D! 🚀**

