# AI面试系统 - 移动三端直连健壮性及交互规范

> **适用对象**：Android 负责人、iOS 负责人、HarmonyOS 负责人  
> **更新时间**：2026-05-27

本规范定义了移动三端应用（Android, iOS, HarmonyOS）与后端主 API 网关及语音直连微服务（ASR / TTS）在建立长连接、网络重连、交互打断及音频采集等场景下的健壮性标准，以确保端到端极速数字人交互的流畅、安全与稳定。

---

## 1. 临时签名鉴权规范 (直连验证)

为了防止 ASR 与 TTS 服务被公网流量盗刷或未授权越权访问，系统废弃了“仅凭 `sessionId` 即可建连”的旧做法。

- **配置获取**：客户端通过 Socket.IO 网关发起 `get_service_config` 或 `get_qwen3_config` 获取 ASR/TTS 服务连接地址时，响应报文中会包含与当前 `sessionId` 绑定、并在 30 分钟内有效的加密签名 `sessionToken`。
- **建连请求**：客户端在建立 ASR WebSocket (`/ws/asr`) 与 TTS WebSocket (`/ws/tts`) 成功后，首条必须发送的控制文本消息为 `session.create`。
- **载荷要求**：必须在 `session.create` 事件的数据中传入 `sessionToken`。

### ASR/TTS 连接首包示例
```json
{
  "type": "session.create",
  "sessionId": "b9087a32-9c12-4cfc-bd89-8d197607ea01",
  "sessionToken": "1779951239000.e235086d4cfd9efba2419ef02b17f867",
  "config": {
    "sampleRate": 16000,
    "language": "zh"
  }
}
```

> [!WARNING]
> 未携带 `sessionToken` 或携带的 Token 已过期/非法的连接，ASR/TTS 服务端会在握手阶段返回 `UNAUTHORIZED` 错误并直接断开 WebSocket（状态码 4001）。

---

## 2. 三通道就绪握手同步规范

客户端在进入数字人面试界面时，会同时维护三条网络通道：
1. **Socket.IO 控制通道** (`backend-api`)
2. **ASR 拾音上行 WS 通道** (`asr-service`)
3. **TTS 播报下行 WS 通道** (`tts-service`)

由于建连网络时序不可控，极易出现 ASR/TTS 尚未完成握手而 `interview-service` 已在 Redis 广播开场白导致客户端“失声”的问题。

- **握手规则**：
  1. 客户端建立 Socket.IO 连接并成功触发 `join_session`（收到 `session_joined` 状态包）。
  2. 客户端建立 ASR WS 连接并发送 `session.create`，收到服务端返回的 `session.created` 回执。
  3. 客户端建立 TTS WS 连接并发送 `session.create`，收到服务端返回的 `session.created` 回执。
  4. **三路确认就绪后**，客户端通过 Socket.IO 发送就绪信号：`client_ready`。
  
- **客户端就绪上报负载**：
  ```json
  // 发送至 Socket.IO
  socket.emit("client_ready", { "sessionId": "b9087a32-9c12-4cfc-bd89-8d197607ea01" });
  ```

> [!NOTE]
> `interview-service` 后台在收到网关中转的 `CLIENT_READY` 消息之前，会一直将面试会话维持在挂起状态，绝不触发首播。一旦收到 `CLIENT_READY`，则立即下发欢迎语或恢复续面进度。

---

## 3. 指数退避式断线重连与状态恢复 (Warm Resume)

在弱网或网络制式切换（Wi-Fi 切换 5G 等）场景下，客户端 WebSocket 随时可能意外断开。

### 客户端重连要求
- 客户端发现 WebSocket 异常断开时，不要主动销毁当前面试页面和内存状态，亦不提示报错，应在后台启动**自动指数退避重连**（重连间隔时间为：0.5s、1s、2s、4s、8s，最大尝试至 30 秒）。
- 重连时，建连及 `session.create` 中必须携带**与断开前完全一致的 `sessionId` 和 `sessionToken`**。

### 服务端宽限期保护 (Grace Period)
- ASR-Service 与 TTS-Service 发现连接异常断开时，系统不会立即销毁当前面试的上下文，而是将该 Session 挂起并启动 **30 秒宽限期倒计时**。
- 如果客户端在 30 秒内使用相同的凭据重连成功，服务端将复用之前的会话环境与缓存数据，并在 `session.created` 响应里返回 `isResumed: true`。

---

## 4. 播放端精准打断与裁剪规范

在数字人面试官发声时，用户如果突然开口（或在按键说话模式下用户按下录音），客户端必须执行即时打断。

### 客户端本地打断逻辑
1. **停止发声**：客户端本地必须**立即**停止 AudioTrack 的播放，并使音频输出静音。
2. **停止动画**：将 Live2D 或 DUIX 数字人从说话状态切换为静音/倾听动画。
3. **裁断缓冲区**：清空客户端待播放的 PCM 音频包本地缓存。
4. **丢弃冗余帧**：大模型和 TTS 微服务存在分布式网络时延。发送打断消息（Socket.IO 发送 `interrupt` 或 `stop_tts`）之后，可能仍有极少数在途的音频包下发，客户端在打断触发后**必须彻底丢弃此后收到的所有音频包**，直到服务端返回 `tts.interrupt_ack`。
5. **打断确认**：TTS-Service 在完成上游截断后，会向客户端派发 `tts.interrupt_ack` 帧：
   ```json
   {
     "type": "tts.interrupt_ack",
     "sessionId": "...",
     "charCount": 140,         // 中断前实际合成的字符数
     "audioChunkCount": 85,    // 中断前实际下发的音频块数
     "timestamp": 1779951241000
   }
   ```
   客户端在收到该 ACK 前，需要继续阻断一切语音外放。

---

## 5. 拾音回声消除 (AEC) 强制标准

数字人在大喇叭功放播放声音时，如果客户端的麦克风同时处于拾音状态，播出的面试官语音极易被麦克风重新录入，发送给 ASR-Service 识别成候选人的话，从而导致数字人“自己和自己吵架/死循环”的严重故障。

- **AEC 强制开启**：三端在初始化音频录制（如 Android 的 `AudioRecord`、iOS 的 `AVAudioEngine`）时，**必须强制启用系统硬件级别的回声消除 (AEC, Acoustic Echo Cancellation)** 与噪声抑制 (ANS, Acoustic Noise Suppression) 选项。
- **软性降噪兜底**：若设备硬件不支持，必须集成软件降噪插件或将麦克风增益调至合理范围，防止回声泄漏。
