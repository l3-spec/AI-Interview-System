#!/usr/bin/env node

/**
 * 开源数字人快速集成脚本
 * Open-LLM-VTuber + Live2D 方案
 */

const fs = require('fs');
const path = require('path');

const SETUP_GUIDE = {
  name: "Open-LLM-VTuber 集成方案",
  description: "免费开源的2D数字人，支持实时语音驱动",
  
  steps: [
    {
      step: 1,
      title: "安装核心依赖",
      commands: [
        "npm install pixi-live2d-display",
        "npm install pixi.js",
        "npm install @pixi/sound"
      ]
    },
    {
      step: 2,
      title: "下载Live2D模型",
      resources: [
        "https://github.com/guansss/pixi-live2d-display/tree/master/samples/assets",
        "https://github.com/open-llm-vtuber/open-llm-vtuber/tree/main/assets/models"
      ]
    },
    {
      step: 3,
      title: "基础集成代码",
      file: "avatar-renderer.js",
      content: `
import { Live2DModel } from 'pixi-live2d-display';
import * as PIXI from 'pixi.js';

class AvatarRenderer {
  constructor(canvasId) {
    this.app = new PIXI.Application({
      view: document.getElementById(canvasId),
      width: 300,
      height: 400,
      backgroundColor: 0x2c3e50
    });
    
    this.model = null;
    this.audioContext = new AudioContext();
    this.analyser = null;
  }

  async loadModel(modelPath) {
    this.model = await Live2DModel.from(modelPath);
    this.app.stage.addChild(this.model);
    this.model.scale.set(0.3);
    this.model.x = 150;
    this.model.y = 200;
  }

  startVoiceSync() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        
        source.connect(this.analyser);
        this.animateMouth();
      });
  }

  animateMouth() {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    const animate = () => {
      this.analyser.getByteFrequencyData(dataArray);
      
      // 计算音量并映射到嘴型参数
      const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const mouthOpen = Math.min(volume / 128, 1);
      
      if (this.model) {
        this.model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', mouthOpen);
      }
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }
}

export default AvatarRenderer;
`
    }
  ],

  demo: {
    html: `
<!DOCTYPE html>
<html>
<head>
    <title>开源数字人演示</title>
    <script src="https://cdn.jsdelivr.net/npm/pixi.js@7.x/dist/pixi.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/index.min.js"></script>
</head>
<body>
    <canvas id="avatar-canvas" width="300" height="400"></canvas>
    <button onclick="startVoice()">开始语音驱动</button>
    
    <script type="module">
        import AvatarRenderer from './avatar-renderer.js';
        
        const avatar = new AvatarRenderer('avatar-canvas');
        await avatar.loadModel('./models/haru/haru.model3.json');
        
        window.startVoice = () => avatar.startVoiceSync();
    </script>
</body>
</html>
`
  },

  models: [
    {
      name: "Haru (免费Live2D模型)",
      url: "https://github.com/guansss/pixi-live2d-display/tree/master/samples/assets/haru",
      license: "免费商用"
    },
    {
      name: "开源动漫角色合集",
      url: "https://github.com/open-llm-vtuber/models",
      license: "Creative Commons"
    }
  ],

  features: [
    "实时语音驱动嘴型",
    "2D卡通形象",
    "零API费用",
    "浏览器直接运行",
    "可自定义形象",
    "支持移动端"
  ]
};

// 生成配置文件
fs.writeFileSync(
  path.join(__dirname, 'open-avatar-config.json'),
  JSON.stringify(SETUP_GUIDE, null, 2)
);

console.log('🎭 开源数字人配置已生成');
console.log('📁 文件: open-avatar-config.json');
console.log('');
console.log('🚀 快速开始:');
console.log('1. npm install pixi-live2d-display pixi.js @pixi/sound');
console.log('2. 下载Live2D模型到 ./models/ 目录');
console.log('3. 运行集成代码');
console.log('');
console.log('💡 优势: 零成本、实时、开源、可扩展');