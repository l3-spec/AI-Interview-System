import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { aiInterviewService } from '../services/aiInterviewService';
import { deepseekService } from '../services/deepseekService';
import { ttsService } from '../services/ttsService';
import { nlpParsingService } from '../services/nlpParsingService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/ai-interview/create-session:
 *   post:
 *     summary: 创建AI面试会话 🤖
 *     description: |
 *       根据用户职位意向创建面试会话，系统会自动：
 *       1. 调用Deepseek大模型生成专业面试问题
 *       2. 批量生成问题的语音文件（TTS）
 *       3. 返回完整的面试会话信息
 *       
 *       **重要提示：**
 *       - 这是第4项功能的核心接口
 *       - 会话创建可能需要5-15秒（包含AI生成时间）
 *       - 返回的语音文件可直接播放给用户
 *     tags: [🤖 AI面试系统]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSessionRequest'
 *           examples:
 *             Java工程师面试:
 *               summary: 高级Java开发工程师面试
 *               value:
 *                 jobTarget: "高级Java开发工程师"
 *                 companyTarget: "腾讯"
 *                 background: "5年Java开发经验，熟悉Spring Boot、微服务架构"
 *                 questionCount: 5
 *             前端工程师面试:
 *               summary: 前端开发工程师面试
 *               value:
 *                 jobTarget: "前端开发工程师"
 *                 companyTarget: "阿里巴巴"
 *                 background: "3年Vue.js开发经验，熟悉前端工程化"
 *                 questionCount: 4
 *             产品经理面试:
 *               summary: 产品经理面试
 *               value:
 *                 jobTarget: "产品经理"
 *                 companyTarget: "字节跳动"
 *                 background: "2年产品设计经验，有B端产品经验"
 *                 questionCount: 5
 *             简单测试:
 *               summary: 最简参数测试
 *               value:
 *                 jobTarget: "Java开发工程师"
 *                 questionCount: 3
 *     responses:
 *       200:
 *         description: 面试会话创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateSessionResponse'
 *             examples:
 *               创建成功:
 *                 value:
 *                   success: true
 *                   message: "面试会话创建成功，准备开始面试"
 *                   data:
 *                     sessionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     questions:
 *                       - questionIndex: 0
 *                         questionText: "请简单介绍一下您自己，以及为什么想要应聘高级Java开发工程师这个职位？"
 *                         audioUrl: "/uploads/audio/tts_uuid_q0.mp3"
 *                         duration: 12
 *                       - questionIndex: 1
 *                         questionText: "请谈谈您在Java开发中最有挑战性的一个项目，您是如何解决的？"
 *                         audioUrl: "/uploads/audio/tts_uuid_q1.mp3"
 *                         duration: 15
 *                     totalQuestions: 5
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "请求参数错误"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "jobTarget"
 *                       message:
 *                         type: string
 *                         example: "职位目标不能为空"
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误（可能是Deepseek API调用失败）
 */
