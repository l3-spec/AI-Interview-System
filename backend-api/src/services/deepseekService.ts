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

export interface QuestionAnswerAnalysisResult {
  relevanceScore: number; // 0-100
  completenessScore: number; // 0-100
  professionalAccuracyScore: number; // 0-100
  logicalCoherenceScore: number; // 0-100
  feedback: string; // 简短反馈
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
  private providerName: string;
  private apiKey: string;
  private apiUrl: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private isEnabled: boolean;
  /** 常规对话/分析类请求 HTTP 超时（毫秒） */
  private readonly defaultTimeoutMs: number;
  /** 整卷面试生成等长输出，易超过 30s，单独放宽 */
  private readonly longGenerationTimeoutMs: number;

  constructor() {
    this.providerName = process.env.LLM_PROVIDER || 'deepseek';

    // 支持火山引擎豆包
    if (this.providerName === 'volcengine') {
      this.apiKey = process.env.VOLCENGINE_API_KEY || '';
      this.apiUrl = process.env.VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
      this.model = process.env.VOLCENGINE_DOUBAO_MODEL || '';
    } else {
      this.apiKey = process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || '';
      this.apiUrl = process.env.LLM_API_URL || process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
      this.model = process.env.LLM_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    }

    this.maxTokens = parseInt(process.env.LLM_MAX_TOKENS || process.env.DEEPSEEK_MAX_TOKENS || process.env.VOLCENGINE_MAX_TOKENS || '2000');
    this.temperature = parseFloat(process.env.LLM_TEMPERATURE || process.env.DEEPSEEK_TEMPERATURE || process.env.VOLCENGINE_TEMPERATURE || '0.7');

    this.defaultTimeoutMs = Math.max(
      15000,
      parseInt(process.env.LLM_TIMEOUT_MS || process.env.DEEPSEEK_TIMEOUT_MS || '120000', 10)
    );
    this.longGenerationTimeoutMs = Math.max(
      this.defaultTimeoutMs,
      parseInt(process.env.LLM_LONG_TIMEOUT_MS || '180000', 10)
    );

    // 如果没有API密钥，启用模拟模式
    this.isEnabled = !!this.apiKey;

    if (!this.isEnabled) {
      console.warn(`⚠️  ${this.providerName.toUpperCase()} API Key 未配置，将使用模拟模式生成问题`);
    } else {
      console.log(`✅ ${this.providerName} API 已配置，将使用真实API生成问题`);
    }
  }

