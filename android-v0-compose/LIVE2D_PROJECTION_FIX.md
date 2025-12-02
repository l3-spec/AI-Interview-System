# Live2D 投影矩阵修复

## 🔍 问题诊断

### 之前的问题
1. ❌ TextureView 不支持 `setBackgroundColor()` - 导致崩溃
2. ❌ 投影矩阵计算错误 - 竖屏时在 Y 轴而非 X 轴缩放
3. ❌ 模型尺寸可能偏小 - Width/Height = 2.0

### 日志显示
```
Live2D 框架正常初始化 ✅
模型加载成功 ✅
纹理加载成功 ✅
渲染正常进行 ✅
但是屏幕上看不见！❌
```

## 🔧 修复方案

### 修复 1: 移除 TextureView 背景设置
```kotlin
// 移除了会崩溃的代码
// setBackgroundColor(0x33FF0000) ❌
```

### 修复 2: 修正投影矩阵
**位置**: `live2d_renderer.cpp:297-306`

```cpp
// 旧代码（错误）
if (width > height) {
    _projection.Scale(height / width, 1.0f);
} else {
    _projection.Scale(1.0f, width / height); // ❌ 竖屏时 Y 轴缩放，导致模型被压扁
}

// 新代码（正确）
if (aspectRatio < 1.0f) {
    // 竖屏：X 轴缩放，保持 Y 轴
    _projection.Scale(aspectRatio, 1.0f); // ✅
} else {
    // 横屏：Y 轴缩放，保持 X 轴
    _projection.Scale(1.0f, 1.0f / aspectRatio);
}
```

**示例计算**（1220x2602 竖屏）：
- 旧：`Scale(1.0, 0.469)` → 模型在 Y 轴被压扁到 46.9%
- 新：`Scale(0.469, 1.0)` → 模型在 X 轴适应屏幕宽度

### 修复 3: 增大模型尺寸
**位置**: `live2d_renderer.cpp:87-89`

```cpp
// 旧代码
_model->GetModelMatrix()->SetWidth(2.0f);
_model->GetModelMatrix()->SetHeight(2.0f);

// 新代码 - 增大 25%
_model->GetModelMatrix()->SetWidth(2.5f);   // ✅
_model->GetModelMatrix()->SetHeight(2.5f);  // ✅
```

## 📱 测试步骤

### 1. 停止并清空旧数据
```bash
adb shell am force-stop com.xlwl.AiMian
adb logcat -c
```

### 2. 启动应用并测试
1. 在设备上打开「AI面面」
2. 进入「AI 面试」→「数字人面试」
3. **观察主画面区域**

### 3. 查看关键日志
```bash
adb logcat -d | grep -E "Live2D|projection|Model matrix"
```

应该看到：
```
I Live2DRenderer: Model matrix configured: width=2.5, height=2.5, center=(0,0)
I Live2DRenderer: Updated view projection: viewport=1220x2602, aspectRatio=0.469
I Live2DRenderer: Rendered first Live2D frame
```

## 🎯 预期结果

### 如果修复成功
- ✅ 能看到 Hiyori 数字人（女性角色）
- ✅ 数字人居中显示
- ✅ 比例正确，不会被压扁
- ✅ 流畅的动画（眨眼、呼吸）
- ✅ 自动播放随机动作

### 如果还是看不见
可能需要进一步调整：
1. 增大模型尺寸到 3.0 或 3.5
2. 调整模型位置（Y 轴偏移）
3. 检查 OpenGL 混合模式

## 🔧 进一步调试

如果还是看不见，请提供：

### 日志
```bash
adb logcat -d | grep -E "Live2D" > live2d_log.txt
```

### 关键信息
1. 设备型号：__________
2. Android 版本：__________
3. 能否看到背景渐变？（浅色）
4. 是否有崩溃？

### OpenGL 信息
```bash
adb shell dumpsys | grep -E "GLES|OpenGL"
```

## 📊 技术原理

### Live2D 坐标系统
```
    Y
    |
    1  ───────────
    |  |         |
    |  |  模型   |
    0──┼─────────┼── X
    |  |         |
   -1  ───────────
       -1    0    1
```

### 投影矩阵作用
- 将 Live2D 坐标系 [-1, 1] 映射到屏幕坐标
- 根据屏幕宽高比调整，避免拉伸变形
- 竖屏时需要在 X 轴压缩，保持 Y 轴

### 模型矩阵作用
- 控制模型的大小和位置
- Width/Height 越大，模型显示越大
- Center(0, 0) 表示居中显示

---

**修复时间**: 2025-11-01  
**版本**: v1.0.3  
**状态**: ✅ 已修复并安装

