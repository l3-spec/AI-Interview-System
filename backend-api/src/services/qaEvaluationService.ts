import OpenAI from 'openai';
import { deepseekService } from './deepseekService';
import { QuestionTemplate, ScoringRubric } from '../config/interviewQuestionTemplates';

/**
 * 问答评估服务
 * 实现四维深度评估：语义相关性、结构化完整度、专业准确度、逻辑连贯性
 */

export interface EvaluationContext {
  jobCategory?: string;        // 职位类别
  jobRequirements?: string;    // 职位要求
  questionType?: string;       // 问题类型（技术/行为/经验等）
  expectedKeywords?: string[]; // 期望关键词
}

export interface MultimodalScores {
  expressionScore: number;      // 表情评分 0-10（自然/紧张/说谎）
  eyeContactScore: number;      // 眼神评分 0-10（专注/闪躲/游离）
  toneScore: number;            // 语气评分 0-10（自信/犹豫/不确定）
  speechRateScore: number;      // 语速评分 0-10（正常/过快/过慢）
  stutterScore: number;         // 卡顿评分 0-10（流畅/卡顿/重复）
  overallMultimodalScore: number; // 综合多模态评分 0-10
}

export interface QAEvaluationResult {
  // 四维评分（0-100）
  relevanceScore: number;           
  completenessScore: number;        
  professionalAccuracyScore: number;
  logicalCoherenceScore: number;    
  
  // 维度综合评分（0-10，内部使用）
  dimensionContentScore: number;    // 内容评分 0-10
  dimensionMultimodalScore: number; // 多模态评分 0-10
  dimensionOverallScore: number;    // 维度最终评分 0-10（按权重融合）
  
  // 综合评分（0-100，前端展示）
  overallScore: number;             
  
  // 详细反馈
  feedback: string;                 
  relevanceDetails: {
    embeddingSimilarity: number;
    keywordOverlap: number;
    semanticMatch: boolean;
  };
  completenessDetails: {
    hasStructure: boolean;
    hasExamples: boolean;
    hasData: boolean;
    subQuestionsCovered: number;
    subQuestionsTotal: number;
    missingItems: string[];
  };
  accuracyDetails: {
    conceptsExtracted: string[];
    verifiedConcepts: string[];
    suspectConcepts: string[];
    wrongConcepts: string[];
  };
  coherenceDetails: {
    argumentCount: number;
    contradictions: string[];
    logicalGaps: string[];
    redundancy: string[];
  };
  // 关键词匹配结果
  keywordMatchRate: number;         // 期望关键词匹配率 0-100
  quantifiableMetricsFound: string[]; // 发现的可量化指标
}

interface EmbeddingConfig {
  provider: 'qwen' | 'deepseek' | 'openai' | 'volcengine';
  apiKey: string;
  baseUrl: string;
  model: string;
}

export class QAEvaluationService {
  private embeddingConfig: EmbeddingConfig | null = null;
  private openaiClient: OpenAI | null = null;
  private enabled = false;

  constructor() {
    // 初始化配置
    this.loadConfig();
  }

  /**
   * 加载环境变量配置
   */
  private loadConfig(): void {
    const enabled = process.env.QA_EVALUATION_ENABLED === 'true';
    if (!enabled) {
      this.enabled = false;
      return;
    }

    const provider = process.env.EMBEDDING_PROVIDER as EmbeddingConfig['provider'];
    const apiKey = process.env.EMBEDDING_API_KEY;
    const baseUrl = process.env.EMBEDDING_BASE_URL;
    const model = process.env.EMBEDDING_MODEL || 'text-embedding-v3';

    if (!provider || !apiKey || !baseUrl) {
      console.warn('[QAEvaluationService] 缺少Embedding配置，服务未启用');
      this.enabled = false;
      return;
    }

    this.embeddingConfig = { provider, apiKey, baseUrl, model };
    this.openaiClient = new OpenAI({
      apiKey: this.embeddingConfig.apiKey,
      baseURL: this.embeddingConfig.baseUrl,
    });
    this.enabled = true;
    console.log(`[QAEvaluationService] 服务已启用，Provider: ${provider}, Model: ${model}`);
  }

