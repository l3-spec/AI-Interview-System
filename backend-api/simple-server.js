const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 模拟数据存储
const sessions = new Map();
const questions = new Map();
const answers = new Map();

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API文档
app.get('/api/docs', (req, res) => {
  res.send(`
    <h1>AI面试系统 API文档</h1>
    <h2>可用端点:</h2>
    <ul>
      <li>POST /api/interview/start - 开始面试</li>
      <li>POST /api/interview/next - 获取下一题</li>
      <li>POST /api/interview/submit - 提交面试结果</li>
      <li>GET /api/interview/sessions - 获取面试列表</li>
    </ul>
  `);
});

// 开始面试
app.post('/api/interview/start', (req, res) => {
  try {
    const { user_job_target, user_company_target, user_background } = req.body;
    
    const sessionId = uuidv4();
    const firstQuestion = `请简单介绍一下您自己，以及为什么想要应聘${user_job_target || '这个职位'}？`;
    
    // 保存会话
    sessions.set(sessionId, {
      sessionId,
      jobTarget: user_job_target,
      companyTarget: user_company_target,
      background: user_background,
      status: 'active',
      createdAt: new Date()
    });
    
    // 保存问题
    questions.set(sessionId, [firstQuestion]);
    answers.set(sessionId, []);
    
    res.json({
      action: 'start',
      question: firstQuestion,
      question_index: 0,
      total_questions: 5,
      session_id: sessionId,
      success: true
    });
  } catch (error) {
    console.error('开始面试失败:', error);
    res.status(500).json({
      success: false,
      error_message: '开始面试失败，请稍后重试'
    });
  }
});

// 获取下一题
app.post('/api/interview/next', (req, res) => {
  try {
    const { session_id, last_answer, current_question_index } = req.body;
    
    if (!sessions.has(session_id)) {
      return res.status(404).json({
        success: false,
        error_message: '面试会话不存在'
      });
    }
    
    // 保存上一题答案
    if (last_answer) {
      const sessionAnswers = answers.get(session_id) || [];
      sessionAnswers.push(last_answer);
      answers.set(session_id, sessionAnswers);
    }
    
    const nextQuestionIndex = (current_question_index || 0) + 1;
    const totalQuestions = 5;
    
    // 检查是否完成
    if (nextQuestionIndex >= totalQuestions) {
      return res.json({
        action: 'complete',
        is_final: true,
        next_action: 'submit',
        session_id: session_id,
        success: true
      });
    }
    
    // 生成下一个问题
    const questionBank = [
      '请描述一下您最熟悉的技术栈，以及相关的项目经验。',
      '请描述一次您在团队中发挥重要作用的经历。',
      '如果遇到一个技术难题，您通常会采用什么方法来解决？',
      '请谈谈您的职业规划，未来3-5年的目标是什么？'
    ];
    
    const nextQuestion = questionBank[nextQuestionIndex - 1] || '请再详细谈谈您对这个职位的理解和期望。';
    
    // 保存问题
    const sessionQuestions = questions.get(session_id) || [];
    sessionQuestions.push(nextQuestion);
    questions.set(session_id, sessionQuestions);
    
    res.json({
      action: 'next',
      question: nextQuestion,
      question_index: nextQuestionIndex,
      total_questions: totalQuestions,
      session_id: session_id,
      is_final: nextQuestionIndex === totalQuestions - 1,
      success: true
    });
  } catch (error) {
    console.error('获取下一题失败:', error);
    res.status(500).json({
      success: false,
      error_message: '获取下一题失败，请稍后重试'
    });
  }
});

// 提交面试结果
app.post('/api/interview/submit', (req, res) => {
  try {
    const { session_id, video_url, interview_duration } = req.body;
    
    if (!sessions.has(session_id)) {
      return res.status(404).json({
        success: false,
        error_message: '面试会话不存在'
      });
    }
    
    // 模拟AI分析结果
    const analysisResult = {
      overall_score: Math.floor(70 + Math.random() * 25),
      ability_scores: {
        '沟通表达': Math.floor(70 + Math.random() * 25),
        '专业技能': Math.floor(65 + Math.random() * 30),
        '逻辑思维': Math.floor(75 + Math.random() * 20),
        '学习能力': Math.floor(80 + Math.random() * 15),
        '团队协作': Math.floor(70 + Math.random() * 25)
      },
      suggestions: [
        '可以更多地结合具体实例来回答问题',
        '建议进一步了解公司文化和业务',
        '可以更详细地描述技术项目经验'
      ],
      strengths: [
        '回答问题思路清晰，逻辑性强',
        '对目标职位有较好的理解',
        '表现出良好的学习意愿'
      ],
      weaknesses: [
        '部分回答可以更加具体和详细',
        '可以更多地展示个人特色和亮点'
      ]
    };
    
    // 更新会话状态
    const session = sessions.get(session_id);
    session.status = 'completed';
    session.videoUrl = video_url;
    session.duration = interview_duration;
    session.analysisResult = analysisResult;
    session.completedAt = new Date();
    sessions.set(session_id, session);
    
    res.json({
      action: 'submit',
      analysis_result: analysisResult,
      session_id: session_id,
      success: true
    });
  } catch (error) {
    console.error('提交面试失败:', error);
    res.status(500).json({
      success: false,
      error_message: '提交面试失败，请稍后重试'
    });
  }
});

// 获取面试会话列表
app.get('/api/interview/sessions', (req, res) => {
  try {
    const sessionList = Array.from(sessions.values()).map(session => ({
      ...session,
      questions: questions.get(session.sessionId) || [],
      answers: answers.get(session.sessionId) || []
    }));
    
    res.json({
      success: true,
      data: {
        sessions: sessionList,
        total: sessionList.length
      }
    });
  } catch (error) {
    console.error('获取面试会话列表失败:', error);
    res.status(500).json({
      success: false,
      error_message: '获取面试会话列表失败'
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 AI面试系统后端服务已启动`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📚 API文档: http://localhost:${PORT}/api/docs`);
  console.log(`🌟 环境: development`);
  console.log(`🎯 主要API端点:`);
  console.log(`   POST /api/interview/start     - 开始面试`);
  console.log(`   POST /api/interview/next      - 获取下一题`);
  console.log(`   POST /api/interview/submit    - 提交面试结果`);
  console.log(`   GET  /api/interview/sessions  - 获取面试列表`);
}); 