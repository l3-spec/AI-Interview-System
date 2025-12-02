# AI面试系统 - 阿里云大模型SDK集成方案

## 项目概述

本项目实现了基于阿里云大模型SDK的完整AI面试系统，集成了DashScope API、语音识别合成、视频录制上传等功能，提供真实的视频通话面试体验。

## 核心功能特性

### 🤖 AI面试官能力
- **智能对话引擎**：基于阿里云DashScope API (qwen-vl-max-latest模型)
- **专业角色设定**：世界五百强集团首席人力资源官角色，15年面试经验
- **STAR行为面试法**：专业的面试评估方法论
- **三维度考核**：专业能力、解决问题、文化适配全面评估

### 🔄 DeepSeek + IndexTTS2 + Wav2Lip 自动化管线（新增）
- **DeepSeek 问题生成**：后端使用 DeepSeek 提供岗位定制化问题，并记录偏差审计日志 `logs/deepseek_audit.log`
- **IndexTTS2 文本转语音**：AI 问题自动调用 IndexTTS2 输出中文专业语音，支持情绪/语速参数调节
- **Wav2Lip 数字人合成**：生成音频实时送入自建 Wav2Lip 服务，输出与语音同步的面试官视频，并持久化到 OSS
- **BullMQ 异步调度 + Inline 兜底**：默认通过 Redis 队列异步生成，若队列不可用自动回退到内联处理
- **Android 数字人播放**：Compose 层检测问题视频地址后直接使用 `media3` 播放器播放，未就绪时展示“数字人视频生成中”提示

### 🎯 智能面试流程
- **职位定制化**：根据面试职位、候选人年龄、工作经验自动调整问题难度
- **热词优化**：预设技术热词提高语音识别准确率
- **实时追问**：对模糊回答进行3层深度追问
- **轨道控制**：跑题时智能拉回面试主线

### 🎤 语音交互系统
- **实时语音识别**：Android原生SpeechRecognizer + 阿里云语音服务
- **语音合成播报**：TextToSpeech + 阿里云TTS
- **口型同步动画**：labubu动画角色实时响应语音
- **音量可视化**：实时音量波形显示

### 📹 视频录制上传
- **高质量录制**：CameraX集成，支持前置摄像头
- **自动上传OSS**：每题答案自动上传阿里云对象存储
- **视频压缩**：可选视频质量压缩减少流量消耗
- **进度监控**：实时上传进度反馈

### 📊 智能评估报告
- **多维度评分**：专业能力、解决问题、文化适配独立评分
- **详细分析报告**：基于LLM生成的专业评估总结
- **数据持久化**：完整面试记录存储和回放

## 技术架构

### 后端架构
```
├── 数据库层 (PostgreSQL + Prisma)
│   ├── AIInterviewQuestion (增加videoUrl, status字段)
│   └── 面试会话管理
├── 队列系统 (BullMQ + Redis)
│   ├── 视频生成队列
│   └── 异步任务处理
├── 服务层
│   ├── AliCloudLLMService (DashScope API集成)
│   ├── DigitalHumanService (文本转视频)
│   └── VideoGenerationWorker (后台处理)
└── API层
    ├── 面试会话管理
    ├── 问题生成
    └── 答案提交
```

### Android架构
```
├── 配置层
│   └── AliCloudConfig (API密钥、模型配置)
├── 网络层
│   ├── AliCloudLLMService (大模型对话)
│   ├── SpeechService (语音识别合成)
│   └── VideoUploadService (视频上传OSS)
├── 管理层
│   └── InterviewManager (面试流程统一管理)
├── UI层
│   ├── PreparationActivity (面试准备)
│   ├── InterviewActivity (面试进行)
│   └── AnimatedDeerView (labubu动画)
└── 数据层
    └── 面试状态管理 (LiveData + StateFlow)
```

## 核心配置参数

