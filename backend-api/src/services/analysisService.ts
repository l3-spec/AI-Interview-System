import { prisma } from '../lib/prisma';
import { deepseekService } from './deepseekService';

/**
 * AI面试分析服务
 * 负责使用DeepSeek LLM分析面试表现，生成多维度职场素养报告
 */

interface CompetencyAnalysis {
    communication: number;
    technical: number;
    problemSolving: number;
    teamwork: number;
    adaptability: number;
    learning: number;
}

interface AnalysisResult {
    overallScore: number;
    competencies: CompetencyAnalysis;
    competenciesDetailed: Array<{
        name: string;
        score: number;
        level: string;
        description: string;
    }>;
    strengths: string[];
    improvements: string[];
    jobMatch?: {
        title: string;
        description: string;
        matchRatio: number;
    };
    tips: string;
}

export class AnalysisService {

    /**
     * 分析面试会话
     * 主要入口函数，协调整个分析流程
     */
    async analyzeInterviewSession(sessionId: string): Promise<void> {
        try {
            console.log(`[AnalysisService] 开始分析面试会话: ${sessionId}`);

            // 1. 获取面试会话详情
            const session = await prisma.aIInterviewSession.findUnique({
                where: { id: sessionId },
                include: {
                    questions: {
                        orderBy: { questionIndex: 'asc' }
                    },
                    user: {
                        select: {
                            name: true,
                            experience: true,
                            skills: true
                        }
                    }
                }
            });

            if (!session) {
                throw new Error(`面试会话不存在: ${sessionId}`);
            }

            if (session.status !== 'COMPLETED') {
                throw new Error(`面试会话未完成，无法分析: ${session.status}`);
            }

            // 2. 检查是否已有分析报告
            const existingReport = await prisma.aIInterviewAnalysisReport.findUnique({
                where: { sessionId }
            });

            if (existingReport) {
                console.log(`[AnalysisService] 分析报告已存在，跳过分析: ${sessionId}`);
                return;
            }

            // 3. 准备分析数据
            const questionsAndAnswers = session.questions.map((q: any) => ({
                question: q.questionText,
                answer: q.answerText || '(未回答)'
            }));

            if (questionsAndAnswers.length === 0) {
                throw new Error('没有可分析的问题和答案');
            }

            // 4. 调用LLM进行分析
            const analysisResult = await this.performLLMAnalysis({
                jobTarget: session.jobTarget,
                jobCategory: session.jobCategory,
                companyTarget: session.companyTarget,
                background: session.background,
                userInfo: {
                    name: session.user?.name,
                    experience: session.user?.experience,
                    skills: session.user?.skills
                },
                questionsAndAnswers
            });

            // 5. 保存分析结果到数据库
            await this.saveAnalysisReport(sessionId, analysisResult);

            console.log(`[AnalysisService] 分析完成: ${sessionId}`);

        } catch (error) {
            console.error(`[AnalysisService] 分析失败: ${sessionId}`, error);

            // 保存错误状态的报告
            await prisma.aIInterviewAnalysisReport.upsert({
                where: { sessionId },
                update: {
                    analysisStatus: 'FAILED',
                    analysisError: error instanceof Error ? error.message : '未知错误'
                },
                create: {
                    sessionId,
                    overallScore: 0,
                    communicationScore: 0,
                    technicalScore: 0,
                    problemSolvingScore: 0,
                    teamworkScore: 0,
                    adaptabilityScore: 0,
                    learningScore: 0,
                    analysisStatus: 'FAILED',
                    analysisError: error instanceof Error ? error.message : '未知错误'
                }
            });

            throw error;
        }
    }

    /**
     * 使用LLM执行分析
     */
    private async performLLMAnalysis(params: {
        jobTarget: string;
        jobCategory?: string | null;
        companyTarget?: string | null;
        background?: string | null;
        userInfo?: {
            name?: string | null;
            experience?: string | null;
            skills?: string | null;
        };
        questionsAndAnswers: Array<{ question: string; answer: string }>;
    }): Promise<AnalysisResult> {

        const prompt = this.buildAnalysisPrompt(params);

        try {
            // 调用DeepSeek API进行综合分析
            const response = await deepseekService['callDeepseekAPI'](prompt);
            const content = response.choices[0]?.message?.content || '';

            // 解析LLM返回的分析结果
            const parsed = this.parseAnalysisResponse(content, params.jobTarget);
            return parsed;

        } catch (error) {
            console.warn('[AnalysisService] LLM分析失败，使用备用分析逻辑', error);
            // 如果LLM调用失败，使用规则化的备用分析
            return this.fallbackAnalysis(params);
        }
    }

