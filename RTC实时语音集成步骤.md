# RTC实时语音集成步骤

**更新时间**: 2025-11-02  
**目标**: 实现App端 ↔ 服务端实时语音交互闭环

---

## 📊 当前进度

### ✅ 已完成（Android端）
1. Live2D数字人显示（主画面 + 小窗）
2. Native库编译和集成
3. 音频分析模块（AudioAnalyzer.kt）
4. 音频采集播放模块（RealtimeAudioCapture.kt）
5. Live2D音频驱动接口（Live2DAudioDriver）
6. 集成管理器（DigitalHumanAudioManager）

### 🔄 待完成（Android端）
1. WebSocket客户端实现
2. 与DigitalInterviewScreen集成
3. 测试和调优

### 🔄 待完成（服务端）
1. WebSocket服务器
2. ASR语音识别服务
3. VAD语音活动检测
4. TTS流式输出
5. 打断机制实现

---

## 🚀 快速开始：Android端集成

### 步骤1: 添加Socket.IO依赖（已有）

在 `app/build.gradle.kts` 中（已存在）:
```kotlin
dependencies {
    implementation("io.socket:socket.io-client:2.0.1")
}
```

### 步骤2: 创建WebSocket管理器

创建文件: `app/src/main/java/com/xlwl/AiMian/ai/DigitalHumanWebSocketManager.kt`

```kotlin
package com.xlwl.AiMian.ai

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URISyntaxException

class DigitalHumanWebSocketManager {
    
    companion object {
        private const val TAG = "DHWebSocket"
        // 服务端地址（需要修改为实际地址）
        private const val SERVER_URL = "http://10.0.2.2:3001"
    }
    
    private var socket: Socket? = null
    
    // 回调
    var onConnected: (() -> Unit)? = null
    var onDisconnected: (() -> Unit)? = null
    var onDigitalHumanAudio: ((ByteArray) -> Unit)? = null
    var onInterruptSignal: (() -> Unit)? = null
    var onError: ((String) -> Unit)? = null
    
    /**
     * 连接到服务器
     */
    fun connect() {
        try {
            val opts = IO.Options().apply {
                reconnection = true
                reconnectionAttempts = 5
                reconnectionDelay = 1000
                timeout = 5000
            }
            
            socket = IO.socket(SERVER_URL, opts).apply {
                // 连接事件
                on(Socket.EVENT_CONNECT) {
                    Log.i(TAG, "Connected to server")
                    onConnected?.invoke()
                }
                
                on(Socket.EVENT_DISCONNECT) {
                    Log.i(TAG, "Disconnected from server")
                    onDisconnected?.invoke()
                }
                
                on(Socket.EVENT_CONNECT_ERROR) { args ->
                    Log.e(TAG, "Connection error: ${args.getOrNull(0)}")
                    onError?.invoke("连接失败")
                }
                
                // 接收数字人音频
                on("digital_human_audio") { args ->
                    try {
                        val data = args[0] as JSONObject
                        val audioBase64 = data.getString("audio")
                        val audioData = android.util.Base64.decode(
                            audioBase64,
                            android.util.Base64.DEFAULT
                        )
                        onDigitalHumanAudio?.invoke(audioData)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing audio data", e)
                    }
                }
                
                // 接收打断信号
                on("interrupt_signal") {
                    Log.i(TAG, "Received interrupt signal")
                    onInterruptSignal?.invoke()
                }
                
                // 连接
                connect()
            }
            
            Log.i(TAG, "Connecting to $SERVER_URL")
            
        } catch (e: URISyntaxException) {
            Log.e(TAG, "Invalid server URL", e)
            onError?.invoke("服务器地址错误")
        }
    }
    
    /**
     * 断开连接
     */
    fun disconnect() {
        socket?.disconnect()
        socket?.close()
        socket = null
        Log.i(TAG, "Disconnected")
    }
    
    /**
     * 发送用户音频
     */
    fun sendAudio(audioData: ByteArray) {
        if (socket?.connected() != true) {
            Log.w(TAG, "Not connected, cannot send audio")
            return
        }
        
        try {
            val audioBase64 = android.util.Base64.encodeToString(
                audioData,
                android.util.Base64.NO_WRAP
            )
            
            val data = JSONObject().apply {
                put("audio", audioBase64)
                put("format", "pcm")
                put("sampleRate", 16000)
                put("channels", 1)
            }
            
            socket?.emit("user_audio", data)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error sending audio", e)
        }
    }
    
    /**
     * 发送打断信号
     */
    fun sendInterruption() {
        if (socket?.connected() != true) {
            return
        }
        
        socket?.emit("user_interrupt")
        Log.i(TAG, "Sent interruption signal")
    }
    
    /**
     * 检查连接状态
     */
    fun isConnected() = socket?.connected() ?: false
}
```

