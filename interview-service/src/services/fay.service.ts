import axios from 'axios';

interface Character {
  id: string;
  name: string;
  description: string;
  voice: string;
  personality: string;
  avatar: string;
}

interface ResponseData {
  text: string;
  audioUrl: string | null;
  character: string;
  questionType: string;
  timestamp: string;
  emotion: string;
}

export class FayServiceManager {
  private characters: Character[] = [
    {
      id: 'tech_interviewer',
      name: '技术面试官',
      description: '专注于技术问题的专业面试官',
      voice: 'zh-CN-XiaoxiaoNeural',
      personality: 'analytical',
      avatar: '🤖'
    },
    {
      id: 'hr_interviewer',
      name: 'HR面试官',
      description: '友好的人力资源面试官',
      voice: 'zh-CN-XiaoyiNeural',
      personality: 'friendly',
      avatar: '👨‍💼'
    },
    {
      id: 'pressure_interviewer',
      name: '压力面试官',
      description: '具有挑战性的压力测试面试官',
      voice: 'zh-CN-YunjianNeural',
      personality: 'challenging',
      avatar: '🎯'
    }
  ];

  async processQuestion(data: { question: string; character?: string }): Promise<ResponseData> {
    const character = data.character || 'tech_interviewer';
    
    // 智能问题分析
    const questionType = this.analyzeQuestionType(data.question);
    
    // 基于问题类型和角色生成回答
    const response = this.generateResponse(data.question, character, questionType);
    
    // 语音合成
    const audioUrl = await this.synthesizeVoice({
      text: response,
      voice: this.getVoiceForCharacter(character)
    });

    return {
      text: response,
      audioUrl: audioUrl,
      character: character,
      questionType: questionType,
      timestamp: new Date().toISOString(),
      emotion: this.detectEmotion(response)
    };
  }

  private analyzeQuestionType(question: string): string {
    const keywords = {
      'technical': ['技术', '架构', '代码', '算法', '数据库', '框架'],
      'behavioral': ['经验', '处理', '团队', '沟通', '困难', '挑战'],
      'career': ['规划', '目标', '发展', '未来', '学习', '成长']
    };

    for (const [type, keywordsList] of Object.entries(keywords)) {
      if (keywordsList.some(keyword => question.includes(keyword))) {
        return type;
      }
    }
    return 'general';
  }

  private generateResponse(question: string, character: string, questionType: string): string {
    const responses: Record<string, Record<string, string[]>> = {
      tech_interviewer: {
        technical: [
          `这是一个很有深度的技术问题。让我从技术架构的角度来分析：首先，${question}涉及到系统设计，其次需要考虑性能优化。基于我的经验，最佳实践是采用微服务架构。`,
          `从技术实现的角度来看，${question}的关键点在于数据一致性。我建议采用渐进式改进的方法，这样可以提高系统可靠性。`
        ],
        behavioral: [
          `在技术团队中，${question}确实是一个重要话题。我的做法是主动沟通，通过定期团队会议来解决技术分歧，最终实现了项目成功交付。`,
          `关于${question}，我认为技术人员的软技能同样重要。我曾经遇到项目延期风险，通过结构化思维有效处理了这个问题。`
        ],
        general: [
          `作为技术面试官，我认为${question}反映了候选人的技术深度。让我分享一下我的观点：这个问题需要从多个维度来考虑。`,
          `这是一个很好的问题。从技术的角度来看，${question}需要考虑技术实现和业务需求的平衡。`
        ]
      },
      hr_interviewer: {
        behavioral: [
          `我理解您的想法。从人力资源管理的角度，${question}确实很重要。让我分享一下：员工发展和团队建设是关键。`,
          `这是一个很好的软技能问题。我认为${question}的核心在于沟通透明，通过有效沟通可以建立良好的团队关系。`
        ],
        career: [
          `关于${question}，我建议采取技术专家路线的职业发展路径。这样可以在3-5年内实现成为技术领导者的目标。`,
          `职业规划确实很重要。针对${question}，我认为应该持续学习和技能提升，同时保持开放的心态。`
        ],
        general: [
          `作为HR面试官，我更关注${question}背后反映的个人特质。让我从团队文化的角度分析一下：个人价值观与团队文化的匹配很重要。`,
          `这个问题很有意义。从职业发展的角度，我建议制定清晰的短期和长期目标，并持续评估和调整。`
        ]
      },
      pressure_interviewer: {
        technical: [
          `你确定吗？让我直接指出${question}中的关键问题：技术债务。请重新考虑重构方案。`,
          `这个回答还不够深入。${question}实际上隐藏了系统复杂性，需要更加系统化的方法。`
        ],
        behavioral: [
          `我质疑你的观点。${question}的真正挑战在于执行能力，请给出更具体的成功项目经验。`,
          `在压力环境下，${question}的解决方案应该是结构化思维，而不是模糊回答。`
        ],
        general: [
          `在压力面试中，${question}测试的是抗压能力。让我给你施加一些压力：时间压力下如何做出正确决策？`,
          `你需要更加具体地回答${question}。请详细说明具体实施步骤，并给出成功项目经验。`
        ]
      }
    };

    const characterResponses = responses[character] || responses.tech_interviewer;
    const questionResponses = characterResponses[questionType as keyof typeof characterResponses] || characterResponses.general;
    
    return questionResponses[Math.floor(Math.random() * questionResponses.length)];
  }

  private getVoiceForCharacter(character: string): string {
    const char = this.characters.find(c => c.id === character);
    return char?.voice || 'zh-CN-XiaoxiaoNeural';
  }

  private detectEmotion(text: string): string {
    const emotions = {
      'positive': ['很好', '优秀', '成功', '有效'],
      'negative': ['问题', '挑战', '困难', '风险'],
      'neutral': ['分析', '考虑', '建议', '观点']
    };

    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return emotion;
      }
    }
    return 'neutral';
  }

  async synthesizeVoice(data: { text: string; voice?: string }): Promise<string | null> {
    try {
      // 模拟真实的语音合成API调用
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 返回模拟的音频URL
      return `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBy/TZhjMGHGS47OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizsIHWq+7+OZRAkPVqzn77JlGAUvgsDx1IcyBR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvPDfm0sKEFus5+2yYhQFOpPY8tB5LgUpeMny2Yc1BR1tvQ==`; // 模拟音频URL
    } catch (error) {
      console.error('语音合成失败:', error);
      return null;
    }
  }

  getCharacters(): Character[] {
    return this.characters;
  }

  async getInterviewQuestions(character: string, topic?: string): Promise<string[]> {
    const baseQuestions: Record<string, string[]> = {
      'tech_interviewer': [
        '请简单自我介绍一下',
        '你的技术栈是什么',
        '你最大的技术挑战是什么',
        '如何优化系统性能',
        '如何处理技术债务'
      ],
      'hr_interviewer': [
        '你为什么想加入我们公司',
        '你最大的优点和缺点是什么',
        '你如何处理工作中的冲突',
        '你的职业规划是什么',
        '如何平衡工作和生活'
      ],
      'pressure_interviewer': [
        '你确定你能胜任这个职位吗',
        '你的项目经验有什么实际价值',
        '你如何证明自己的能力',
        '面对失败你会怎么办',
        '你最大的弱点是什么'
      ]
    };

    return baseQuestions[character] || baseQuestions.tech_interviewer;
  }
}