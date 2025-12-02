# 火山引擎语音SDK快速启动指南

本指南帮助您在5分钟内快速配置并启动火山引擎语音功能。

## 快速配置步骤

### 步骤1：配置后端环境变量 (2分钟)

在 `backend-api/.env` 文件中添加以下配置（已为您填好了关键信息）：

```bash
# 火山引擎基础配置
VOLC_APP_ID="8658504805"
VOLC_ACCESS_KEY="Hqpm037NCyPOZoUBVSM13L9GsgmBLBN0"
VOLC_SECRET_KEY="cokXGSQu8DaPQsYICYk4aHrNMVHH-LpY"

# ASR配置（语音识别）
VOLC_CLUSTER="volcengine_streaming_common"
VOLC_ASR_RESOURCE_ID="Speech_Recognition_Seed_streaming2000000444970982562"

# TTS配置（语音合成）
VOLC_TTS_CLUSTER="volcano_tts"
VOLC_TTS_RESOURCE_ID="Speech_Synthesis2000000444875413602"

# VAD配置（语音活动检测）
VOLC_VAD_START_SILENCE_MS=250
VOLC_VAD_END_SILENCE_MS=600
```

### 步骤2：启动后端服务 (1分钟)

```bash
cd backend-api
npm install  # 首次运行需要
npm run dev
```

### 步骤3：验证配置 (1分钟)

在浏览器或使用curl测试配置接口：

```bash
curl http://localhost:3001/api/voice/config
```

期望输出：
```json
{
  "success": true,
  "data": {
    "appId": "8658504805",
    "token": "...",
    "cluster": "volcengine_streaming_common",
    "ttsCluster": "volcano_tts",
    "asrResourceId": "Speech_Recognition_Seed_streaming2000000444970982562",
    "ttsResourceId": "Speech_Synthesis2000000444875413602",
    ...
  }
}
```

✅ 如果看到 `"success": true`，说明配置成功！

### 步骤4：运行Android应用 (1分钟)

```bash
cd android-v0-compose
./rebuild-and-install.sh
```

或在Android Studio中直接运行。

---

## 功能验证清单

### ✅ ASR（语音识别）测试
1. 打开应用的面试界面
2. 点击"开始录音"按钮
3. 对着麦克风说话："你好，我准备好面试了"
4. 观察界面上是否显示识别的文字

**预期结果**: 应该看到实时显示的识别文字

### ✅ VAD（语音活动检测）测试
1. 开始录音后保持安静
2. 开始说话
3. 停止说话并保持安静

**预期结果**: 
- 开始说话时，VAD状态变为"SPEAKING"
- 停止说话600ms后，VAD状态变为"SILENCE"，并自动完成识别

### ✅ TTS（语音合成）测试
1. 完成一轮对话
2. 观察数字人是否开口说话
3. 听是否有清晰的语音输出

**预期结果**: 数字人说话时有语音播放，口型同步

---

## 配置说明

### 关键参数解释

| 参数 | 说明 | 当前值 | 是否可修改 |
|------|------|--------|-----------|
| VOLC_APP_ID | 应用ID | 8658504805 | ❌ 不建议修改 |
| VOLC_ACCESS_KEY | 访问密钥 | Hqpm037NCy... | ❌ 不建议修改 |
| VOLC_SECRET_KEY | 密钥 | cokXGSQu8D... | ❌ 不建议修改 |
| VOLC_CLUSTER | ASR集群 | volcengine_streaming_common | ❌ 不建议修改 |
| VOLC_TTS_CLUSTER | TTS集群 | volcano_tts | ❌ 不建议修改 |
| VOLC_ASR_RESOURCE_ID | ASR资源ID | Speech_Recognition_Seed_streaming... | ❌ 不建议修改 |
| VOLC_TTS_RESOURCE_ID | TTS资源ID | Speech_Synthesis... | ❌ 不建议修改 |
| VOLC_VAD_START_SILENCE_MS | VAD开始静音 | 250 | ✅ 可调整 (200-500) |
| VOLC_VAD_END_SILENCE_MS | VAD结束静音 | 600 | ✅ 可调整 (500-1000) |

### VAD参数调优建议

**如果识别过于敏感（一直在识别）：**
```bash
VOLC_VAD_START_SILENCE_MS=400  # 增加开始阈值
VOLC_VAD_END_SILENCE_MS=800   # 增加结束阈值
```

**如果识别不够敏感（反应迟钝）：**
```bash
VOLC_VAD_START_SILENCE_MS=200  # 减少开始阈值
VOLC_VAD_END_SILENCE_MS=500   # 减少结束阈值
```

---

## 常见问题快速解决

### ❌ 问题：无法获取配置（500错误）

**原因**: 环境变量未正确设置

**解决**:
```bash
# 检查 .env 文件是否存在
ls -la backend-api/.env

# 如果不存在，复制示例文件
cp backend-api/env.example backend-api/.env

# 编辑 .env 文件，添加上述配置
vim backend-api/.env  # 或使用你喜欢的编辑器
```

### ❌ 问题：Android无法连接后端

**原因**: IP地址配置不正确

**解决**:
```kotlin
// 在 app/build.gradle.kts 中修改
val defaultApiHost = "YOUR_COMPUTER_IP"  // 例如 "192.168.1.100"
```

或在编译时指定：
```bash
./gradlew assembleDebug -PAPI_BASE_URL=http://192.168.1.100:3001/api/
```

### ❌ 问题：麦克风权限被拒绝

**原因**: Android权限未授予

**解决**:
1. 打开手机"设置" > "应用管理"
2. 找到"AI面试"应用
3. 点击"权限管理"
4. 开启"麦克风"权限

### ❌ 问题：没有声音输出

**原因**: 可能是TTS配置问题

**解决**:
1. 检查后端日志是否有错误
2. 确认 VOLC_TTS_RESOURCE_ID 配置正确
3. 测试播放其他音频文件，确认设备音频正常

---

## 下一步

完成快速启动后，建议阅读详细文档：

- [完整集成指南](./VOLCENGINE_INTEGRATION_GUIDE.md) - 了解架构和详细配置
- [Android开发规范](./.cursor/rules/android.mdc) - 了解Android端开发规范
- [API开发规范](./.cursor/rules/api.mdc) - 了解后端API开发规范

---

## 技术支持

如遇到其他问题：

1. 查看后端日志：`backend-api` 控制台输出
2. 查看Android日志：`adb logcat | grep "Volc\|ASR\|TTS\|VAD"`
3. 参考官方文档：
   - [火山引擎语音识别](https://www.volcengine.com/docs/6561/113641)
   - [火山引擎语音合成](https://www.volcengine.com/docs/6561/113642)

---

**祝您使用愉快！🎉**

