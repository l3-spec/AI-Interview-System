import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';

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
      reasoning_content?: string;
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
  /** DeepSeek 判断用户是否尚未说完，应该继续等待更多输入 */
  shouldContinueWaiting: boolean;
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

/** LLM 任务类型，用于模型路由 */
type TaskType = 'dialogue' | 'followup' | 'analysis' | 'deep_analysis' | 'question_generation' | 'summary' | 'opening' | 'closing';

export class DeepseekService {
  private providerName: string;
  private apiKey: string;
  private apiUrl: string;
  private model: string;
  private thinkingModel!: string;
  private analysisModel!: string;
  private maxTokens: number;
  private temperature: number;
  private isEnabled: boolean;
  /** 常规对话/分析类请求 HTTP 超时（毫秒） */
  private readonly defaultTimeoutMs: number;
  /** 整卷面试生成等长输出，易超过 30s，单独放宽 */
  private readonly longGenerationTimeoutMs: number;
  /** 是否为 DashScope 提供商（支持模型分层路由 + 流式） */
  private readonly isDashScope: boolean;
  /** DashScope 模型分层配置 */
  private readonly dashScopeModels: { flash: string; plus: string; pro: string; max: string };

  constructor() {
    this.providerName = process.env.LLM_PROVIDER || 'deepseek';
    this.isDashScope = this.providerName === 'dashscope';

    // 支持火山引擎豆包
    if (this.providerName === 'volcengine') {
      this.apiKey = process.env.VOLCENGINE_API_KEY || '';
      this.apiUrl = process.env.VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
      this.model = process.env.VOLCENGINE_DOUBAO_MODEL || '';
      this.dashScopeModels = { flash: '', plus: '', pro: '', max: '' };
    } else if (this.isDashScope) {
      // DashScope（阿里云百炼）OpenAI 兼容模式
      // 优先使用 PrivateLink 内网地址，回退公网地址
      this.apiKey = process.env.DASHSCOPE_API_KEY || process.env.LLM_API_KEY || '';
      this.apiUrl = process.env.DASHSCOPE_LLM_URL ||
        process.env.LLM_API_URL ||
        (process.env.DASHSCOPE_WS_URL
          ? process.env.DASHSCOPE_WS_URL.replace('api-ws/v1/realtime', 'compatible-mode/v1/chat/completions')
          : 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
      // 默认模型：flash（最快，适合对话）
      this.model = process.env.LLM_MODEL || process.env.DASHSCOPE_FLASH_MODEL || 'qwen3.6-flash-2026-04-16';
      this.thinkingModel = process.env.DASHSCOPE_PRO_MODEL || 'qwen3-pro';
      this.analysisModel = process.env.DASHSCOPE_PLUS_MODEL || this.model;
      // 模型分层配置（可通过环境变量覆盖各层级）
      this.dashScopeModels = {
        flash: process.env.DASHSCOPE_FLASH_MODEL || 'qwen3.6-flash-2026-04-16',
        plus: process.env.DASHSCOPE_PLUS_MODEL || 'qwen3.6-plus-2026-04-02',
        pro: process.env.DASHSCOPE_PRO_MODEL || 'qwen3-pro',
        max: process.env.DASHSCOPE_MAX_MODEL || 'qwen3-max',
      };
      console.log(`✅ DashScope LLM 已配置 (兼容模式), 内网=${this.apiUrl.includes('vpc') || this.apiUrl.includes('privatelink')}, 默认模型=${this.model}`);
    } else {
      this.apiKey = process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || '';
      this.apiUrl = process.env.LLM_API_URL || process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
      this.model = process.env.LLM_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
      this.thinkingModel = process.env.DEEPSEEK_THINKING_MODEL || 'deepseek-v4-pro';
      // 分析模型统一使用 deepseek-v4-flash（与生成模型一致，降低延迟和成本）
      this.analysisModel = process.env.DEEPSEEK_ANALYSIS_MODEL || this.model;
      this.dashScopeModels = { flash: '', plus: '', pro: '', max: '' };
    }
    
    this.maxTokens = parseInt(process.env.LLM_MAX_TOKENS || process.env.DEEPSEEK_MAX_TOKENS || process.env.VOLCENGINE_MAX_TOKENS || '4096');
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

  // ==================== 模型分层路由 ====================

  /**
   * 根据任务类型自动选择合适的模型。
   * 
   * 路由策略（DashScope 下生效，非 DashScope 使用默认模型）：
   * - dialogue / followup / opening / closing → flash（最快，适合实时对话）
   * - analysis → plus（中等，适合即时分析）
   * - deep_analysis → pro（高质量分析）
   * - question_generation / summary → pro（复杂生成任务）
   * 
   * 可通过环境变量覆盖各层级：
   *   DASHSCOPE_FLASH_MODEL / DASHSCOPE_PLUS_MODEL / DASHSCOPE_PRO_MODEL / DASHSCOPE_MAX_MODEL
   */
  private selectModel(task: TaskType): string {
    if (!this.isDashScope) {
      return this.model; // 非 DashScope 使用默认模型
    }

    switch (task) {
      case 'dialogue':
      case 'followup':
      case 'opening':
      case 'closing':
        return this.dashScopeModels.flash;

      case 'analysis':
        return this.dashScopeModels.plus;

      case 'deep_analysis':
        return this.dashScopeModels.pro;

      case 'question_generation':
      case 'summary':
        return this.dashScopeModels.pro;

      default:
        return this.dashScopeModels.flash;
    }
  }

  // ==================== 流式聊天完成 ====================

  /**
   * 流式聊天完成（async generator）。
   * 通过 SSE 逐 token 产出内容，适用于需要边生成边下发的场景（如 TTS 实时合成）。
   * 
   * 使用方式：
   *   for await (const token of this.chatCompletionStream(messages, options)) {
   *     // 逐 token 发送到 TTS
   *   }
   */
  private async *chatCompletionStream(
    messages: any[],
    options: {
      temperature?: number;
      maxTokens?: number;
      /** 覆盖默认模型 */
      model?: string;
      taskType?: TaskType;
      timeoutMs?: number;
    } = {}
  ): AsyncGenerator<string, void, undefined> {
    if (!this.isEnabled) {
      yield '抱歉，AI 服务暂未启用。';
      return;
    }

    const model = options.model || this.selectModel(options.taskType || 'dialogue');
    const requestData: any = {
      model,
      messages,
      max_tokens: options.maxTokens || Math.min(this.maxTokens, 1024),
      temperature: options.temperature ?? this.temperature,
      stream: true,
      stream_options: { include_usage: false },
    };

    // DashScope 流式也禁用 thinking，避免推理链阻塞 token 产出
    if (this.isDashScope) {
      requestData.enable_thinking = false;
    }

    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const logTag = this.isDashScope ? '[DashScope]' : `[${this.providerName}]`;

    try {
      console.log(`${logTag} 流式请求: model=${model}, maxTokens=${requestData.max_tokens}`);

      const response = await axios.post(this.apiUrl, requestData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        timeout: timeoutMs,
        responseType: 'stream',
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        // 保留最后一个不完整的行
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (delta) {
              yield delta;
            }
          } catch {
            // 跳过解析失败的行（如注释行）
          }
        }
      }
    } catch (error: any) {
      console.error(`${logTag} 流式请求失败:`, error.message);
      yield '抱歉，生成回复时出现了问题。请再说一遍。';
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

      // 调用 Deepseek API（整卷题目生成耗时常 >30s，必须用长超时，勿受 DEEPSEEK_TIMEOUT_MS=15s 等过短配置影响）
      const response = await this.callDeepseekAPI(builtPrompt, {
        taskType: 'question_generation',
        timeoutMs: this.longGenerationTimeoutMs,
      });

      // 解析返回的问题（不再截断，由 DeepSeek 自行决定题目数量）
      const questions = this.parseQuestionsFromResponse(response.choices[0].message.content);

      console.log(`成功生成 ${questions.length} 个面试问题`);
      this.auditPrompt(builtPrompt, questions, {
        mode: 'api',
        jobTarget,
        jobCategory,
        jobSubCategory,
        questionCount: questions.length,
      });

      return {
        questions: questions,
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
   * @param options.taskType DashScope 模型分层路由类型（非 DashScope 忽略）
   * @param options.timeoutMs 覆盖默认超时（整卷面试生成等请用更长超时，避免 Axios stream aborted）
   */
  private async callDeepseekAPI(
    prompt: string,
    options?: { taskType?: TaskType; timeoutMs?: number; isThinking?: boolean; reasoningEffort?: 'high' | 'max'; maxTokens?: number }
  ): Promise<DeepseekResponse> {
    const isThinking = options?.isThinking ?? false;
    const model = options?.taskType
      ? this.selectModel(options.taskType)
      : (isThinking ? this.thinkingModel : this.model);

    const requestData: any = {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: options?.maxTokens || this.maxTokens,
      temperature: isThinking ? undefined : this.temperature,
      stream: false,
    };

    // DashScope：非思考模式下显式禁用 reasoning，避免 Qwen3 自动产生超长思维链（耗时 30s+）
    if (this.isDashScope && !isThinking) {
      requestData.enable_thinking = false;
    }

    if (isThinking) {
      requestData.extra_body = {
        thinking: {
          type: "enabled"
        }
      };
      if (options?.reasoningEffort) {
        requestData.reasoning_effort = options.reasoningEffort;
      }
    }

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
    const reasoningContent = responseData?.choices?.[0]?.message?.reasoning_content ?? '';
    
    try {
      if (reasoningContent) {
        const summary = reasoningContent.length > 200
          ? reasoningContent.substring(0, 200) + '...[截断]'
          : reasoningContent;
        console.log(`${logTag} 推理摘要:`, summary);
      }
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
   * 生成首题（开场白 + 第一道面试题）— 基于完整画像由 LLM 自行生成
   */
  async generateFirstQuestion(params: {
    name: string;
    targetJob: string;
    companyTarget?: string;
    background?: string;
    candidateProfile?: string;
  }): Promise<{ content: string }> {
    const { name, targetJob, companyTarget, background, candidateProfile } = params;
    const companyText = companyTarget ? `\n- 目标公司/企业：${companyTarget}` : '';
    
    // 判断是否是应届/无经验候选人
    const isFresh = /应届|毕业生|在读|无.*经验|零基础|新人/.test(background || '');
    
    // 完整画像文本
    const profileSection = candidateProfile
      ? `\n【候选人完整画像——请基于以下信息自然生成称呼和开场白】\n${candidateProfile}\n`
      : '';

    const prompt = `作为一位专业、公正且严肃的AI面试官（10年资深HR总监形象），请基于候选人的背景信息，生成面试的开场白与首个提问：

${profileSection}
- 目标职位：${targetJob}${companyText}
- 背景：${background || '未指定'}${isFresh ? '（注意：该候选人为应届毕业生或无相关工作经验，请避免询问过往工作经历）' : ''}

请生成包含以下内容的面试开场：
1. 开场介绍与首个提问（1个问题，基于候选人画像信息生成一段自然且亲切的面试问候，同时包含第一个正式面试提问）
${isFresh ? '2. 首个提问应侧重在校项目、课程设计、实习经历、学习能力等，严禁问"过去工作中""上一份工作""过往的项目经验"等工作经验类问题' : '2. 如有候选人画像信息，可在提问中自然地引用其经历或所在地区'}
3. 根据性别信息使用正确称呼，不要用"先生/女士"模糊表达；如果姓名只有一个字，结合性别称"X先生"或"X女士"

【重要】请用 [emotion:opening] 标记语气，用于 TTS 情感合成：
- [emotion:opening] — 开场问候与首个提问

示例格式（称呼会因候选人画像而不同）：
${isFresh 
  ? `"[emotion:opening]林先生您好，欢迎参加${companyTarget || ''}${targetJob}的面试。我是您的面试官，很开心与您深入交流。首先，请您介绍一下在校期间最有代表性的课题项目或实习经历。"`
  : `"[emotion:opening]林先生您好，欢迎参加${companyTarget || ''}${targetJob}的面试。我是您的面试官，很开心与您深入交流。首先，请您结合自身的最突出的工作亮点，谈谈您为什么觉得自己是这个岗位的最佳人选？"`}

请直接输出开场白和首题，不要包含预期考察点、评分标准等评估字段。
请用中文回答，保持专业严肃但不失礼貌的面试官语气。`.trim();

    try {
      const response = await this.callDeepseekAPI(prompt, {
        taskType: 'opening',
        timeoutMs: 60_000, // 首题超时较短（60秒）
        maxTokens: 1024,
      });
      const content = response.choices[0]?.message?.content || '';
      return { content };
    } catch (error) {
      console.error('生成首题失败:', error);
      // 降级到默认首题
      return { content: `[emotion:opening]${name}您好，欢迎参加${targetJob}的面试。请先简单介绍一下您自己，包括您的教育背景和工作经历。` };
    }
  }

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
        maxTokens: this.maxTokens,
      });
      const content = response.choices[0]?.message?.content || '';
      return { content };
    } catch (error) {
      console.error('生成面试内容失败:', error);
      return { content: "生成面试内容失败，请重试。" };
    }
  }

  /**
   * 生成开场白（基于完整候选人画像，由 LLM 自行生成自然称呼）
   */
  async generateOpening(
    userInfo: { name: string; targetJob: string; candidateProfile?: string },
    isFirstTime: boolean
  ): Promise<OpeningResult> {
    const profileSection = userInfo.candidateProfile
      ? `\n【候选人完整画像——请基于以下信息自然生成称呼和开场白】\n${userInfo.candidateProfile}\n`
      : '';

    const prompt = `你是一位专业的AI面试官。请基于候选人的背景信息，生成一段简短、亲切且专业的开场白。

${profileSection}
- 场景：${isFirstTime ? '第一次进入面试' : '面试中断后重新进入'}

要求：
1. ${isFirstTime ? '包含欢迎致辞、自我介绍（我是您的AI面试官）、简要说明面试流程（约15-20分钟，分为信息确认和正式面试两部分）。' : '包含欢迎回来致辞，鼓励候选人继续完成面试。'}
2. 语气专业、亲切、自然。
3. 根据性别信息使用正确称呼（先生/女士），不要用"先生/女士"这种不确定的模糊表达。
4. 如果姓名只有一个字（可能只是姓氏），结合性别信息自然地称呼（如"林先生"）。
5. 如果有地区、学历、经验等信息，在开场白中自然地提及，让候选人感到被重视。
6. 长度控制在100字以内。
7. 请直接输出开场白内容，不要包含任何其他文字。`.trim();

    if (!this.isEnabled) {
      return { opening: isFirstTime ? `${userInfo.name || '候选人'}您好，欢迎来到U-Talent面试系统。` : "欢迎回来，让我们继续面试。" };
    }

    try {
      const response = await this.callDeepseekAPI(prompt, { taskType: 'opening' });
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
        shouldContinueWaiting: false,
        strengths: ["逻辑清晰", "表达流畅"],
        weaknesses: ["缺乏具体案例"],
        suggestions: ["多结合实际项目经验来阐述"]
      };
    }

    try {
      const messages = [
        {
          role: 'system',
          content: `你是一位专业的面试评估专家。请分析面试问答并以JSON格式返回结果。
要求输出必须是合法的JSON对象，包含以下字段：
- score: 数字 (0-100)
- feedback: 字符串，对回答的简短评价
- needsFollowup: 布尔值，是否需要进一步追问
- shouldContinueWaiting: 布尔值，用户是否明显尚未说完（回答是半截话、不完整句子、包含"嗯…让我想想"/"第一个是…"/"还有…"等未完信号），若为true则暂不追问也暂不推进题目
- strengths: 字符串数组，回答的优点
- weaknesses: 字符串数组，回答的不足
- suggestions: 字符串数组，改进建议

shouldContinueWaiting 判定规则（重要）：
1. 回答以"然后…""还有…""另外…""第二个…""接下来…"等未完连接词结尾 → true
2. 回答明显是列举式开头但尚未完整展开（如只说"第一点…"而未见第二点）→ true
3. 回答总字数少于15字且无明显结束语气 → true
4. 回答已自然收尾（"就是这样""差不多这些""基本就这些"）→ false
5. 回答已完整阐述且自行停止 → false`
        },
        { role: 'user', content: prompt }
      ];

      const isThinking = false; // 统一使用 flash 模型，禁用思维链
      const content = await this.chatCompletion(messages, {
        response_format: { type: 'json_object' },
        isThinking: isThinking,
        model: this.analysisModel,
        taskType: 'analysis',
        reasoning_effort: undefined
      });

      // 尝试解析JSON
      try {
        // 提取JSON部分（如果DeepSeek还是返回了Markdown代码块，尽管请求了json_object）
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0].replace(/```json|```/g, '') : content;

        const result = JSON.parse(jsonStr);
        return {
          score: typeof result.score === 'number' ? result.score : 70,
          feedback: result.feedback || '回答已收到',
          needsFollowup: !!result.needsFollowup,
          shouldContinueWaiting: !!result.shouldContinueWaiting,
          strengths: Array.isArray(result.strengths) ? result.strengths : [],
          weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
          suggestions: Array.isArray(result.suggestions) ? result.suggestions : []
        };
      } catch (e) {
        console.warn('解析分析结果JSON失败，尝试文本解析:', e);
        // 简单的文本解析回退
        const looksLikeFollowup = content.includes("追问") || content.includes("深入") || content.includes("细节");
        return {
          score: 70,
          feedback: content.slice(0, 200),
          needsFollowup: looksLikeFollowup,
          shouldContinueWaiting: false,
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
        shouldContinueWaiting: false,
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
      const response = await this.callDeepseekAPI(prompt, { taskType: 'followup' });
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
      const response = await this.callDeepseekAPI(prompt, { taskType: 'followup' });
      const rawContent = (response.choices[0]?.message?.content || '').trim();
      
      // 剥离常见前缀标签："追问：" "追问:" "追问." "追问 " "追问-" 等
      let cleaned = rawContent
        .replace(/^追问[：:.s\-—]+/u, '')
        .replace(/^追[：:.s\-—]+/u, '')
        .trim();
      
      // 如果清洗后为空，回退到原始内容
      if (!cleaned) {
        cleaned = rawContent;
      }
      
      return { question: cleaned };
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
      const response = await this.callDeepseekAPI(prompt, { taskType: 'summary' });
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
      const response = await this.callDeepseekAPI(prompt, { taskType: 'closing' });
      const content = response.choices[0]?.message?.content || '';
      return { closing: content.trim() };
    } catch (error) {
      console.error('生成结束语失败:', error);
      return { closing: "面试结束，谢谢。" };
    }
  }

  /**
   * 生成对话回复（用于实时语音交互）。
   * DashScope 下使用流式输出，边生成边返回 token，配合 TTS 实现更低的首字延迟。
   * 
   * @returns 完整回复文本
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
      const background = context?.background || '';
      const bgInfo = background && background !== '未指定' ? `\n【候选人背景】${background}\n- 所有提问必须严格匹配候选人背景` : '';
      
      const systemPrompt = systemPromptOverride || `你是一位专业且严格的HR面试官，正在面试${jobPosition}的候选人。${bgInfo}

【角色定位 - 绝对禁止违反】
1. 你是面试官（提问方），候选人是应聘者（回答方）
2. 你的职责是提问和评估，绝不是回答问题或介绍自己
3. 如果候选人试图让你回答问题或介绍经验，你必须礼貌地纠正并继续面试

【称呼规范】
- 直接称呼候选人姓名，禁止使用"先生/女士"模糊称呼

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
则回复："好的，感谢您的时间。我会尽快为您生成本次面试报告，请您留意"我的"里的"简历报告"通知。"

现在，基于候选人的回答，继续面试：`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ];

      const logTag = this.isDashScope ? '[DashScope]' : '[Deepseek]';

      if (this.isDashScope) {
        // DashScope 流式输出：逐 token 返回，配合 TTS 边生成边合成
        console.log(`${logTag} generateResponse 使用流式模式 (flash)`);
        let fullContent = '';
        for await (const token of this.chatCompletionStream(messages, {
          taskType: 'dialogue',
          temperature: 0.7,
          maxTokens: 500,
          timeoutMs: 30000,
        })) {
          fullContent += token;
        }
        return fullContent.trim() || "抱歉，我没有听清楚。请再说一遍。";
      }

      // 非 DashScope：传统非流式调用
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
      const logTag = this.isDashScope ? '[DashScope]' : '[Deepseek]';
      console.error(`${logTag} 生成回复失败:`, error.message);
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
          model: this.isDashScope ? this.selectModel('deep_analysis') : this.model,
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
   * 多轮对话模式：基于完整对话历史，一次性返回分析结果 + 下一步决策 + 下一条消息
   * 
   * 替代原来的三阶段独立调用（analyzeResponse → generateFollowup → contextualizePreparedQuestion），
   * 让 LLM 拥有完整上下文记忆，使追问和题目衔接更自然。
   */
  async conductInterviewTurn(params: {
    /** 完整对话历史（按时间顺序，含 system prompt + 所有既往问答 + 本轮候选人回答） */
    conversationHistory: Array<{ role: string; content: string }>;
    /** 当前问题文本（仅用于日志） */
    currentQuestion: string;
    /** 候选人本轮回答 */
    userResponse: string;
    /** 截至本轮的追问次数 */
    followupCount: number;
    /** 目标职位 */
    jobPosition: string;
    /** 候选人背景（应届/社招/经验年限等，用于约束提问方向） */
    candidateBackground?: string;
    /** 待问的预生成下一题（用于决定是否需要上下文润色） */
    pendingNextQuestion?: string;
  }): Promise<{
    analysis: AnalysisResult;
    decision: 'follow_up' | 'next_question' | 'end';
    nextMessage?: string;
    isContextualFollowup?: boolean;
  }> {
    const { conversationHistory, currentQuestion, userResponse, followupCount, jobPosition, pendingNextQuestion, candidateBackground } = params;

    if (!this.isEnabled) {
      return {
        analysis: {
          score: 75,
          feedback: '回答已收到（模拟模式）',
          needsFollowup: false,
          shouldContinueWaiting: false,
          strengths: ['表达清晰'],
          weaknesses: ['可增加具体案例'],
          suggestions: ['建议结合项目经验阐述']
        },
        decision: 'next_question',
        nextMessage: pendingNextQuestion || '请继续下一个问题。',
        isContextualFollowup: false,
      };
    }

    // 构建 system prompt：面试官角色 + 决策规则
    const bgInfo = candidateBackground && candidateBackground !== '未指定' ? candidateBackground : '未提供';
    const systemPrompt = `你是一位专业且严格的AI面试官（10年资深HR总监形象），正在面试${jobPosition}的候选人。

【候选人背景 - 必须严格遵循】
该候选人的背景是：${bgInfo}
- 所有提问和追问必须与候选人背景严格匹配，绝不允许脱离背景提问
- 若候选人为应届毕业生/无经验者，严禁询问过往工作经验、上一份工作、项目中取得的业绩成果等社招类问题
- 对于应届生，应聚焦在校课题项目、实习经历、课程设计、学习能力和成长潜力
- 若候选人有工作经验，则可深挖项目细节和可量化的业绩成果
- 若有候选人所在地区、学历、技能等信息，可在追问时自然地引用

【称呼规范 - 绝对禁止违反】
- 必须直接称呼候选人的姓名，禁止使用"先生/女士"这种模糊称呼
- 若候选人姓名为单字（如"林"），可说"林同学"或直接称呼其全名

【你的身份——绝对禁止违反】
1. 你是面试官（提问方），候选人是应聘者（回答方）
2. 你的职责是评估候选人回答并推进面试流程
3. 你绝不能以候选人身份回答问题、介绍自己或模拟候选人的回答

【你的任务】
分析候选人刚才的回答，并做出以下决策之一：
1. follow_up — 回答不够深入/偏离主题/需举例 → 生成一句简短自然的追问（≤40字）
2. next_question — 回答已充分 → 推进到下一个主题
3. end — 面试已自然完成或候选人明确表示结束 → 生成结束语

【分析维度（内部评估，不输出给候选人）】
- completeness：完整性、深度
- relevance：是否切题
- logic：逻辑清晰度
- professionalism：专业水平

【追问规则】
- 每个主题最多追问${followupCount >= 2 ? '0次（已达上限）' : `${2 - followupCount}次`}
- 追问要自然承接候选人的回答，可用「您刚才提到…」
${followupCount >= 2 ? '- 已达追问上限，请直接推进到下一题' : ''}

${pendingNextQuestion ? `【预生成的下一题（作为参考，可上下文润色）】
${pendingNextQuestion}` : `【下一题提示】
需要你根据当前对话进程，自然提出下一个面试问题。问题应承接上文、考察新维度。`}

【判定标准】
- shouldContinueWaiting=true：回答明显是半截话，以"然后…""还有…""第一个是…"等未完连接词结尾，或总字数<15且无结束语气

【输出格式（严格JSON，不要Markdown包裹）】
{
  "score": 0-100,
  "feedback": "1-2句话的简短分析",
  "needsFollowup": true/false,
  "shouldContinueWaiting": true/false,
  "strengths": ["优点"],
  "weaknesses": ["不足"],
  "suggestions": ["改进建议"],
  "decision": "follow_up" | "next_question" | "end",
  "nextMessage": "追问问题 / 下一个面试问题 / 结束语"
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role as any, content: m.content })),
    ];

    try {
      const logTag = this.isDashScope ? '[DashScope]' : '[Deepseek]';
      
      let content: string;
      if (this.isDashScope) {
        // DashScope 流式模式：收集完整 token 流后解析 JSON
        // 虽不能边生成边下发 TTS（因为需要先解析 JSON），但流式可大幅降低首 token 延迟
        console.log(`${logTag} conductInterviewTurn 使用流式模式 (${this.selectModel('dialogue')})`);
        let fullContent = '';
        for await (const token of this.chatCompletionStream(messages, {
          taskType: 'dialogue',
          temperature: 0.3,
          maxTokens: 1500,
          timeoutMs: this.defaultTimeoutMs,
        })) {
          fullContent += token;
        }
        content = fullContent;
      } else {
        // 非 DashScope：传统非流式调用
        content = await this.chatCompletion(messages, {
          response_format: { type: 'json_object' },
          model: this.analysisModel,
          isThinking: false,
          maxTokens: 1500,
        });
      }

      // 解析 JSON
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0].replace(/```json|```/g, '') : content;
      const result = JSON.parse(jsonStr);

      return {
        analysis: {
          score: typeof result.score === 'number' ? result.score : 70,
          feedback: result.feedback || '回答已收到',
          needsFollowup: !!result.needsFollowup,
          shouldContinueWaiting: !!result.shouldContinueWaiting,
          strengths: Array.isArray(result.strengths) ? result.strengths : [],
          weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
          suggestions: Array.isArray(result.suggestions) ? result.suggestions : []
        },
        decision: ['follow_up', 'next_question', 'end'].includes(result.decision) ? result.decision : 'next_question',
        nextMessage: typeof result.nextMessage === 'string' ? result.nextMessage : undefined,
        isContextualFollowup: true,
      };
    } catch (error: any) {
      console.error('[Deepseek] conductInterviewTurn 失败:', error.message);
      throw error;
    }
  }

  /**
   * 流式对话生成（纯文本，不含分析 JSON）。
   * 配合 TTS 实现边生成边合成：每个 token 通过 async generator 产出，
   * 调用方可逐 token 发送到 qwen3TTSClient.synthesize(sessionId, token, false)。
   * 
   * 使用场景：
   * - 开场白、结束语、简单追问等无需结构化分析的对话
   * - 与 conductInterviewTurn 配合：本方法产出对话文本（流式→TTS），
   *   conductInterviewTurn 负责分析（可并行或异步）
   * 
   * 使用方式：
   *   for await (const token of deepseekService.generateDialogueStream(messages)) {
   *     qwen3TTSClient.synthesize(sessionId, token, false);
   *   }
   *   qwen3TTSClient.synthesize(sessionId, '', true); // 提交
   */
  async *generateDialogueStream(
    messages: Array<{ role: string; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      timeoutMs?: number;
    } = {}
  ): AsyncGenerator<string, string, undefined> {
    if (!this.isEnabled) {
      yield '感谢您的回答。请继续下一个问题。';
      return '感谢您的回答。请继续下一个问题。';
    }

    const logTag = this.isDashScope ? '[DashScope]' : `[${this.providerName}]`;
    console.log(`${logTag} generateDialogueStream 开始流式生成 (${this.selectModel('dialogue')})`);

    let fullText = '';
    try {
      for await (const token of this.chatCompletionStream(messages, {
        taskType: 'dialogue',
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 500,
        timeoutMs: options.timeoutMs ?? 30000,
      })) {
        fullText += token;
        yield token;
      }
    } catch (error: any) {
      console.error(`${logTag} generateDialogueStream 失败:`, error.message);
      const fallback = '抱歉，我没有听清楚。请再说一遍。';
      yield fallback;
      return fallback;
    }

    return fullText.trim();
  }

  /**
   * 语义完整性检查：快速判断候选人的回答是否已完成。
   * 
   * 用于替代固定时长的 VAD 冷却窗口，通过 LLM 理解内容来判断
   * "用户是说完了还是在思考中"，避免抢话题。
   * 
   * 使用 flash 模型（最快），限定 50 token，目标 <1s 延迟。
   */
  async checkSemanticCompleteness(text: string, questionContext?: string): Promise<{
    isComplete: boolean;
    reason: string;
  }> {
    if (!this.isEnabled) {
      // 未启用时，基于长度简单判断：>20字大概率完整
      return { isComplete: text.length > 20, reason: '基于长度判断' };
    }

    const qContext = questionContext ? `\n面试题目：${questionContext.substring(0, 100)}` : '';
    const prompt = `仅判断以下面试回答是否"语义完整"（即候选人已表达完一个完整观点），不要做其他分析。

回答: "${text.substring(0, 300)}"${qContext}

只输出JSON: {"isComplete": true/false, "reason": "简短理由"}`;

    try {
      const content = await this.chatCompletion(
        [
          { role: 'system', content: '你是一个快速语义完整性检测器。只输出JSON。' },
          { role: 'user', content: prompt },
        ],
        {
          taskType: 'dialogue', // 用 flash 模型，最快
          temperature: 0,
          maxTokens: 50,
        }
      );

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          isComplete: result.isComplete !== false,
          reason: result.reason || 'LLM判断',
        };
      }
    } catch (error: any) {
      console.warn('[DashScope] 语义完整性检查失败，默认放行:', error.message);
    }

    // 降级：基于长度和标点判断
    const hasEndingPunctuation = /[。！？\.\!\?]$/.test(text.trim());
    const isLongEnough = text.length > 50;
    return {
      isComplete: hasEndingPunctuation && isLongEnough,
      reason: '降级规则判断',
    };
  }

  /**
   * 轻量快速分析（仅评分 + 决策，不生成对话文本）。
   * 与 generateDialogueStream 配合使用：对话文本流式产出后，
   * 用此方法异步完成分析评分（不阻塞音频播放）。
   * 
   * @returns 简化的分析结果（无 nextMessage 字段）
   */
  async quickAnalyze(params: {
    conversationHistory: Array<{ role: string; content: string }>;
    jobPosition: string;
    followupCount: number;
    /** 候选人背景（应届/社招等），用于约束决策方向 */
    candidateBackground?: string;
    pendingNextQuestion?: string;
  }): Promise<{
    score: number;
    feedback: string;
    needsFollowup: boolean;
    shouldContinueWaiting: boolean;
    decision: 'follow_up' | 'next_question' | 'end';
  }> {
    if (!this.isEnabled) {
      return {
        score: 75,
        feedback: '回答已收到',
        needsFollowup: false,
        shouldContinueWaiting: false,
        decision: 'next_question',
      };
    }

    const { conversationHistory, jobPosition, followupCount, pendingNextQuestion, candidateBackground } = params;

    const bgInfo = candidateBackground && candidateBackground !== '未指定' ? candidateBackground : '未提供';
    const systemPrompt = `你是一位专业的AI面试官，正在面试${jobPosition}的候选人。

【候选人背景】${bgInfo}

【任务】仅分析候选人刚才的回答质量，做出推进决策。
【输出格式】严格JSON，不要Markdown：
{
  "score": 0-100,
  "feedback": "1-2句话简短分析",
  "needsFollowup": true/false,
  "shouldContinueWaiting": true/false,
  "decision": "follow_up" | "next_question" | "end"
}

【规则】
- needsFollowup: 回答不够深入/需举例/偏离岗位要求
- shouldContinueWaiting: 回答明显未说完（半截话、<15字且无结束语气）
- 追问上限：${followupCount >= 2 ? 0 : 2 - followupCount}次
- 若候选人为应届毕业生，评估时侧重学习能力和潜力，而非工作经验
- decision=end: 仅当候选人明确表示"想结束面试"或所有题目已答完时才用，绝不要因为回答质量差就结束面试
- decision=next_question: 默认选择，回答已足够推进到下一题
- decision=follow_up: 回答不够深入需要追问时使用
${pendingNextQuestion ? `- 预生成下一题作为参考：${pendingNextQuestion}` : ''}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role as any, content: m.content })),
    ];

    try {
      const content = await this.chatCompletion(messages, {
        taskType: 'analysis',
        response_format: { type: 'json_object' },
        temperature: 0.2,
        maxTokens: 500,
      });

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const result = JSON.parse(jsonStr);

      return {
        score: typeof result.score === 'number' ? result.score : 70,
        feedback: result.feedback || '回答已收到',
        needsFollowup: !!result.needsFollowup,
        shouldContinueWaiting: !!result.shouldContinueWaiting,
        decision: ['follow_up', 'next_question', 'end'].includes(result.decision) ? result.decision : 'next_question',
      };
    } catch (error: any) {
      console.error('[Deepseek] quickAnalyze 失败:', error.message);
      return {
        score: 60,
        feedback: '分析异常',
        needsFollowup: false,
        shouldContinueWaiting: false,
        decision: 'next_question',
      };
    }
  }

  /**
   * 通用聊天完成方法
   */
  async chatCompletion(
    messages: any[],
    options: {
      temperature?: number;
      maxTokens?: number;
      response_format?: any;
      /** 覆盖默认模型 */
      model?: string;
      /** DashScope 任务类型（非 DashScope 忽略） */
      taskType?: TaskType;
      isThinking?: boolean;
      reasoning_effort?: 'high' | 'max';
    } = {}
  ): Promise<string> {
    if (!this.isEnabled) {
      return '{}';
    }

    try {
      const isThinking = options.isThinking ?? false;
      const model = options.model
        || (options.taskType ? this.selectModel(options.taskType) : undefined)
        || (isThinking ? this.thinkingModel : this.model);

      const requestData: any = {
        model,
        messages,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: isThinking ? undefined : (options.temperature ?? this.temperature),
        response_format: options.response_format,
        stream: false,
      };

      // DashScope：非思考模式下显式禁用 reasoning，避免 Qwen3 自动产生超长思维链（耗时 30s+）
      if (this.isDashScope && !isThinking) {
        requestData.enable_thinking = false;
      }

      if (isThinking) {
        requestData.extra_body = {
          thinking: {
            type: "enabled"
          }
        };
        if (options.reasoning_effort) {
          requestData.reasoning_effort = options.reasoning_effort;
        }
      }

      const response = await axios.post(this.apiUrl, requestData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: this.defaultTimeoutMs,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const choice = response.data?.choices?.[0]?.message;
      if (choice?.reasoning_content) {
        // 仅输出前 200 字的摘要，避免超长思维链阻塞日志 I/O
        const summary = choice.reasoning_content.length > 200
          ? choice.reasoning_content.substring(0, 200) + '...[截断]'
          : choice.reasoning_content;
        console.log(`[DashScope] 推理摘要: ${summary}`);
      }
      return choice?.content || '{}';
    } catch (error: any) {
      console.error('chatCompletion 失败:', error.message);
      return '{}';
    }
  }
}

export const deepseekService = new DeepseekService();