  /**
   * 检查服务是否可用
   */
  isEnabled(): boolean {
    return this.enabled && !!this.openaiClient && !!this.embeddingConfig;
  }

  /**
   * 主要评估入口（兼容旧版）
   */
  async evaluate(
    question: string,
    answer: string,
    context: EvaluationContext = {}
  ): Promise<QAEvaluationResult | null> {
    return this.evaluateWithTemplate(question, answer, context, null, null);
  }

  /**
   * 新的评估入口：支持评分模板和多模态融合
   */
  async evaluateWithTemplate(
    question: string,
    answer: string,
    context: EvaluationContext = {},
    scoringRubric: ScoringRubric | null = null, // 评分规则模板
    multimodalScores: MultimodalScores | null = null // 多模态分析结果
  ): Promise<QAEvaluationResult | null> {
    if (!this.isEnabled()) {
      return null;
    }

    if (!answer || answer.trim().length === 0) {
      return this.getEmptyResult();
    }

    try {
      // 并行执行四个维度的评估
      const [relevanceResult, completenessResult, accuracyResult, coherenceResult] = await Promise.all([
        this.evaluateSemanticRelevance(question, answer),
        this.evaluateCompleteness(question, answer, context.expectedKeywords || (scoringRubric?.keywords || [])),
        this.evaluateProfessionalAccuracy(question, answer, context),
        this.evaluateLogicalCoherence(question, answer)
      ]);

      // 计算基础综合评分，默认权重：相关性30%，完整度25%，专业度25%，逻辑20%
      const contentOverallScore = Math.round(
        relevanceResult.score * 0.3 +
        completenessResult.score * 0.25 +
        accuracyResult.score * 0.25 +
        coherenceResult.score * 0.2
      );

      // 转换为0-10分制的内容评分
      const dimensionContentScore = Math.round(contentOverallScore / 10);

      // 计算多模态评分（默认10分满分，如果没有多模态数据）
      let dimensionMultimodalScore = 10;
      if (multimodalScores) {
        dimensionMultimodalScore = multimodalScores.overallMultimodalScore;
      }

      // 按评分规则中的权重融合内容和多模态评分
      let dimensionOverallScore = dimensionContentScore;
      if (scoringRubric) {
        dimensionOverallScore = Math.round(
          dimensionContentScore * scoringRubric.contentWeight + 
          dimensionMultimodalScore * scoringRubric.multimodalWeight
        );
      } else {
        // 默认权重：内容80%，多模态20%
        dimensionOverallScore = Math.round(dimensionContentScore * 0.8 + dimensionMultimodalScore * 0.2);
      }
      dimensionOverallScore = Math.max(0, Math.min(10, dimensionOverallScore));

      // 最终前端展示的0-100分制
      const overallScore = dimensionOverallScore * 10;

      // 计算关键词匹配率和可量化指标
      const keywordMatchRate = completenessResult.details.subQuestionsCovered / completenessResult.details.subQuestionsTotal * 100;
      const quantifiableMetricsFound = answer.match(/\d+(\.\d+)?%?/g) || [];

      // 生成整体反馈
      const feedback = this.generateOverallFeedback(
        relevanceResult,
        completenessResult,
        accuracyResult,
        coherenceResult,
        scoringRubric,
        multimodalScores,
        dimensionOverallScore
      );

      return {
        relevanceScore: relevanceResult.score,
        completenessScore: completenessResult.score,
        professionalAccuracyScore: accuracyResult.score,
        logicalCoherenceScore: coherenceResult.score,
        dimensionContentScore,
        dimensionMultimodalScore,
        dimensionOverallScore,
        overallScore,
        feedback,
        relevanceDetails: relevanceResult.details,
        completenessDetails: completenessResult.details,
        accuracyDetails: accuracyResult.details,
        coherenceDetails: coherenceResult.details,
        keywordMatchRate,
        quantifiableMetricsFound
      };
    } catch (error) {
      console.error('[QAEvaluationService] 评估失败', error);
      return null;
    }
  }

