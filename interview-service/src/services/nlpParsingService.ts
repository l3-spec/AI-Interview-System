import axios from 'axios';

/**
 * 自然语言解析服务
 * 将用户的自然语言描述转换为结构化的面试会话数据
 */

interface JobTargetParseResult {
  jobTarget: string;
  companyTarget: string;
  background: string;
  questionCount: number;
  confidence: number; // 解析置信度 0-1
  parsedElements: {
    position?: string;
    company?: string;
    experience?: string;
    skills?: string[];
    seniority?: string;
  };
}

interface ParsedJobInfo {
  position: string;
  company: string;
  experience: string;
  skills: string[];
  questionCount: number;
}

class NLPParsingService {
  private aiProvider: string;
  private isEnabled: boolean;

  constructor() {
    this.aiProvider = process.env.AI_PROVIDER || 'deepseek';
    this.isEnabled = this.checkAIConfig();
    
    if (!this.isEnabled) {
      console.warn('⚠️  AI解析服务未配置，将使用规则引擎解析');
    } else {
      console.log(`✅ AI解析服务已配置 (${this.aiProvider})`);
    }
  }

  /**
   * 检查AI配置
   */
  private checkAIConfig(): boolean {
    switch (this.aiProvider) {
      case 'deepseek':
        return !!(process.env.DEEPSEEK_API_KEY);
      case 'openai':
        return !!(process.env.OPENAI_API_KEY);
      case 'azure':
        return !!(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT);
      default:
        return false;
    }
  }

  /**
   * 解析用户描述为结构化面试数据
   */
  async parseJobDescription(userInput: string): Promise<JobTargetParseResult> {
    try {
      console.log(`开始解析用户描述: "${userInput}"`);

      let result: JobTargetParseResult;

      if (this.isEnabled) {
        // 使用AI解析
        result = await this.aiParse(userInput);
      } else {
        // 使用规则引擎解析
        result = this.ruleBasedParse(userInput);
      }

      console.log('解析结果:', result);
      return result;

    } catch (error) {
      console.error('解析失败，使用默认解析:', error);
      return this.fallbackParse(userInput);
    }
  }

  /**
   * AI智能解析（推荐）
   */
  private async aiParse(userInput: string): Promise<JobTargetParseResult> {
    const prompt = this.buildParsingPrompt(userInput);
    
    try {
      let aiResponse: string;

      switch (this.aiProvider) {
        case 'deepseek':
          aiResponse = await this.callDeepSeekAPI(prompt);
          break;
        case 'openai':
          aiResponse = await this.callOpenAIAPI(prompt);
          break;
        case 'azure':
          aiResponse = await this.callAzureOpenAIAPI(prompt);
          break;
        default:
          throw new Error(`不支持的AI提供商: ${this.aiProvider}`);
      }

      // 解析AI返回的JSON结果
      const parsedResult = JSON.parse(aiResponse);
      
      return {
        jobTarget: parsedResult.jobTarget,
        companyTarget: parsedResult.companyTarget,
        background: parsedResult.background,
        questionCount: parsedResult.questionCount || 5,
        confidence: parsedResult.confidence || 0.9,
        parsedElements: parsedResult.parsedElements || {}
      };

    } catch (error) {
      console.error('AI解析失败:', error);
      throw error;
    }
  }