### 阿里云服务配置
```kotlin
object AliCloudConfig {
    // 大模型配置
    const val WORKSPACE_ID = "llm-ivhhbrwypq1ymmhw"
    const val API_KEY = "<your-dashscope-api-key>"
    const val APP_ID = "mm_71f296cc492f49e9aae367a1d7c3"
    
    // 模型选择
    const val DEFAULT_MODEL = "qwen-vl-max-latest"
    const val AUDIO_MODEL = "paraformer-realtime-v1"
    const val TTS_MODEL = "sambert-zhichu-v1"
    
    // 面试参数
    const val MAX_CONVERSATION_ROUNDS = 10
    const val QUESTION_TIMEOUT_SECONDS = 120
    const val VIDEO_MAX_DURATION_SECONDS = 180
}
```

### 面试官角色Prompt设计
```
你现为某世界五百强集团首席人力资源官（HRO），拥有15年高管面试经验，精通STAR行为面试法与素质模型评估。

面试要求：
1. 需在5-10轮对话中，对候选人进行【专业能力】【解决问题】【文化适配】三维度考核
2. 每轮提问聚焦一个评估维度
3. 对模糊回答进行3层追问
4. 跑题时用话术强行拉回轨道
5. 保持专业、友善但严格的面试官形象
6. 根据候选人回答深度调整问题难度
```

## 关键技术实现

### 1. 大模型对话管理
```kotlin
class AliCloudLLMService {
    private val generation = Generation()
    private val conversationHistory = ConcurrentLinkedQueue<Message>()
    
    suspend fun startInterview(jobPosition: String, candidateAge: Int, experience: String): InterviewResponse {
        // 设置系统角色
        val systemPrompt = AliCloudConfig.getInterviewerPrompt(jobPosition, candidateAge, experience)
        
        // 调用DashScope API
        val param = GenerationParam.builder()
            .apiKey(AliCloudConfig.API_KEY)
            .model(AliCloudConfig.DEFAULT_MODEL)
            .messages(conversationHistory.toList())
            .temperature(0.7f)
            .maxTokens(800)
            .build()
            
        return generation.call(param)
    }
}
```

### 2. 语音识别集成
```kotlin
class SpeechService {
    fun startSpeechRecognition() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "zh-CN")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            // 添加面试热词提高识别准确率
            putExtra(RecognizerIntent.EXTRA_BIASING_STRINGS, AliCloudConfig.INTERVIEW_HOT_WORDS)
        }
        speechRecognizer.startListening(intent)
    }
}
```

### 3. 视频上传OSS
```kotlin
class VideoUploadService {
    suspend fun uploadVideo(file: File, sessionId: String, questionIndex: Int): VideoUploadResult {
        val objectKey = "interview-videos/$dateFolder/$sessionId/question_${questionIndex}_${timestamp}.mp4"
        
        return suspendCancellableCoroutine { continuation ->
            val putRequest = PutObjectRequest(OSS_BUCKET_NAME, objectKey, file.absolutePath)
            oss.asyncPutObject(putRequest, callback)
        }
    }
}
```

### 4. 面试流程管理
```kotlin
class InterviewManager {
    suspend fun startInterview(jobPosition: String, candidateAge: Int, experience: String) {
        // 1. 初始化LLM服务
        val response = llmService.startInterview(jobPosition, candidateAge, experience)
        
        // 2. AI语音播报问题
        speechService.speakText(response.content)
        
        // 3. 监听用户回答
        speechService.startSpeechRecognition()
        
        // 4. 录制视频
        startVideoRecording()
    }
    
    private suspend fun handleUserAnswer(answer: String) {
        // 1. 停止录制并上传视频
        val videoFile = stopVideoRecording()
        videoUploadService.uploadVideo(videoFile, sessionId, currentRound)
        
        // 2. 发送答案给LLM获取下一题
        val response = llmService.sendAnswer(answer)
        
        // 3. 继续面试流程
        if (!response.isFinished) {
            speechService.speakText(response.content)
        } else {
            finishInterview()
        }
    }
}
```

