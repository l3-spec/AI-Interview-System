#!/bin/bash

# AIRI数字人简化版启动脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js未安装，请先安装Node.js"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    log_success "Node.js版本: $NODE_VERSION"
}

# 安装依赖
install_dependencies() {
    log_info "安装依赖..."
    
    if [ ! -f "package-lock.json" ]; then
        npm install
    else
        npm ci
    fi
    
    log_success "依赖安装完成"
}

# 创建服务器文件
create_server_file() {
    log_info "创建AIRI简化版服务器..."
    
    cat > airi-simple-server.js << 'EOF'
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 创建public目录
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// 创建AIRI前端页面
const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AIRI数字人 - 简化版</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        .container {
            text-align: center;
            max-width: 600px;
            padding: 2rem;
        }
        
        .digital-human {
            width: 300px;
            height: 300px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            margin: 0 auto 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 4rem;
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.2);
        }
        
        .status {
            font-size: 1.2rem;
            margin-bottom: 1rem;
            padding: 0.5rem 1rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            display: inline-block;
        }
        
        .controls {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin: 2rem 0;
        }
        
        .btn {
            padding: 0.8rem 1.5rem;
            border: none;
            border-radius: 25px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1rem;
        }
        
        .btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
        
        .btn.primary {
            background: #4CAF50;
        }
        
        .btn.primary:hover {
            background: #45a049;
        }
        
        .btn.danger {
            background: #f44336;
        }
        
        .btn.danger:hover {
            background: #da190b;
        }
        
        .chat-area {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 1rem;
            margin: 1rem 0;
            max-height: 300px;
            overflow-y: auto;
            text-align: left;
        }
        
        .message {
            margin: 0.5rem 0;
            padding: 0.5rem;
            border-radius: 10px;
        }
        
        .message.user {
            background: rgba(255, 255, 255, 0.2);
            margin-left: 2rem;
        }
        
        .message.airi {
            background: rgba(76, 175, 80, 0.3);
            margin-right: 2rem;
        }
        
        .input-area {
            display: flex;
            gap: 0.5rem;
            margin-top: 1rem;
        }
        
        .input-area input {
            flex: 1;
            padding: 0.8rem;
            border: none;
            border-radius: 25px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            font-size: 1rem;
        }
        
        .input-area input::placeholder {
            color: rgba(255, 255, 255, 0.7);
        }
        
        .mic-btn {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: none;
            background: #4CAF50;
            color: white;
            cursor: pointer;
            font-size: 1.2rem;
            transition: all 0.3s ease;
        }
        
        .mic-btn:hover {
            background: #45a049;
            transform: scale(1.1);
        }
        
        .mic-btn.recording {
            background: #f44336;
            animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="digital-human">🤖</div>
        <div class="status" id="status">准备就绪</div>
        
        <div class="controls">
            <button class="btn primary" onclick="startInterview()">开始面试</button>
            <button class="btn" onclick="toggleVoice()">语音开关</button>
            <button class="btn danger" onclick="endInterview()">结束面试</button>
        </div>
        
        <div class="chat-area" id="chatArea">
            <div class="message airi">你好！我是AIRI数字人，很高兴为您服务。请点击"开始面试"开始我们的对话。</div>
        </div>
        
        <div class="input-area">
            <input type="text" id="messageInput" placeholder="输入消息..." onkeypress="handleKeyPress(event)">
            <button class="mic-btn" id="micBtn" onclick="toggleMic()">🎤</button>
        </div>
    </div>

    <script>
        let isInterviewActive = false;
        let isVoiceEnabled = true;
        let isRecording = false;
        
        // 初始化语音识别
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'zh-CN';
            
            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                document.getElementById('messageInput').value = transcript;
                sendMessage(transcript);
            };
            
            recognition.onerror = function(event) {
                console.error('语音识别错误:', event.error);
                updateStatus('语音识别错误');
            };
            
            window.recognition = recognition;
        }
        
        // 初始化语音合成
        if ('speechSynthesis' in window) {
            window.synthesis = window.speechSynthesis;
        }
        
        function updateStatus(message) {
            document.getElementById('status').textContent = message;
        }
        
        function addMessage(message, isUser = false) {
            const chatArea = document.getElementById('chatArea');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${isUser ? 'user' : 'airi'}\`;
            messageDiv.textContent = message;
            chatArea.appendChild(messageDiv);
            chatArea.scrollTop = chatArea.scrollHeight;
        }
        
        function speak(text) {
            if (isVoiceEnabled && window.synthesis) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'zh-CN';
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                window.synthesis.speak(utterance);
            }
        }
        
        function startInterview() {
            isInterviewActive = true;
            updateStatus('面试进行中');
            const welcomeMessage = '面试开始！我是您的AI面试官。请告诉我您想面试的职位，我会为您准备相关的问题。';
            addMessage(welcomeMessage);
            speak(welcomeMessage);
        }
        
        function endInterview() {
            isInterviewActive = false;
            updateStatus('面试已结束');
            const endMessage = '面试结束！感谢您的参与，祝您面试顺利！';
            addMessage(endMessage);
            speak(endMessage);
        }
        
        function toggleVoice() {
            isVoiceEnabled = !isVoiceEnabled;
            updateStatus(isVoiceEnabled ? '语音已开启' : '语音已关闭');
        }
        
        function toggleMic() {
            if (!window.recognition) {
                alert('您的浏览器不支持语音识别功能');
                return;
            }
            
            const micBtn = document.getElementById('micBtn');
            
            if (!isRecording) {
                isRecording = true;
                micBtn.classList.add('recording');
                micBtn.textContent = '⏹️';
                updateStatus('正在录音...');
                window.recognition.start();
            } else {
                isRecording = false;
                micBtn.classList.remove('recording');
                micBtn.textContent = '🎤';
                updateStatus('录音已停止');
                window.recognition.stop();
            }
        }
        
        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                const input = document.getElementById('messageInput');
                const message = input.value.trim();
                if (message) {
                    sendMessage(message);
                    input.value = '';
                }
            }
        }
        
        function sendMessage(message) {
            if (!isInterviewActive) {
                addMessage('请先开始面试', true);
                return;
            }
            
            addMessage(message, true);
            
            // 模拟AIRI回复
            setTimeout(() => {
                const responses = [
                    '这是一个很好的回答！请继续详细说明。',
                    '您提到的经验很有价值，能否举例说明？',
                    '这个问题回答得很到位，还有其他补充吗？',
                    '您的思路很清晰，请继续。',
                    '这是一个有趣的观点，请进一步阐述。'
                ];
                
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                addMessage(randomResponse);
                speak(randomResponse);
            }, 1000);
        }
        
        window.addEventListener('load', function() {
            updateStatus('AIRI数字人已准备就绪');
        });
    </script>
</body>
</html>`;

// 写入HTML文件
fs.writeFileSync(path.join(publicDir, 'index.html'), htmlContent);

// API路由
app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/chat', (req, res) => {
    const { message } = req.body;
    
    const responses = [
        '这是一个很好的问题！',
        '您的回答很有见地。',
        '请继续详细说明。',
        '这个观点很有趣。',
        '您提到的经验很有价值。'
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    res.json({
        message: response,
        timestamp: new Date().toISOString()
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(\`
🚀 AIRI数字人简化版服务器已启动！

📱 访问地址: http://localhost:\${PORT}
🌐 网络访问: http://0.0.0.0:\${PORT}

✨ 功能特性:
   ✅ 实时语音对话
   ✅ 文字聊天
   ✅ 语音合成
   ✅ 语音识别
   ✅ 面试模式
   ✅ 响应式设计

🔧 技术栈:
   📦 Node.js + Express
   🎨 原生HTML/CSS/JS
   🎤 Web Speech API

📋 使用说明:
   1. 打开浏览器访问上述地址
   2. 点击"开始面试"开始对话
   3. 使用语音或文字与AIRI交流
   4. 点击"结束面试"结束对话

💡 提示:
   - 建议使用Chrome或Edge浏览器
   - 需要允许麦克风权限
   - 支持语音输入和语音输出

按 Ctrl+C 停止服务器
    \`);
});

process.on('SIGINT', () => {
    console.log('\\n👋 AIRI服务器正在关闭...');
    process.exit(0);
});
EOF

    log_success "服务器文件创建完成"
}

# 启动服务器
start_server() {
    log_info "启动AIRI简化版服务器..."
    
    if [ -f "airi-simple-server.js" ]; then
        node airi-simple-server.js
    else
        log_error "服务器文件不存在"
        exit 1
    fi
}

# 主函数
main() {
    log_info "启动AIRI数字人简化版..."
    
    # 检查Node.js
    check_node
    
    # 安装依赖
    install_dependencies
    
    # 创建服务器文件
    create_server_file
    
    # 启动服务器
    start_server
}

# 运行主函数
main "$@"
