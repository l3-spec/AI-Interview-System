# AI 面试系统 — 当前代码架构与业务流

> 基于仓库代码梳理，反映 **as-is** 实现（非目标架构）。  
> 最后更新：2026-05-20

---

## 1. 总体部署架构

```mermaid
flowchart TB
    subgraph Client["客户端"]
        APP["Android / iOS App"]
        ADMIN["企业管理端 admin-dashboard :5174"]
        SYS["系统管理端 system-admin :5175"]
    end

    subgraph Edge["入口层（生产）"]
        NGINX["Nginx :80 / :443"]
    end

    subgraph Services["微服务层（Docker Compose 生产）"]
        API["backend-api :3001<br/>主 API + Socket.IO 网关"]
        ASR["asr-service :3002<br/>Qwen3 实时 ASR"]
        TTS["tts-service :3003<br/>Qwen3 实时 TTS"]
        IV["interview-service :3004<br/>面试流程编排"]
        AN["analysis-service :3005<br/>分析 Worker（轮询 DB）"]
    end

    subgraph Infra["基础设施"]
        MYSQL[("MySQL / RDS<br/>ai_interview_db")]
        REDIS[("Redis<br/>Stream + Pub/Sub")]
        OSS[("阿里云 OSS<br/>视频/音频/报告")]
    end

    subgraph External["外部 AI 服务"]
        DS["DeepSeek / LLM API"]
        DASH["DashScope<br/>Qwen3 ASR/TTS"]
    end

    APP -->|"① REST /api/*"| NGINX
    APP -->|"② Socket.IO 面试控制"| NGINX
    APP -->|"③ WebSocket 直连 ASR"| ASR
    APP -->|"④ WebSocket 直连 TTS"| TTS

    ADMIN --> NGINX
    SYS --> NGINX

    NGINX -->|"/api/ /socket.io/"| API
    NGINX -->|"/asr/" 可选| ASR
    NGINX -->|"/tts/" 可选| TTS
    NGINX -->|"/interview/"| IV
    NGINX -->|"/analysis/"| AN

    API --> MYSQL
    API --> REDIS
    API --> OSS
    API -->|"HTTP + Redis"| ASR
    API -->|"HTTP + Redis"| TTS
    API -->|"HTTP REST"| IV
    API -->|"Redis Stream"| IV
    API --> DS

    IV --> MYSQL
    IV --> REDIS
    IV -->|"HTTP + Redis"| ASR
    IV -->|"HTTP + Redis"| TTS
    IV --> DS

    ASR --> REDIS
    ASR --> DASH
    TTS --> REDIS
    TTS --> DASH

    AN --> MYSQL
    AN --> OSS
    AN --> DS
```

### 端口一览

| 服务 | 端口 | 协议 | 职责 |
|------|------|------|------|
| backend-api | 3001 | HTTP + Socket.IO | 认证、业务 API、实时网关 |
| asr-service | 3002 | HTTP + WebSocket `/ws/asr` | 实时语音识别 |
| tts-service | 3003 | HTTP + WebSocket `/ws/tts` | 实时语音合成 |
| interview-service | 3004 | HTTP REST | 面试状态机、LLM 编排 |
| analysis-service | 3005 | HTTP `/health` only | 异步分析报告生成 |

---

## 2. 服务依赖关系（代码级）

```mermaid
flowchart LR
    subgraph 有状态依赖
        API2["backend-api"]
        IV2["interview-service"]
        AN2["analysis-service"]
    end

    subgraph 无状态语音微服务
        ASR2["asr-service"]
        TTS2["tts-service"]
    end

    MYSQL2[("MySQL")]
    REDIS2[("Redis")]
    OSS2[("OSS")]

    API2 --> MYSQL2
    API2 --> REDIS2
    API2 --> OSS2
    API2 -.->|"InterviewServiceClient HTTP"| IV2
    API2 -.->|"Redis Stream inbound/outbound"| IV2
    API2 -.->|"qwen3-*-client"| ASR2
    API2 -.->|"qwen3-*-client"| TTS2

    IV2 --> MYSQL2
    IV2 --> REDIS2
    IV2 -.->|"coordinator 订阅 asr:events"| ASR2
    IV2 -.->|"qwen3-tts-client + session 频道"| TTS2

    ASR2 --> REDIS2
    TTS2 --> REDIS2

    AN2 --> MYSQL2
    AN2 --> OSS2

    style AN2 fill:#f9f,stroke:#333
    note1["analysis-service 不被 backend-api HTTP 调用<br/>通过轮询 MySQL 解耦"]
```

