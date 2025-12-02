import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// DeepSeek API配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

// TTS服务配置 - 推荐使用Azure Cognitive Services
const AZURE_TTS_KEY = process.env.AZURE_TTS_KEY || '';
const AZURE_TTS_REGION = process.env.AZURE_TTS_REGION || 'eastus';
const AZURE_TTS_ENDPOINT = `https://${AZURE_TTS_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

/**
 * AI服务类 - 处理面试问题生成和语音合成
 */
export class AIService {
  
  /**
   * 根据职位生成面试问题
   */
  static async generateInterviewQuestions(jobPosition: string, jobLevel: string): Promise<string[]> {
    try {
      const prompt = this.buildInterviewPrompt(jobPosition, jobLevel);
      
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一位专业的HR面试官，擅长根据不同职位设计合适的面试问题。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      return this.parseQuestionsFromResponse(content);
      
    } catch (error) {
      console.error('生成面试问题失败:', error);
      // 返回默认问题作为备选
      return this.getDefaultQuestions(jobPosition, jobLevel);
    }
  }

  /**
   * 构建面试问题生成的提示词
   */
  private static buildInterviewPrompt(jobPosition: string, jobLevel: string): string {
    const basePrompt = `
请为以下职位生成6-8个专业的面试问题：

职位：${jobPosition}
级别：${jobLevel}

要求：
1. 问题应该涵盖技能评估、经验考察、情景应对等多个维度
2. 根据职位级别调整问题难度（初级/中级/高级/资深）
3. 每个问题应该简洁明了，适合口语表达
4. 问题应该能够有效评估候选人的专业能力和综合素质
5. 请直接输出问题列表，每个问题一行，以数字编号

格式示例：
1. [问题内容]
2. [问题内容]
...
`;

    // 根据不同职位类型添加特定要求
    if (jobPosition.toLowerCase().includes('java') || jobPosition.toLowerCase().includes('开发')) {
      return basePrompt + `
技术重点：
- Java核心技术和框架
- 系统设计和架构思维
- 代码质量和最佳实践
- 问题解决能力
`;
    } else if (jobPosition.toLowerCase().includes('产品') || jobPosition.toLowerCase().includes('product')) {
      return basePrompt + `
技术重点：
- 产品思维和用户体验
- 数据分析和决策能力
- 项目管理和协调能力
- 市场敏感度
`;
    } else if (jobPosition.toLowerCase().includes('设计') || jobPosition.toLowerCase().includes('design')) {
      return basePrompt + `
技术重点：
- 设计理念和创意思维
- 用户体验和交互设计
- 设计工具和技术能力
- 审美和趋势把握
`;
    }
    
    return basePrompt;
  }

  /**
   * 解析AI返回的问题列表
   */
  private static parseQuestionsFromResponse(content: string): string[] {
    const lines = content.split('\n').filter(line => line.trim());
    const questions: string[] = [];
    
    for (const line of lines) {
      // 匹配数字开头的问题格式
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match && match[1]) {
        questions.push(match[1].trim());
      }
    }
    
    // 如果解析失败，尝试简单分割
    if (questions.length === 0) {
      return lines.filter(line => line.length > 10).slice(0, 8);
    }
    
    return questions.slice(0, 8); // 最多8个问题
  }

  /**
   * 获取默认问题（当AI服务失败时的备选方案）
   */
  private static getDefaultQuestions(jobPosition: string, jobLevel: string): string[] {
    const defaultQuestions = [
      '请简单介绍一下你自己和你的工作经历',
      '你为什么想要应聘这个职位？',
      '请描述一个你在工作中遇到的挑战以及你是如何解决的',
      '你认为自己最大的优势是什么？',
      '你如何看待团队合作？能举个例子吗？',
      '你对我们公司有什么了解？',
      '你的职业规划是什么？',
      '你还有什么问题想要问我们的吗？'
    ];
    
    return defaultQuestions;
  }

  /**
   * 文本转语音 - 使用Azure Cognitive Services
   */
  static async textToSpeech(text: string, outputPath: string): Promise<string> {
    try {
      const ssml = this.buildSSML(text);
      
      const response = await axios.post(
        AZURE_TTS_ENDPOINT,
        ssml,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': AZURE_TTS_KEY,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
          },
          responseType: 'arraybuffer'
        }
      );

      // 保存音频文件
      fs.writeFileSync(outputPath, response.data);
      return outputPath;
      
    } catch (error) {
      console.error('TTS转换失败:', error);
      throw new Error('语音合成失败');
    }
  }

  /**
   * 构建SSML格式的语音合成文本
   */
  private static buildSSML(text: string): string {
    return `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <prosody rate="0.9" pitch="+2st">
      ${text}
    </prosody>
  </voice>