  /**
   * 构建解析提示词
   */
  private buildParsingPrompt(userInput: string): string {
    return `
请将以下用户描述解析为结构化的面试信息。请严格按照JSON格式返回，不要添加任何其他文字：

用户描述: "${userInput}"

请分析并提取以下信息：
1. 目标职位 (jobTarget) - 标准化的职位名称
2. 目标公司 (companyTarget) - 公司名称或公司类型
3. 个人背景 (background) - 工作经验和技能描述
4. 问题数量 (questionCount) - 建议的面试题目数量(5-15题)
5. 解析置信度 (confidence) - 0到1之间的数值
6. 解析元素 (parsedElements) - 详细解析的各个组成部分

返回JSON格式 (必须是有效的JSON，不能有注释)：
{
  "jobTarget": "具体职位名称",
  "companyTarget": "公司名称或类型",
  "background": "X年相关经验，掌握X技术栈",
  "questionCount": 5,
  "confidence": 0.9,
  "parsedElements": {
    "position": "提取的职位",
    "company": "提取的公司",
    "experience": "提取的经验年限",
    "skills": ["技能1", "技能2"],
    "seniority": "级别(初级/中级/高级/资深)"
  }
}

示例输入输出：

输入: "我想面试阿里巴巴的Java开发工程师，我有3年Java经验，熟悉Spring框架"
输出: {
  "jobTarget": "Java开发工程师",
  "companyTarget": "阿里巴巴",
  "background": "3年Java开发经验，熟悉Spring框架",
  "questionCount": 8,
  "confidence": 0.95,
  "parsedElements": {
    "position": "Java开发工程师",
    "company": "阿里巴巴",
    "experience": "3年",
    "skills": ["Java", "Spring"],
    "seniority": "中级"
  }
}

现在请解析用户输入并返回JSON结果：
`;
  }

  /**
   * DeepSeek API调用
   */
  private async callDeepSeekAPI(prompt: string): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';