**要点：**

- `backend-api` 与 `interview-service` 之间存在 **双通道**：HTTP REST + Redis Stream。
- `analysis-service` 是独立 Worker，**没有** `ANALYSIS_SERVICE_URL` 之类的同步调用。
- `interview-service` 内含 `analysisQueue.ts`（与 analysis-service 重复），但 `index.ts` **未启动**该队列。

---

## 3. 客户端三通道连接

App 在一次实时面试中同时维护 **三条独立连接**：

```mermaid
flowchart TB
    APP["Android App<br/>RealtimeVoiceManager"]

    APP -->|"Socket.IO<br/>join_session / text_chunk / voice_response"| GW["backend-api :3001<br/>RealtimeVoiceWebSocketServer"]
    APP -->|"原生 WebSocket<br/>session.create / audio.append"| ASR3["asr-service :3002<br/>/ws/asr"]
    APP -->|"原生 WebSocket<br/>session.create / text.append"| TTS3["tts-service :3003<br/>/ws/tts"]

    GW -->|"Redis Stream<br/>interview:inbound_stream"| COORD["interview-service<br/>CoordinatorService"]
    COORD -->|"Redis Pub/Sub<br/>interview:events:outbound:*"| GW
    GW -->|"Socket.IO emit"| APP

    ASR3 -->|"Redis asr:events<br/>transcription_completed"| COORD
    TTS3 -->|"音频 PCM 流"| APP
    ASR3 -->|"DashScope WS"| DS3["DashScope"]
    TTS3 -->|"DashScope WS"| DS3
```

| 通道 | 协议 | 默认地址 | 用途 |
|------|------|----------|------|
| 业务控制 | Socket.IO | `http(s)://host:3001` | 加入会话、LLM 文本块、状态同步 |
| 语音识别 | WebSocket | `ws://host:3002/ws/asr` | 麦克风 PCM 上行、识别结果 |
| 语音合成 | WebSocket | `ws://host:3003/ws/tts` | 面试官语音下行、口型驱动 |

配置下发：`GET /api/public/client-runtime-config` 或 Socket 事件 `get_service_config`。

---

## 4. 实时面试主业务流（Sequence）

```mermaid
sequenceDiagram
    autonumber
    participant C as Android 客户端
    participant G as backend-api<br/>(Socket.IO 网关)
    participant R as Redis
    participant I as interview-service<br/>(Coordinator)
    participant L as DeepSeek LLM
    participant T as tts-service
    participant A as asr-service

    Note over C,A: 阶段 0 — 建立三通道
    C->>G: Socket.IO connect + join_session
    G->>R: XADD interview:inbound_stream JOIN_SESSION
    C->>A: WS connect /ws/asr + session.create
    C->>T: WS connect /ws/tts + session.create

    R->>I: 消费 JOIN_SESSION
    I->>I: initializeSession / 断点续面判断
    I->>L: 生成开场白 / 下一题
    I->>R: PUBLISH interview:events:outbound voice_response
    R->>G: 订阅 outbound 频道
    G->>C: emit text_chunk / voice_response

    Note over C,T: 阶段 1 — 面试官说话（TTS）
    C->>T: text.append + commit（或服务端经 Redis 触发）
    T->>C: response.audio.delta (PCM 流)
    C->>C: DUIX 口型同步 + 播放
    C->>G: playback_done

    Note over C,A: 阶段 2 — 用户回答（ASR）
    C->>A: audio.append (PCM)
    A->>R: PUBLISH asr:events transcription_completed
    R->>I: Coordinator 订阅 asr:events
    I->>L: 评估回答 / 生成追问或下一题
    I->>R: PUBLISH voice_response / text_chunk
    R->>G: outbound 事件
    G->>C: Socket.IO 推送

    Note over C,I: 阶段 3 — 结束面试
    C->>G: 结束信号 / 最后一轮完成
    G->>R: inbound END 类事件
    I->>I: endInterview → status=COMPLETED 写入 MySQL
    I->>R: 推送结束事件
    G->>C: interview_completed
```