  /**
   * 系统管理端更新平台配置后刷新 DeepSeek/LLM 连接参数（非 volcengine 路径）
   */
  refreshFromPlatformConfig(config: {
    deepseekApiKey?: string;
    deepseekModel?: string;
    deepseekApiUrl?: string;
  }): void {
    if (this.providerName === 'volcengine') {
      return;
    }
    const k = (config.deepseekApiKey || '').trim();
    if (k) {
      this.apiKey = k;
      this.isEnabled = true;
      console.log('✅ DeepSeek API Key 已从平台配置刷新');
    }
    const m = (config.deepseekModel || '').trim();
    if (m) this.model = m;
    const u = (config.deepseekApiUrl || '').trim();
    if (u) this.apiUrl = u;
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

      // 调用 Deepseek API（整卷题目生成耗时常 >30s，必须用长超时，勿受 DEEPSEEK_TIMEOUT_MS=15s 等过短配置影响）
      const response = await this.callDeepseekAPI(builtPrompt, {
        timeoutMs: this.longGenerationTimeoutMs,
      });

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
   * @param options.timeoutMs 覆盖默认超时（整卷面试生成等请用更长超时，避免 Axios stream aborted）
   */
  private async callDeepseekAPI(
    prompt: string,
    options?: { timeoutMs?: number }
  ): Promise<DeepseekResponse> {
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

    const logTag = this.providerName === 'volcengine' ? '[豆包]' : '[Deepseek]';
    try {
      console.log(`${logTag} 请求报文:`, JSON.stringify(requestData, null, 2));
    } catch (error) {
      console.warn(`${logTag} 请求报文记录失败:`, error);
    }

    // 火山引擎格式：baseUrl 可能以 /api/v3 结尾，需要加上 /chat/completions
    let finalUrl = this.apiUrl;
    if (this.providerName === 'volcengine' && !finalUrl.includes('/chat/completions')) {
      finalUrl = finalUrl.replace(/\/$/, '') + '/chat/completions';
    }

    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;

    const response = await axios.post(finalUrl, requestData, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: timeoutMs,
      // 长响应时避免过早断开读端（与 timeout 配合，减少 ERR_BAD_RESPONSE / stream aborted）
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const responseData: DeepseekResponse = response.data;

    const responseContent = responseData?.choices?.[0]?.message?.content ?? '';
    try {
      console.log(`${logTag} 返回内容:`, responseContent);
      if (responseData?.usage) {
        console.log(`${logTag} Token 用量:`, responseData.usage);
      }
    } catch (error) {
      console.warn(`${logTag} 返回内容记录失败:`, error);
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
      const response = await this.callDeepseekAPI(prompt, {
        timeoutMs: this.longGenerationTimeoutMs,
      });
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
      return { opening: isFirstTime ? "您好，欢迎来到U-Talent面试系统。" : "欢迎回来，让我们继续面试。" };
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
   * 在保留考察意图的前提下，用候选人上一轮回答做轻量衔接，润色下一道「预生成」题干（1～2 句问句）
   */
  async contextualizePreparedQuestion(params: {
    jobPosition: string;
    preparedQuestion: string;
    candidateLastAnswer: string;
    candidateName?: string;
  }): Promise<string> {
    const { jobPosition, preparedQuestion, candidateLastAnswer, candidateName } = params;
    const nameHint = candidateName ? `候选人姓名：${candidateName}\n` : '';
    const prompt = `
你是一位严谨的 AI 面试官，岗位：${jobPosition}。

${nameHint}【已预生成的下一题（不可改变考察方向，不可换成无关问题）】
${preparedQuestion}

【候选人上一轮回答摘要】
${candidateLastAnswer.slice(0, 1200)}

请输出**唯一一段**新的面试提问中文文本：
- 必须与预生成题目考察同一能力点，不得偏题或换题；
- 自然承接候选人回答中的 1 个可核实信息点（公司/项目/技术栈/职责），可用「您刚才提到…」式衔接；
- 保持 1～2 句、语气专业克制；
- 不要输出分析、前缀、Markdown，不要加 [emotion:…] 标记。
`.trim();

    if (!this.isEnabled) {
      return preparedQuestion;
    }

    try {
      const response = await this.callDeepseekAPI(prompt);
      const content = (response.choices[0]?.message?.content || '').trim();
      if (content.length < 12) {
        return preparedQuestion;
      }
      return content;
    } catch (error) {
      console.error('上下文润色下一题失败:', error);
      return preparedQuestion;
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
    systemPromptOverride?: string;
  }): Promise<string> {
    const { userMessage, sessionId, context, systemPromptOverride } = params;

    if (!this.isEnabled) {
      return "感谢您的回答。请继续下一个问题。";
    }

    try {
      const jobPosition = context?.jobPosition || '该职位';
      const systemPrompt = systemPromptOverride || `你是一位专业且严格的HR面试官，正在面试${jobPosition}的候选人。

【角色定位 - 绝对禁止违反】
1. 你是面试官（提问方），候选人是应聘者（回答方）
2. 你的职责是提问和评估，绝不是回答问题或介绍自己
3. 如果候选人试图让你回答问题或介绍经验，你必须礼貌地纠正并继续面试

【面试规则】
- 根据候选人的回答，提出有针对性的追问或新问题
- 每次回复控制在2-3句话，保持对话自然流畅
- 如果回答不够深入，要求候选人举具体实例
- 如果发现明显不符，可以质疑或要求澄清

【面试结束检测】
如果候选人明确表示：
- "面试可以结束了吗"
- "还有多少问题"  
- "我答完了"
- 或其他明显的结束意图
则回复："好的，感谢您的时间。我会尽快为您生成本次面试报告，请您留意“我的”里的“简历报告”通知。"

现在，基于候选人的回答，继续面试：`;

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

  /**
   * 分析单个问答对，返回4个维度评分和反馈
   * @param question 问题文本
   * @param answer 答案文本
   * @param context 上下文信息（职位类型、要求等）
   */
  async analyzeQuestionAnswerPair(
    question: string,
    answer: string,
    context: { jobCategory?: string; jobRequirements?: string; questionType?: string }
  ): Promise<QuestionAnswerAnalysisResult> {
    // 空答案降级处理
    if (!answer || answer.trim().length === 0) {
      return {
        relevanceScore: 0,
        completenessScore: 0,
        professionalAccuracyScore: 0,
        logicalCoherenceScore: 0,
        feedback: '未回答该问题'
      };
    }

    // 模拟模式降级
    if (!this.isEnabled) {
      const randomScore = () => Math.floor(Math.random() * 40) + 60;
      return {
        relevanceScore: randomScore(),
        completenessScore: randomScore(),
        professionalAccuracyScore: randomScore(),
        logicalCoherenceScore: randomScore(),
        feedback: '回答基本符合要求，建议增加具体案例支撑'
      };
    }

    try {
      const jobCategory = context.jobCategory || '通用类';
      const systemPrompt = `你是一位专业的面试评估专家，负责评估候选人回答的质量。请严格按照以下维度对问答对进行评分，输出严格为JSON格式，不要任何其他内容。

【评分规则】
1. 相关性评分（relevanceScore：0-100）：评估答案与问题的匹配程度，完全答非所问为0，完全匹配为100
2. 完整度评分（completenessScore：0-100）：评估答案是否充分、有结构、有举例，检查是否有具体案例/数据支撑、是否有逻辑层次、字数是否合理、是否回答了所有子问题
3. 专业准确度评分（professionalAccuracyScore：0-100）：评估答案中的专业知识是否准确，针对${jobCategory}职位检查专业术语使用或方法论合理性，是否存在知识性错误
4. 逻辑连贯性评分（logicalCoherenceScore：0-100）：评估答案的逻辑是否清晰连贯，是否存在自相矛盾、逻辑跳跃，论证过程是否完整（观点→论据→结论）
5. feedback：100字以内的简短反馈，指出优缺点和改进建议

【输出格式】
{
  "relevanceScore": 数字,
  "completenessScore": 数字,
  "professionalAccuracyScore": 数字,
  "logicalCoherenceScore": 数字,
  "feedback": "反馈内容"
}`;

      const userPrompt = `问题：${question}
回答：${answer}
职位要求：${context.jobRequirements || '无特殊要求'}
请按照上述规则进行评分。`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages,
          max_tokens: 1000,
          temperature: 0.3,
          stream: false,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const content = response.data?.choices?.[0]?.message?.content || '';
      const result = JSON.parse(content) as QuestionAnswerAnalysisResult;

      // 校验分数范围
      const clampScore = (score: number) => Math.max(0, Math.min(100, score || 0));
      return {
        relevanceScore: clampScore(result.relevanceScore),
        completenessScore: clampScore(result.completenessScore),
        professionalAccuracyScore: clampScore(result.professionalAccuracyScore),
        logicalCoherenceScore: clampScore(result.logicalCoherenceScore),
        feedback: result.feedback?.trim() || '无反馈'
      };
    } catch (error: any) {
      console.error('问答对分析失败:', error.message);
      // 错误降级，返回基础评分
      return {
        relevanceScore: 50,
        completenessScore: 50,
        professionalAccuracyScore: 50,
        logicalCoherenceScore: 50,
        feedback: '系统分析异常，评分仅供参考'
      };
    }
  }

  /**
   * 通用聊天完成方法，供 qaEvaluationService 等调用
   */
  async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      response_format?: any;
      /** 覆盖默认 DeepSeek 模型，例如 QA 评估专用 model */
      model?: string;
    }
  ): Promise<string> {
    if (!this.isEnabled) {
      return '{}';
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: options?.model || this.model,
          messages,
          max_tokens: options?.maxTokens || 2000,
          temperature: options?.temperature ?? 0.7,
          stream: false,
          ...(options?.response_format ? { response_format: options.response_format } : {})
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data?.choices?.[0]?.message?.content || '{}';
    } catch (error: any) {
      console.error('chatCompletion 失败:', error.message);
      return '{}';
    }
  }
}

export const deepseekService = new DeepseekService();