  /**
   * 模块A：语义相关性评估
   */
  private async evaluateSemanticRelevance(
    question: string,
    answer: string
  ): Promise<{ score: number; details: QAEvaluationResult['relevanceDetails'] }> {
    // 1. 获取Embedding向量
    const [questionEmbedding, answerEmbedding] = await Promise.all([
      this.getEmbedding(question),
      this.getEmbedding(answer)
    ]);

    // 2. 计算余弦相似度
    const embeddingSimilarity = this.cosineSimilarity(questionEmbedding, answerEmbedding);
    
    // 3. 计算关键词重叠率
    const keywordOverlap = this.calculateKeywordOverlap(question, answer);
    
    // 4. 加权融合：Embedding占70%，关键词占30%
    const score = Math.round(embeddingSimilarity * 0.7 + keywordOverlap * 0.3);
    
    return {
      score: Math.max(0, Math.min(100, score)),
      details: {
        embeddingSimilarity: Math.round(embeddingSimilarity * 100),
        keywordOverlap,
        semanticMatch: score >= 60
      }
    };
  }

  /**
   * 模块B：结构化完整度评估
   */
  private async evaluateCompleteness(
    question: string,
    answer: string,
    expectedKeywords: string[]
  ): Promise<{ score: number; details: QAEvaluationResult['completenessDetails'] }> {
    const details: QAEvaluationResult['completenessDetails'] = {
      hasStructure: false,
      hasExamples: false,
      hasData: false,
      subQuestionsCovered: 0,
      subQuestionsTotal: 0,
      missingItems: []
    };

    let score = 0;

    // 1. 长度合理性检测 (20分)
    const answerLength = answer.trim().length;
    if (answerLength >= 50) {
      score += 20;
    } else if (answerLength >= 20) {
      score += 10;
    } else {
      details.missingItems.push('答案过短，内容不足');
    }

    // 2. 结构检测 (20分)
    const structurePatterns = /首先|其次|最后|第一|第二|第三|一方面|另一方面|观点|结论|因此|所以/g;
    if (structurePatterns.test(answer)) {
      details.hasStructure = true;
      score += 20;
    } else {
      details.missingItems.push('缺乏结构化表达（如首先/其次/最后等逻辑连接词）');
    }

    // 3. 案例/数据支撑 (20分)
    const examplePatterns = /例如|比如|举个例子|在.*项目中|我曾经|我有过|[\d]+/g;
    const hasExamples = examplePatterns.test(answer);
    const hasData = /\d+(\.\d+)?%?/.test(answer);
    
    details.hasExamples = hasExamples;
    details.hasData = hasData;
    
    if (hasExamples && hasData) {
      score += 20;
    } else if (hasExamples || hasData) {
      score += 10;
      details.missingItems.push(hasExamples ? '缺少数据支撑' : '缺少案例支撑');
    } else {
      details.missingItems.push('缺少案例和数据支撑');
    }

    // 4. 子问题覆盖检测 (20分)
    const questionMarkCount = (question.match(/\?/g) || []).length;
    const conjunctionCount = (question.match(/和|与|以及|还有|同时/g) || []).length;
    const subQuestionsTotal = Math.max(questionMarkCount, conjunctionCount + 1);
    details.subQuestionsTotal = subQuestionsTotal;
    
    // 简单检测子问题覆盖
    let coveredCount = 0;
    if (subQuestionsTotal <= 1) {
      coveredCount = 1;
    } else {
      // 按句号分割答案，粗略估算覆盖数量
      const answerSentences = answer.split(/[。！；]/).filter(s => s.trim().length > 10);
      coveredCount = Math.min(subQuestionsTotal, answerSentences.length);
    }
    
    details.subQuestionsCovered = coveredCount;
    const subQuestionScore = Math.round((coveredCount / subQuestionsTotal) * 20);
    score += subQuestionScore;
    
    if (coveredCount < subQuestionsTotal) {
      details.missingItems.push(`未完全覆盖所有问题，共${subQuestionsTotal}个问题，仅回答了${coveredCount}个`);
    }

    // 5. 关键词覆盖率 (20分)
    if (expectedKeywords.length > 0) {
      const matchedKeywords = expectedKeywords.filter(keyword => 
        answer.includes(keyword)
      );
      const keywordScore = Math.round((matchedKeywords.length / expectedKeywords.length) * 20);
      score += keywordScore;
      
      if (matchedKeywords.length < expectedKeywords.length) {
        const missingKeywords = expectedKeywords.filter(k => !matchedKeywords.includes(k));
        details.missingItems.push(`缺少期望关键词：${missingKeywords.join('、')}`);
      }
    } else {
      // 如果没有预设关键词，这部分默认给满分
      score += 20;
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      details
    };
  }

