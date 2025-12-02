# ✅ Live2D 集成检查清单

在构建和运行项目前，请使用此清单确认所有文件已正确配置。

## 📋 文件检查

### 1. 模型资源文件 ✓

检查 `app/src/main/assets/live2d/hiyori/` 目录：

```bash
cd android-v0-compose
ls -la app/src/main/assets/live2d/hiyori/
```

应该看到：

- [ ] ✅ `hiyori_pro_t11.model3.json` (~205 KB)
- [ ] ✅ `hiyori_pro_t11.moc3` (~1.2 MB)
- [ ] ✅ `hiyori_pro_t11.physics3.json` (~10 KB)
- [ ] ✅ `hiyori_pro_t11.pose3.json` (~5 KB)
- [ ] ✅ `hiyori_pro_t11.cdi3.json` (~2 KB)
- [ ] ✅ `hiyori_pro_t11.2048/` 目录
  - [ ] ✅ `texture_00.png` (~1.5 MB)
  - [ ] ✅ `texture_01.png` (~800 KB)
- [ ] ✅ `motion/` 目录
  - [ ] ✅ `hiyori_m01.motion3.json` 到 `hiyori_m10.motion3.json` (共10个)

**验证命令**:
```bash
find app/src/main/assets/live2d/hiyori -type f | wc -l
# 应该输出: 16 (1个model3 + 1个moc3 + 3个配置 + 2个纹理 + 10个动作 - 可能有偏差)
```

---

### 2. Live2D SDK 文件 ✓

检查 `app/src/main/cpp/live2d/Framework/` 目录：

```bash
ls -la app/src/main/cpp/live2d/Framework/src/
```

应该看到：

- [ ] ✅ `CubismFramework.cpp/hpp`
- [ ] ✅ `CubismModelSettingJson.cpp/hpp`
- [ ] ✅ `Model/` 目录
- [ ] ✅ `Motion/` 目录
- [ ] ✅ `Physics/` 目录
- [ ] ✅ `Rendering/OpenGL/` 目录
- [ ] ✅ 其他核心文件...

**验证命令**:
```bash
find app/src/main/cpp/live2d/Framework -name "*.cpp" | wc -l
# 应该有 50+ 个 .cpp 文件
```

---

### 3. Live2D Core 库 ✓

检查 `app/src/main/cpp/libs/` 目录：

```bash
ls -la app/src/main/cpp/libs/
```

应该看到：

- [ ] ✅ `arm64-v8a/libLive2DCubismCore.a` (~2-3 MB)
- [ ] ✅ `x86/libLive2DCubismCore.a` (可选)
- [ ] ✅ `x86_64/libLive2DCubismCore.a` (可选)

**验证命令**:
```bash
file app/src/main/cpp/libs/arm64-v8a/libLive2DCubismCore.a
# 应该输出: current ar archive
```

---

### 4. C++ 源代码 ✓

检查 `app/src/main/cpp/` 目录：

- [ ] ✅ `CMakeLists.txt`
- [ ] ✅ `live2d_jni_bridge.cpp`
- [ ] ✅ `live2d_model.hpp`
- [ ] ✅ `live2d_model.cpp`
- [ ] ✅ `live2d_renderer.hpp`
- [ ] ✅ `live2d_renderer.cpp`

**验证命令**:
```bash
ls app/src/main/cpp/*.{cpp,hpp}
```

---

### 5. Kotlin 源代码 ✓

检查 `app/src/main/java/com/example/v0clone/live2d/` 目录：

- [ ] ✅ `Live2DNative.kt`
- [ ] ✅ `Live2DRenderer.kt`
- [ ] ✅ `Live2DView.kt`
- [ ] ✅ `Live2DComposable.kt`

**验证命令**:
```bash
ls app/src/main/java/com/example/v0clone/live2d/*.kt
```

---

### 6. 配置文件 ✓

- [ ] ✅ `app/build.gradle.kts` 已修改（包含 NDK/CMake 配置）

**验证内容**:
```gradle
externalNativeBuild {
    cmake {
        cppFlags += listOf("-std=c++14", "-frtti", "-fexceptions")
        arguments += listOf("-DANDROID_STL=c++_shared")
    }
}
```

---

### 7. 集成代码 ✓

- [ ] ✅ `app/src/main/java/com/example/v0clone/ai/DigitalInterviewScreen.kt` 已修改

**验证内容**:
- 导入了 `Live2DView` 和 `Live2DViewController`
- 使用了 `Live2DDigitalHumanSurface` 组件

---

## 🔧 环境检查

### 1. Android Studio ✓

```bash
# 检查 Android Studio 版本
# 应该 >= Arctic Fox (2020.3.1)
```

- [ ] ✅ Android Studio 已安装
- [ ] ✅ Android SDK 已配置
- [ ] ✅ Kotlin 插件已启用

---

### 2. CMake ✓

```bash
cmake --version
# 应该输出: cmake version 3.22.1 或更高
```

- [ ] ✅ CMake 已安装 (>= 3.22.1)

**如果未安装**:
- Android Studio → SDK Manager → SDK Tools → CMake ✓

---

### 3. NDK ✓

```bash
ls $ANDROID_SDK_ROOT/ndk/
# 应该看到版本号目录，如: 21.4.7075529
```