### 步骤3: 在DigitalInterviewScreen中集成

在 `DigitalInterviewScreen.kt` 中添加（在`DigitalInterviewScreen`函数顶部）:

```kotlin
@Composable
fun DigitalInterviewScreen(
    uiState: DigitalInterviewUiState,
    onBackClick: () -> Unit,
    onStartAnswer: () -> Unit,
    onRetry: () -> Unit
) {
    val context = LocalContext.current
    var hasCameraPermission by remember { mutableStateOf(false) }
    var hasMicrophonePermission by remember { mutableStateOf(false) }
    var isCameraEnabled by remember { mutableStateOf(false) }
    var showPermissionDialog by remember { mutableStateOf(false) }
    var isUserPrimary by rememberSaveable { mutableStateOf(false) }
    val live2DController = remember { Live2DViewController() }
    
    // ===== 新增：音频和WebSocket集成 =====
    val websocketManager = remember { DigitalHumanWebSocketManager() }
    val audioManager = remember { 
        DigitalHumanAudioManager(context, live2DController).apply {
            // 监听用户说话（用于打断检测和ASR）
            onUserSpeechDetected = { audioData ->
                // 将用户语音发送到服务器
                websocketManager.sendAudio(audioData)
            }
            
            // 监听打断事件
            onInterruptionDetected = {
                // 通知服务器用户打断了数字人
                websocketManager.sendInterruption()
            }
        }
    }
    
    // WebSocket事件处理
    LaunchedEffect(Unit) {
        websocketManager.apply {
            onConnected = {
                Log.i("DigitalInterviewScreen", "WebSocket connected")
                // 可以更新UI状态
            }
            
            onDigitalHumanAudio = { audioChunk ->
                // 播放数字人语音并驱动Live2D
                audioManager.playDigitalHumanAudio(audioChunk)
            }
            
            onInterruptSignal = {
                // 收到服务端打断信号，停止数字人说话
                audioManager.stopDigitalHumanAudio()
            }
            
            onError = { error ->
                Log.e("DigitalInterviewScreen", "WebSocket error: $error")
            }
        }
        
        // 连接到服务器
        websocketManager.connect()
        
        // 开始监听用户语音（用于打断检测）
        if (hasMicrophonePermission) {
            audioManager.startListening()
        }
    }
    
    // 清理资源
    DisposableEffect(Unit) {
        onDispose {
            audioManager.stop()
            websocketManager.disconnect()
            live2DController.detachView()
        }
    }
    // ===== 新增代码结束 =====
    
    // ... 原有代码 ...
}
```

---

## 🔧 服务端实现

### 步骤1: 创建WebSocket服务

创建文件: `backend-api/src/services/digital-human-websocket.service.ts`

```typescript
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { VADService } from './vad.service';
import { ASRService } from './asr.service';
import { LLMService } from './llm.service';
import { TTSService } from './tts.service';
import { InterruptionService } from './interruption.service';

export class DigitalHumanWebSocketService {
  private io: SocketIOServer;
  private vadService: VADService;
  private asrService: ASRService;
  private llmService: LLMService;
  private ttsService: TTSService;
  private interruptionService: InterruptionService;
  
  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.vadService = new VADService();
    this.asrService = new ASRService();
    this.llmService = new LLMService();
    this.ttsService = new TTSService();
    this.interruptionService = new InterruptionService();
    
    this.setupHandlers();
  }
  
  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Digital human client connected: ${socket.id}`);
      
      // 接收用户音频
      socket.on('user_audio', async (data: any) => {
        try {
          const audioBuffer = Buffer.from(data.audio, 'base64');
          
          // 1. VAD检测
          const isSpeaking = await this.vadService.detect(audioBuffer);
          
          if (!isSpeaking) {
            return;
          }
          
          // 2. 如果数字人正在说话，打断
          if (this.interruptionService.isSpeaking(socket.id)) {
            socket.emit('interrupt_signal');
            this.interruptionService.interrupt(socket.id);
          }
          
          // 3. ASR识别
          const text = await this.asrService.recognize(audioBuffer);
          console.log(`User said: ${text}`);
          
          // 4. LLM生成回复
          const response = await this.llmService.chat(text, {
            persona: "专业面试官，15年面试经验"
          });
          console.log(`Digital human response: ${response}`);
          
          // 5. TTS合成（流式）
          const audioStream = await this.ttsService.synthesizeStream(response);
          
          // 标记数字人开始说话
          this.interruptionService.startSpeaking(socket.id, audioStream);
          
          // 6. 流式发送音频
          audioStream.on('data', (chunk: Buffer) => {
            socket.emit('digital_human_audio', {
              audio: chunk.toString('base64'),
              format: 'pcm',
              sampleRate: 16000
            });
          });
          
          audioStream.on('end', () => {
            console.log('Digital human finished speaking');
          });
          
          audioStream.on('error', (error: Error) => {
            console.error('TTS stream error:', error);
          });
          
        } catch (error) {
          console.error('Error processing user audio:', error);
        }
      });
      
      // 接收用户打断信号
      socket.on('user_interrupt', () => {
        console.log(`User interrupted: ${socket.id}`);
        this.interruptionService.interrupt(socket.id);
      });
      
      // 断开连接
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.interruptionService.interrupt(socket.id);
      });
    });
  }
}
```

### 步骤2: 在主服务器中集成

在 `backend-api/src/server.ts` 或 `backend-api/src/app.ts` 中:

```typescript
import express from 'express';
import { createServer } from 'http';
import { DigitalHumanWebSocketService } from './services/digital-human-websocket.service';

