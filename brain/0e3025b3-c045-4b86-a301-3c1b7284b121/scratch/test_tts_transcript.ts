import WebSocket from 'ws';

const url = 'ws://localhost:3003/ws/tts';
const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('Connected to TTS service');
  
  // 1. Create session
  ws.send(JSON.stringify({
    type: 'session.create',
    sessionId: 'test-session-' + Date.now(),
    config: {
      voice: 'Cherry',
      sampleRate: 24000
    }
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('Received:', msg.type, msg.text || '');
  
  if (msg.type === 'session.created') {
    // 2. Send text to synthesize
    ws.send(JSON.stringify({
      type: 'text.append',
      text: '你好，欢迎来到AI面试系统。我们将为您提供最真实的面试体验。'
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
  
  if (msg.type === 'tts.response_done') {
    console.log('Synthesis done. Closing in 2 seconds...');
    setTimeout(() => {
      ws.close();
      process.exit(0);
    }, 2000);
  }
});

ws.on('error', (err) => {
  console.error('WS Error:', err);
});

ws.on('close', () => {
  console.log('Disconnected');
});