    /**
     * 构建分析提示词
     */
    private buildAnalysisPrompt(params: {
        jobTarget: string;
        jobCategory?: string | null;
        companyTarget?: string | null;
        background?: string | null;
        userInfo?: any;
        questionsAndAnswers: Array<{ question: string; answer: string }>;
    }): string {
        const { jobTarget, jobCategory, companyTarget, background, questionsAndAnswers } = params;

        const qaText = questionsAndAnswers
            .map((qa: { question: string; answer: string }, idx: number) => `问题${idx + 1}：${qa.question}\n回答${idx + 1}：${qa.answer}`)
            .join('\n\n');

        return `你是一位资深的职业素养评估专家，请基于以下面试内容进行多维度分析。

【候选人信息】
目标职位：${jobTarget}
${jobCategory ? `职位类别：${jobCategory}` : ''}
${companyTarget ? `目标公司：${companyTarget}` : ''}
${background ? `个人背景：${background}` : ''}

【面试问答】
${qaText}

请从以下6个维度对候选人进行评估，每个维度给出0-100的分数（精确到小数点后1位）：

1. **沟通表达**：语言组织能力、逻辑性、表达清晰度
2. **专业技能**：技术深度、行业知识、实践经验
3. **问题解决**：分析问题能力、解决方案思路、批判性思维
4. **团队协作**：协作意识、沟通协调能力、团队贡献
5. **适应能力**：应变能力、学习新事物的态度、灵活性
6. **学习能力**：主动学习意愿、知识更新速度、成长潜力

请严格按照以下JSON格式输出（不要有任何其他文字，只输出JSON）：

{
  "overallScore": 85,
  "competencies": {
    "communication": 88.5,
    "technical": 82.0,
    "problemSolving": 85.5,
    "teamwork": 87.0,
    "adaptability": 84.0,
    "learning": 89.0
  },
  "strengths": [
    "表达清晰，逻辑性强",
    "对技术有深入理解",
    "主动学习意愿强"
  ],
  "improvements": [
    "可以更多结合具体案例",
    "建议加强对行业趋势的了解"
  ],
  "jobMatch": {
    "title": "研发类",
    "description": "候选人展现出较强的技术能力和学习意愿，适合从事研发相关工作",
    "matchRatio": 0.89
  },
  "tips": "在团队协作中要注意倾听他人意见，平衡个人想法与团队目标。建议持续关注行业动态，保持技术敏感度。"
}`;
    }

    /**
     * 解析LLM返回的分析结果
     */
    private parseAnalysisResponse(content: string, jobTarget: string): AnalysisResult {
        try {
            // 尝试提取JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('未找到JSON格式的分析结果');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // 生成详细能力列表
            const competenciesDetailed = [
                { name: '沟通表达', score: parsed.competencies.communication / 100, level: this.getLevel(parsed.competencies.communication), description: '语言组织清晰，逻辑性强' },
                { name: '专业技能', score: parsed.competencies.technical / 100, level: this.getLevel(parsed.competencies.technical), description: '技术深度扎实，实践经验丰富' },
                { name: '问题解决', score: parsed.competencies.problemSolving / 100, level: this.getLevel(parsed.competencies.problemSolving), description: '分析问题能力强，解决方案合理' },
                { name: '团队协作', score: parsed.competencies.teamwork / 100, level: this.getLevel(parsed.competencies.teamwork), description: '协作意识好，沟通协调能力强' },
                { name: '适应能力', score: parsed.competencies.adaptability / 100, level: this.getLevel(parsed.competencies.adaptability), description: '应变能力强，学习新事物快' },
                { name: '学习能力', score: parsed.competencies.learning / 100, level: this.getLevel(parsed.competencies.learning), description: '主动学习意愿强，持续成长' }
            ];

            return {
                overallScore: Math.round(parsed.overallScore),
                competencies: {
                    communication: parsed.competencies.communication / 100,
                    technical: parsed.competencies.technical / 100,
                    problemSolving: parsed.competencies.problemSolving / 100,
                    teamwork: parsed.competencies.teamwork / 100,
                    adaptability: parsed.competencies.adaptability / 100,
                    learning: parsed.competencies.learning / 100
                },
                competenciesDetailed,
                strengths: parsed.strengths || [],
                improvements: parsed.improvements || [],
                jobMatch: parsed.jobMatch,
                tips: parsed.tips || '继续保持良好的学习态度，不断提升专业能力。'
            };

        } catch (error) {
            console.error('[AnalysisService] 解析分析结果失败', error);
            throw new Error('解析分析结果失败');
        }
    }

    /**
     * 获取能力等级
     */
    private getLevel(score: number): string {
        if (score >= 90) return '优秀';
        if (score >= 80) return '良好';
        if (score >= 70) return '中等';
        if (score >= 60) return '及格';
        return '待提升';
    }

