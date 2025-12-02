/**
 * AI服务
 * 负责生成面试问题和分析面试结果
 */
class AIService {
  
  /**
   * 生成第一个面试问题
   */
  async generateFirstQuestion(params: {
    jobTarget: string;
    companyTarget: string;
    background: string;
  }): Promise<string> {
    const { jobTarget, companyTarget, background } = params;
    
    // 模拟AI生成问题的逻辑
    // 在实际项目中，这里会调用DeepSeek或其他AI服务
    const questions = [
      `请简单介绍一下您自己，以及为什么想要应聘${jobTarget}这个职位？`,
      `您对${companyTarget}有什么了解？为什么选择我们公司？`,
      `请谈谈您在${background}方面的经验和技能。`,
      `您认为自己最大的优势是什么？如何帮助您胜任${jobTarget}这个职位？`,
      `请描述一个您在学习或工作中遇到的挑战，以及您是如何解决的？`
    ];
    
    // 根据用户信息选择合适的开场问题
    return questions[0];
  }
  
  /**
   * 生成下一个面试问题
   */
  async generateNextQuestion(params: {
    jobTarget: string;
    companyTarget: string;
    background: string;
    questionHistory: string[];
    answerHistory: string[];
    currentIndex: number;
  }): Promise<string> {
    const { jobTarget, companyTarget, background, questionHistory, answerHistory, currentIndex } = params;
    
    // 预设的问题库，根据职位和背景动态选择
    const questionBank = {
      technical: [
        `请描述一下您最熟悉的编程语言或技术栈，以及相关的项目经验。`,
        `如果遇到一个技术难题，您通常会采用什么方法来解决？`,
        `请谈谈您对代码质量和团队协作的理解。`,
        `您如何保持技术技能的更新？有什么学习计划吗？`
      ],
      behavioral: [
        `请描述一次您在团队中发挥重要作用的经历。`,
        `当您与同事或上级意见不一致时，您会如何处理？`,
        `请谈谈您的职业规划，未来3-5年的目标是什么？`,
        `您认为什么样的工作环境最能发挥您的潜力？`
      ],
      situational: [
        `如果您需要在紧急情况下完成一个重要项目，您会如何安排？`,
        `假设您发现了一个可能影响用户体验的问题，但修复它可能会延迟项目进度，您会怎么做？`,
        `如果您需要学习一个全新的技术来完成工作任务，您会如何快速上手？`,
        `请描述一下您理想中的工作日是什么样的？`
      ]
    };
    
    // 根据当前问题索引选择不同类型的问题
    let selectedQuestions: string[];
    if (currentIndex === 1) {
      selectedQuestions = questionBank.technical;
    } else if (currentIndex === 2) {
      selectedQuestions = questionBank.behavioral;
    } else if (currentIndex === 3) {
      selectedQuestions = questionBank.situational;
    } else {
      selectedQuestions = [...questionBank.technical, ...questionBank.behavioral];
    }
    
    // 避免重复问题
    const availableQuestions = selectedQuestions.filter(q => !questionHistory.includes(q));
    
    if (availableQuestions.length === 0) {
      return `基于您之前的回答，请再详细谈谈您对${jobTarget}这个职位的理解和期望。`;
    }
    
    // 随机选择一个问题
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    return availableQuestions[randomIndex];
  }
  
  /**
   * 分析面试结果
   */
  async analyzeInterview(params: {
    jobTarget: string;
    companyTarget: string;
    background: string;
    questions: string[];
    answers: string[];
    duration: number;
  }): Promise<{
    overall_score: number;
    ability_scores: { [key: string]: number };
    suggestions: string[];
    strengths: string[];
    weaknesses: string[];
  }> {
    const { jobTarget, companyTarget, background, questions, answers, duration } = params;
    
    // 模拟AI分析结果
    // 在实际项目中，这里会调用AI服务进行深度分析
    
    // 基础评分逻辑
    let overallScore = 70; // 基础分数
    
    // 根据回答长度调整分数
    const avgAnswerLength = answers.reduce((sum, answer) => sum + answer.length, 0) / answers.length;
    if (avgAnswerLength > 100) overallScore += 10;
    if (avgAnswerLength > 200) overallScore += 5;
    
    // 根据面试时长调整分数
    const expectedDuration = questions.length * 60000; // 每题预期1分钟
    if (duration > expectedDuration * 0.8) overallScore += 5;
    
    // 确保分数在合理范围内
    overallScore = Math.min(95, Math.max(40, overallScore));
    
    // 能力评分
    const abilityScores = {
      '沟通表达': Math.floor(overallScore * (0.9 + Math.random() * 0.2)),
      '专业技能': Math.floor(overallScore * (0.8 + Math.random() * 0.3)),
      '逻辑思维': Math.floor(overallScore * (0.85 + Math.random() * 0.25)),
      '学习能力': Math.floor(overallScore * (0.9 + Math.random() * 0.2)),
      '团队协作': Math.floor(overallScore * (0.8 + Math.random() * 0.3))
    };
    
    // 优势分析
    const strengths = [
      '回答问题思路清晰，逻辑性强',
      '对目标职位有较好的理解',
      '表现出良好的学习意愿',
      '沟通表达能力较好'
    ];
    
    // 改进建议
    const suggestions = [
      '可以更多地结合具体实例来回答问题',
      '建议进一步了解公司文化和业务',
      '可以更详细地描述技术项目经验',
      '建议准备一些针对性的问题向面试官提问'
    ];
    
    // 待改进点
    const weaknesses = [
      '部分回答可以更加具体和详细',
      '可以更多地展示个人特色和亮点',
      '建议加强对行业趋势的了解'
    ];
    
    return {
      overall_score: overallScore,
      ability_scores: abilityScores,
      suggestions: suggestions.slice(0, 3), // 返回前3个建议
      strengths: strengths.slice(0, 3), // 返回前3个优势
      weaknesses: weaknesses.slice(0, 2) // 返回前2个待改进点
    };
  }
  
  /**
   * 生成面试报告
   */
  async generateReport(analysisResult: any): Promise<string> {
    const { overall_score, ability_scores, suggestions, strengths, weaknesses } = analysisResult;
    
    let report = `## 面试评估报告\n\n`;
    report += `### 综合评分：${overall_score}分\n\n`;
    
    report += `### 能力评估\n`;
    Object.entries(ability_scores).forEach(([ability, score]) => {
      report += `- ${ability}：${score}分\n`;
    });
    
    report += `\n### 优势表现\n`;
    strengths.forEach((strength: string, index: number) => {
      report += `${index + 1}. ${strength}\n`;
    });
    
    report += `\n### 改进建议\n`;
    suggestions.forEach((suggestion: string, index: number) => {
      report += `${index + 1}. ${suggestion}\n`;
    });
    
    if (weaknesses.length > 0) {
      report += `\n### 待改进点\n`;
      weaknesses.forEach((weakness: string, index: number) => {
        report += `${index + 1}. ${weakness}\n`;
      });
    }
    
    return report;
  }
}

export const aiService = new AIService(); 