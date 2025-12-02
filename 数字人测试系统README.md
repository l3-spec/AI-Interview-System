# 🤖 STAR-LINK 数字人实时语音测试系统

> 完整的端到端数字人面试系统，支持实时语音交互、Live2D 动画和智能对话

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)
![Status](https://img.shields.io/badge/status-ready-success)

---

## ✨ 功能特性

- 🎤 **实时语音识别** - 火山引擎/声网 ASR，高精度中文识别
- 🤖 **智能对话生成** - DeepSeek AI，专业面试官人设
- 🔊 **高质量语音合成** - 阿里云/Azure TTS，自然流畅
- 🎭 **Live2D 数字人** - 实时口型同步，生动表情
- ⚡ **打断机制** - 支持用户随时打断数字人说话
- 🌐 **多端支持** - Web 测试页面 + Android 应用
- 📊 **可视化面板** - 实时音频可视化和状态监控

---

## 🚀 快速开始

### 三步启动

```bash
# 1️⃣ 检查配置
./check-digital-human-config.sh

# 2️⃣ 启动系统
./start-digital-human-test.sh

# 3️⃣ 打开浏览器
# 访问: http://localhost:3001/test/digital-human
```

### 首次使用

```bash
# 1. 安装依赖
cd backend-api && npm install
cd ../admin-dashboard && npm install

# 2. 配置环境变量
cp backend-api/.env.example backend-api/.env
vi backend-api/.env  # 填写 API 密钥

# 3. 启动测试
./start-digital-human-test.sh
```

---

## 📋 系统要求

### 软件要求

- Node.js ≥ 16.0
- npm ≥ 7.0
- Android Studio (如需测试 Android 端)

### 硬件要求

- CPU: 2核以上
- 内存: 4GB 以上
- 磁盘: 2GB 可用空间
- 网络: 稳定的互联网连接

### API 服务

必需配置以下至少一组服务：

- **LLM**: DeepSeek API (必需)
- **ASR**: 火山引擎 或 声网 (选一)
- **TTS**: 阿里云 或 Azure (选一)

---

## 📁 项目结构

```
AI-Interview-System/
├── backend-api/                      # 后端服务
│   ├── src/
│   │   ├── websocket/               # WebSocket 服务器
│   │   │   └── realtime-voice.websocket.ts
│   │   └── services/                # 核心服务
│   │       ├── realtime-voice-pipeline.service.ts
│   │       ├── rtc-asr.service.ts
│   │       ├── ttsService.ts
│   │       └── deepseekService.ts
│   └── public/
│       └── test/
│           └── digital-human.html   # Web 测试页面
│
├── android-v0-compose/              # Android 应用
│   └── app/src/main/java/com/xlwl/AiMian/
│       ├── ai/                      # 数字人面试模块
│       │   ├── DigitalInterviewScreen.kt
│       │   └── realtime/
│       │       └── RealtimeVoiceManager.kt
│       └── live2d/                  # Live2D 渲染
│           ├── Live2DView.kt
│           └── Live2DViewController.kt
│
├── start-digital-human-test.sh      # 一键启动脚本
├── check-digital-human-config.sh    # 配置检查脚本
├── stop-digital-human-test.sh       # 停止脚本
├── 快速开始.md                       # 快速参考指南
└── 数字人沟通测试完整指南.md          # 完整使用手册
```

---

## 🎯 测试方式

### 方式一：Web 端测试（推荐）

**优点**: 无需编译，开箱即用

1. 启动系统：`./start-digital-human-test.sh`
2. 打开浏览器：http://localhost:3001/test/digital-human
3. 点击"连接服务" → "开始录音" → 说话 → "停止录音"
4. 等待数字人回复

### 方式二：Android 端测试

**优点**: 完整体验，包含 Live2D 动画

1. 配置 WebSocket 地址（使用电脑 IP，不是 localhost）
2. 编译安装应用
3. 打开应用，进入"数字人面试"
4. 点击"开始答题"并说话

详细步骤见《快速开始.md》

---

## 🔧 配置说明

### 最小配置

在 `backend-api/.env` 中配置：

```bash
# DeepSeek AI
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx

# 火山引擎 ASR
VOLC_APP_ID=xxxxxxxx
VOLC_ACCESS_KEY=xxxxxxxx
VOLC_SECRET_KEY=xxxxxxxx

# 阿里云 TTS
ALIYUN_ACCESS_KEY_ID=xxxxxxxx
ALIYUN_ACCESS_KEY_SECRET=xxxxxxxx
ALIYUN_TTS_APP_KEY=xxxxxxxx
```

### 完整配置

参考 `ENV_CONFIG_TEMPLATE.md` 了解所有配置项

---

## 📊 系统架构

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 (Web) | HTML5 + Socket.IO Client |
| 前端 (Android) | Kotlin + Jetpack Compose + Live2D |
| 后端 | Node.js + TypeScript + Express |
| 通信 | WebSocket (Socket.IO) |
| AI 服务 | DeepSeek + 火山引擎 + 阿里云 |

### 数据流

```
用户说话
  ↓ 麦克风采集
音频数据
  ↓ WebSocket
后端接收
  ↓ ASR 识别
文本内容
  ↓ LLM 生成
回复文本
  ↓ TTS 合成
音频 URL
  ↓ 返回客户端
播放 + Live2D
```

---

## 📖 文档

| 文档 | 说明 |
|------|------|
| [快速开始.md](快速开始.md) | 3分钟快速上手 |
| [数字人沟通测试完整指南.md](数字人沟通测试完整指南.md) | 详细使用手册 |
| [数字人开源方案调研报告.md](数字人开源方案调研报告.md) | 技术选型和架构 |
| [ENV_CONFIG_TEMPLATE.md](ENV_CONFIG_TEMPLATE.md) | 环境配置模板 |

---

## 🧪 测试示例

### Web 端测试录屏

```
┌────────────────────────────────────┐
│  🤖 AI 数字人实时语音测试           │
├────────────────────────────────────┤
│  ✓ 已连接 | Session: test-xxx      │
│  ▓▓▓░░░▓▓▓░░░  (音频可视化)        │
├────────────────────────────────────┤
│  🤖 STAR-LINK:                     │
│  "你好！很高兴认识你。请做一个自我  │
│   介绍吧。"                         │
├────────────────────────────────────┤
│  👤 我:                             │
│  "我叫张三，有5年Java开发经验"      │
└────────────────────────────────────┘
```

### Android 端界面

```
┌─────────────────────────────────────┐
│  [<]  1/15                          │ ← 返回 + 问题计数
├─────────────────────────────────────┤
│                                     │
│       [Live2D 数字人]               │ ← 全屏显示
│                                     │
│                [我的画面]           │ ← 小窗（可拖动）
├─────────────────────────────────────┤
│  STAR-LINK 数字人正在聆听            │ ← 状态
│  ┌─────────────────────────────┐   │
│  │ 请您做一个简单的自我介绍     │   │ ← 问题
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 🤖 STAR-LINK               │   │
│  │ 您好，请开始...            │   │ ← 对话
│  │ 👤 我                       │   │
│  │ （正在聆听...）            │   │
│  └─────────────────────────────┘   │
│  [🎤 开始答题]                      │ ← 按钮
└─────────────────────────────────────┘
```

---

## ❓ 常见问题

### Q: 连接失败怎么办？

```bash
# 检查后端是否运行
lsof -i :3001

# 重启服务
./start-digital-human-test.sh
```

### Q: 语音识别失败？

- 检查 ASR API 配置
- 延长录音时间（至少 2-3 秒）
- 确保环境安静

### Q: 数字人不回复？

- 检查 DeepSeek API Key
- 查看后端日志：`tail -f backend-api/digital-human-backend.log`
- 确认账户余额充足

### Q: Android 无法连接？

- 使用电脑 IP 而非 localhost
- 确保手机和电脑在同一 WiFi
- 检查防火墙设置

更多问题参见《数字人沟通测试完整指南.md》

---

## 📈 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 端到端延迟 | < 4s | 从说话到收到回复 |
| ASR 识别 | < 500ms | 语音转文字 |
| LLM 生成 | < 2s | 生成回复内容 |
| TTS 合成 | < 1s | 文字转语音 |
| 打断响应 | < 200ms | 打断数字人说话 |

---

## 🛠️ 开发指南

### 添加新的面试问题

编辑 `backend-api/src/services/deepseekService.ts` 中的系统提示词

### 自定义数字人形象

修改 Live2D 模型文件，参见 `android-v0-compose/app/src/main/java/com/xlwl/AiMian/live2d/`

### 集成新的 TTS 提供商

实现 `TTSProvider` 接口，参见 `backend-api/src/services/ttsService.ts`

---

## 🚧 路线图

### 近期计划

- [ ] 多轮对话上下文管理
- [ ] 面试评分和报告
- [ ] 流式 TTS 输出
- [ ] 多语言支持

### 未来规划

- [ ] 表情识别和反馈
- [ ] WebRTC 音视频
- [ ] Docker 部署
- [ ] 云端版本

---

## 📞 支持

### 获取帮助

- 📧 Email: support@star-link.ai
- 💬 GitHub Issues
- 📖 文档: 查看 `docs/` 目录

### 报告问题

提交 Issue 时请包含：
- 问题描述
- 复现步骤
- 环境信息（OS、Node 版本等）
- 日志截图

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🎉 致谢

感谢以下开源项目：

- [DeepSeek](https://www.deepseek.com/) - 智能对话
- [火山引擎](https://www.volcengine.com/) - 语音识别
- [阿里云](https://www.aliyun.com/) - 语音合成
- [Live2D](https://www.live2d.com/) - 数字人渲染
- [Socket.IO](https://socket.io/) - 实时通信

---

## 📊 统计

- **开发时间**: 2024年
- **代码行数**: ~15,000 行
- **支持语言**: 中文
- **测试覆盖**: Web + Android

---

**🎉 开始你的数字人面试之旅吧！**

```bash
./start-digital-human-test.sh
```

---

*最后更新: 2024年11月*  
*版本: v1.0.0*  
*作者: STAR-LINK AI Team*

