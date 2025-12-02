# HarmonyOS 项目运行配置指南

## 问题诊断

从 DevEco Studio 截图可以看到以下问题：
1. **项目同步失败** - "Project sync failed"
2. **配置错误** - "No module found" 错误
3. **hvigorfile.ts 占位符** - 需要重新生成

## 解决步骤

### 1. 运行自动修复脚本
```bash
cd /Users/linxiong/Documents/dev/AI-Interview-System/harmony-v0-arkts
./fix-project.sh
```

### 2. 重新同步项目
在 DevEco Studio 中：
- 点击 `File` -> `Sync Project with Gradle Files`
- 或者点击工具栏的同步按钮 🔄
- 等待项目同步完成（应该不再显示 "Project sync failed"）

### 3. 在 DevEco Studio 中安装依赖
- 当项目同步时，DevEco Studio 会自动提示安装依赖
- 点击 "Install" 或 "Sync" 按钮
- 或者使用菜单 `Tools` -> `Ohpm` -> `Install Dependencies`

### 4. 配置运行环境

#### 4.1 创建模拟器或连接设备
- 打开 `Tools` -> `Device Manager`
- 创建 HarmonyOS 模拟器（推荐 API 9+）
- 或连接真实 HarmonyOS 设备

#### 4.2 配置运行参数
在 "Edit Configuration" 对话框中：

**General 标签页：**
- **Module**: 选择 `entry` （这是关键！）
- **Product**: 留空或选择默认
- **Target**: 选择已创建的模拟器或设备
- **Installation**: 
  - ✅ Keep existing application data
  - ✅ Automatically install application
  - ❌ Automatically uninstall application

**Debugger 标签页：**
- 保持默认设置

### 4. 运行项目
1. 确保配置正确后，点击 `Apply`
2. 点击 `Run` 按钮
3. 项目将编译并安装到目标设备

## 常见问题解决

### 问题1: "No module found"
**原因**: Module 字段未选择
**解决**: 在配置中选择 `entry` 模块

### 问题2: 项目同步失败
**原因**: hvigorfile.ts 配置错误
**解决**: 已修复 hvigorfile.ts 文件

### 问题3: 编译错误
**原因**: 依赖未安装
**解决**: 执行 `ohpm install`

## 项目结构说明

```
harmony-v0-arkts/
├── AppScope/           # 应用级配置
│   └── app.json5      # 应用信息
├── entry/             # 主模块
│   ├── src/main/
│   │   ├── ets/       # ArkTS 源码
│   │   ├── resources/ # 资源文件
│   │   └── module.json5 # 模块配置
│   └── build-profile.json5
├── build-profile.json5 # 构建配置
└── hvigorfile.ts      # 构建脚本
```

## 开发建议

1. **参考 Android 实现**: 查看 `entry/src/main/reference/android/` 目录
2. **逐步迁移**: 从简单页面开始，逐步迁移复杂功能
3. **测试验证**: 每个功能迁移后都要测试

## 下一步

1. 修复配置问题
2. 成功运行基础页面
3. 开始迁移 Android Compose 页面到 ArkTS
4. 实现 AI 面试功能
