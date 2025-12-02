# Fay数字人集成方案

## 🎯 项目概述
将Fay开源数字人框架集成到AI面试系统，替代Live2D方案

## 📊 对比分析

| 特性 | Live2D | Fay |
|---|---|---|
| **视觉效果** | 2D卡通 | 2.5D/3D逼真 |
| **口型同步** | 基础 | 高精度音频驱动 |
| **表情丰富度** | 有限 | 丰富面部表情 |
| **部署复杂度** | 中等 | 低-中等 |
| **开源程度** | 部分 | 完全开源 |
| **实时性能** | 好 | 优秀 |

## 🔧 技术方案

### 方案一：轻量级2.5D实现（推荐）
- **引擎**：Fay MetaHuman Stream (WebRTC)
- **优势**：浏览器原生，无需安装
- **资源**：中等配置即可运行

### 方案二：3D UE5集成
- **引擎**：Unreal Engine 5 + Fay插件
- **优势**：极致视觉效果
- **要求**：需要GPU支持

## 📦 实施步骤

### 阶段1：基础集成（2-3天）
```bash
# 1. 下载Fay框架
git clone https://github.com/xszyou/Fay.git
cd Fay

# 2. 安装依赖
pip install -r requirements.txt

# 3. 基础配置
cp configs/system.conf.example configs/system.conf
```

### 阶段2：API集成（3-4天）
- 创建Fay与Flask的API对接
- 实现面试流程控制
- 添加语音打断功能

### 阶段3：前端集成（2-3天）
- 替换现有数字人页面
- 实现WebRTC视频流
- 优化用户体验

## 🎬 功能实现

### 核心特性
1. **实时对话**：低延迟语音交互
2. **表情驱动**：根据回答内容调整表情
3. **打断唤醒**：支持用户随时提问
4. **多角色**：不同风格的面试官
5. **知识库**：面试问题库集成

### 技术细节
- **语音链路**：ASR → LLM → TTS → Avatar
- **延迟控制**：<500ms端到端延迟
- **并发支持**：支持多用户同时面试

## 🔧 配置文件

### Fay配置示例（configs/system.conf）
```ini
[SYSTEM]
mode = interview
port = 5001

[LLM]
type = openai
api_key = your_key
base_url = https://api.openai.com/v1
model = gpt-4o-mini

[TTS]
type = azure
voice = zh-CN-XiaoxiaoNeural

[ASR]
type = funasr
model = paraformer-zh

[DIGITAL_HUMAN]
type = metahuman_stream
character_path = ./characters/interviewer/
```

## 📱 前端集成代码

### WebRTC连接
```javascript
class FayDigitalHuman {
    constructor(containerId, onMessage) {
        this.container = document.getElementById(containerId);
        this.websocket = null;
        this.onMessage = onMessage;
        this.init();
    }

    async init() {
        // 建立WebRTC连接
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        // 接收视频流
        pc.ontrack = (event) => {
            this.container.srcObject = event.streams[0];
        };
    }

    sendAudio(audioBlob) {
        // 发送音频到Fay
        if (this.websocket?.readyState === WebSocket.OPEN) {
            this.websocket.send(audioBlob);
        }
    }
}
```

### 面试流程控制
```javascript
class InterviewController {
    constructor() {
        this.digitalHuman = new FayDigitalHuman('avatar-container', this.handleResponse);
        this.currentQuestion = 0;
        this.questions = [];
    }

    async startInterview() {
        await this.digitalHuman.speak('您好，我是今天的面试官，让我们开始面试吧！');
        this.askNextQuestion();
    }

    askNextQuestion() {
        if (this.currentQuestion < this.questions.length) {
            const question = this.questions[this.currentQuestion];
            this.digitalHuman.speak(question.text);
        }
    }

    handleResponse(text) {
        // 处理用户回答
        console.log('用户回答：', text);
        this.currentQuestion++;
        setTimeout(() => this.askNextQuestion(), 1000);
    }
}
```

## 🚀 快速启动脚本

### 1. 安装脚本
```bash
#!/bin/bash
# install_fay.sh

echo "🚀 安装Fay数字人框架..."

# 克隆仓库
git clone https://github.com/xszyou/Fay.git
cd Fay

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate

# 安装依赖
pip install -r requirements.txt

# 下载模型
python tools/download_models.py

# 配置面试系统
cp configs/system.conf.example configs/system.conf
sed -i 's/type = retail/type = interview/g' configs/system.conf

echo "✅ Fay安装完成！"
echo "📝 请编辑 configs/system.conf 配置API密钥"
```

### 2. 启动脚本
```bash
#!/bin/bash
# start_fay.sh

cd Fay
source venv/bin/activate

# 启动Fay控制器
python main.py &
FAY_PID=$!

# 启动Flask后端
cd ../backend-api
python app.py &
FLASK_PID=$!

echo "🎯 系统已启动！"
echo "📱 Fay数字人: http://localhost:5000"
echo "🌐 面试系统: http://localhost:3001"

echo "按Ctrl+C停止所有服务"
trap "kill $FAY_PID $FLASK_PID" EXIT
wait
```

## 📊 性能指标

| 指标 | 目标值 | 备注 |
|---|---|---|
| 语音延迟 | <500ms | 端到端 |
| 视频延迟 | <200ms | WebRTC |
| 并发用户 | 10+ | 中等配置 |
| CPU占用 | <30% | i5级别 |
| 内存占用 | <2GB | 包含模型 |

## 🎭 预设角色

### 1. 技术面试官
- **形象**：专业商务风格
- **语速**：适中，清晰
- **语调**：权威但不严厉

### 2. HR面试官
- **形象**：亲切友好
- **语速**：温和
- **语调**：鼓励性

### 3. 压力面试官
- **形象**：严肃专业
- **语速**：较快
- **语调**：挑战性

## 🔗 集成API

### 开始面试
```http
POST /api/interview/start
{
    "position_id": "software_engineer",
    "candidate_name": "张三",
    "character": "tech_interviewer"
}
```

### 发送语音
```http
POST /api/interview/audio
Content-Type: audio/wav

[音频数据]
```

### 获取响应
```http
GET /api/interview/response
{
    "text": "请介绍一下你的项目经验",
    "emotion": "neutral",
    "next_action": "ask_question"
}
```

## ✅ 验收标准

- [ ] 数字人形象加载成功
- [ ] 语音交互延迟<500ms
- [ ] 口型同步准确
- [ ] 表情变化自然
- [ ] 支持面试流程
- [ ] 支持用户打断
- [ ] 多角色切换
- [ ] 移动端适配

## 📞 技术支持

- **Fay官方文档**: https://qqk9ntwbcit.feishu.cn/wiki/JzMJw7AghiO8eHktMwlcxznenIg
- **GitHub Issues**: https://github.com/xszyou/Fay/issues
- **微信群**: 关注公众号"Fay数字人"