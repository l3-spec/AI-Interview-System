import { Request, Response } from 'express';
import { interviewFlowService } from '../services/interviewFlowService';
import { InterviewRequest, UserResponseRequest } from '../models/interviewFlow';

export class InterviewFlowController {
  /**
   * 开始面试流程 - 第一阶段：用户信息收集
   */
  async startInterview(req: Request, res: Response): Promise<void> {
    try {
      const { userId, userName, isFirstTime } = req.body as InterviewRequest;

      if (!userId || !userName) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'userId和userName是必填参数'
          }
        });
        return;
      }

      const sessionId = await interviewFlowService.startIntroductionPhase(
        userId,
        userName,
        isFirstTime
      );

      res.json({
        success: true,
        data: {
          sessionId,
          state: 'introduction',
          message: isFirstTime ? '正在介绍面试流程' : '欢迎回来！正在准备面试',
          nextAction: 'collect_user_info'
        }
      });
    } catch (error) {
      console.error('开始面试失败:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'START_INTERVIEW_ERROR',
          message: error instanceof Error ? error.message : '启动面试失败'
        }
      });
    }
  }

  /**
   * 收集用户信息
   */
  async collectUserInfo(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { targetJob, background, experience, skills } = req.body;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'sessionId是必填参数'
          }
        });
        return;
      }

      const userInfo = await interviewFlowService.collectUserInfo(sessionId, {
        targetJob,
        background,
        experience,
        skills
      });

      res.json({
        success: true,
        data: {
          userInfo,
          state: 'generating',
          message: '正在生成个性化面试内容...',
          nextAction: 'generate_interview'
        }
      });
    } catch (error) {
      console.error('收集用户信息失败:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'COLLECT_INFO_ERROR',
          message: error instanceof Error ? error.message : '收集信息失败'
        }
      });
    }
  }

  /**
   * 开始面试第二阶段：AI生成内容
   */
  async startInterviewPhase(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'sessionId是必填参数'
          }
        });
        return;
      }

      const result = await interviewFlowService.startInterviewPhase(sessionId);

      res.json({
        success: true,
        data: {
          sessionId,
          state: 'ready',
          totalRounds: result.totalRounds,
          firstQuestion: result.firstQuestion,
          message: '面试内容已生成，准备开始',
          nextAction: 'start_first_round'
        }
      });
    } catch (error) {
      console.error('开始面试阶段失败:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'START_PHASE_ERROR',
          message: error instanceof Error ? error.message : '启动面试阶段失败'
        }
      });
    }
  }

  /**
   * 开始下一轮面试
   */
  async startNextRound(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const nextRound = await interviewFlowService.startNextRound(sessionId);

      if (!nextRound) {
        // 面试已完成
        const summary = await interviewFlowService.endInterview(sessionId);
        res.json({
          success: true,
          data: {
            sessionId,
            state: 'completed',
            message: '面试已完成',
            summary: summary.summary,
            isCompleted: true
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          sessionId,
          state: 'in_progress',
          currentRound: nextRound.roundNumber,
          question: nextRound.question,
          expectedPoints: nextRound.expectedPoints,
          suggestedTime: nextRound.suggestedTime,
          audioUrl: nextRound.audioUrl,
          message: '开始新一轮面试',
          isCompleted: false
        }
      });
    } catch (error) {
      console.error('开始下一轮失败:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'NEXT_ROUND_ERROR',
          message: error instanceof Error ? error.message : '开始下一轮失败'
        }
      });
    }
  }

  /**
   * 处理用户回答
   */
  async processUserResponse(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { response, audioUrl, duration } = req.body as UserResponseRequest;

      if (!sessionId || !response) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'sessionId和response是必填参数'
          }
        });
        return;
      }

      const result = await interviewFlowService.processUserResponse(sessionId, response);

      res.json({
        success: true,
        data: {
          sessionId,
          isCompleted: result.isCompleted,
          nextRound: result.nextRound,
          feedback: result.feedback,
          score: result.score,
          message: result.isCompleted ? '面试已完成' : '回答已接收，准备下一轮'
        }
      });
    } catch (error) {
      console.error('处理用户回答失败:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PROCESS_RESPONSE_ERROR',
          message: error instanceof Error ? error.message : '处理回答失败'
        }
      });
    }
  }

  /**
   * 结束面试
   */
  async endInterview(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const summary = await interviewFlowService.endInterview(sessionId);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('结束面试失败:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'END_INTERVIEW_ERROR',
          message: error instanceof Error ? error.message : '结束面试失败'
        }
      });
    }
  }

  /**
   * 获取会话状态
   */
  async getSessionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const session = interviewFlowService.getSession(sessionId);

      if (!session) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: '会话不存在'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('获取会话状态失败:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_STATUS_ERROR',
          message: error instanceof Error ? error.message : '获取状态失败'
        }
      });
    }
  }

  /**
   * 获取所有会话
   */
  async getAllSessions(req: Request, res: Response): Promise<void> {
    try {
      const sessions = interviewFlowService.getAllSessions();

      res.json({
        success: true,
        data: {
          sessions,
          total: sessions.length
        }
      });
    } catch (error) {
      console.error('获取会话列表失败:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_SESSIONS_ERROR',
          message: error instanceof Error ? error.message : '获取会话列表失败'
        }
      });
    }
  }

  /**
   * 跳过当前问题
   */
  async skipQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const session = interviewFlowService.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: '会话不存在'
          }
        });
        return;
      }

      const currentRound = session.rounds.find(r => r.status === 'in_progress');
      if (currentRound) {
        currentRound.status = 'skipped';
      }

      const nextRound = await interviewFlowService.startNextRound(sessionId);

      res.json({
        success: true,
        data: {
          nextRound,
          isCompleted: !nextRound
        }
      });
    } catch (error) {
      console.error('跳过问题失败:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SKIP_QUESTION_ERROR',
          message: error instanceof Error ? error.message : '跳过问题失败'
        }
      });
    }
  }
}

export const interviewFlowController = new InterviewFlowController();