    const response = await axios.post(apiUrl, {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的HR助手，擅长解析用户的面试需求并转换为结构化数据。请始终返回有效的JSON格式。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    return response.data.choices[0].message.content.trim();
  }

  /**
   * OpenAI API调用
   */
  private async callOpenAIAPI(prompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    const response = await axios.post(apiUrl, {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的HR助手，擅长解析用户的面试需求并转换为结构化数据。请始终返回有效的JSON格式。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    return response.data.choices[0].message.content.trim();
  }

  /**
   * Azure OpenAI API调用
   */
  private async callAzureOpenAIAPI(prompt: string): Promise<string> {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-35-turbo';

    const response = await axios.post(
      `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-12-01-preview`,
      {
        messages: [
          {
            role: 'system',
            content: '你是一个专业的HR助手，擅长解析用户的面试需求并转换为结构化数据。请始终返回有效的JSON格式。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return response.data.choices[0].message.content.trim();
  }

  /**
   * 规则引擎解析 (备用方案)
   */
  private ruleBasedParse(userInput: string): JobTargetParseResult {
    const input = userInput.toLowerCase();
    
    // 职位关键词映射
    const positionKeywords = {
      'java': 'Java开发工程师',
      'python': 'Python开发工程师',
      'javascript': 'JavaScript开发工程师',
      'js': 'JavaScript开发工程师',
      'react': 'React前端工程师',
      'vue': 'Vue前端工程师',
      'angular': 'Angular前端工程师',
      '前端': '前端开发工程师',
      '后端': '后端开发工程师',
      '全栈': '全栈开发工程师',
      'ai': 'AI工程师',
      '人工智能': 'AI工程师',
      '机器学习': '机器学习工程师',
      '算法': '算法工程师',
      '产品经理': '产品经理',
      '测试': '测试工程师',
      '运维': '运维工程师',
      'devops': 'DevOps工程师',
      '数据分析': '数据分析师',
      '架构师': '系统架构师'
    };

    // 公司关键词映射
    const companyKeywords = {
      '阿里': '阿里巴巴',
      'alibaba': '阿里巴巴',
      '腾讯': '腾讯',
      'tencent': '腾讯',
      '百度': '百度',
      'baidu': '百度',
      '字节': '字节跳动',
      'bytedance': '字节跳动',
      '美团': '美团',
      'meituan': '美团',
      '滴滴': '滴滴',
      '京东': '京东',
      'jd': '京东',
      '华为': '华为',
      'huawei': '华为',
      '小米': '小米',
      'xiaomi': '小米'
    };

    // 提取职位
    let jobTarget = '软件开发工程师'; // 默认值
    for (const [keyword, position] of Object.entries(positionKeywords)) {
      if (input.includes(keyword)) {
        jobTarget = position;
        break;
      }
    }

    // 提取公司
    let companyTarget = '科技公司'; // 默认值
    for (const [keyword, company] of Object.entries(companyKeywords)) {
      if (input.includes(keyword)) {
        companyTarget = company;
        break;
      }
    }

    // 提取经验年限
    const experienceMatch = input.match(/(\d+)\s*年/);
    const experienceYears = experienceMatch ? experienceMatch[1] : '1-3';

    // 提取技能
    const skillKeywords = ['java', 'python', 'javascript', 'react', 'vue', 'spring', 'mysql', 'redis'];
    const skills = skillKeywords.filter(skill => input.includes(skill));

    // 构建背景描述
    const background = `${experienceYears}年相关开发经验${skills.length > 0 ? `，熟悉${skills.join('、')}` : ''}`;

    // 估算问题数量
    const questionCount = experienceYears === '1-3' ? 5 : experienceYears === '3-5' ? 8 : 10;

    return {
      jobTarget,
      companyTarget,
      background,
      questionCount,
      confidence: 0.6, // 规则引擎置信度较低
      parsedElements: {
        position: jobTarget,
        company: companyTarget,
        experience: `${experienceYears}年`,
        skills,
        seniority: this.estimateSeniority(experienceYears)
      }
    };
  }

  /**
   * 估算技能级别
   */
  private estimateSeniority(experience: string): string {
    const years = parseInt(experience) || 1;
    if (years <= 2) return '初级';
    if (years <= 5) return '中级';
    if (years <= 8) return '高级';
    return '资深';
  }

  /**
   * 兜底解析
   */
  private fallbackParse(userInput: string): JobTargetParseResult {
    return {
      jobTarget: '软件开发工程师',
      companyTarget: '科技公司',
      background: '具有一定的技术基础和学习能力',
      questionCount: 5,
      confidence: 0.3,
      parsedElements: {
        position: '软件开发工程师',
        company: '科技公司',
        experience: '1-3年',
        skills: [],
        seniority: '初级'
      }
    };
  }

  /**
   * 批量解析多个描述
   */
  async batchParse(inputs: string[]): Promise<JobTargetParseResult[]> {
    const results: JobTargetParseResult[] = [];
    
    for (const input of inputs) {
      const result = await this.parseJobDescription(input);
      results.push(result);
      
      // 添加短暂延迟避免API限流
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return results;
  }

  /**
   * 验证解析结果
   */
  validateParseResult(result: JobTargetParseResult): boolean {
    return !!(
      result.jobTarget &&
      result.companyTarget &&
      result.background &&
      result.questionCount > 0 &&
      result.questionCount <= 20 &&
      result.confidence >= 0 &&
      result.confidence <= 1
    );
  }

  /**
   * 获取解析示例
   */
  getParsingExamples(): Array<{ input: string; expectedOutput: JobTargetParseResult }> {
    return [
      {
        input: "我想面试阿里巴巴的Java开发工程师，我有5年Java经验，熟悉Spring Boot和微服务",
        expectedOutput: {
          jobTarget: "Java开发工程师",
          companyTarget: "阿里巴巴",
          background: "5年Java开发经验，熟悉Spring Boot和微服务架构",
          questionCount: 8,
          confidence: 0.95,
          parsedElements: {
            position: "Java开发工程师",
            company: "阿里巴巴",
            experience: "5年",
            skills: ["Java", "Spring Boot", "微服务"],
            seniority: "高级"
          }
        }
      },
      {
        input: "刚毕业，想找个前端的工作，会React和Vue",
        expectedOutput: {
          jobTarget: "前端开发工程师",
          companyTarget: "科技公司",
          background: "前端开发基础，掌握React和Vue框架",
          questionCount: 5,
          confidence: 0.8,
          parsedElements: {
            position: "前端开发工程师",
            company: "科技公司",
            experience: "应届生",
            skills: ["React", "Vue"],
            seniority: "初级"
          }
        }
      }
    ];
  }
}

export const nlpParsingService = new NLPParsingService(); 