router.post('/create-session',
  authenticateToken,
  [
    body('jobTarget')
      .notEmpty()
      .withMessage('职位目标不能为空')
      .isLength({ min: 2, max: 100 })
      .withMessage('职位目标长度应在2-100个字符之间'),
    body('jobId')
      .optional()
      .isUUID()
      .withMessage('岗位ID格式错误'),
    body('jobCategory')
      .notEmpty()
      .withMessage('职位大类不能为空')
      .isLength({ max: 50 })
      .withMessage('职位大类长度不能超过50个字符')
      .trim(),
    body('jobSubCategory')
      .notEmpty()
      .withMessage('职位小类不能为空')
      .isLength({ max: 100 })
      .withMessage('职位小类长度不能超过100个字符')
      .trim(),
    body('companyTarget')
      .optional()
      .isLength({ max: 100 })
      .withMessage('公司目标长度不能超过100个字符'),
    body('background')
      .optional()
      .isLength({ max: 500 })
      .withMessage('背景信息长度不能超过500个字符'),
    body('questionCount')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('问题数量必须在1-10之间'),
  ],
  async (req: any, res: any) => {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数错误',
          errors: errors.array(),
        });
      }

      const {
        jobTarget,
        jobId,
        companyTarget,
        background,
        questionCount,
        jobCategory: rawJobCategory,
        jobSubCategory: rawJobSubCategory,
      } = req.body;
      const userId = req.user.id;

      const jobCategory =
        typeof rawJobCategory === 'string' && rawJobCategory.trim().length > 0
          ? rawJobCategory.trim()
          : undefined;
      const jobSubCategory =
        typeof rawJobSubCategory === 'string' && rawJobSubCategory.trim().length > 0
          ? rawJobSubCategory.trim()
          : undefined;

      const displayCategory = jobCategory ?? '通用面试';
      const displaySubCategory = jobSubCategory ?? jobTarget;
      console.log(
        `收到AI面试会话创建请求: 用户${userId}, 岗位ID:${jobId ?? '无'}, 职位${jobTarget}, 大类${displayCategory}, 小类${displaySubCategory}`
      );

      // 创建面试会话
      const result = await aiInterviewService.createInterviewSession({
        userId,
        jobId,
        jobTarget,
        companyTarget,
        background,
        questionCount,
        jobCategory,
        jobSubCategory,
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: '创建面试会话失败',
          error: result.error,
        });
      }

      res.json({
        success: true,
        message: '面试会话创建成功',
        data: {
          jobId: result.jobId,
          sessionId: result.sessionId,
          questions: result.questions,
          totalQuestions: result.questions?.length || 0,
          jobCategory: result.jobCategory,
          jobSubCategory: result.jobSubCategory,
          prompt: result.prompt,
          plannedDuration: result.plannedDuration,
          resumed: result.resumed ?? false,
          currentQuestion: result.currentQuestion ?? 0,
          status: result.status ?? 'PREPARING',
        },
      });

    } catch (error) {
      console.error('创建AI面试会话接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-interview/session/{sessionId}:
 *   get:
 *     summary: 获取面试会话信息
 *     tags: [AI面试]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 会话ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 会话不存在
 */
router.get('/session/:sessionId',
  authenticateToken,
  [
    param('sessionId')
      .isUUID()
      .withMessage('会话ID格式无效'),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数错误',
          errors: errors.array(),
        });
      }

      const { sessionId } = req.params;

      const session = await aiInterviewService.getInterviewSession(sessionId);
      if (!session.success || !session.session) {
        return res.status(404).json({
          success: false,
          message: session.error || '会话不存在',
        });
      }

      res.json({
        success: true,
        data: session.session,
      });

    } catch (error) {
      console.error('获取会话信息接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-interview/next-question/{sessionId}:
 *   get:
 *     summary: 获取下一个面试问题 ➡️
 *     description: |
 *       获取面试会话中的下一个问题
 *       - 自动更新当前问题索引
 *       - 返回问题文本和对应的语音文件URL
 *       - 支持断点续传，可从中断处继续
 *     tags: [🤖 AI面试系统]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         description: 面试会话ID
 *     responses:
 *       200:
 *         description: 获取问题成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 question:
 *                   type: object
 *                   properties:
 *                     questionIndex:
 *                       type: integer
 *                       example: 0
 *                     questionText:
 *                       type: string
 *                       example: "请简单介绍一下您自己，以及为什么想要应聘这个职位？"
 *                     audioUrl:
 *                       type: string
 *                       example: "/uploads/audio/tts_uuid_q0.mp3"
 *                     duration:
 *                       type: integer
 *                       example: 12
 *                 isCompleted:
 *                   type: boolean
 *                   example: false
 *             examples:
 *               获取问题:
 *                 value:
 *                   success: true
 *                   question:
 *                     questionIndex: 0
 *                     questionText: "请简单介绍一下您自己，以及为什么想要应聘这个职位？"
 *                     audioUrl: "/uploads/audio/tts_uuid_q0.mp3"
 *                     duration: 12
 *                   isCompleted: false
 *               面试完成:
 *                 value:
 *                   success: true
 *                   isCompleted: true
 *                   message: "面试已完成，所有问题都已回答"
 *       404:
 *         description: 会话不存在
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "会话不存在"
 *       401:
 *         description: 未授权访问
 */
router.get('/next-question/:sessionId',
  authenticateToken,
  [
    param('sessionId')
      .isUUID()
      .withMessage('会话ID格式无效'),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数错误',
          errors: errors.array(),
        });
      }

      const { sessionId } = req.params;

      const result = await aiInterviewService.getNextQuestion(sessionId);

      res.json(result);

    } catch (error) {
      console.error('获取下一个问题接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-interview/submit-answer:
 *   post:
 *     summary: 提交面试答案 📝
 *     description: |
 *       提交用户对某个问题的回答
 *       - 支持文本答案和视频答案
 *       - 视频文件应先上传到OSS，然后提交URL
 *       - 自动记录回答时间和时长
 *     tags: [🤖 AI面试系统]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitAnswerRequest'
 *           examples:
 *             文本答案:
 *               summary: 仅提交文本回答
 *               value:
 *                 sessionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 questionIndex: 0
 *                 answerText: "我是一名有5年经验的Java开发工程师，熟悉Spring Boot、微服务架构等技术栈..."
 *                 answerDuration: 120
 *             视频答案:
 *               summary: 提交视频回答
 *               value:
 *                 sessionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 questionIndex: 1
 *                 answerText: "我在之前的项目中遇到了数据库性能问题..."
 *                 answerVideoUrl: "https://oss.example.com/interview/video_123.mp4"
 *                 answerDuration: 180
 *             完整答案:
 *               summary: 包含所有信息的回答
 *               value:
 *                 sessionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 questionIndex: 2
 *                 answerText: "对于这个技术问题，我的解决方案是..."
 *                 answerVideoUrl: "https://oss.example.com/interview/video_456.mp4"
 *                 answerDuration: 150
 *     responses:
 *       200:
 *         description: 答案提交成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "答案提交成功"
 *             examples:
 *               提交成功:
 *                 value:
 *                   success: true
 *                   message: "答案提交成功"
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 会话或问题不存在
 *       401:
 *         description: 未授权访问
 */
router.post('/submit-answer',
  authenticateToken,
  [
    body('sessionId')
      .isUUID()
      .withMessage('会话ID格式无效'),
    body('questionIndex')
      .isInt({ min: 0 })
      .withMessage('问题索引必须是非负整数'),
    body('answerText')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('答案文本长度不能超过2000个字符'),
    body('answerVideoUrl')
      .optional()
      .custom((value) => {
        if (typeof value !== 'string' || value.trim().length === 0) {
          throw new Error('answerVideoUrl 无效');
        }
        if (/^https?:\/\//i.test(value)) {
          return true;
        }
        return true;
      }),
    body('answerVideoPath')
      .optional()
      .isString()
      .withMessage('answerVideoPath 无效'),
    body('answerDuration')
      .optional()
      .isInt({ min: 1 })
      .withMessage('答案时长必须是正整数'),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数错误',
          errors: errors.array(),
        });
      }

      const { sessionId, questionIndex, answerText, answerVideoUrl, answerVideoPath, answerDuration } = req.body;

      const result = await aiInterviewService.submitAnswer(
        sessionId,
        questionIndex,
        answerText,
        answerVideoUrl,
        answerVideoPath,
        answerDuration
      );

      res.json(result);

    } catch (error) {
      console.error('提交答案接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-interview/complete/{sessionId}:
 *   post:
 *     summary: 完成面试 ✅
 *     description: |
 *       标记面试会话为已完成状态
 *       - 更新会话状态为 COMPLETED
 *       - 记录完成时间
 *       - 面试完成后可生成报告和分析
 *     tags: [🤖 AI面试系统]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         description: 面试会话ID
 *     responses:
 *       200:
 *         description: 面试完成
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "面试已完成"
 *             examples:
 *               完成成功:
 *                 value:
 *                   success: true
 *                   message: "恭喜您完成面试！系统正在生成面试报告，请稍后查看。"
 *       404:
 *         description: 会话不存在
 *       401:
 *         description: 未授权访问
 */
router.post('/complete/:sessionId',
  authenticateToken,
  [
    param('sessionId')
      .isUUID()
      .withMessage('会话ID格式无效'),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数错误',
          errors: errors.array(),
        });
      }

      const { sessionId } = req.params;

      const result = await aiInterviewService.completeInterviewSession(sessionId);

      // 触发分析任务
      if (result.success) {
        try {
          const { analysisQueue } = await import('../jobs/analysisQueue');
          await analysisQueue.enqueueAnalysis(sessionId);
          console.log(`[AI Interview] Analysis task enqueued for session: ${sessionId}`);
        } catch (error) {
          console.error('[AI Interview] Failed to enqueue analysis task:', error);
          // 不影响complete的成功响应
        }
      }

      res.json(result);

    } catch (error) {
      console.error('完成面试接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }
);


/**
 * @swagger
 * /api/ai-interview/resume:
 *   get:
 *     summary: 恢复未完成面试 🔄
 *     description: |
 *       查找当前用户的未完成面试并返回会话信息
 *       - 支持断点续传功能
 *       - 返回最近的未完成面试会话
 *       - 用户可从中断处继续面试
 *     tags: [🤖 AI面试系统]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 找到未完成面试
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 sessionId:
 *                   type: string
 *                   example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 currentQuestion:
 *                   type: integer
 *                   example: 2
 *                 totalQuestions:
 *                   type: integer
 *                   example: 5
 *                 jobTarget:
 *                   type: string
 *                   example: "高级Java开发工程师"
 *             examples:
 *               有未完成面试:
 *                 value:
 *                   success: true
 *                   sessionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                   currentQuestion: 2
 *                   totalQuestions: 5
 *                   jobTarget: "高级Java开发工程师"
 *                   message: "找到未完成的面试，您可以从第3题继续"
 *               无未完成面试:
 *                 value:
 *                   success: false
 *                   message: "没有未完成的面试"
 *       401:
 *         description: 未授权访问
 */
router.get('/resume',
  authenticateToken,
  async (req: any, res: any) => {
    try {
      const userId = req.user.id;

      const result = await aiInterviewService.getUnfinishedSession(userId);

      res.json(result);

    } catch (error) {
      console.error('恢复面试接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-interview/history:
 *   get:
 *     summary: 获取面试历史
 *     tags: [AI面试]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 */
router.get('/history',
  authenticateToken,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须是正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('每页数量必须在1-50之间'),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数错误',
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await aiInterviewService.getInterviewSessions(userId);

      res.json(result);

    } catch (error) {
      console.error('获取面试历史接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-interview/cancel/{sessionId}:
 *   post:
 *     summary: 取消面试会话
 *     tags: [AI面试]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 会话ID
 */
router.post('/cancel/:sessionId',
  authenticateToken,
  [
    param('sessionId')
      .isUUID()
      .withMessage('会话ID格式无效'),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数错误',
          errors: errors.array(),
        });
      }

      const { sessionId } = req.params;

      const result = await aiInterviewService.cancelInterviewSession(sessionId);

      res.json(result);

    } catch (error) {
      console.error('取消面试会话接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-interview/test-tts:
 *   post:
 *     summary: 测试TTS语音服务 🔊
 *     description: |
 *       测试文本转语音功能
 *       - 用于验证TTS服务是否正常工作
 *       - 返回生成的音频文件URL
 *       - 开发和调试时使用
 *     tags: [🤖 AI面试系统]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: 要转换为语音的文本
 *                 example: "您好，欢迎参加AI面试"
 *               voice:
 *                 type: string
 *                 description: 语音类型（可选）
 *                 example: "siqi"
 *           examples:
 *             测试文本:
 *               value:
 *                 text: "您好，欢迎参加AI面试。请准备好您的简历和相关材料。"
 *             指定语音:
 *               value:
 *                 text: "请简单介绍一下您自己。"
 *                 voice: "siqi"
 *     responses:
 *       200:
 *         description: TTS测试成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "TTS转换成功"
 *                 audioUrl:
 *                   type: string
 *                   example: "/uploads/audio/test_tts_uuid.mp3"
 *                 duration:
 *                   type: integer
 *                   example: 5
 *             examples:
 *               测试成功:
 *                 value:
 *                   success: true
 *                   message: "TTS转换成功"
 *                   audioUrl: "/uploads/audio/test_tts_uuid.mp3"
 *                   duration: 5
 *       400:
 *         description: 参数错误
 *       500:
 *         description: TTS服务错误
 */
router.post('/test-tts',
  authenticateToken,
  [
    body('text')
      .notEmpty()
      .withMessage('文本内容不能为空')
      .isLength({ min: 1, max: 500 })
      .withMessage('文本长度应在1-500个字符之间'),
    body('voice')
      .optional()
      .isString()
      .withMessage('语音类型必须是字符串'),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数错误',
          errors: errors.array(),
        });
      }

      const { text, voice } = req.body;

      console.log(`TTS测试请求: ${text.substring(0, 50)}...`);

      // 调用TTS服务
      const result = await ttsService.textToSpeech({
        text,
        voice,
        sessionId: 'test-session',
        questionIndex: 0,
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'TTS转换失败',
          error: result.error,
        });
      }

      res.json({
        success: true,
        message: 'TTS转换成功',
        audioUrl: result.audioUrl,
        duration: result.duration,
        fileSize: result.fileSize,
        provider: process.env.TTS_PROVIDER || 'mock',
      });

    } catch (error) {
      console.error('TTS测试接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-interview/supported-voices:
 *   get:
 *     summary: 获取支持的语音列表 🎤
 *     description: |
 *       获取系统支持的TTS语音类型列表
 *       - 按提供商分组显示
 *       - 包含语音名称和描述
 *       - 用于前端语音选择功能
 *     tags: [🤖 AI面试系统]
 *     responses:
 *       200:
 *         description: 获取语音列表成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentProvider:
 *                       type: string
 *                       example: "aliyun"
 *                     voices:
 *                       type: object
 *                       additionalProperties:
 *                         type: array
 *                         items:
 *                           type: string
 *             examples:
 *               语音列表:
 *                 value:
 *                   success: true
 *                   data:
 *                     currentProvider: "aliyun"
 *                     voices:
 *                       aliyun: ["siqi", "xiaoyun", "xiaogang", "ruoxi", "xiaowei"]
 *                       azure: ["zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural", "zh-CN-YunjianNeural"]
 *                       baidu: ["度小宇", "度小美", "度逍遥", "度丫丫"]
 */
router.get('/supported-voices', (req: any, res: any) => {
  try {
    const voices = ttsService.getSupportedVoices();
    const currentProvider = process.env.TTS_PROVIDER || 'aliyun';

    res.json({
      success: true,
      data: {
        currentProvider,
        voices,
      },
    });
  } catch (error) {
    console.error('获取支持语音列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支持语音列表失败',
    });
  }
});

/**
 * @swagger
 * /api/ai-interview/smart-create-session:
 *   post:
 *     summary: 智能创建AI面试会话 🧠
 *     description: |
 *       基于自然语言描述智能创建面试会话，系统会：
 *       1. 使用AI解析用户的自然语言描述
 *       2. 自动提取职位、公司、背景等信息
 *       3. 调用Deepseek生成专业面试问题
 *       4. 生成问题的语音文件（TTS）
 *       5. 返回完整的面试会话信息
 *       
 *       **支持的输入格式：**
 *       - "我想面试阿里巴巴的Java开发工程师，我有3年Java经验"
 *       - "应聘腾讯前端开发，会React和Vue，有2年工作经验"
 *       - "Java开发，3年经验"
 *       - "前端工程师，刚毕业"
 *     tags: [🤖 AI面试系统]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userInput
 *             properties:
 *               userInput:
 *                 type: string
 *                 description: 用户的自然语言描述
 *                 minLength: 5
 *                 maxLength: 1000
 *                 example: "我想面试阿里巴巴的Java开发工程师，我有3年Java经验，熟悉Spring框架"
 *               questionCount:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 description: 可选：自定义问题数量，如果不提供将由AI智能推荐
 *                 example: 5
 *           examples:
 *             Java工程师:
 *               summary: Java开发工程师面试
 *               value:
 *                 userInput: "我想面试阿里巴巴的Java开发工程师，我有3年Java经验，熟悉Spring框架"
 *             前端工程师:
 *               summary: 前端开发工程师面试
 *               value:
 *                 userInput: "应聘腾讯前端开发，会React和Vue，有2年工作经验"
 *                 questionCount: 6
 *             简短描述:
 *               summary: 简短的职位描述
 *               value:
 *                 userInput: "Python后端开发，5年经验"
 *     responses:
 *       200:
 *         description: 面试会话创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "面试会话创建成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: string
 *                       format: uuid
 *                     parseResult:
 *                       type: object
 *                       description: AI解析的结构化结果
 *                       properties:
 *                         jobTarget:
 *                           type: string
 *                         companyTarget:
 *                           type: string
 *                         background:
 *                           type: string
 *                         confidence:
 *                           type: number
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           questionIndex:
 *                             type: integer
 *                           questionText:
 *                             type: string
 *                           audioUrl:
 *                             type: string
 *                           duration:
 *                             type: integer
 *                     totalQuestions:
 *                       type: integer
 *             examples:
 *               创建成功:
 *                 value:
 *                   success: true
 *                   message: "面试会话创建成功"
 *                   data:
 *                     sessionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     parseResult:
 *                       jobTarget: "Java开发工程师"
 *                       companyTarget: "阿里巴巴"
 *                       background: "3年Java开发经验，熟悉Spring框架"
 *                       confidence: 0.95
 *                     questions:
 *                       - questionIndex: 0
 *                         questionText: "请简单介绍一下您自己，以及为什么想要应聘Java开发工程师这个职位？"
 *                         audioUrl: "/uploads/audio/tts_uuid_q0.mp3"
 *                         duration: 12
 *                     totalQuestions: 5
 *       400:
 *         description: 请求参数错误或解析失败
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.post('/smart-create-session',
  authenticateToken,
  [
    body('userInput')
      .notEmpty()
      .withMessage('用户描述不能为空')
      .isLength({ min: 5, max: 1000 })
      .withMessage('用户描述长度应在5-1000个字符之间'),
    body('questionCount')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('问题数量必须在1-10之间'),
  ],
  async (req: any, res: any) => {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数错误',
          errors: errors.array(),
        });
      }

      const { userInput, questionCount } = req.body;
      const userId = req.user.id;

      console.log(`收到智能面试会话创建请求: 用户${userId}, 描述: "${userInput}"`);

      // 1. 使用NLP服务解析用户描述
      const parseResult = await nlpParsingService.parseJobDescription(userInput);

      if (!nlpParsingService.validateParseResult(parseResult)) {
        return res.status(400).json({
          success: false,
          message: '无法解析用户描述，请提供更详细的信息',
          parseResult,
        });
      }

      console.log(`解析结果: 职位=${parseResult.jobTarget}, 公司=${parseResult.companyTarget}, 置信度=${parseResult.confidence}`);

      // 2. 使用解析结果创建面试会话
      const finalQuestionCount = questionCount || parseResult.questionCount;

      const result = await aiInterviewService.createInterviewSession({
        userId,
        jobTarget: parseResult.jobTarget,
        companyTarget: parseResult.companyTarget,
        background: parseResult.background,
        questionCount: finalQuestionCount,
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: '创建面试会话失败',
          error: result.error,
          parseResult, // 返回解析结果以便调试
        });
      }

      res.json({
        success: true,
        message: `面试会话创建成功 (解析置信度: ${Math.round(parseResult.confidence * 100)}%)`,
        data: {
          sessionId: result.sessionId,
          parseResult: {
            jobTarget: parseResult.jobTarget,
            companyTarget: parseResult.companyTarget,
            background: parseResult.background,
            confidence: parseResult.confidence,
            parsedElements: parseResult.parsedElements,
          },
          questions: result.questions,
          totalQuestions: result.questions?.length || 0,
          resumed: result.resumed ?? false,
          currentQuestion: result.currentQuestion ?? 0,
          status: result.status ?? 'PREPARING',
        },
      });

    } catch (error) {
      console.error('智能创建AI面试会话接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-interview/preview-parse:
 *   post:
 *     summary: 预览解析结果 👁️
 *     description: |
 *       预览用户描述的解析结果，不创建实际的面试会话
 *       用于让用户确认解析是否准确，然后再决定是否创建会话
 *     tags: [🤖 AI面试系统]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userInput
 *             properties:
 *               userInput:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 1000
 *                 example: "我想面试阿里巴巴的Java开发工程师，我有3年Java经验"
 *     responses:
 *       200:
 *         description: 解析预览成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobTarget:
 *                       type: string
 *                     companyTarget:
 *                       type: string
 *                     background:
 *                       type: string
 *                     questionCount:
 *                       type: integer
 *                     confidence:
 *                       type: number
 *                     parsedElements:
 *                       type: object
 */
router.post('/preview-parse',
  authenticateToken,
  [
    body('userInput')
      .notEmpty()
      .withMessage('用户描述不能为空')
      .isLength({ min: 5, max: 1000 })
      .withMessage('用户描述长度应在5-1000个字符之间'),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数错误',
          errors: errors.array(),
        });
      }

      const { userInput } = req.body;

      console.log(`收到解析预览请求: "${userInput}"`);

      // 解析用户描述
      const parseResult = await nlpParsingService.parseJobDescription(userInput);

      res.json({
        success: true,
        message: `解析完成 (置信度: ${Math.round(parseResult.confidence * 100)}%)`,
        data: parseResult,
        suggestions: {
          isHighConfidence: parseResult.confidence >= 0.8,
          needsMoreInfo: parseResult.confidence < 0.6,
          tips: parseResult.confidence < 0.6 ?
            "建议提供更详细的信息，如具体的职位名称、公司名称、工作经验年限等" :
            null
        }
      });

    } catch (error) {
      console.error('解析预览接口错误:', error);
      res.status(500).json({
        success: false,
        message: '解析失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-interview/sessions/{sessionId}/report:
 *   get:
 *     summary: 获取视频简历报告 🧾
 *     description: 返回适配客户端 ResumeReport 数据模型的面试报告结构
 *     tags: [🤖 AI面试系统]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 面试会话ID
 *     responses:
 *       200:
 *         description: 获取报告成功
 *       403:
 *         description: 无权访问该报告
 *       404:
 *         description: 会话不存在
 *       409:
 *         description: 面试未完成或分析报告尚未生成
 */
router.get('/sessions/:sessionId/report',
  authenticateToken,
  [
    param('sessionId')
      .isUUID()
      .withMessage('会话ID格式无效'),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数错误',
          errors: errors.array(),
        });
      }

      const { sessionId } = req.params;
      const userId = req.user?.type === 'user' ? req.user.id : undefined;
      const result = await aiInterviewService.getInterviewResumeReport(sessionId, userId);

      if (!result.success) {
        if (result.code === 'FORBIDDEN') {
          return res.status(403).json({
            success: false,
            message: result.error,
          });
        }

        if (result.code === 'NOT_FOUND') {
          return res.status(404).json({
            success: false,
            message: result.error,
          });
        }

        if (result.code === 'NOT_READY') {
          return res.status(409).json({
            success: false,
            message: result.error,
          });
        }

        return res.status(500).json({
          success: false,
          message: result.error || '获取面试报告失败',
        });
      }

      res.json({
        success: true,
        data: result.report,
      });
    } catch (error) {
      console.error('获取视频简历报告接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-interview/sessions/{sessionId}/analysis:
 *   get:
 *     summary: 获取面试分析报告 📊
 *     description: 获取已完成面试的综合分析报告，包含多维度职场素养评估
 *     tags: [🤖 AI面试系统]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 面试会话ID
 *     responses:
 *       200:
 *         description: 获取报告成功
 *       404:
 *         description: 报告不存在
 */
router.get('/sessions/:sessionId/analysis',
  authenticateToken,
  [
    param('sessionId')
      .isUUID()
      .withMessage('会话ID格式无效'),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数错误',
          errors: errors.array(),
        });
      }

      const { sessionId } = req.params;
      const { analysisService } = await import('../services/analysisService');

      const report = await analysisService.getAnalysisReport(sessionId);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: '分析报告不存在'
        });
      }

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('获取分析报告接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-interview/sessions/{sessionId}/analysis/status:
 *   get:
 *     summary: 获取分析状态 🔍
 *     description: 查询面试分析任务的当前状态
 *     tags: [🤖 AI面试系统]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 面试会话ID
 *     responses:
 *       200:
 *         description: 获取状态成功
 */
router.get('/sessions/:sessionId/analysis/status',
  authenticateToken,
  [
    param('sessionId')
      .isUUID()
      .withMessage('会话ID格式无效'),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数错误',
          errors: errors.array(),
        });
      }

      const { sessionId } = req.params;
      const { analysisService } = await import('../services/analysisService');

      const status = await analysisService.getAnalysisStatus(sessionId);

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('获取分析状态接口错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-interview/sessions/{sessionId}/analysis/retry:
 *   post:
 *     summary: 重试失败的分析 🔄
 *     description: 重新触发失败的面试分析任务
 *     tags: [🤖 AI面试系统]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 面试会话ID
 *     responses:
 *       200:
 *         description: 重试任务已创建
 */
router.post('/sessions/:sessionId/analysis/retry',
  authenticateToken,
  [
    param('sessionId')
      .isUUID()
      .withMessage('会话ID格式无效'),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数错误',
          errors: errors.array(),
        });
      }

      const { sessionId } = req.params;
      const { analysisQueue } = await import('../jobs/analysisQueue');

      await analysisQueue.retryFailedTask(sessionId);

      res.json({
        success: true,
        message: '分析任务已重新加入队列'
      });

    } catch (error) {
      console.error('重试分析接口错误:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '服务器内部错误',
      });
    }
  }
);

export default router;
