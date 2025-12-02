import { Request, Response } from 'express';
import { deepseekService } from '../services/deepseekService';

/**
 * 面试规划控制器
 * 根据用户输入生成定制化的面试问题
 */

interface InterviewPlanRequest {
  jobTarget: string;
  userBackground: string;
  experienceLevel?: string;
  skills?: string[];
  companyTarget?: string;
  questionCount?: number;
}

interface InterviewPlanResponse {
  success: boolean;
  data: {
    jobTarget: string;
    focusAreas: string[];
    totalQuestions: number;
    estimatedDuration: number;
    questions: string[];
    userBackground: string;
    experienceLevel: string;
    skills: string[];
    createdAt: string;
  };
  message?: string;
}

export class InterviewPlanController {
  /**
   * 生成面试计划
   */
  async generateInterviewPlan(req: Request, res: Response) {
    try {
      const {
        jobTarget,
        userBackground,
        experienceLevel = '中级',
        skills = [],
        companyTarget,
        questionCount = 8
      }: InterviewPlanRequest = req.body;

      // 参数验证
      if (!jobTarget || !userBackground) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数：jobTarget 和 userBackground 不能为空'
        });
      }

      console.log('🎯 收到面试规划请求:', {
        jobTarget,
        userBackground: userBackground.substring(0, 100) + '...',
        experienceLevel,
        skills: skills.join(', '),
        companyTarget,
        questionCount
      });

      // 调用 Deepseek 生成面试问题
      const generationResult = await deepseekService.generateInterviewQuestions({
        jobTarget,
        companyTarget,
        background: userBackground,
        questionCount
      });

      const questions = generationResult.questions;

      // 根据经验级别调整问题
      const adjustedQuestions = this.adjustQuestionsByLevel(questions, experienceLevel);

      // 根据技能定制问题
      const skillBasedQuestions = this.addSkillBasedQuestions(adjustedQuestions, skills);

      // 确定面试重点
      const focusAreas = this.determineFocusAreas(jobTarget, experienceLevel, skills);

      // 计算预计时长（每个问题平均3-4分钟）
      const estimatedDuration = Math.ceil(skillBasedQuestions.length * 3.5);

      const response: InterviewPlanResponse = {
        success: true,
        data: {
          jobTarget,
          focusAreas,
          totalQuestions: skillBasedQuestions.length,
          estimatedDuration,
          questions: skillBasedQuestions,
          userBackground,
          experienceLevel,
          skills,
          createdAt: new Date().toISOString()
        }
      };

      console.log('✅ 面试计划生成成功:', {
        questionCount: skillBasedQuestions.length,
        estimatedDuration,
        focusAreas
      });

      res.json(response);

    } catch (error) {
      console.error('❌ 生成面试计划失败:', error);
      
      res.status(500).json({
        success: false,
        message: '生成面试计划失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 根据经验级别调整问题
   */
  private adjustQuestionsByLevel(questions: string[], experienceLevel: string): string[] {
    const levelKeywords = {
      '初级': ['基础', '入门', '了解', '掌握', '熟悉'],
      '中级': ['熟练', '应用', '实践', '经验', '项目'],
      '高级': ['深入', '架构', '设计', '优化', '管理', '领导']
    };

    const keywords = levelKeywords[experienceLevel as keyof typeof levelKeywords] || levelKeywords['中级'];
    
    return questions.map(question => {
      // 根据经验级别调整问题表述
      let adjustedQuestion = question;
      
      if (experienceLevel === '初级') {
        adjustedQuestion = question.replace(/深入|高级|复杂/g, '基础');
      } else if (experienceLevel === '高级') {
        adjustedQuestion = question.replace(/基础|入门|简单/g, '深入');
      }
      
      return adjustedQuestion;
    });
  }

  /**
   * 根据技能添加定制问题
   */
  private addSkillBasedQuestions(questions: string[], skills: string[]): string[] {
    if (skills.length === 0) return questions;

    const skillQuestions = skills.slice(0, 2).map(skill => {
      return `基于您在${skill}方面的专业技能，请分享一个具体的应用案例，说明您如何利用这项技能解决实际问题？`;
    });

    // 将技能相关问题插入到现有问题中
    const midIndex = Math.floor(questions.length / 2);
    return [
      ...questions.slice(0, midIndex),
      ...skillQuestions,
      ...questions.slice(midIndex)
    ];
  }

  /**
   * 确定面试重点
   */
  private determineFocusAreas(jobTarget: string, experienceLevel: string, skills: string[]): string[] {
    const focusAreas = [];

    // 通用重点
    focusAreas.push('技术能力评估');
    focusAreas.push('沟通表达能力');
    focusAreas.push('团队协作');

    // 根据职位定制
    const jobTargetLower = jobTarget.toLowerCase();
    
    if (jobTargetLower.includes('java') || jobTargetLower.includes('python') || jobTargetLower.includes('前端')) {
      focusAreas.push('编程能力');
      focusAreas.push('系统设计');
    }
    
    if (jobTargetLower.includes('管理') || jobTargetLower.includes('主管')) {
      focusAreas.push('管理能力');
      focusAreas.push('决策能力');
    }
    
    if (jobTargetLower.includes('销售') || jobTargetLower.includes('市场')) {
      focusAreas.push('销售技巧');
      focusAreas.push('客户关系');
    }

    // 根据经验级别调整
    if (experienceLevel === '初级') {
      focusAreas.push('学习能力');
      focusAreas.push('潜力评估');
    } else if (experienceLevel === '高级') {
      focusAreas.push('战略思维');
      focusAreas.push('领导力');
    }

    return Array.from(new Set(focusAreas)); // 去重
  }

  /**
   * 获取面试计划模板
   */
  async getInterviewTemplates(req: Request, res: Response) {
    try {
      const { category } = req.query;

      const templates = await deepseekService.getJobTemplate('');

      res.json({
        success: true,
        data: templates,
        message: '获取模板成功'
      });

    } catch (error) {
      console.error('获取面试模板失败:', error);
      res.status(500).json({
        success: false,
        message: '获取面试模板失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 验证面试计划参数
   */
  validateInterviewPlan(req: Request, res: Response, next: Function) {
    const { jobTarget, userBackground, questionCount = 8 } = req.body;

    // 验证必填字段
    if (!jobTarget || typeof jobTarget !== 'string' || jobTarget.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '职位目标不能为空且必须是有效字符串'
      });
    }

    if (!userBackground || typeof userBackground !== 'string' || userBackground.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '用户背景不能为空且必须是有效字符串'
      });
    }

    // 验证问题数量
    const count = parseInt(questionCount as string);
    if (isNaN(count) || count < 3 || count > 15) {
      return res.status(400).json({
        success: false,
        message: '问题数量必须在3-15之间'
      });
    }

    // 验证经验级别
    const validLevels = ['初级', '中级', '高级', '专家'];
    if (req.body.experienceLevel && !validLevels.includes(req.body.experienceLevel)) {
      return res.status(400).json({
        success: false,
        message: '经验级别必须是：初级、中级、高级或专家'
      });
    }

    next();
  }
}

export const interviewPlanController = new InterviewPlanController();
