/**
 * 面试服务
 * 处理面试会话的数据库操作
 */

// 模拟数据存储（实际项目中应使用数据库）
interface InterviewSession {
  sessionId: string;
  jobTarget: string;
  companyTarget: string;
  background: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  videoUrl?: string;
  duration?: number;
  analysisResult?: any;
}

interface Question {
  questionIndex: number;
  question: string;
  createdAt: Date;
}

interface Answer {
  questionIndex: number;
  answer: string;
  createdAt: Date;
}

interface VideoSegment {
  questionIndex: number;
  videoUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
}

class InterviewService {
  private sessions: Map<string, InterviewSession> = new Map();
  private questions: Map<string, Question[]> = new Map();
  private answers: Map<string, Answer[]> = new Map();
  private videoSegments: Map<string, VideoSegment[]> = new Map();

  /**
   * 创建面试会话
   */
  async createSession(sessionData: {
    sessionId: string;
    jobTarget: string;
    companyTarget: string;
    background: string;
    status: 'active' | 'completed' | 'cancelled';
    createdAt: Date;
  }): Promise<InterviewSession> {
    const session: InterviewSession = {
      ...sessionData
    };
    
    this.sessions.set(sessionData.sessionId, session);
    this.questions.set(sessionData.sessionId, []);
    this.answers.set(sessionData.sessionId, []);
    this.videoSegments.set(sessionData.sessionId, []);
    
    console.log(`创建面试会话: ${sessionData.sessionId}`);
    return session;
  }

  /**
   * 获取面试会话
   */
  async getSession(sessionId: string): Promise<InterviewSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * 更新面试会话
   */
  async updateSession(sessionId: string, updateData: Partial<InterviewSession>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updateData);
      this.sessions.set(sessionId, session);
      console.log(`更新面试会话: ${sessionId}`);
    }
  }

  /**
   * 添加问题到会话
   */
  async addQuestionToSession(sessionId: string, questionData: {
    questionIndex: number;
    question: string;
    createdAt: Date;
  }): Promise<void> {
    const questions = this.questions.get(sessionId) || [];
    questions.push(questionData);
    this.questions.set(sessionId, questions);
    console.log(`添加问题到会话 ${sessionId}: ${questionData.question}`);
  }

  /**
   * 保存答案
   */
  async saveAnswer(sessionId: string, answerData: {
    questionIndex: number;
    answer: string;
    createdAt: Date;
  }): Promise<void> {
    const answers = this.answers.get(sessionId) || [];
    answers.push(answerData);
    this.answers.set(sessionId, answers);
    console.log(`保存答案到会话 ${sessionId}: ${answerData.answer.substring(0, 50)}...`);
  }

  /**
   * 获取问题历史
   */
  async getQuestionHistory(sessionId: string): Promise<string[]> {
    const questions = this.questions.get(sessionId) || [];
    return questions.map(q => q.question);
  }

  /**
   * 获取答案历史
   */
  async getAnswerHistory(sessionId: string): Promise<string[]> {
    const answers = this.answers.get(sessionId) || [];
    return answers.map(a => a.answer);
  }

  /**
   * 保存视频片段
   */
  async saveVideoSegment(sessionId: string, videoData: {
    questionIndex: number;
    videoUrl: string;
    fileName: string;
    fileSize: number;
    uploadedAt: Date;
  }): Promise<void> {
    const segments = this.videoSegments.get(sessionId) || [];
    segments.push(videoData);
    this.videoSegments.set(sessionId, segments);
    console.log(`保存视频片段到会话 ${sessionId}: ${videoData.fileName}`);
  }

  /**
   * 获取面试会话列表
   */
  async getSessions(params: {
    page: number;
    limit: number;
    status?: string;
  }): Promise<{
    sessions: InterviewSession[];
    total: number;
    page: number;
    limit: number;
  }> {
    let allSessions = Array.from(this.sessions.values());
    
    // 状态过滤
    if (params.status) {
      allSessions = allSessions.filter(s => s.status === params.status);
    }
    
    // 排序（最新的在前）
    allSessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // 分页
    const start = (params.page - 1) * params.limit;
    const end = start + params.limit;
    const sessions = allSessions.slice(start, end);
    
    return {
      sessions,
      total: allSessions.length,
      page: params.page,
      limit: params.limit
    };
  }

  /**
   * 获取面试会话详情
   */
  async getSessionDetail(sessionId: string): Promise<{
    session: InterviewSession;
    questions: Question[];
    answers: Answer[];
    videoSegments: VideoSegment[];
  } | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const questions = this.questions.get(sessionId) || [];
    const answers = this.answers.get(sessionId) || [];
    const videoSegments = this.videoSegments.get(sessionId) || [];

    return {
      session,
      questions,
      answers,
      videoSegments
    };
  }

  /**
   * 删除面试会话
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      this.questions.delete(sessionId);
      this.answers.delete(sessionId);
      this.videoSegments.delete(sessionId);
      console.log(`删除面试会话: ${sessionId}`);
    }
    return deleted;
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<{
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    totalQuestions: number;
    totalAnswers: number;
  }> {
    const allSessions = Array.from(this.sessions.values());
    const totalQuestions = Array.from(this.questions.values()).reduce((sum, questions) => sum + questions.length, 0);
    const totalAnswers = Array.from(this.answers.values()).reduce((sum, answers) => sum + answers.length, 0);

    return {
      totalSessions: allSessions.length,
      activeSessions: allSessions.filter(s => s.status === 'active').length,
      completedSessions: allSessions.filter(s => s.status === 'completed').length,
      totalQuestions,
      totalAnswers
    };
  }
}

export const interviewService = new InterviewService(); 