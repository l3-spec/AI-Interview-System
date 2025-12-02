import express from 'express';

const router = express.Router();

// REST API路由

// 检查Fay服务状态
router.get('/health', (req, res) => {
  res.json({
    status: 'ready',
    service: 'fay_integration',
    websocket: 'ws://localhost:3001',
    api: 'http://localhost:3001/api/fay',
    timestamp: new Date().toISOString()
  });
});

// 发送面试问题到Fay
router.post('/interview/question', (req, res) => {
  const { question, character = 'tech_interviewer' } = req.body;
  
  if (!question) {
    return res.status(400).json({
      success: false,
      error: '问题不能为空'
    });
  }
  
  const message = {
    type: 'interview_request',
    question: question,
    character: character,
    timestamp: new Date().toISOString()
  };
  
  // 使用WebSocket广播
  const io = (req as any).app.get('io');
  io?.to('fay_interview').emit('send_question', message);
  
  res.json({
    success: true,
    message: '问题已发送到面试会话',
    data: message,
    websocket: 'ws://localhost:3001'
  });
});

// 发送语音合成请求
router.post('/synthesize', (req, res) => {
  const { text, voice = 'zh-CN-XiaoxiaoNeural' } = req.body;
  
  if (!text) {
    return res.status(400).json({
      success: false,
      error: '文本不能为空'
    });
  }
  
  const message = {
    type: 'voice_synthesis',
    text: text,
    voice: voice,
    timestamp: new Date().toISOString()
  };
  
  // 使用WebSocket广播
  const io = (req as any).app.get('io');
  io?.to('fay_interview').emit('voice_synthesis', message);
  
  res.json({
    success: true,
    message: '语音合成请求已发送',
    data: message,
    websocket: 'ws://localhost:3001'
  });
});

// 获取可用角色
router.get('/characters', (req, res) => {
  const characters = [
    {
      id: 'tech_interviewer',
      name: '技术面试官',
      description: '专注于技术问题的专业面试官',
      avatar: '/avatars/tech_interviewer.png',
      voice: 'zh-CN-XiaoxiaoNeural'
    },
    {
      id: 'hr_interviewer', 
      name: 'HR面试官',
      description: '友好的人力资源面试官',
      avatar: '/avatars/hr_interviewer.png',
      voice: 'zh-CN-XiaoyiNeural'
    },
    {
      id: 'pressure_interviewer',
      name: '压力面试官',
      description: '具有挑战性的压力测试面试官',
      avatar: '/avatars/pressure_interviewer.png',
      voice: 'zh-CN-YunjianNeural'
    }
  ];
  
  res.json({
    success: true,
    characters
  });
});

// 开始面试会话
router.post('/session/start', (req, res) => {
  const { character = 'tech_interviewer', questions = [] } = req.body;
  
  const message = {
    type: 'start_interview',
    character: character,
    questions: questions.length > 0 ? questions : [
      '请简单自我介绍一下。',
      '你为什么想加入我们公司？',
      '你最大的职业成就是什么？'
    ],
    timestamp: new Date().toISOString()
  };
  
  // 使用WebSocket广播
  const io = (req as any).app.get('io');
  const sessionId = Date.now().toString();
  
  io?.to('fay_interview').emit('start_session', {
    sessionId,
    character,
    questions
  });
  
  res.json({
    success: true,
    sessionId,
    character,
    message: '面试会话已启动',
    websocket: 'ws://localhost:3001'
  });
});

// 测试连接
router.get('/test', (req, res) => {
  res.json({
    success: true,
    websocket: 'ws://localhost:3001',
    api: 'http://localhost:3001/api/fay',
    endpoints: {
      health: '/api/fay/health',
      characters: '/api/fay/characters',
      interview: '/api/fay/interview/question',
      synthesize: '/api/fay/synthesize',
      session: '/api/fay/session/start'
    },
    instructions: {
      websocket: '连接到 ws://localhost:3001 使用Socket.IO',
      join_room: '加入 "fay_interview" 房间',
      emit_events: '使用 send_question, voice_synthesis, start_session 事件'
    }
  });
});

export default router;