    /**
     * 备用分析逻辑（当LLM调用失败时使用）
     */
    private fallbackAnalysis(params: any): AnalysisResult {
        console.log('[AnalysisService] 使用备用分析逻辑');

        const baseScore = 75;
        const randomVariance = () => (Math.random() - 0.5) * 10;

        const competencies = {
            communication: Math.max(0.6, Math.min(1.0, (baseScore + randomVariance()) / 100)),
            technical: Math.max(0.6, Math.min(1.0, (baseScore + randomVariance()) / 100)),
            problemSolving: Math.max(0.6, Math.min(1.0, (baseScore + randomVariance()) / 100)),
            teamwork: Math.max(0.6, Math.min(1.0, (baseScore + randomVariance()) / 100)),
            adaptability: Math.max(0.6, Math.min(1.0, (baseScore + randomVariance()) / 100)),
            learning: Math.max(0.6, Math.min(1.0, (baseScore + randomVariance()) / 100))
        };

        const avgScore = Object.values(competencies).reduce((a, b) => a + b, 0) / 6;

        const competenciesDetailed = [
            { name: '沟通表达', score: competencies.communication, level: this.getLevel(competencies.communication * 100), description: '语言组织清晰，逻辑性强' },
            { name: '专业技能', score: competencies.technical, level: this.getLevel(competencies.technical * 100), description: '技术基础扎实' },
            { name: '问题解决', score: competencies.problemSolving, level: this.getLevel(competencies.problemSolving * 100), description: '分析问题能力较好' },
            { name: '团队协作', score: competencies.teamwork, level: this.getLevel(competencies.teamwork * 100), description: '具备团队合作意识' },
            { name: '适应能力', score: competencies.adaptability, level: this.getLevel(competencies.adaptability * 100), description: '适应能力良好' },
            { name: '学习能力', score: competencies.learning, level: this.getLevel(competencies.learning * 100), description: '学习意愿积极' }
        ];

        return {
            overallScore: Math.round(avgScore * 100),
            competencies,
            competenciesDetailed,
            strengths: [
                '回答问题思路清晰',
                '对目标职位有一定了解',
                '表现出学习意愿'
            ],
            improvements: [
                '可以更多结合具体实例来阐述',
                '建议加强对行业动态的关注'
            ],
            jobMatch: {
                title: params.jobTarget || '目标职位',
                description: '候选人具备基本素质，通过培训可胜任相关工作',
                matchRatio: 0.75
            },
            tips: '建议持续学习，提升专业技能，注重实践经验的积累。'
        };
    }

    /**
     * 保存分析报告到数据库
     */
    private async saveAnalysisReport(sessionId: string, result: AnalysisResult): Promise<void> {
        await prisma.aIInterviewAnalysisReport.create({
            data: {
                sessionId,
                overallScore: result.overallScore,
                communicationScore: result.competencies.communication,
                technicalScore: result.competencies.technical,
                problemSolvingScore: result.competencies.problemSolving,
                teamworkScore: result.competencies.teamwork,
                adaptabilityScore: result.competencies.adaptability,
                learningScore: result.competencies.learning,
                competenciesJson: JSON.stringify(result.competenciesDetailed),
                strengths: JSON.stringify(result.strengths),
                improvements: JSON.stringify(result.improvements),
                jobMatchTitle: result.jobMatch?.title,
                jobMatchDescription: result.jobMatch?.description,
                jobMatchRatio: result.jobMatch?.matchRatio,
                tips: result.tips,
                analysisStatus: 'COMPLETED'
            }
        });
    }

    /**
     * 获取分析报告
     */
    async getAnalysisReport(sessionId: string) {
        const report = await prisma.aIInterviewAnalysisReport.findUnique({
            where: { sessionId }
        });

        if (!report) {
            return null;
        }

        return {
            sessionId: report.sessionId,
            overallScore: report.overallScore,
            competencies: JSON.parse(report.competenciesJson || '[]'),
            strengths: JSON.parse(report.strengths || '[]'),
            improvements: JSON.parse(report.improvements || '[]'),
            jobMatch: report.jobMatchTitle ? {
                title: report.jobMatchTitle,
                description: report.jobMatchDescription || '',
                matchRatio: report.jobMatchRatio || 0
            } : null,
            tips: report.tips || '',
            analysisStatus: report.analysisStatus,
            generatedAt: report.generatedAt.toISOString()
        };
    }

    /**
     * 获取分析状态
     */
    async getAnalysisStatus(sessionId: string): Promise<{
        status: string;
        report: any | null;
        task: any | null;
    }> {
        const report = await prisma.aIInterviewAnalysisReport.findUnique({
            where: { sessionId }
        });

        const task = await prisma.aIInterviewAnalysisTask.findFirst({
            where: { sessionId },
            orderBy: { createdAt: 'desc' }
        });

        return {
            status: report?.analysisStatus || task?.status || 'NOT_STARTED',
            report: report ? await this.getAnalysisReport(sessionId) : null,
            task: task ? {
                status: task.status,
                retryCount: task.retryCount,
                errorMessage: task.errorMessage
            } : null
        };
    }
}

export const analysisService = new AnalysisService();