- [ ] ✅ NDK 已安装 (>= 21.0)

**如果未安装**:
- Android Studio → SDK Manager → SDK Tools → NDK (Side by side) ✓

---

### 4. Gradle ✓

```bash
cd android-v0-compose
./gradlew --version
# 应该输出: Gradle 8.x
```

- [ ] ✅ Gradle 版本正确

---

## 🚀 构建前检查

运行以下命令进行最终检查：

```bash
cd android-v0-compose

# 1. 清理旧的构建文件
./gradlew clean

# 2. 同步项目
./gradlew --refresh-dependencies

# 3. 检查依赖
./gradlew dependencies | grep -i live2d
```

---

## 🔨 构建步骤

### 1. 首次构建

```bash
# Debug 版本
./gradlew :app:assembleDebug

# 如果成功，应该看到:
# BUILD SUCCESSFUL in XXs
```

- [ ] ✅ 构建成功，无错误
- [ ] ✅ APK 已生成: `app/build/outputs/apk/debug/app-debug.apk`

### 2. 验证 Native 库

```bash
# 解压 APK 并检查 .so 文件
unzip -l app/build/outputs/apk/debug/app-debug.apk | grep .so

# 应该看到:
# lib/arm64-v8a/libc++_shared.so
# lib/arm64-v8a/liblive2d_native.so
```

- [ ] ✅ `liblive2d_native.so` 存在
- [ ] ✅ 文件大小合理 (几百 KB 到几 MB)

---

## 📱 运行前检查

### 1. 设备连接

```bash
adb devices
# 应该看到你的设备
```

- [ ] ✅ 设备已连接并授权
- [ ] ✅ 设备支持 OpenGL ES 2.0

### 2. 安装应用

```bash
./gradlew :app:installDebug
adb shell pm list packages | grep xlwl.AiMian
# 应该看到: package:com.xlwl.AiMian
```

- [ ] ✅ 应用已安装

---

## ✅ 运行测试

### 1. 启动应用

```bash
adb shell am start -n com.xlwl.AiMian/.MainActivity
```

- [ ] ✅ 应用成功启动
- [ ] ✅ 无崩溃

### 2. 进入数字人面试

1. 打开应用
2. 点击「AI 面试」
3. 选择「数字人面试」

- [ ] ✅ 页面加载成功
- [ ] ✅ Live2D 模型显示正常
- [ ] ✅ 数字人有动画效果

### 3. 交互测试

- [ ] ✅ 触摸屏幕：播放随机动作
- [ ] ✅ 双击屏幕：切换主副画面
- [ ] ✅ 拖动小窗：悬浮窗移动
- [ ] ✅ 物理效果：头发、衣服自然飘动

---

## 📊 性能检查

### 1. 帧率

```bash
adb shell dumpsys gfxinfo com.xlwl.AiMian
# 查看 FPS 数据
```

- [ ] ✅ 帧率稳定在 55-60 FPS
- [ ] ✅ 无明显掉帧

### 2. 内存占用

```bash
adb shell dumpsys meminfo com.xlwl.AiMian | grep TOTAL
```

- [ ] ✅ 内存占用合理 (< 200 MB)
- [ ] ✅ 无内存泄漏

### 3. CPU 使用率

```bash
adb shell top -n 1 | grep AiMian
```

- [ ] ✅ CPU 使用率合理 (< 20%)

---

## 🐛 日志检查

### 实时日志

```bash
adb logcat | grep -E "Live2D|GL"
```

应该看到：
```
Live2DNative: Native library loaded successfully
Live2DRenderer: Renderer created with handle: XXXXX
Live2DModel: Model loaded successfully: live2d/hiyori/...
Live2DRenderer: Model loaded successfully
```

- [ ] ✅ 无错误日志
- [ ] ✅ 模型加载成功
- [ ] ✅ 渲染器初始化成功

---

## 📝 最终确认

完成以上所有检查后，在此签字确认：

- [ ] ✅ 所有文件已就位
- [ ] ✅ 环境配置正确
- [ ] ✅ 构建成功
- [ ] ✅ 运行正常
- [ ] ✅ 交互流畅
- [ ] ✅ 性能良好

**确认日期**: _______________  
**确认人**: _______________

---

## 🎉 完成！

恭喜！你已经成功完成 Live2D 数字人的集成和测试。

### 下一步

- 📖 阅读 [使用指南](./LIVE2D_INTEGRATION_GUIDE.md)
- 🎨 自定义模型和动作
- 🔧 性能优化
- 🚀 部署到生产环境

---

## 💡 快速修复

如果遇到问题，尝试以下步骤：

1. **清理重建**
   ```bash
   ./gradlew clean
   rm -rf .gradle/
   ./gradlew :app:assembleDebug
   ```

2. **同步 Gradle**
   ```bash
   ./gradlew --refresh-dependencies
   ```

3. **重启 Android Studio**

4. **重新安装应用**
   ```bash
   adb uninstall com.xlwl.AiMian
   ./gradlew :app:installDebug
   ```

5. **查看详细日志**
   ```bash
   adb logcat > logcat.txt
   # 然后检查 logcat.txt
   ```

---

**检查清单版本**: v1.0.0  
**最后更新**: 2025-10-29

