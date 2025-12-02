# Live2D 调试步骤

## 🔧 我刚刚修复的问题

### 发现的根本原因
Live2D **一直在正常渲染**，但是被 **Compose 背景层遮挡**了！

### 修复的问题
1. ✅ 移除了外层 Box 的背景渐变（遮挡 Live2D）
2. ✅ 简化了 UI 层级结构（减少遮挡）
3. ✅ 设置 TextureView 为透明
4. ✅ 修正 OpenGL 背景颜色和混合模式

### 修改的文件
- `app/src/main/cpp/live2d_renderer.cpp` - 背景颜色和混合模式
- `app/src/main/java/com/example/v0clone/live2d/Live2DView.kt` - 透明度设置
- `app/src/main/java/com/example/v0clone/ai/DigitalInterviewScreen.kt` - 移除遮挡背景

## 🚀 测试步骤

### 1. 应用已经重新安装并启动
我已经：
- ✅ 清除了应用数据
- ✅ 强制停止了应用
- ✅ 重新编译并安装了新版本
- ✅ 启动了应用

### 2. 请在你的设备上操作
1. **登录账号**（如果需要）
2. **点击「AI 面试」**
3. **选择「数字人面试」**

### 3. 预期效果
你应该能看到：
- ✨ **Hiyori 数字人** - 浅色背景上的 2D 动画角色
- 👀 **自然动画** - 眨眼、呼吸、身体摆动
- 🎬 **自动动作** - 每 2 秒播放随机动作
- 🎨 **流畅渲染** - 60 FPS

### 4. 如果还是看不见
请运行以下命令查看日志：
\`\`\`bash
adb logcat -d | grep -E "Live2D|isOpaque" | tail -30
\`\`\`

关键日志应该显示：
\`\`\`
I Live2DView: Live2DView initialized (TextureView), isOpaque=false
I Live2DRenderer: Renderer initialized: XXXXxXXXX
I Live2DModel: Model loaded successfully
I Live2DRenderer: Rendered first Live2D frame
\`\`\`

## 📊 技术分析

### 为什么之前看不见？

**层级遮挡问题：**

```kotlin
Box {
    // 第一层：Live2D (zIndex 0)
    Live2DView()  
    
    // 第二层：半透明 Box (zIndex 1) ❌ 遮挡了 Live2D
    Box(modifier = Modifier
        .fillMaxSize()
        .background(渐变色))  // 这个背景完全遮挡了 Live2D！
}
```

**修复后：**

```kotlin
Box {
    // 第一层：Live2D (zIndex 0)
    Live2DView()  // C++ 渲染器自带背景
    
    // 第二层：只有 UI 元素 (zIndex 1) ✅ 不遮挡
    Column { /* TopSection, BottomSection */ }
}
```

### OpenGL 渲染原理

1. **TextureView** 创建一个离屏纹理
2. **Live2D C++** 使用 OpenGL ES 2.0 渲染到纹理
3. **Compose** 将纹理合成到屏幕

如果 Compose 层在 TextureView 上面有不透明背景，就会完全遮挡住渲染结果。

## 🔍 调试命令

### 查看 Live2D 日志
\`\`\`bash
adb logcat | grep -E "Live2D|DigitalHuman"
\`\`\`

### 查看 OpenGL 日志
\`\`\`bash
adb logcat | grep -E "GL|EGL"
\`\`\`

### 查看渲染帧率
\`\`\`bash
adb logcat | grep "Rendered Live2D frame"
\`\`\`

### 截图调试
\`\`\`bash
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png
\`\`\`

## ✅ 成功标志

如果修复成功，你会看到：

1. **视觉效果**
   - Hiyori 数字人清晰显示
   - 浅色背景（不是白色或深色）
   - 流畅的动画

2. **日志输出**
   - `isOpaque=false`
   - `Model loaded successfully`
   - `Rendered Live2D frame #N`

3. **交互响应**
   - 单击触发动作
   - 双击切换画面
   - 拖动悬浮窗正常

## 🆘 如果还有问题

### 方案 A: 使用简单的测试模式
我可以创建一个独立的测试页面，只显示 Live2D，不包含其他 UI 元素。

### 方案 B: 添加调试可视化
添加一个红色边框标记 Live2D 区域，确认位置和大小。

### 方案 C: 回退到占位图片
如果 Live2D 实在有问题，可以临时使用带动画的占位图片。

---

**当前状态**: ✅ 已修复遮挡问题，等待测试反馈
**修复时间**: 2025-11-01 17:30