### Socket.IO 主要事件（客户端 ↔ backend-api）

| 方向 | 事件 | 说明 |
|------|------|------|
| C → G | `join_session` | 加入面试房间，触发 JOIN_SESSION |
| C → G | `text_message` | 文本模式输入（不经 ASR） |
| C → G | `playback_done` | TTS 播放完毕，切换 listening |
| C → G | `stop_tts` | 打断 TTS |
| G → C | `session_joined` | 加入成功 |
| G → C | `text_chunk` | LLM 流式文本（字幕） |
| G → C | `voice_response` | 需播放的语音文本 + metadata |

---

## 5. ASR 语音识别流

```mermaid
sequenceDiagram
    participant C as 客户端
    participant A as asr-service
    participant D as DashScope<br/>Qwen3-ASR
    participant R as Redis
    participant I as interview-service

    C->>A: WS session.create {sessionId, language, sampleRate}
    A->>D: Realtime WS 建立 ASR 会话
    A->>C: asr.session_created

    loop 用户说话
        C->>A: audio.append (Base64 PCM)
        A->>D: 转发音频帧
        D->>A: transcription_partial
        A->>C: asr.transcription_partial
    end

    D->>A: transcription_final (Server VAD)
    A->>C: asr.transcription_final
    A->>R: PUBLISH asr:events {transcription_completed}
    R->>I: Coordinator.handleAsrTranscription
    I->>I: processUserResponse → LLM
```

**Redis 频道：**

| 频道 | 方向 | 内容 |
|------|------|------|
| `asr:events` | ASR → 订阅方 | 识别结果、VAD 事件 |
| `asr:commands` | backend/interview → ASR | 控制指令 |

---

## 6. TTS 语音合成流（双轨混合流式）

```mermaid
sequenceDiagram
    participant I as interview-service
    participant R as Redis
    participant T as tts-service
    participant D as DashScope<br/>Qwen3-TTS
    participant C as 客户端

    I->>R: PUBLISH interview:events:outbound:session:{id}<br/>{type: voice_response, text: "..."}
    Note over T: tts-service 订阅 session 频道
    R->>T: 收到 voice_response
    T->>D: input_text_buffer.append (流式文本)
    T->>D: commit (server_commit 模式)

    loop 音频流
        D->>T: response.audio.delta
        T->>C: WS tts.audio.delta (Base64 PCM)
    end

    D->>T: response.done
    T->>C: tts.response.done
    C->>C: AudioTrack 播放 + DUIX 口型
    C->>I: playback_done (经 backend-api 网关)
```

**说明：** 客户端也可直接向 TTS 发送 `text.append`（`Qwen3TtsWsClient.speak()`），与服务端 Redis 触发并存。

---

## 7. 异步分析业务流

```mermaid
flowchart TB
    subgraph 触发
        IV3["interview-service<br/>endInterview()"]
    end

    subgraph 存储
        DB[("MySQL<br/>AIInterviewSession<br/>status = COMPLETED")]
    end

    subgraph 消费
        AN3["analysis-service<br/>pollPendingAnalyses()<br/>每 10 秒"]
    end

    subgraph 分析管线
        P1["拉取会话问答记录"]
        P2["ASR 补全 / 视频抽帧"]
        P3["DeepSeek 评分"]
        P4["写 AIInterviewAnalysisReport"]
        P5["报告上传 OSS"]
    end

    IV3 -->|"UPDATE status"| DB
    AN3 -->|"SELECT PENDING/COMPLETED"| DB
    AN3 --> P1 --> P2 --> P3 --> P4 --> P5
    P5 --> DB
    P2 --> OSS3[("OSS 视频")]
```

**与 backend-api 的关系：** 无直接 HTTP 调用。管理端通过 `backend-api` 读取 MySQL 中已生成的报告。

---

## 8. REST API 路径 vs 实时路径

系统存在 **两套** 面试流程入口，历史原因并存：