const app = express();
const server = createServer(app);

// ... 其他中间件和路由 ...

// 初始化数字人WebSocket服务
const digitalHumanService = new DigitalHumanWebSocketService(server);

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Digital Human WebSocket ready`);
});
```

---

## 🧪 测试步骤

### 测试1: Android端Live2D显示

```bash
# 编译并安装
cd android-v0-compose
./gradlew installDebug

# 查看日志
adb logcat -s Live2DView Live2DRenderer DigitalHumanLive2D | grep -E "(initialized|loaded|created)"
```

**预期结果**:
```
I/Live2DView: Creating Live2DGLView
I/Live2DRenderer: Model loaded successfully
I/DigitalHumanLive2D: Live2D view created and attached
```

### 测试2: 音频采集和分析

在DigitalInterviewScreen中添加测试代码:

```kotlin
Button(onClick = {
    // 测试音频采集
    val testCapture = RealtimeAudioCapture(context, { audioData ->
        val analyzer = AudioAnalyzer()
        val features = analyzer.analyze(audioData)
        Log.i("TEST", "Volume: ${features.volume}, Pitch: ${features.pitch}Hz")
    })
    testCapture.startCapture()
    
    // 10秒后停止
    lifecycleScope.launch {
        delay(10000)
        testCapture.stopCapture()
    }
}) {
    Text("测试音频采集")
}
```

### 测试3: WebSocket连接

```bash
# 启动服务端
cd backend-api
npm run dev

# 查看服务端日志
# 当Android端连接时，应该看到:
# Digital human client connected: <socket-id>
```

### 测试4: 端到端测试

1. 启动服务端
2. 安装并运行Android App
3. 进入数字人面试页面
4. 说话测试：
   - 应该看到Live2D嘴型随音频变化
   - 服务端应该收到音频数据
   - 数字人应该回复（ASR+LLM+TTS）
5. 打断测试：
   - 当数字人说话时，用户说话
   - 数字人应该立即停止
   - 开始处理用户新的输入

---

## 📝 配置检查清单

### Android端
- [ ] 录音权限已授予
- [ ] WebSocket服务器地址正确（修改`SERVER_URL`）
- [ ] Socket.IO依赖已添加
- [ ] Live2D数字人显示正常

### 服务端
- [ ] WebSocket服务器已启动
- [ ] ASR服务已配置（阿里云或FunASR）
- [ ] TTS服务已配置（IndexTTS2或阿里云）
- [ ] LLM服务已配置（DeepSeek）
- [ ] 端口3001开放（或修改为其他端口）

---

## ⚠️ 常见问题

### 问题1: Live2D不显示
**解决方案**: 查看诊断报告 `数字人实现诊断报告.md`

### 问题2: WebSocket连接失败
**原因**: 
- 服务器地址错误
- 服务器未启动
- 网络不通

**解决方案**:
```kotlin
// 在Android端修改服务器地址
private const val SERVER_URL = "http://你的服务器IP:3001"
```

### 问题3: 音频采集失败
**原因**: 没有录音权限

**解决方案**: 在Android设置中手动授予录音权限

### 问题4: Live2D嘴型不动
**原因**: 音频数据没有正确传递给Live2D控制器

**解决方案**: 检查`DigitalHumanAudioManager`的初始化和连接

---

## 📚 下一步优化

1. **延迟优化**
   - 减小音频缓冲区大小
   - 使用UDP替代TCP（考虑WebRTC Data Channel）
   - 优化TTS流式输出

2. **用户体验**
   - 添加"正在听"/"正在思考"/"正在说话"状态指示
   - 添加音量可视化
   - 添加打断动画效果

3. **稳定性**
   - 添加网络断开自动重连
   - 添加错误重试机制
   - 添加日志上报

4. **功能扩展**
   - 支持多轮对话
   - 支持上下文记忆
   - 支持情绪表达（通过Live2D表情）

---

**更新时间**: 2025-11-02  
**状态**: Android端基础功能已完成，等待测试反馈

