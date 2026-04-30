const WebSocket = require('ws');

const url = 'ws://localhost:3003/ws/tts';
const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('Connected to TTS service');
  
  // 1. Create session
  ws.send(JSON.stringify({
    type: 'session.create',
    sessionId: 'test-session-' + Date.now(),
    config: {
      voice: 'Neil',
      sampleRate: 24000
    }
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  if (msg.type === 'session.created') {
    console.log('Session created, sending text...');
    ws.send(JSON.stringify({
      type: 'text.append',
      text: '人工智能面试系统通过集成的数字人技术，能够为求职者提供沉浸式的面试体验。我们的系统集成了语音识别、语音合成以及大语言模型，确保每一次对话都流畅自然。今天我们将进行一场关于后端开发的面试，请您做好准备。'
    }));
    ws.send(JSON.stringify({
      type: 'text.commit'
    }));
  }
  
  if (msg.type === 'tts.transcript_delta') {
    console.log('--- TRANSCRIPT DELTA ---');
    console.log('Text:', msg.text);
    console.log('AudioTime:', msg.audioTime);
  }
  
  if (msg.type === 'tts.audio_chunk') {
    console.log('Received audio chunk');
  }
  
  if (msg.type === 'tts.response_done') {
    console.log('Synthesis done. Closing in 5 seconds...');
    setTimeout(() => {
      ws.close();
      process.exit(0);
    }, 5000);
  }
  
  if (msg.type === 'error' || msg.type === 'tts.error') {
    console.error('TTS Error:', msg.error || msg.message);
  }
});

ws.on('error', (err) => {
  console.error('WS Error:', err);
});

ws.on('close', () => {
  console.log('Disconnected');
});