  /**
   * 模块C：专业准确度验证
   */
  private async evaluateProfessionalAccuracy(
    question: string,
    answer: string,
    context: EvaluationContext
  ): Promise<{ score: number; details: QAEvaluationResult['accuracyDetails'] }> {
    const details: QAEvaluationResult['accuracyDetails'] = {
      conceptsExtracted: [],
      verifiedConcepts: [],
      suspectConcepts: [],
      wrongConcepts: []
    };

    try {
      // 1. 提取专业概念
      const extractionPrompt = `
请从以下候选人回答中提取所有专业术语、技术概念、方法论名词：
问题：${question}
职位类别：${context.jobCategory || '通用'}
回答：${answer}

输出要求：
- 只返回JSON格式，不要其他内容
- 格式：{"concepts": ["概念1", "概念2", ...]}
      `.trim();

      const extractionResult = await deepseekService.chatCompletion([
        { role: 'user', content: extractionPrompt }
      ], {
        temperature: 0,
        response_format: { type: 'json_object' }
      });

      const extracted = JSON.parse(extractionResult);
      details.conceptsExtracted = extracted.concepts || [];

      if (details.conceptsExtracted.length === 0) {
        return { score: 100, details };
      }

      // 2. 事实核查
      const verificationPrompt = `
请作为${context.jobCategory || 'IT互联网'}领域的专家，逐一验证以下专业概念的使用是否正确：
问题：${question}
回答：${answer}
提取的概念：${details.conceptsExtracted.join('、')}

输出要求：
- 只返回JSON格式，不要其他内容
- 格式：{
  "verified": ["正确的概念1", "正确的概念2"],
  "suspect": ["可疑的概念1", "可疑的概念2"],
  "wrong": ["错误的概念1：错误原因", "错误的概念2：错误原因"]
}
      `.trim();

      const verificationResult = await deepseekService.chatCompletion([
        { role: 'user', content: verificationPrompt }
      ], {
        temperature: 0,
        response_format: { type: 'json_object' },
        model: process.env.QA_EVALUATION_LLM_MODEL || undefined
      });

      const verification = JSON.parse(verificationResult);
      details.verifiedConcepts = verification.verified || [];
      details.suspectConcepts = verification.suspect || [];
      details.wrongConcepts = verification.wrong || [];

      // 计算得分：每个正确得100分，可疑得50分，错误得0分
      const total = details.conceptsExtracted.length;
      if (total === 0) {
        return { score: 100, details };
      }

      const correctPoints = details.verifiedConcepts.length * 100;
      const suspectPoints = details.suspectConcepts.length * 50;
      const totalPoints = correctPoints + suspectPoints;
      const score = Math.round(totalPoints / (total * 100) * 100);

      return {
        score: Math.max(0, Math.min(100, score)),
        details
      };
    } catch (error) {
      console.error('[QAEvaluationService] 专业准确度验证失败', error);
      // 失败时默认给60分
      return { score: 60, details };
    }
  }

