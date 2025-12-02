# 快速构建和测试指南

## 一键测试流程

### 前提条件
1. Backend服务已运行（`cd backend-api && npm run dev`）
2. Android设备已连接并开启USB调试
3. 已配置阿里云NLS相关环境变量

### 快速测试步骤

```bash
# 1. 进入Android项目目录
cd /Volumes/Leo/dev/AI-Interview-System/android-v0-compose

# 2. 清理并重新编译
./gradlew clean assembleDebug

# 3. 安装到设备
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 4. 运行测试脚本（监控日志）
./test-voice-system.sh
```

## 详细步骤说明

### 1. 启动Backend服务

```bash
# 在第一个终端窗口
cd /Volumes/Leo/dev/AI-Interview-System/backend-api
npm run dev

# 应该看到类似输出：
# Server running on port 3001
# WebSocket server initialized
```

### 2. 编译Android App

```bash
# 在第二个终端窗口
cd /Volumes/Leo/dev/AI-Interview-System/android-v0-compose

# 清理旧的编译产物
./gradlew clean

# 编译Debug版本
./gradlew assembleDebug

# 编译成功后，APK位于：
# app/build/outputs/apk/debug/app-debug.apk
```

### 3. 安装到设备

```bash
# 确保设备已连接
adb devices

# 安装APK（-r参数表示替换已有版本）
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 应该看到：
# Success
```

### 4. 运行测试

#### 方法1：使用测试脚本（推荐）
```bash
./test-voice-system.sh
```

脚本会自动：
- 检查ADB连接
- 检查Backend服务
- 测试阿里云Token API
- 清空日志
- 实时监控并高亮关键日志

#### 方法2：手动监控日志
```bash
# 清空旧日志
adb logcat -c

# 实时查看日志
adb logcat | grep -E "RealtimeVoiceManager|AliyunSpeechService"
```

### 5. 执行测试操作

在App中依次操作：
1. 打开App
2. 进入数字人面试界面
3. 等待WebSocket连接成功（看到"WebSocket连接成功"日志）
4. 点击"开始答题"按钮
5. 对着麦克风说话2-3秒（例如："你好，我想应聘软件工程师"）
6. 点击"结束回答"按钮
7. 观察日志中的ASR识别结果
8. 等待数字人回复并播放TTS

### 6. 验证结果

检查是否看到以下关键日志：

#### ✅ WebSocket连接
```
D/RealtimeVoiceManager: WebSocket连接成功: http://192.168.1.6:3001
```

#### ✅ 录音启动
```
I/RealtimeVoiceManager: 录音已启动
D/RealtimeVoiceManager: 开始录音循环
D/RealtimeVoiceManager: 已录音: 32KB
```

#### ✅ ASR识别
```
I/RealtimeVoiceManager: 开始调用阿里云ASR - 音频大小: 102400 bytes
D/AliyunSpeechService: ASR成功: text=你好，我想应聘软件工程师
```

#### ✅ 文本发送
```
I/RealtimeVoiceManager: 通过WebSocket发送text_message - text=你好，我想应聘软件工程师
```

#### ✅ 收到回复
```
I/RealtimeVoiceManager: 收到语音响应 - text=您好！很高兴认识您...
```

#### ✅ TTS播放
```
I/RealtimeVoiceManager: 开始调用阿里云TTS - textLen=50
D/AliyunSpeechService: TTS成功: file=/data/.../aliyun_tts_xxx.mp3
I/RealtimeVoiceManager: TTS成功，开始播放
```

## 常见构建问题

### 问题1: Gradle Sync失败

**错误信息**：
```
Could not resolve all dependencies...
```

**解决方案**：
```bash
# 清理Gradle缓存
./gradlew clean
rm -rf .gradle
./gradlew build --refresh-dependencies
```

### 问题2: Build失败 - Kotlin版本问题

**解决方案**：
检查`build.gradle.kts`中的Kotlin版本与项目配置一致

### 问题3: APK安装失败

**错误信息**：
```
INSTALL_FAILED_UPDATE_INCOMPATIBLE
```

**解决方案**：
```bash
# 卸载旧版本
adb uninstall com.xlwl.AiMian

# 重新安装
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 问题4: ADB设备未找到

**解决方案**：
```bash
# 重启ADB服务
adb kill-server
adb start-server
adb devices
```

## 性能优化提示

### 加快编译速度
在`gradle.properties`中添加：
```properties
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.caching=true
```

### 只编译特定架构
```bash
# 只编译arm64-v8a（适用于大多数现代Android设备）
./gradlew assembleDebug -Pandroid.injected.build.abi=arm64-v8a
```

## 调试技巧

### 1. 查看崩溃日志
```bash
adb logcat -b crash
```

### 2. 查看ANR日志
```bash
adb pull /data/anr/traces.txt
```

### 3. 监控网络请求
```bash
adb logcat | grep -E "OkHttp|HttpClient"
```

### 4. 查看内存使用
```bash
adb shell dumpsys meminfo com.xlwl.AiMian
```

## 发布构建

### 生成签名APK
```bash
# 生成Release版本（需要配置签名）
./gradlew assembleRelease

# APK位于：
# app/build/outputs/apk/release/app-release.apk
```

### 生成AAB（Google Play）
```bash
./gradlew bundleRelease

# AAB位于：
# app/build/outputs/bundle/release/app-release.aab
```

## 相关文档

- [VOICE_TESTING_GUIDE.md](./VOICE_TESTING_GUIDE.md) - 详细测试指南
- [VOICE_DEBUG_SUMMARY.md](./VOICE_DEBUG_SUMMARY.md) - 调试总结
- [README_LIVE2D.md](./README_LIVE2D.md) - Live2D集成说明

---

**最后更新**：2025-11-12

