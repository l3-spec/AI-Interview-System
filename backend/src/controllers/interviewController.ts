import { Request, Response } from 'express';
import { AIService } from '../services/aiService';
import { InterviewSession, InterviewQuestion, InterviewAnswer, CareerAssessment } from '../models/Interview';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 配置multer用于视频文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'videos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `interview_${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

export const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB限制
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传视频文件'));
    }
  }
});

/**
 * 面试控制器
 */
export class InterviewController {

  /**
   * 创建面试会话
   */
  static async createSession(req: Request, res: Response) {
    try {
      const { jobPosition, jobLevel } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ message: '用户未认证' });
      }

      if (!jobPosition || !jobLevel) {
        return res.status(400).json({ message: '职位和级别不能为空' });
      }

      // 检查是否有未完成的面试
      const existingSession = await this.findIncompleteSession(userId);
      if (existingSession) {
        return res.json({
          message: '检测到未完成的面试',
          session: existingSession,
          shouldResume: true
        });
      }

      // 创建新的面试会话
      const session = await this.createNewSession(userId, jobPosition, jobLevel);
      
      // 异步生成问题和语音
      this.generateQuestionsAsync(session.id, jobPosition, jobLevel);

      res.json({
        message: '面试会话创建成功',
        session,
        shouldResume: false
      });

    } catch (error) {
      console.error('创建面试会话失败:', error);
      res.status(500).json({ message: '服务器错误' });
    }
  }

  /**
   * 获取面试问题
   */
  static async getQuestions(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.id;

      // 验证会话归属
      const session = await this.validateSessionOwnership(parseInt(sessionId), userId);
      if (!session) {
        return res.status(404).json({ message: '面试会话不存在' });
      }

      // 获取问题列表
      const questions = await this.getSessionQuestions(session.id);
      
      res.json({
        session,
        questions,
        currentQuestionIndex: session.currentQuestionIndex
      });

    } catch (error) {
      console.error('获取面试问题失败:', error);
      res.status(500).json({ message: '服务器错误' });
    }
  }

  /**
   * 提交回答视频
   */
  static async submitAnswer(req: Request & { file?: Express.Multer.File }, res: Response) {
    try {
      const { sessionId, questionId } = req.params;
      const userId = (req as any).user?.id;
      const videoFile = req.file;

      if (!videoFile) {
        return res.status(400).json({ message: '视频文件不能为空' });
      }

      // 验证会话归属
      const session = await this.validateSessionOwnership(parseInt(sessionId), userId);
      if (!session) {
        return res.status(404).json({ message: '面试会话不存在' });
      }

      // 获取问题信息
      const question = await this.getQuestionById(parseInt(questionId));
      if (!question) {
        return res.status(404).json({ message: '问题不存在' });
      }

      // 保存回答记录
      const videoUrl = `/uploads/videos/${videoFile.filename}`;
      const answer = await this.saveAnswer(session.id, question.id, videoUrl, videoFile);

      // 更新会话进度
      await this.updateSessionProgress(session.id, question.questionIndex);

      // 异步处理视频分析
      this.analyzeAnswerAsync(answer.id, question.questionText, session.jobPosition);

      res.json({
        message: '回答提交成功',
        answer: {
          id: answer.id,
          videoUrl: answer.videoUrl,
          duration: answer.duration
        },
        nextQuestionIndex: question.questionIndex + 1
      });

    } catch (error) {
      console.error('提交回答失败:', error);
      res.status(500).json({ message: '服务器错误' });
    }
  }

  /**
   * 完成面试
   */
  static async completeInterview(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.id;

      // 验证会话归属
      const session = await this.validateSessionOwnership(parseInt(sessionId), userId);
      if (!session) {
        return res.status(404).json({ message: '面试会话不存在' });
      }

      // 更新会话状态
      await this.markSessionCompleted(session.id);

      // 异步生成综合评估
      this.generateAssessmentAsync(session.id, userId);

      res.json({
        message: '面试完成！正在生成评估报告...',
        sessionId: session.id,
        estimatedTime: '3-5分钟'
      });

    } catch (error) {
      console.error('完成面试失败:', error);
      res.status(500).json({ message: '服务器错误' });
    }
  }

  /**
   * 获取面试状态
   */
  static async getInterviewStatus(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.id;

      const session = await this.validateSessionOwnership(parseInt(sessionId), userId);
      if (!session) {
        return res.status(404).json({ message: '面试会话不存在' });
      }

      const questions = await this.getSessionQuestions(session.id);
      const answers = await this.getSessionAnswers(session.id);

      res.json({
        session: {
          id: session.id,
          status: session.status,
          currentQuestionIndex: session.currentQuestionIndex,
          totalQuestions: session.totalQuestions,
          analysisStatus: session.analysisStatus
        },
        questions: questions.map(q => ({
          id: q.id,
          questionIndex: q.questionIndex,
          questionText: q.questionText,
          questionAudioUrl: q.questionAudioUrl,
          timeLimit: q.timeLimit,
          hasAnswer: answers.some(a => a.questionId === q.id)
        })),
        progress: {
          completed: answers.length,
          total: questions.length,
          percentage: Math.round((answers.length / questions.length) * 100)
        }
      });

    } catch (error) {
      console.error('获取面试状态失败:', error);
      res.status(500).json({ message: '服务器错误' });
    }
  }

  /**
   * 获取评估报告
   */
  static async getAssessmentReport(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.id;

      const session = await this.validateSessionOwnership(parseInt(sessionId), userId);
      if (!session) {
        return res.status(404).json({ message: '面试会话不存在' });
      }

      if (session.analysisStatus !== 'completed') {
        return res.json({
          status: session.analysisStatus,
          message: session.analysisStatus === 'processing' ? '报告生成中...' : '报告未就绪'
        });
      }

      // 获取详细评估结果
      const assessment = await this.getCareerAssessment(userId, session.id);
      const answers = await this.getSessionAnswersWithAnalysis(session.id);

      res.json({
        status: 'completed',
        session: {
          id: session.id,
          jobPosition: session.jobPosition,
          jobLevel: session.jobLevel,
          startTime: session.startTime,
          endTime: session.endTime
        },
        assessment,
        answers: answers.map(answer => ({
          questionText: answer.question?.questionText,
          score: answer.analysisScore,
          analysis: answer.analysisDetails ? JSON.parse(answer.analysisDetails) : null,
          transcription: answer.transcription
        }))
      });

    } catch (error) {
      console.error('获取评估报告失败:', error);
      res.status(500).json({ message: '服务器错误' });
    }
  }

  // ========== 私有辅助方法 ==========

  /**
   * 查找未完成的面试会话
   */
  private static async findIncompleteSession(userId: number) {
    try {
      const session = await InterviewSession.findOne({
        where: {
          userId,
          status: ['preparing', 'in_progress']
        },
        order: [['createdAt', 'DESC']]
      });
      return session;
    } catch (error) {
      console.error('查找未完成会话失败:', error);
      return null;
    }
  }

  /**
   * 创建新的面试会话
   */
  private static async createNewSession(userId: number, jobPosition: string, jobLevel: string) {
    try {
      const session = await InterviewSession.create({
        userId,
        jobPosition,
        jobLevel,
        status: 'preparing',
        totalQuestions: 0,
        currentQuestionIndex: 0,
        startTime: new Date(),
        analysisStatus: 'pending'
      });
      return session;
    } catch (error) {
      console.error('创建面试会话失败:', error);
      throw error;
    }
  }

  /**
   * 异步生成问题和语音
   */
  private static async generateQuestionsAsync(sessionId: number, jobPosition: string, jobLevel: string) {
    try {
      console.log(`开始为会话${sessionId}生成问题...`);
      
      // 生成问题
      const questions = await AIService.generateInterviewQuestions(jobPosition, jobLevel);
      console.log(`生成了${questions.length}个问题`);

      // 生成语音文件
      const audioUrls = await AIService.generateQuestionAudios(questions, sessionId);
      console.log(`生成了${audioUrls.length}个语音文件`);

      // 保存问题到数据库
      await this.saveQuestionsToDatabase(sessionId, questions, audioUrls);

      // 更新会话状态
      await this.updateSessionStatus(sessionId, 'in_progress', questions.length);

      console.log(`会话${sessionId}准备完成`);

    } catch (error) {
      console.error(`生成问题失败 (会话${sessionId}):`, error);
      await this.updateSessionStatus(sessionId, 'abandoned', 0);
    }
  }

  /**
   * 验证会话归属
   */
  private static async validateSessionOwnership(sessionId: number, userId: number) {
    try {
      const session = await InterviewSession.findOne({
        where: {
          id: sessionId,
          userId
        }
      });
      return session;
    } catch (error) {
      console.error('验证会话归属失败:', error);
      return null;
    }
  }

  /**
   * 获取会话问题
   */
  private static async getSessionQuestions(sessionId: number) {
    try {
      const questions = await InterviewQuestion.findAll({
        where: { sessionId },
        order: [['questionIndex', 'ASC']]
      });
      return questions;
    } catch (error) {
      console.error('获取会话问题失败:', error);
      return [];
    }
  }

  /**
   * 获取问题详情
   */
  private static async getQuestionById(questionId: number) {
    try {
      const question = await InterviewQuestion.findByPk(questionId);
      return question;
    } catch (error) {
      console.error('获取问题详情失败:', error);
      return null;
    }
  }

  /**
   * 保存回答
   */
  private static async saveAnswer(sessionId: number, questionId: number, videoUrl: string, videoFile: Express.Multer.File) {
    try {
      const answer = await InterviewAnswer.create({
        sessionId,
        questionId,
        videoUrl,
        duration: 60 // TODO: 从视频文件获取实际时长
      });
      return answer;
    } catch (error) {
      console.error('保存回答失败:', error);
      throw error;
    }
  }

  /**
   * 更新会话进度
   */
  private static async updateSessionProgress(sessionId: number, questionIndex: number) {
    try {
      await InterviewSession.update(
        { currentQuestionIndex: questionIndex + 1 },
        { where: { id: sessionId } }
      );
      console.log(`更新会话${sessionId}进度到问题${questionIndex + 1}`);
    } catch (error) {
      console.error('更新会话进度失败:', error);
    }
  }

  /**
   * 异步分析回答
   */
  private static async analyzeAnswerAsync(answerId: number, questionText: string, jobPosition: string) {
    try {
      console.log(`开始分析回答${answerId}...`);
      
      // 模拟分析过程
      setTimeout(async () => {
        const analysis = await AIService.analyzeInterviewAnswer(
          questionText,
          '这是转录的回答内容', // TODO: 实际应该从语音转文字获取
          jobPosition
        );
        
        // 保存分析结果
        await this.saveAnswerAnalysis(answerId, analysis);
        console.log(`回答${answerId}分析完成`);
      }, 5000);

    } catch (error) {
      console.error(`分析回答失败 (${answerId}):`, error);
    }
  }

  /**
   * 标记会话完成
   */
  private static async markSessionCompleted(sessionId: number) {
    try {
      await InterviewSession.update(
        { 
          status: 'completed',
          endTime: new Date(),
          analysisStatus: 'processing'
        },
        { where: { id: sessionId } }
      );
      console.log(`标记会话${sessionId}为已完成`);
    } catch (error) {
      console.error('标记会话完成失败:', error);
    }
  }

  /**
   * 异步生成综合评估
   */
  private static async generateAssessmentAsync(sessionId: number, userId: number) {
    try {
      console.log(`开始生成会话${sessionId}的综合评估...`);
      
      // 获取所有回答和分析结果
      const answers = await this.getSessionAnswersWithAnalysis(sessionId);
      const session = await this.getSessionById(sessionId);
      
      if (!session) return;

      // 生成综合评估
      const assessment = await AIService.generateCareerAssessment(
        answers.map(a => ({
          question: a.question?.questionText || '',
          answer: a.transcription || '',
          score: a.analysisScore || 0
        })),
        session.jobPosition
      );

      // 保存评估结果
      await this.saveCareerAssessment(userId, sessionId, assessment);

      // 更新会话分析状态
      await this.updateSessionAnalysisStatus(sessionId, 'completed');

      console.log(`会话${sessionId}综合评估生成完成`);

    } catch (error) {
      console.error(`生成综合评估失败 (会话${sessionId}):`, error);
      await this.updateSessionAnalysisStatus(sessionId, 'failed');
    }
  }

  // 其他辅助方法的实际实现
  private static async saveQuestionsToDatabase(sessionId: number, questions: string[], audioUrls: string[]) {
    try {
      const questionData = questions.map((text, index) => ({
        sessionId,
        questionIndex: index,
        questionText: text,
        questionAudioUrl: audioUrls[index] || null,
        questionType: 'general' as const,
        timeLimit: 120
      }));

      await InterviewQuestion.bulkCreate(questionData);
      console.log(`保存${questions.length}个问题到数据库`);
    } catch (error) {
      console.error('保存问题到数据库失败:', error);
    }
  }

  private static async updateSessionStatus(sessionId: number, status: string, totalQuestions: number) {
    try {
      await InterviewSession.update(
        { status, totalQuestions },
        { where: { id: sessionId } }
      );
      console.log(`更新会话${sessionId}状态为${status}`);
    } catch (error) {
      console.error('更新会话状态失败:', error);
    }
  }

  private static async getSessionAnswers(sessionId: number) {
    try {
      const answers = await InterviewAnswer.findAll({
        where: { sessionId }
      });
      return answers;
    } catch (error) {
      console.error('获取会话回答失败:', error);
      return [];
    }
  }

  private static async getCareerAssessment(userId: number, sessionId: number) {
    try {
      const assessment = await CareerAssessment.findOne({
        where: { userId, sessionId }
      });
      return assessment;
    } catch (error) {
      console.error('获取职场评估失败:', error);
      return null;
    }
  }

  private static async getSessionAnswersWithAnalysis(sessionId: number) {
    try {
      const answers = await InterviewAnswer.findAll({
        where: { sessionId },
        include: [{
          model: InterviewQuestion,
          as: 'question'
        }]
      });
      return answers;
    } catch (error) {
      console.error('获取带分析的回答失败:', error);
      return [];
    }
  }

  private static async saveAnswerAnalysis(answerId: number, analysis: any) {
    try {
      await InterviewAnswer.update(
        {
          analysisScore: analysis.score,
          analysisDetails: JSON.stringify(analysis.analysis),
          transcription: '模拟转录内容' // TODO: 实际语音转文字
        },
        { where: { id: answerId } }
      );
      console.log(`保存回答${answerId}的分析结果`);
    } catch (error) {
      console.error('保存分析结果失败:', error);
    }
  }

  private static async getSessionById(sessionId: number) {
    try {
      const session = await InterviewSession.findByPk(sessionId);
      return session;
    } catch (error) {
      console.error('获取会话详情失败:', error);
      return null;
    }
  }

  private static async saveCareerAssessment(userId: number, sessionId: number, assessment: any) {
    try {
      await CareerAssessment.create({
        userId,
        sessionId,
        assessmentType: 'interview_based',
        overallScore: assessment.overallScore,
        communicationScore: assessment.scores.communication,
        technicalScore: assessment.scores.technical,
        leadershipScore: assessment.scores.leadership,
        problemSolvingScore: assessment.scores.problemSolving,
        teamworkScore: assessment.scores.teamwork,
        adaptabilityScore: assessment.scores.adaptability,
        detailsData: JSON.stringify(assessment),
        recommendations: assessment.recommendations.join('\n')
      });
      console.log(`保存用户${userId}的职场评估结果`);
    } catch (error) {
      console.error('保存职场评估失败:', error);
    }
  }

  private static async updateSessionAnalysisStatus(sessionId: number, status: string) {
    try {
      await InterviewSession.update(
        { analysisStatus: status },
        { where: { id: sessionId } }
      );
      console.log(`更新会话${sessionId}分析状态为${status}`);
    } catch (error) {
      console.error('更新分析状态失败:', error);
    }
  }
} 