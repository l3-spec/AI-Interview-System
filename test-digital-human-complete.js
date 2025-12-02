/**
 * 数字人语音交互完整测试脚本
 * 测试整个语音交互流程：WebSocket连接 -> 音频上传 -> ASR -> LLM -> TTS -> 音频返回
 */

const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  serverUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  testAudioFile: process.argv[2] || null, // 可选：提供测试音频文件路径
  sessionId: `test-session-${Date.now()}`,
  userId: 'test-user-001',
  jobPosition: 'Node.js后端工程师',
  background: '3年工作经验，熟悉Express、Prisma等技术栈'
};

console.log('🚀 数字人语音交互完整测试');
console.log('=' .repeat(60));
console.log(`服务器地址: ${CONFIG.serverUrl}`);
console.log(`会话ID: ${CONFIG.sessionId}`);
console.log(`职位: ${CONFIG.jobPosition}`);
console.log('=' .repeat(60));

// 创建Socket连接
const socket = io(CONFIG.serverUrl, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// 测试状态
const testState = {
  connected: false,
  sessionJoined: false,
  audioSent: false,
  partialResultReceived: false,
  voiceResponseReceived: false,
  testStartTime: Date.now(),
  errors: []
};

// 连接事件
socket.on('connect', () => {
  console.log('✅ WebSocket连接成功');
  console.log(`   Socket ID: ${socket.id}`);
  testState.connected = true;
  
  // 加入会话
  joinSession();
});

socket.on('disconnect', (reason) => {
  console.log(`❌ WebSocket连接断开: ${reason}`);
  testState.connected = false;
});

socket.on('connect_error', (error) => {
  console.error('❌ WebSocket连接错误:', error.message);
  testState.errors.push(`连接错误: ${error.message}`);
});

// 加入会话
function joinSession() {
  console.log('\n📝 加入会话...');
  
  socket.emit('join_session', {
    sessionId: CONFIG.sessionId,
    userId: CONFIG.userId,
    jobPosition: CONFIG.jobPosition,
    background: CONFIG.background
  });
  
  socket.once('session_joined', (data) => {
    console.log('✅ 会话加入成功');
    console.log(`   Session ID: ${data.sessionId}`);
    testState.sessionJoined = true;
    
    // 等待1秒后发送测试音频
    setTimeout(() => {
      sendTestAudio();
    }, 1000);
  });
}

// 发送测试音频
async function sendTestAudio() {
  console.log('\n🎤 发送测试音频...');
  
  let audioBase64;
  
  if (CONFIG.testAudioFile && fs.existsSync(CONFIG.testAudioFile)) {
    // 使用提供的音频文件
    console.log(`   使用音频文件: ${CONFIG.testAudioFile}`);
    const audioBuffer = fs.readFileSync(CONFIG.testAudioFile);
    audioBase64 = audioBuffer.toString('base64');
  } else {
    // 生成模拟音频数据（静音）
    console.log('   使用模拟音频数据（静音）');
    const sampleRate = 16000;
    const duration = 2; // 秒
    const bufferSize = sampleRate * duration * 2; // 16-bit = 2 bytes
    const audioBuffer = Buffer.alloc(bufferSize);
    
    // 生成一些随机噪声模拟语音
    for (let i = 0; i < bufferSize; i += 2) {
      const sample = Math.floor((Math.random() - 0.5) * 1000);
      audioBuffer.writeInt16LE(sample, i);
    }
    
    audioBase64 = audioBuffer.toString('base64');
  }
  
  // 发送音频数据（先发送中间块，模拟流式传输）
  const chunkSize = Math.floor(audioBase64.length / 3);
  
  // 发送前两个块（非最终）
  for (let i = 0; i < 2; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, audioBase64.length);
    const chunk = audioBase64.substring(start, end);
    
    console.log(`   发送音频块 ${i + 1}/3 (${chunk.length} 字符)`);
    
    socket.emit('audio_data', {
      audio: chunk,
      sessionId: CONFIG.sessionId,
      sampleRate: 16000,
      isFinal: false
    });
    
    // 等待100ms模拟流式传输
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 发送最后一个块（最终）
  const lastChunk = audioBase64.substring(2 * chunkSize);
  console.log(`   发送音频块 3/3 (${lastChunk.length} 字符, FINAL)`);
  
  socket.emit('audio_data', {
    audio: lastChunk,
    sessionId: CONFIG.sessionId,
    sampleRate: 16000,
    isFinal: true
  });
  
  testState.audioSent = true;
  console.log('✅ 音频发送完成');
}

// 接收临时识别结果
socket.on('audio_partial_result', (data) => {
  console.log('\n📝 收到临时识别结果:');
  console.log(`   文本: "${data.text}"`);
  console.log(`   Session ID: ${data.sessionId}`);
  testState.partialResultReceived = true;
});

// 接收语音响应
socket.on('voice_response', (data) => {
  console.log('\n🎉 收到语音响应:');
  console.log(`   文本: "${data.text}"`);
  console.log(`   音频URL: ${data.audioUrl}`);
  console.log(`   Session ID: ${data.sessionId}`);
  console.log(`   时长: ${data.duration || 'N/A'}ms`);
  testState.voiceResponseReceived = true;
  
  // 测试完成，显示总结
  setTimeout(() => {
    displayTestSummary();
  }, 1000);
});

// 接收状态更新
socket.on('status', (data) => {
  console.log('\n📊 状态更新:');
  console.log(`   处理中: ${data.isProcessing}`);
  console.log(`   数字人说话中: ${data.isDigitalHumanSpeaking}`);
});

// 接收错误
socket.on('error', (data) => {
  console.error('\n❌ 服务器错误:');
  console.error(`   消息: ${data.message}`);
  console.error(`   Session ID: ${data.sessionId}`);
  testState.errors.push(data.message);
  
  // 如果收到错误，等待2秒后显示总结
  setTimeout(() => {
    displayTestSummary();
  }, 2000);
});

// 显示测试总结
function displayTestSummary() {
  const duration = Date.now() - testState.testStartTime;
  
  console.log('\n');
  console.log('=' .repeat(60));
  console.log('📊 测试总结');
  console.log('=' .repeat(60));
  console.log(`总耗时: ${duration}ms (${(duration / 1000).toFixed(2)}秒)`);
  console.log('');
  console.log('测试项目:');
  console.log(`  ✓ WebSocket连接: ${testState.connected ? '✅ 成功' : '❌ 失败'}`);
  console.log(`  ✓ 会话加入: ${testState.sessionJoined ? '✅ 成功' : '❌ 失败'}`);
  console.log(`  ✓ 音频发送: ${testState.audioSent ? '✅ 成功' : '❌ 失败'}`);
  console.log(`  ✓ 临时识别结果: ${testState.partialResultReceived ? '✅ 成功' : '⚠️  未收到'}`);
  console.log(`  ✓ 语音响应: ${testState.voiceResponseReceived ? '✅ 成功' : '❌ 失败'}`);
  
  if (testState.errors.length > 0) {
    console.log('\n错误列表:');
    testState.errors.forEach((err, index) => {
      console.log(`  ${index + 1}. ${err}`);
    });
  }
  
  console.log('=' .repeat(60));
  
  // 测试结果评估
  const allPassed = testState.connected && 
                   testState.sessionJoined && 
                   testState.audioSent && 
                   testState.voiceResponseReceived;
  
  if (allPassed) {
    console.log('🎉 测试通过！数字人语音交互流程正常工作。');
  } else {
    console.log('❌ 测试失败！请检查上述错误信息。');
  }
  
  console.log('\n提示：');
  if (!testState.partialResultReceived) {
    console.log('  - 未收到临时识别结果可能是因为音频太短或ASR服务配置问题');
  }
  if (!testState.voiceResponseReceived) {
    console.log('  - 未收到语音响应可能是ASR、LLM或TTS服务配置问题');
    console.log('  - 请检查backend-api的服务配置和日志');
  }
  
  console.log('\n' + '=' .repeat(60));
  
  // 断开连接并退出
  setTimeout(() => {
    socket.disconnect();
    process.exit(allPassed ? 0 : 1);
  }, 1000);
}

// 超时保护（30秒后自动结束）
setTimeout(() => {
  console.log('\n⏰ 测试超时（30秒），强制结束');
  displayTestSummary();
}, 30000);

// 捕获进程退出
process.on('SIGINT', () => {
  console.log('\n\n⚠️  测试被用户中断');
  displayTestSummary();
});

console.log('\n⏳ 正在连接WebSocket服务器...');