  /**
   * 模块D：逻辑连贯性分析
   */
  private async evaluateLogicalCoherence(
    question: string,
    answer: string
  ): Promise<{ score: number; details: QAEvaluationResult['coherenceDetails'] }> {
    const details: QAEvaluationResult['coherenceDetails'] = {
      argumentCount: 0,
      contradictions: [],
      logicalGaps: [],
      redundancy: []
    };

    try {
      const analysisPrompt = `
请分析以下回答的逻辑连贯性：
问题：${question}
回答：${answer}

分析维度：
1. 提取所有论点
2. 检查论点之间是否存在矛盾
3. 检查是否存在逻辑跳跃（论点没有论据支撑、突然转换话题）
4. 检查是否有冗余重复内容

输出要求：
- 只返回JSON格式，不要其他内容
- 格式：{
  "arguments": ["论点1", "论点2"],
  "contradictions": ["矛盾点1描述", "矛盾点2描述"],
  "logicalGaps": ["逻辑跳跃1描述", "逻辑跳跃2描述"],
  "redundancy": ["冗余内容1描述", "冗余内容2描述"]
}
      `.trim();

      const analysisResult = await deepseekService.chatCompletion([
        { role: 'user', content: analysisPrompt }
      ], {
        temperature: 0,
        response_format: { type: 'json_object' },
        model: process.env.QA_EVALUATION_LLM_MODEL || undefined
      });

      const analysis = JSON.parse(analysisResult);
      details.argumentCount = analysis.arguments?.length || 0;
      details.contradictions = analysis.contradictions || [];
      details.logicalGaps = analysis.logicalGaps || [];
      details.redundancy = analysis.redundancy || [];

      // 计算得分：基础分70分，每有一个矛盾扣20分，每有一个逻辑跳跃扣10分，每有一个冗余扣5分
      let score = 70;
      score -= details.contradictions.length * 20;
      score -= details.logicalGaps.length * 10;
      score -= details.redundancy.length * 5;

      // 有论点加分
      if (details.argumentCount >= 3) {
        score += 30;
      } else if (details.argumentCount >= 2) {
        score += 20;
      } else if (details.argumentCount >= 1) {
        score += 10;
      }

      return {
        score: Math.max(0, Math.min(100, score)),
        details
      };
    } catch (error) {
      console.error('[QAEvaluationService] 逻辑连贯性分析失败', error);
      // 失败时默认给60分
      return { score: 60, details };
    }
  }