```mermaid
flowchart TB
    subgraph REST路径["REST 路径（管理端 / 部分 HTTP API）"]
        R1["admin-dashboard / HTTP Client"]
        R2["backend-api<br/>interviewFlowController"]
        R3["InterviewServiceClient HTTP"]
        R4["interview-service<br/>/sessions/*"]
        R1 --> R2 --> R3 --> R4
    end

    subgraph 实时路径["实时路径（Android 主路径）"]
        M1["Android App"]
        M2["backend-api<br/>Socket.IO Gateway"]
        M3["Redis Stream"]
        M4["interview-service<br/>Coordinator"]
        M1 --> M2 --> M3 --> M4
    end

    R4 --> DB2[("MySQL")]
    M4 --> DB2
```

| 场景 | 推荐路径 |
|------|----------|
| Android 实时 AI 面试 | Socket.IO → Redis Stream → interview-service |
| 企业管理端调试 / HTTP 集成 | backend-api REST → InterviewServiceClient |
| 面试分析报告 | analysis-service 轮询 DB（异步） |

---

## 9. Redis 总线全景

```mermaid
flowchart LR
    subgraph Producers
        GW2["backend-api Gateway"]
        IV4["interview-service"]
        ASR4["asr-service"]
        TTS4["tts-service"]
    end

    subgraph RedisChannels["Redis"]
        S1["Stream: interview:inbound_stream"]
        P1["Pub: interview:events:outbound:broadcast"]
        P2["Pub: interview:events:outbound:{gatewayId}"]
        P3["Pub: interview:events:outbound:session:{sessionId}"]
        P4["Pub: asr:events"]
        P5["Pub: asr:commands"]
        P6["Pub: tts:events"]
        P7["Pub: tts:commands"]
        P8["Pub: platform:ai_settings"]
    end

    GW2 -->|"XADD"| S1
    S1 -->|"XREADGROUP"| IV4
    IV4 --> P1 & P2 & P3
    P1 & P2 --> GW2

    ASR4 --> P4
    IV4 -->|"SUB"| P4
    TTS4 --> P6
    IV4 -->|"SUB"| P3
    TTS4 -->|"SUB"| P3
```

---

## 10. 生产 Nginx 路由

| 外部路径 | 上游服务 | 备注 |
|----------|----------|------|
| `/api/` | backend-api:3001 | REST API |
| `/socket.io/` | backend-api:3001 | Socket.IO 长连接 |
| `/asr/` | asr-service:3002 | WebSocket 反代（可选） |
| `/tts/` | tts-service:3003 | WebSocket 反代（可选） |
| `/interview/` | interview-service:3004 | 一般内网调用 |
| `/analysis/` | analysis-service:3005 | 仅 health |
| `/uploads/` | 静态卷 | 本地上传文件 |

---

## 11. 已知架构债务（代码 as-is）

| 项 | 说明 |
|----|------|
| 分析双实现 | `interview-service/jobs/analysisQueue.ts` 与 `analysis-service` 功能重复，后者实际运行 |
| backend-api 遗留分析 | `aiService.analyzeInterview` 仍存在，与新 Worker 架构并存 |
| 双面试入口 | REST Client 与 Redis Stream 两套路径，需明确各自适用场景 |
| ASR/TTS 多调用方 | backend-api 与 interview-service 均可触发 TTS，需保持一致 |

---

## 12. 相关源码索引

| 模块 | 关键文件 |
|------|----------|
| 部署 | `docker-compose.prod.yml`, `deploy-prod.sh`, `nginx/nginx.prod.conf` |
| 网关 | `backend-api/src/websocket/realtime-voice.websocket.ts` |
| 编排 | `interview-service/src/services/coordinator.service.ts` |
| ASR | `asr-service/src/index.ts`, `asr-service/src/redis-event-bus.ts` |
| TTS | `tts-service/src/index.ts`, `tts-service/src/tts-session-manager.ts` |
| 分析 | `analysis-service/src/index.ts`, `analysis-service/src/services/analysisService.ts` |
| Android | `android-v0-compose/.../RealtimeVoiceManager.kt`, `AppConfig.kt` |
| 架构文档 | `docs/QWEN3_SPEECH_ARCHITECTURE.md` |