## 面试体验流程

### 1. 面试准备阶段
- **权限检查**：相机、麦克风、存储权限
- **系统初始化**：LLM服务、语音服务、OSS服务
- **参数设置**：职位、年龄、经验等个人信息

### 2. 面试进行阶段
- **AI提问**：labubu动画 + 语音播报
- **用户回答**：语音识别 + 视频录制
- **实时反馈**：识别文本显示、音量可视化
- **自动流转**：答案处理 → 视频上传 → 下一题

### 3. 面试结束阶段
- **智能总结**：LLM生成评估报告
- **多维评分**：专业能力、解决问题、文化适配
- **结果展示**：评分可视化 + 详细建议

## 部署配置

### 环境变量设置
```bash
# 阿里云DashScope
DASHSCOPE_API_KEY=<your-dashscope-api-key>

# 阿里云OSS
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET_NAME=ai-interview-videos

# Redis配置
REDIS_URL=redis://localhost:6379
```

### 依赖安装
```kotlin
// Android build.gradle
dependencies {
    // 阿里云大模型SDK
    implementation 'com.alibaba:dashscope-sdk-java:2.12.0'
    implementation 'com.alibaba:fastjson:1.2.83'
    
    // 阿里云OSS SDK
    implementation 'com.aliyun.dpa:oss-android-sdk:2.9.13'
    
    // 语音和视频
    implementation 'com.google.android.gms:play-services-speech:18.0.0'
    implementation 'com.google.android.exoplayer:exoplayer:2.19.1'
}
```

### 后端启动
```bash
# 1. 启动API服务
cd backend-api
npm install
npm run dev

# 2. 启动视频处理Worker
npm run worker

# 3. 确保Redis服务运行
redis-server
```

## 性能优化

### 1. 响应速度优化
- **并行初始化**：LLM、语音、视频服务并行启动
- **连接池管理**：复用HTTP连接减少延迟
- **本地缓存**：常用配置和热词本地存储

### 2. 资源使用优化
- **视频压缩**：可选质量等级减少上传时间
- **音频优化**：适配的采样率和编码格式
- **内存管理**：及时释放大文件资源

### 3. 用户体验优化
- **渐进式加载**：分步骤初始化显示进度
- **错误恢复**：网络中断自动重连机制
- **离线支持**：关键配置本地备份

## 扩展功能

### 1. 多语言支持
- 支持英文面试场景
- 语音识别多语言切换
- 国际化UI文本

### 2. 高级分析
- 面试录像回放分析
- 语音情感分析
- 眼神交流检测

### 3. 企业定制
- 自定义面试官角色
- 行业特定问题库
- 企业品牌定制UI

## 故障排查

### 常见问题解决

1. **DashScope API调用失败**
   - 检查API Key有效性
   - 确认网络连接状态
   - 验证模型访问权限

2. **语音识别不准确**
   - 检查麦克风权限
   - 调整热词配置
   - 优化环境噪音

3. **视频上传失败**
   - 验证OSS配置
   - 检查文件大小限制
   - 确认网络稳定性

### 日志监控
```kotlin
// 启用详细日志
Log.d("InterviewManager", "Interview started with session: $sessionId")
Log.d("AliCloudLLMService", "LLM Response: ${response.content}")
Log.d("VideoUploadService", "Upload progress: $progress%")
```

## 总结

本集成方案提供了完整的AI面试系统实现，具备以下优势：

✅ **技术先进**：基于阿里云最新大模型技术
✅ **体验流畅**：真实视频通话面试感受  
✅ **功能完整**：从准备到结果的全流程覆盖
✅ **高度可定制**：支持多种职位和场景配置
✅ **性能优异**：优化的响应速度和资源使用
✅ **易于维护**：清晰的架构设计和完善的文档

通过这套方案，可以快速搭建专业级的AI面试平台，为求职者提供高质量的面试练习体验。 
