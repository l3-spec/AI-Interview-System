import axios from 'axios';

/**
 * 火山引擎豆包大模型服务
 * 用于AI面试官的对话生成
 */

interface DoubaoMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DoubaoChoice {
  index: number;
  message: DoubaoMessage;
  finish_reason: string;
}

interface DoubaoUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface DoubaoResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: DoubaoChoice[];
  usage?: DoubaoUsage;
}

export class VolcengineDoubaoService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private isEnabled: boolean;
  private temperature: number;
  private maxTokens: number;

  constructor() {
    this.apiKey = process.env.VOLCENGINE_API_KEY || '';
    this.baseUrl = process.env.VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
    this.model = process.env.VOLCENGINE_DOUBAO_MODEL || 'ep-20241234567890-abcde';
    this.temperature = parseFloat(process.env.VOLCENGINE_TEMPERATURE || '0.7');
    this.maxTokens = parseInt(process.env.VOLCENGINE_MAX_TOKENS || '2000');

    this.isEnabled = !!this.apiKey;

    if (!this.isEnabled) {
      console.warn('⚠️ 火山引擎豆包API Key未配置，将使用模拟模式');
    } else {
      console.log(`✅ 火山引擎豆包服务已配置，模型: ${this.model}`);
    }
  }

  /**
   * 调用豆包大模型进行对话
   */
  async chatCompletion(params: {
    messages: DoubaoMessage[];
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }): Promise<DoubaoResponse> {
    const { messages, temperature = this.temperature, maxTokens = this.maxTokens, stream = false } = params;

    if (!this.isEnabled) {
      return this.mockResponse(messages);
    }

    try {
      const requestData = {
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream,
      };

      console.log('[豆包] 请求报文:', JSON.stringify(requestData, null, 2));

      const response = await axios.post(`${this.baseUrl}/chat/completions`, requestData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      });

      const responseData: DoubaoResponse = response.data;
      const responseContent = responseData?.choices?.[0]?.message?.content ?? '';

      console.log('[豆包] 返回内容:', responseContent);
      if (responseData?.usage) {
        console.log('[豆包] Token 用量:', responseData.usage);
      }

      return responseData;
    } catch (error: any) {
      console.error('[豆包] API调用失败:', error.message);
      console.error('[豆包] 错误详情:', error.response?.data || error);

      // 降级到模拟模式
      console.log('[豆包] 降级到模拟模式');
      return this.mockResponse(messages);
    }
  }

  /**
   * 生成模拟响应（API不可用时使用）
   */
  private mockResponse(messages: DoubaoMessage[]): DoubaoResponse {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';

    let mockContent = '感谢您的回答，我们继续下一个问题。';

    if (lastUserMessage.includes('介绍') || lastUserMessage.includes('你好')) {
      mockContent = '您好，欢迎参加本次面试。我是今天的AI面试官，我们将进行约15-20分钟的面试。首先，请简单介绍一下您自己。';
    } else if (lastUserMessage.includes('结束') || lastUserMessage.includes('谢谢')) {
      mockContent = '好的，感谢您的参与。面试到此结束，我们会尽快为您生成面试报告，请留意通知。';
    } else if (lastUserMessage.length > 50) {
      mockContent = '很好，感谢您的详细分享。接下来，想了解一下您在项目中遇到的最大挑战是什么？您是如何解决的？';
    } else {
      mockContent = '了解了。能否举一个具体的例子，说明您在实际工作中是如何应用这些技能的？';
    }

    return {
      id: `mock-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: this.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: mockContent,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  /**
   * 生成面试开场白
   */
  async generateOpening(params: {
    userName: string;
    jobPosition: string;
    companyName?: string;
  }): Promise<string> {
    const { userName, jobPosition, companyName = '贵公司' } = params;

    const systemPrompt = `你是一位专业、亲切的AI面试官。请为候选人生成一段自然的开场白。

要求：
1. 欢迎候选人参加${jobPosition}职位的面试
2. 简要介绍面试流程（约15-20分钟，包括自我介绍、专业问题、反问环节）
3. 语气友好、专业，让候选人放松
4. 控制在100字以内
5. 直接输出开场白内容`;

    const messages: DoubaoMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `候选人姓名：${userName}，目标职位：${jobPosition}，目标公司：${companyName}` },
    ];

    const response = await this.chatCompletion({ messages, maxTokens: 300 });
    return response.choices[0].message.content;
  }

  /**
   * 生成面试问题
   */
  async generateQuestion(params: {
    jobPosition: string;
    jobCategory?: string;
    userBackground?: string;
    questionIndex: number;
    totalQuestions: number;
    previousContext?: string;
  }): Promise<string> {
    const { jobPosition, jobCategory = '技术类', userBackground = '有相关工作经验', questionIndex, totalQuestions, previousContext = '' } = params;

    const systemPrompt = `你是一位在${jobCategory}领域有10年经验的资深面试官。

当前是第${questionIndex}/${totalQuestions}个问题。

要求：
1. 根据候选人背景提出有针对性的问题
2. 问题要具体、实用，能考察真实能力
3. 每次只提一个问题
4. 问题要自然，有适当的背景铺垫
5. 适合口头回答
6. 直接输出问题内容`;

    const contextPrompt = previousContext
      ? `之前的对话内容：\n${previousContext}\n\n请基于以上上下文，提出下一个面试问题。`
      : '';

    const messages: DoubaoMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `目标职位：${jobPosition}\n候选人背景：${userBackground}\n${contextPrompt}` },
    ];

    const response = await this.chatCompletion({ messages, maxTokens: 500 });
    return response.choices[0].message.content;
  }

  /**
   * 分析回答并生成反馈
   */
  async analyzeAnswer(params: {
    question: string;
    answer: string;
    jobPosition: string;
  }): Promise<{
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    needsFollowup: boolean;
  }> {
    const { question, answer, jobPosition } = params;

    const systemPrompt = `你是一位专业的面试官。请分析候选人的回答，并按JSON格式返回分析结果。

返回格式：
{
  "score": 0-100的综合评分,
  "feedback": "简短的总体评价",
  "strengths": ["优点1", "优点2"],
  "improvements": ["改进建议1", "改进建议2"],
  "needsFollowup": 是否需要追问（true/false）
}

要求：
- score: 根据回答质量给出0-100的评分
- feedback: 20-50字的总体评价
- strengths: 2-3个优点
- improvements: 1-2个改进建议
- needsFollowup: 如果回答不够深入，需要追问则返回true`;

    const messages: DoubaoMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `目标职位：${jobPosition}\n面试问题：${question}\n候选人回答：${answer}` },
    ];

    const response = await this.chatCompletion({ messages, maxTokens: 800, temperature: 0.3 });
    const content = response.choices[0].message.content;

    try {
      // 尝试提取JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found');
    } catch (e) {
      // 解析失败返回默认值
      return {
        score: 70,
        feedback: '回答基本完整，但可以更具体一些。',
        strengths: ['表达清晰', '逻辑连贯'],
        improvements: ['建议增加具体案例'],
        needsFollowup: answer.length < 100,
      };
    }
  }

  /**
   * 生成追问问题
   */
  async generateFollowup(params: {
    originalQuestion: string;
    previousAnswer: string;
    jobPosition: string;
  }): Promise<string> {
    const { originalQuestion, previousAnswer, jobPosition } = params;

    const systemPrompt = `你是一位资深面试官。根据候选人的回答，生成一个有针对性的追问问题。

要求：
1. 追问要针对候选人回答中的模糊点或可以深入的点
2. 问题要自然，引导候选人提供更多细节
3. 直接输出追问内容，不要添加其他文字`;

    const messages: DoubaoMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `目标职位：${jobPosition}\n原始问题：${originalQuestion}\n候选人回答：${previousAnswer}\n\n请生成一个追问问题。` },
    ];

    const response = await this.chatCompletion({ messages, maxTokens: 300 });
    return response.choices[0].message.content;
  }

  /**
   * 生成结束语
   */
  async generateClosing(params: {
    userName: string;
    overallScore: number;
    summary?: string;
  }): Promise<string> {
    const { userName, overallScore, summary = '表现良好' } = params;

    const systemPrompt = `你是一位专业的AI面试官。请为候选人生成一段温暖的结束语。

要求：
1. 感谢候选人的时间和参与
2. 简要提及面试表现（保持积极鼓励）
3. 说明后续流程（面试报告将在稍后生成，请留意通知）
4. 语气专业、温暖
5. 控制在100字以内
6. 直接输出结束语内容`;

    const messages: DoubaoMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `候选人：${userName}，总体评价：${summary}，评分：${overallScore}/100` },
    ];

    const response = await this.chatCompletion({ messages, maxTokens: 300 });
    return response.choices[0].message.content;
  }
}

export const volcengineDoubaoService = new VolcengineDoubaoService();
