import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Deepseek AI 服务
 * 负责调用 Deepseek 大模型生成面试问题
 */

interface DeepseekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AnalysisResult {
  score: number;
  feedback: string;
  needsFollowup: boolean;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface OpeningResult {
  opening: string;
}

export interface ClosingResult {
  closing: string;
}

interface JobTemplate {
  id: string;
  jobTitle: string;
  category: string;
  level: string;
  promptTemplate: string;
  questionCount: number;
}

export class DeepseekService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private isEnabled: boolean;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    this.maxTokens = parseInt(process.env.DEEPSEEK_MAX_TOKENS || '2000');
    this.temperature = parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.7');

    // 如果没有API密钥，启用模拟模式
    this.isEnabled = !!this.apiKey;

    if (!this.isEnabled) {
      console.warn('⚠️  DEEPSEEK_API_KEY 未配置，将使用模拟模式生成问题');
    } else {
      console.log('✅ Deepseek API 已配置，将使用真实API生成问题');
    }
  }

  /**
   * 获取职位模板
   */
  async getJobTemplate(jobTarget: string): Promise<JobTemplate | null> {
    try {
      // 首先尝试精确匹配
      let template = await prisma.jobInterviewTemplate.findFirst({
        where: {
          jobTitle: {
            contains: jobTarget,
          },
          isActive: true,
        },
      });

      // 如果没有找到，尝试分类匹配
      if (!template) {
        const category = this.categorizeJob(jobTarget);
        template = await prisma.jobInterviewTemplate.findFirst({
          where: {
            category: category,
            isActive: true,
          },
        });
      }

      return template as JobTemplate | null;
    } catch (error) {
      console.error('获取职位模板失败:', error);
      return null;
    }
  }

  private auditPrompt(prompt: string, questions: string[], metadata: Record<string, unknown>): void {
    try {
      const baseDir = process.env.AI_AUDIT_LOG_DIR || path.join(process.cwd(), 'logs');
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
      const logPath = path.join(baseDir, 'deepseek_audit.log');
      const entry = {
        timestamp: new Date().toISOString(),
        prompt,
        questions,
        ...metadata,
      };
      fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', { encoding: 'utf-8' });
    } catch (error) {
      console.error('写入Bias审计日志失败:', error);
    }
  }

  /**
   * 职位分类
   */
  private categorizeJob(jobTarget: string): string {
    const techKeywords = ['开发', '程序员', '工程师', '技术', 'java', 'python', 'javascript', 'php', '前端', '后端', '全栈'];
    const managementKeywords = ['经理', '主管', '总监', '领导', '管理'];
    const salesKeywords = ['销售', '业务', '客户', '市场'];
    const designKeywords = ['设计', 'UI', 'UX', '美工', '视觉'];
    const hrKeywords = ['人事', 'HR', '招聘', '行政'];

    const lowerJobTarget = jobTarget.toLowerCase();

    if (techKeywords.some(keyword => lowerJobTarget.includes(keyword))) {
      return '技术类';
    } else if (managementKeywords.some(keyword => lowerJobTarget.includes(keyword))) {
      return '管理类';
    } else if (salesKeywords.some(keyword => lowerJobTarget.includes(keyword))) {
      return '销售类';
    } else if (designKeywords.some(keyword => lowerJobTarget.includes(keyword))) {
      return '设计类';
    } else if (hrKeywords.some(keyword => lowerJobTarget.includes(keyword))) {
      return 'HR类';
    }

    return '通用类';
  }

  /**
   * 生成面试问题
   */
  async generateInterviewQuestions(params: {
    jobTarget: string;
    companyTarget?: string;
    background?: string;
    questionCount?: number;
    jobCategory?: string;
    jobSubCategory?: string;
    personaInstruction?: string;
    estimatedDurationMinutes?: number;
  }): Promise<{ questions: string[]; prompt: string }> {
    const {
      jobTarget,
      companyTarget,
      background,
      questionCount = 5,
      jobCategory,
      jobSubCategory,
      personaInstruction,
      estimatedDurationMinutes,
    } = params;

    let promptTemplate = this.getDefaultPromptTemplate();
    let builtPrompt = '';

    try {
      // 获取职位模板
      const template = await this.getJobTemplate(jobTarget);
      if (template) {
        promptTemplate = template.promptTemplate;
      }

      // 构建提示词
      builtPrompt = this.buildPrompt({
        promptTemplate,
        jobTarget,
        companyTarget,
        background,
        questionCount,
        jobCategory,
        jobSubCategory,
        personaInstruction,
        estimatedDurationMinutes,
      });

      // 如果API未启用，直接返回备用问题
      if (!this.isEnabled) {
        console.log('使用模拟模式生成面试问题...');
        const fallbackQuestions = this.getFallbackQuestions(jobTarget, questionCount);
        this.auditPrompt(builtPrompt, fallbackQuestions, {
          mode: 'mock',
          jobTarget,
          jobCategory,
          jobSubCategory,
          questionCount: fallbackQuestions.length,
        });
        return {
          questions: fallbackQuestions,
          prompt: builtPrompt,
        };
      }

      // 调用 Deepseek API
      const response = await this.callDeepseekAPI(builtPrompt);

      // 解析返回的问题
      const questions = this.parseQuestionsFromResponse(response.choices[0].message.content);
      const trimmedQuestions = questions.slice(0, questionCount);

      console.log(`成功生成 ${trimmedQuestions.length} 个面试问题`);
      this.auditPrompt(builtPrompt, trimmedQuestions, {
        mode: 'api',
        jobTarget,
        jobCategory,
        jobSubCategory,
        questionCount: trimmedQuestions.length,
      });

      return {
        questions: trimmedQuestions,
        prompt: builtPrompt,
      };

    } catch (error) {
      console.error('生成面试问题失败:', error);

      // 如果 API 调用失败，返回备用问题
      console.log('API调用失败，使用备用问题...');
      if (!builtPrompt) {
        builtPrompt = this.buildPrompt({
          promptTemplate,
          jobTarget,
          companyTarget,
          background,
          questionCount,
          jobCategory,
          jobSubCategory,
          personaInstruction,
          estimatedDurationMinutes,
        });
      }

      const fallbackQuestions = this.getFallbackQuestions(jobTarget, questionCount);
      this.auditPrompt(builtPrompt, fallbackQuestions, {
        mode: 'fallback',
        jobTarget,
        jobCategory,
        jobSubCategory,
        questionCount: fallbackQuestions.length,
        error: error instanceof Error ? error.message : 'unknown',
      });
      return {
        questions: fallbackQuestions,
        prompt: builtPrompt,
      };
    }
  }

  /**
   * 构建提示词
   */
  private buildPrompt(params: {
    promptTemplate: string;
    jobTarget: string;
    companyTarget?: string;
    background?: string;
    questionCount: number;
    jobCategory?: string;
    jobSubCategory?: string;
    personaInstruction?: string;
    estimatedDurationMinutes?: number;
  }): string {
    const {
      promptTemplate,
      jobTarget,
      companyTarget,
      background,
      questionCount,
      jobCategory,
      jobSubCategory,
      personaInstruction,
      estimatedDurationMinutes,
    } = params;

    let prompt = promptTemplate
      .replace(/{jobTarget}/g, jobTarget)
      .replace(/{questionCount}/g, questionCount.toString());

    if (companyTarget) {
      prompt = prompt.replace(/{companyTarget}/g, companyTarget);
    } else {
      prompt = prompt.replace(/{companyTarget}/g, '目标公司');
    }

    if (background) {
      prompt = prompt.replace(/{background}/g, background);
    } else {
      prompt = prompt.replace(/{background}/g, '相关经验');
    }

    const persona = personaInstruction
      ? personaInstruction.trim()
      : this.buildVeteranPersona({ jobTarget, jobCategory, jobSubCategory });

    const durationHint = this.buildDurationHint(questionCount, estimatedDurationMinutes);

    return [
      persona,
      prompt,
      '请以行业老炮的视角提出问题，结合真实工作细节与踩坑经验。',
      durationHint,
      '请以中文输出，按顺序列出问题，每行一个问题。',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private buildVeteranPersona(params: {
    jobTarget: string;
    jobCategory?: string;
    jobSubCategory?: string;
  }): string {
    const { jobTarget, jobCategory, jobSubCategory } = params;

    const categoryText = jobCategory ? `${jobCategory}领域` : '该行业';
    const focusRole = jobSubCategory ? `${jobSubCategory}岗位` : jobTarget;

    return `你是一位在${categoryText}深耕超过10年的资深面试官，被候选人称为行业“老炮”。你熟悉${focusRole}的核心能力模型、真实业务挑战与团队协作细节，请以这种身份来设计面试问题。`;
  }

  private buildDurationHint(questionCount: number, estimatedDurationMinutes?: number): string {
    if (estimatedDurationMinutes) {
      const min = Math.max(10, Math.round(estimatedDurationMinutes - 2));
      const max = Math.round(estimatedDurationMinutes + 2);
      return `请确保整套问题能够支撑约${min}-${max}分钟的数字人面试流程，平均每题2-3分钟，符合15-20分钟的面试节奏。`;
    }

    const baseline = Math.max(15, Math.round(questionCount * 3));
    const upper = baseline + 3;
    return `请确保整套问题能够支撑约${baseline}-${upper}分钟的数字人面试流程，平均每题2-3分钟。`;
  }

  /**
   * 调用 Deepseek API
   */
  private async callDeepseekAPI(prompt: string): Promise<DeepseekResponse> {
    const requestData = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      stream: false,
    };

    try {
      console.log('[Deepseek] 请求报文:', JSON.stringify(requestData, null, 2));
    } catch (error) {
      console.warn('[Deepseek] 请求报文记录失败:', error);
    }

    const response = await axios.post(this.apiUrl, requestData, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30秒超时
    });

    const responseData: DeepseekResponse = response.data;

    const responseContent = responseData?.choices?.[0]?.message?.content ?? '';
    try {
      console.log('[Deepseek] 返回内容:', responseContent);
      if (responseData?.usage) {
        console.log('[Deepseek] Token 用量:', responseData.usage);
      }
    } catch (error) {
      console.warn('[Deepseek] 返回内容记录失败:', error);
    }

    return responseData;
  }

  /**
   * 从响应中解析问题
   */
  private parseQuestionsFromResponse(content: string): string[] {
    // 移除可能的序号和多余的空行
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const questions: string[] = [];

    for (const line of lines) {
      // 移除序号标记（如 1. 2. Q1: 等）
      const cleanedLine = line
        .replace(/^\d+\.\s*/, '')  // 移除 "1. "
        .replace(/^Q\d+[:：]\s*/, '') // 移除 "Q1: "
        .replace(/^问题\d+[:：]\s*/, '') // 移除 "问题1："
        .trim();

      if (cleanedLine.length > 10 && cleanedLine.includes('？') || cleanedLine.includes('?')) {
        questions.push(cleanedLine);
      }
    }

    return questions;
  }

  /**
   * 获取默认提示词模板
   */
  private getDefaultPromptTemplate(): string {
    return `
你是一个专业的HR面试官，现在需要为应聘 {jobTarget} 职位的求职者设计面试问题。

请生成 {questionCount} 个专业且具有真实感的面试问题，要求：
1. 每个问题都要有适当的背景描述，让问题更自然、更有情境感
2. 问题应该涵盖技能评估、工作经验、解决问题能力、团队协作等多个维度
3. 问题要具体、实用，能够有效评估候选人的能力
4. 考虑到这是AI面试，问题应该适合口头回答
5. 每个问题都要以问号结尾
6. 问题应该循序渐进，从基础到深入
7. 在问题前增加适当的背景铺垫，例如："在现代企业发展中..."、"随着行业技术不断进步..."、"为了更好地应对市场挑战..."等

候选人背景：{background}
目标公司：{companyTarget}

问题格式示例：
"随着数字化转型的深入推进，现代企业对技术人才的要求越来越高。请简单介绍一下您自己，以及您认为自己在{jobTarget}这个职位上有哪些核心竞争力？"

请直接输出问题列表，每行一个问题：
    `.trim();
  }

  /**
   * 获取备用问题（API调用失败时使用）
   */
  private getFallbackQuestions(jobTarget: string, questionCount: number): string[] {
    const enhancedQuestions = [
      `在当今竞争激烈的就业市场中，每个人都有自己独特的职业故事。请简单介绍一下您自己，以及为什么想要应聘${jobTarget}这个职位？`,
      `在职场发展过程中，每个人都会逐渐发现自己的核心优势。请谈谈您认为自己最大的优势是什么，以及这个优势如何帮助您在${jobTarget}这个岗位上取得成功？`,
      `随着科技发展和市场变化，各个行业都在经历着深刻的变革。您如何看待当前这个行业的发展前景，以及您认为未来几年会有哪些重要的发展趋势？`,
      `在工作和学习过程中，我们都会遇到各种挑战和困难，这些经历往往能体现一个人的解决问题能力。请描述一个您印象深刻的挑战经历，以及您是如何分析和解决这个问题的？`,
      `对于职业发展，每个人都应该有清晰的规划和目标。请谈谈您的职业规划是什么，特别是未来3-5年您希望在专业技能和职位发展方面达到什么样的目标？`,
      `在团队协作中，意见分歧是很常见的现象，如何处理这些分歧往往体现一个人的沟通协调能力。当您与同事或上级意见不一致时，您通常会采用什么方法来处理和解决？`,
      `工作环境对个人的发挥和成长有着重要影响，不同的人适合不同的工作氛围。您认为什么样的工作环境和团队氛围最能发挥您的潜力，让您感到工作有意义和成就感？`,
      `团队协作是现代工作中不可或缺的能力，无论是跨部门合作还是项目团队配合。请结合具体案例，谈谈您在团队协作方面的经验，以及您在团队中通常扮演什么样的角色？`,
      `在快速变化的时代，持续学习和技能更新变得越来越重要，这也是保持职业竞争力的关键。您是如何保持专业技能的更新和学习的，有什么具体的学习计划或方法吗？`,
      `面试是一个双向了解的过程，我们希望候选人也能充分了解职位和公司情况。基于您对这个职位和我们公司的了解，您还有什么想深入了解的问题，或者有什么疑虑需要我们解答的吗？`,
    ];

    return enhancedQuestions.slice(0, questionCount);
  }

  /**
   * 创建或更新职位模板
   */
  async createJobTemplate(templateData: {
    jobTitle: string;
    category: string;
    level: string;
    promptTemplate: string;
    questionCount?: number;
    keywords?: string[];
  }): Promise<void> {
    try {
      console.log('创建职位模板:', templateData.jobTitle);

      await prisma.jobInterviewTemplate.create({
        data: {
          jobTitle: templateData.jobTitle,
          category: templateData.category,
          level: templateData.level,
          promptTemplate: templateData.promptTemplate,
          questionCount: templateData.questionCount || 5,
          keywords: templateData.keywords ? JSON.stringify(templateData.keywords) : null,
        },
      });

      console.log(`创建职位模板成功: ${templateData.jobTitle}`);
    } catch (error) {
      console.error('创建职位模板失败:', error);
      throw error;
    }
  }

  /**
   * 生成面试内容 (Placeholder)
   */
  /**
   * 生成面试内容
   */
  async generateInterview(prompt: string): Promise<{ content: string }> {
    if (!this.isEnabled) {
      return { content: "这是一个模拟的面试内容。请问您对这份工作有什么期待？" };
    }

    try {
      const response = await this.callDeepseekAPI(prompt);
      const content = response.choices[0]?.message?.content || '';
      return { content };
    } catch (error) {
      console.error('生成面试内容失败:', error);
      return { content: "生成面试内容失败，请重试。" };
    }
  }

  /**
   * 生成开场白
   */
  async generateOpening(userInfo: { name: string; targetJob: string }, isFirstTime: boolean): Promise<OpeningResult> {
    const prompt = `
你是一位专业的AI面试官。请为候选人生成一段简短、亲切且专业的开场白。

候选人信息：
- 姓名：${userInfo.name}
- 目标职位：${userInfo.targetJob}
- 场景：${isFirstTime ? '第一次进入面试' : '面试中断后重新进入'}

要求：
1. ${isFirstTime ? '包含欢迎致辞、自我介绍（我是您的AI面试官）、简要说明面试流程（约15-20分钟，分为信息确认和正式面试两部分）。' : '包含欢迎回来致辞，鼓励候选人继续完成面试。'}
2. 语气专业、亲切、自然。
3. 长度控制在100字以内。
4. 请直接输出开场白内容，不要包含任何其他文字。
    `.trim();

    if (!this.isEnabled) {
      return { opening: isFirstTime ? "您好，欢迎来到AI面试系统。" : "欢迎回来，让我们继续面试。" };
    }

    try {
      const response = await this.callDeepseekAPI(prompt);
      const content = response.choices[0]?.message?.content || '';
      return { opening: content.trim() };
    } catch (error) {
      console.error('生成开场白失败:', error);
      return { opening: "您好，欢迎参加面试。" };
    }
  }

  /**
   * 分析用户回答
   */
  async analyzeResponse(prompt: string): Promise<AnalysisResult> {
    if (!this.isEnabled) {
      return {
        score: 80,
        feedback: "回答完整，逻辑清晰。",
        needsFollowup: false,
        strengths: ["逻辑清晰", "表达流畅"],
        weaknesses: ["缺乏具体案例"],
        suggestions: ["多结合实际项目经验来阐述"]
      };
    }

    try {
      const response = await this.callDeepseekAPI(prompt);
      const content = response.choices[0]?.message?.content || '';

      // 尝试解析JSON
      try {
        // 提取JSON部分（如果DeepSeek返回了Markdown代码块）
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0].replace(/```json|```/g, '') : content;

        const result = JSON.parse(jsonStr);
        return {
          score: result.score || 0,
          feedback: result.feedback || '',
          needsFollowup: result.needsFollowup || false,
          strengths: result.strengths || [],
          weaknesses: result.weaknesses || [],
          suggestions: result.suggestions || []
        };
      } catch (e) {
        console.warn('解析分析结果JSON失败，尝试文本解析:', e);
        // 简单的文本解析回退
        return {
          score: 70,
          feedback: content.slice(0, 100),
          needsFollowup: content.includes("追问") || content.includes("深入"),
          strengths: [],
          weaknesses: [],
          suggestions: []
        };
      }
    } catch (error) {
      console.error('分析回答失败:', error);
      return {
        score: 0,
        feedback: "分析失败",
        needsFollowup: false,
        strengths: [],
        weaknesses: [],
        suggestions: []
      };
    }
  }

  /**
   * 生成追问问题
   */
  async generateFollowup(prompt: string): Promise<{ question: string }> {
    if (!this.isEnabled) {
      return { question: "您刚才提到了...，能详细说明一下您是如何实现它的吗？" };
    }

    try {
      const response = await this.callDeepseekAPI(prompt);
      const content = response.choices[0]?.message?.content || '';
      return { question: content.trim() };
    } catch (error) {
      console.error('生成追问失败:', error);
      return { question: "能请您多谈谈这方面的细节吗？" };
    }
  }

  /**
   * 生成面试总结
   */
  async generateSummary(prompt: string): Promise<{ summary: string }> {
    if (!this.isEnabled) {
      return { summary: "候选人表现良好，对技术有扎实理解，但需加强项目经验的阐述。" };
    }

    try {
      const response = await this.callDeepseekAPI(prompt);
      const content = response.choices[0]?.message?.content || '';
      return { summary: content.trim() };
    } catch (error) {
      console.error('生成总结失败:', error);
      return { summary: "面试已结束，感谢您的参与。" };
    }
  }

  /**
   * 生成结束语
   */
  async generateClosing(summary: string): Promise<ClosingResult> {
    const prompt = `
你是一位专业的AI面试官。面试已经结束，请根据以下面试总结为候选人生成一段结束语。

面试总结：${summary}

要求：
1. 感谢候选人的时间。
2. 简要提及面试表现（基于总结，保持积极鼓励的基调）。
3. 说明后续流程（评估报告生成中，请留意通知）。
4. 语气专业、温暖。
5. 长度控制在100字以内。
6. 请直接输出结束语内容。
    `.trim();

    if (!this.isEnabled) {
      return { closing: "感谢您的参与，面试结束。详细报告将稍后生成。" };
    }

    try {
      const response = await this.callDeepseekAPI(prompt);
      const content = response.choices[0]?.message?.content || '';
      return { closing: content.trim() };
    } catch (error) {
      console.error('生成结束语失败:', error);
      return { closing: "面试结束，谢谢。" };
    }
  }

  /**
   * 生成对话回复（用于实时语音交互）
   */
  async generateResponse(params: {
    userMessage: string;
    sessionId: string;
    context?: {
      userId?: string;
      jobPosition?: string;
      background?: string;
    };
  }): Promise<string> {
    const { userMessage, sessionId, context } = params;

    if (!this.isEnabled) {
      // 模拟模式
      return "感谢您的回答。请继续下一个问题。";
    }

    try {
      // 构建对话提示词
      const systemPrompt = context?.jobPosition
        ? `你是一位专业的面试官，正在面试${context.jobPosition}职位的候选人。请用简短、自然的语言进行对话，每次回复2-3句话即可。`
        : `你是一位专业的面试官。请用简短、自然的语言进行对话，每次回复2-3句话即可。`;

      const messages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ];

      const response = await axios.post(this.apiUrl, {
        model: this.model,
        messages,
        max_tokens: 500,
        temperature: 0.7,
        stream: false,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      const content = response.data?.choices?.[0]?.message?.content || '';
      return content.trim();

    } catch (error: any) {
      console.error('DeepSeek生成回复失败:', error.message);
      return "抱歉，我没有听清楚。请再说一遍。";
    }
  }
}

export const deepseekService = new DeepseekService(); 
