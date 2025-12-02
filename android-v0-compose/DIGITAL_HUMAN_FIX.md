# 数字人形象显示修复

## 问题

之前使用简单的文字占位符（"AI" 图标 + 文字说明）显示数字人，用户体验不佳，缺乏真实感。

## 解决方案

使用项目中已有的真实数字人形象图片 `digital_human_placeholder.png` 来替换文字占位符。

## 修改内容

### 1. 导入必要的组件

```kotlin
import androidx.compose.foundation.Image
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.layout.ContentScale as ComposeContentScale
```

### 2. 更新主画面数字人显示

**DigitalHumanPlaceholder 组件**：
- 使用 `Image` 组件加载 `R.drawable.digital_human_placeholder`
- 背景使用浅色渐变（模拟办公室环境）
- 图片使用 `ContentScale.Fit` 保持宽高比
- 底部添加半透明标签显示 "STAR-LINK 数字人面试官"

### 3. 更新小窗预览数字人显示

**DigitalHumanPreviewTile 组件**：
- 同样使用真实数字人图片
- 圆角边框（12dp）
- 右上角显示 "数字人" 标签

## 技术细节

### ContentScale 选择

使用 `ContentScale.Fit` 而不是 `Crop`：
- **Fit**：保持图片宽高比，完整显示所有内容
- **Crop**：填充整个容器，可能裁剪部分内容

由于数字人图片包含4个人物的横向排列，使用 Fit 可以确保所有数字人都可见。

### 背景颜色

主画面背景使用浅色渐变：
```kotlin
Color(0xFFE8EEF2)  // 浅灰蓝色
Color(0xFFF5F5F5)  // 浅灰色
```

这样可以与数字人图片的办公室背景更好地融合。

## 显示效果

现在用户将看到：
1. **主画面**：专业的数字人形象（可能显示4个数字人）
2. **小窗预览**：同样的数字人图片缩略图
3. **底部标签**：半透明黑色渐变背景 + "STAR-LINK 数字人面试官" 文字

## 进一步优化建议

如果需要只显示单个数字人：

### 方案1：创建单独的图片资源
从原图中裁剪出4个单独的数字人图片：
- `digital_human_1.png`
- `digital_human_2.png`
- `digital_human_3.png`
- `digital_human_4.png`

然后随机选择一个显示。

### 方案2：使用 Crop + Alignment
使用 `ContentScale.Crop` 并指定对齐方式：
```kotlin
contentScale = ComposeContentScale.Crop,
alignment = Alignment.CenterStart  // 显示左侧的数字人
```

### 方案3：添加动画效果
使用 Lottie 或其他动画库为数字人添加：
- 眨眼动画
- 微笑动画
- 手势动画
- 说话时的口型动画

## 文件修改记录

- `DigitalInterviewScreen.kt`
  - 添加 Image 和 painterResource 导入
  - 重写 `DigitalHumanPlaceholder` 使用图片
  - 重写 `DigitalHumanPreviewTile` 使用图片
  - 优化背景颜色和布局

## 测试验证

构建运行后，检查：
- ✅ 主画面显示数字人图片（不是文字）
- ✅ 图片清晰完整
- ✅ 底部标签清晰可读
- ✅ 小窗预览显示数字人缩略图
- ✅ UI元素（返回按钮、题目、问题卡片、答题按钮）正常显示

## 性能考虑

- 图片从 drawable 资源加载，内存效率高
- 使用 Compose Image 组件，自动处理图片缓存
- 不需要额外的第三方库（如 Coil、Glide）