</speak>`;
  }

  /**
   * 批量生成问题的语音文件
   */
  static async generateQuestionAudios(questions: string[], sessionId: number): Promise<string[]> {
    const audioUrls: string[] = [];
    
    for (let i = 0; i < questions.length; i++) {
      try {
        const fileName = `interview_${sessionId}_q${i + 1}.mp3`;
        const outputPath = path.join(process.cwd(), 'uploads', 'audio', fileName);
        
        // 确保目录存在
        const audioDir = path.dirname(outputPath);
        if (!fs.existsSync(audioDir)) {
          fs.mkdirSync(audioDir, { recursive: true });
        }
        
        await this.textToSpeech(questions[i], outputPath);
        audioUrls.push(`/uploads/audio/${fileName}`);
        
      } catch (error) {
        console.error(`生成第${i + 1}个问题的语音失败:`, error);
        audioUrls.push(''); // 空字符串表示生成失败
      }
    }
    
    return audioUrls;
  }

  /**
   * 分析面试回答 - 使用DeepSeek进行智能评分
   */
  static async analyzeInterviewAnswer(
    question: string, 
    answer: string, 
    jobPosition: string
  ): Promise<{
    score: number;
    analysis: {
      strengths: string[];
      weaknesses: string[];
      suggestions: string[];
      keywordMatch: number;
      fluency: number;
      relevance: number;
    }
  }> {
    try {
      const prompt = `
作为专业的面试官，请分析以下面试回答：

职位：${jobPosition}
问题：${question}
回答：${answer}

请从以下维度进行评分（0-100分）：
1. 内容相关性（是否回答了问题）
2. 专业性（是否体现专业能力）
3. 逻辑性（回答是否有条理）
4. 完整性（回答是否充分）

请以JSON格式返回分析结果：
{
  "score": 总分(0-100),
  "analysis": {
    "strengths": ["优点1", "优点2"],
    "weaknesses": ["不足1", "不足2"], 
    "suggestions": ["建议1", "建议2"],
    "keywordMatch": 关键词匹配度(0-100),
    "fluency": 流畅度(0-100),
    "relevance": 相关性(0-100)
  }
}
`;

      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一位专业的HR面试官，擅长客观公正地评价面试表现。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error('解析AI分析结果失败:', parseError);
        return this.getDefaultAnalysis();
      }
      
    } catch (error) {
      console.error('分析面试回答失败:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * 默认分析结果
   */
  private static getDefaultAnalysis() {
    return {
      score: 70,
      analysis: {
        strengths: ['回答了问题'],
        weaknesses: ['可以更加详细'],
        suggestions: ['可以举更多具体例子'],
        keywordMatch: 60,
        fluency: 70,
        relevance: 70
      }
    };
  }

  /**
   * 生成综合职场素质评估
   */
  static async generateCareerAssessment(
    answers: Array<{question: string; answer: string; score: number}>,
    jobPosition: string,
    resumeData?: any
  ): Promise<{
    overallScore: number;
    scores: {
      communication: number;
      technical: number;
      leadership: number;
      problemSolving: number;
      teamwork: number;
      adaptability: number;
    };
    recommendations: string[];
    summary: string;
  }> {
    try {
      const prompt = `
基于以下面试表现和简历信息，生成综合职场素质评估：

职位：${jobPosition}
简历信息：${resumeData ? JSON.stringify(resumeData) : '无'}

面试回答表现：
${answers.map((item, index) => `
问题${index + 1}：${item.question}
回答得分：${item.score}分
`).join('\n')}

请从以下6个维度评估候选人（每项0-100分）：
1. 沟通表达能力 (communication)
2. 技术专业能力 (technical) 
3. 领导力 (leadership)
4. 问题解决能力 (problemSolving)
5. 团队协作能力 (teamwork)
6. 适应能力 (adaptability)

请以JSON格式返回：
{
  "overallScore": 总体得分(0-100),
  "scores": {
    "communication": 分数,
    "technical": 分数,
    "leadership": 分数,
    "problemSolving": 分数,
    "teamwork": 分数,
    "adaptability": 分数
  },
  "recommendations": ["改进建议1", "改进建议2", "改进建议3"],
  "summary": "综合评价总结"
}
`;

      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一位资深的职场导师和HR专家，擅长全面客观地评估职场素质。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.4
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error('解析职场评估结果失败:', parseError);
        return this.getDefaultCareerAssessment(answers);
      }
      
    } catch (error) {
      console.error('生成职场素质评估失败:', error);
      return this.getDefaultCareerAssessment(answers);
    }
  }

  /**
   * 默认职场素质评估
   */
  private static getDefaultCareerAssessment(answers: Array<{score: number}>) {
    const avgScore = answers.reduce((sum, item) => sum + item.score, 0) / answers.length;
    
    return {
      overallScore: Math.round(avgScore),
      scores: {
        communication: Math.round(avgScore * 0.9),
        technical: Math.round(avgScore * 1.1),
        leadership: Math.round(avgScore * 0.8),
        problemSolving: Math.round(avgScore),
        teamwork: Math.round(avgScore * 0.9),
        adaptability: Math.round(avgScore * 0.85)
      },
      recommendations: [
        '继续保持现有优势',
        '可以在技术深度上进一步提升',
        '建议多参与团队协作项目'
      ],
      summary: '候选人表现良好，具备基本的职场素质，建议继续提升专业技能。'
    };
  }
} 