  /**
   * 获取文本的Embedding向量
   */
  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.openaiClient || !this.embeddingConfig) {
      throw new Error('Embedding服务未初始化');
    }

    const response = await this.openaiClient.embeddings.create({
      model: this.embeddingConfig.model,
      input: text.trim().slice(0, 8000), // 限制长度，避免超过模型上限
      encoding_format: 'float'
    });

    return response.data[0].embedding;
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('向量长度不一致');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 计算关键词重叠率
   */
  private calculateKeywordOverlap(question: string, answer: string): number {
    // 中文停用词
    const stopWords = new Set(['的', '了', '和', '是', '在', '我', '你', '有', '要', '会', '吗', '呢', '啊', '什么', '怎么', '如何', '哪些']);
    
    // 分词（简单按字符分割，后续可接入专业分词工具）
    const questionWords = new Set(
      question.split(/[\s，。？！；：、]/)
        .map(w => w.trim())
        .filter(w => w.length > 1 && !stopWords.has(w))
    );
    
    const answerWords = new Set(
      answer.split(/[\s，。？！；：、]/)
        .map(w => w.trim())
        .filter(w => w.length > 1 && !stopWords.has(w))
    );

    if (questionWords.size === 0) {
      return 100;
    }

    // 计算重叠率
    let overlapCount = 0;
    for (const word of questionWords) {
      if (answerWords.has(word)) {
        overlapCount++;
      }
    }

    return Math.round((overlapCount / questionWords.size) * 100);
  }

  /**
   * 生成整体反馈（支持评分模板和多模态）
   */
  private generateOverallFeedback(
    relevance: { score: number; details: QAEvaluationResult['relevanceDetails'] },
    completeness: { score: number; details: QAEvaluationResult['completenessDetails'] },
    accuracy: { score: number; details: QAEvaluationResult['accuracyDetails'] },
    coherence: { score: number; details: QAEvaluationResult['coherenceDetails'] },
    scoringRubric: ScoringRubric | null = null,
    multimodalScores: MultimodalScores | null = null,
    dimensionOverallScore: number = 0
  ): string {
    const feedbackParts: string[] = [];

    // 相关性反馈
    if (relevance.score >= 80) {
      feedbackParts.push('✅ 回答与问题高度相关，语义匹配度很好');
    } else if (relevance.score >= 60) {
      feedbackParts.push('⚠️ 回答与问题基本相关，但存在部分偏离');
    } else {
      feedbackParts.push('❌ 回答与问题相关性较低，存在严重偏离');
    }

    // 完整度反馈
    if (completeness.score >= 80) {
      feedbackParts.push('✅ 回答内容完整，结构清晰，有充分的案例和数据支撑');
    } else {
      feedbackParts.push(`⚠️ 回答完整度有待提升：${completeness.details.missingItems.join('；')}`);
    }

    // 专业度反馈
    if (accuracy.details.wrongConcepts.length > 0) {
      feedbackParts.push(`❌ 存在专业错误：${accuracy.details.wrongConcepts.join('；')}`);
    }
    if (accuracy.details.suspectConcepts.length > 0) {
      feedbackParts.push(`⚠️ 部分专业概念使用存疑：${accuracy.details.suspectConcepts.join('、')}`);
    }
    if (accuracy.details.wrongConcepts.length === 0 && accuracy.details.suspectConcepts.length === 0) {
      feedbackParts.push('✅ 专业概念使用正确，知识准确度高');
    }

    // 逻辑反馈
    if (coherence.details.contradictions.length > 0) {
      feedbackParts.push(`❌ 存在逻辑矛盾：${coherence.details.contradictions.join('；')}`);
    }
    if (coherence.details.logicalGaps.length > 0) {
      feedbackParts.push(`⚠️ 存在逻辑跳跃：${coherence.details.logicalGaps.join('；')}`);
    }
    if (coherence.details.redundancy.length > 0) {
      feedbackParts.push(`⚠️ 存在冗余内容：${coherence.details.redundancy.join('；')}`);
    }
    if (coherence.details.contradictions.length === 0 && coherence.details.logicalGaps.length === 0 && coherence.details.redundancy.length === 0) {
      feedbackParts.push('✅ 逻辑连贯，论证清晰，没有明显的逻辑问题');
    }

    // 多模态反馈
    if (multimodalScores) {
      if (multimodalScores.overallMultimodalScore >= 8) {
        feedbackParts.push('✅ 多模态表现良好：表情自然，眼神专注，语气自信，表达流畅');
      } else if (multimodalScores.overallMultimodalScore >= 5) {
        const issues: string[] = [];
        if (multimodalScores.expressionScore < 5) issues.push('表情紧张');
        if (multimodalScores.eyeContactScore < 5) issues.push('眼神闪躲');
        if (multimodalScores.toneScore < 5) issues.push('语气犹豫');
        if (multimodalScores.speechRateScore < 5) issues.push('语速异常');
        if (multimodalScores.stutterScore < 5) issues.push('表达卡顿');
        feedbackParts.push(`⚠️ 多模态表现有待提升：${issues.join('、')}`);
      } else {
        feedbackParts.push('❌ 多模态表现较差，存在明显的紧张、不自信或说谎嫌疑');
      }
    }

    // 评分等级反馈
    if (scoringRubric) {
      const scoreLevel = dimensionOverallScore >= 8 ? '优秀' : dimensionOverallScore >= 5 ? '一般' : '不足';
      feedbackParts.push(`📊 评分等级：${scoreLevel}（${dimensionOverallScore}/10）`);
      if (dimensionOverallScore >= 8) {
        feedbackParts.push(`✅ ${scoringRubric.criteria.score10}`);
      } else if (dimensionOverallScore >= 5) {
        feedbackParts.push(`⚠️ ${scoringRubric.criteria.score5}`);
      } else {
        feedbackParts.push(`❌ ${scoringRubric.criteria.score0}`);
      }
    }

    return feedbackParts.join('\n');
  }

  /**
   * 获取空结果（未作答时）
   */
  private getEmptyResult(): QAEvaluationResult {
    return {
      relevanceScore: 0,
      completenessScore: 0,
      professionalAccuracyScore: 0,
      logicalCoherenceScore: 0,
      overallScore: 0,
      feedback: '未作答，无法评估',
      relevanceDetails: {
        embeddingSimilarity: 0,
        keywordOverlap: 0,
        semanticMatch: false
      },
      completenessDetails: {
        hasStructure: false,
        hasExamples: false,
        hasData: false,
        subQuestionsCovered: 0,
        subQuestionsTotal: 0,
        missingItems: ['未作答']
      },
      accuracyDetails: {
        conceptsExtracted: [],
        verifiedConcepts: [],
        suspectConcepts: [],
        wrongConcepts: []
      },
      coherenceDetails: {
        argumentCount: 0,
        contradictions: [],
        logicalGaps: [],
        redundancy: []
      }
    };
  }
}

// 导出单例
export const qaEvaluationService = new QAEvaluationService();
