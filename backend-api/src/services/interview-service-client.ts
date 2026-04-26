import axios from 'axios';

/**
 * Interview Service 客户端
 * backend-api 通过此客户端与独立的 Interview 微服务交互
 */
export class InterviewServiceClient {
  private static instance: InterviewServiceClient;
  private interviewServiceUrl: string;

  private constructor() {
    this.interviewServiceUrl = process.env.INTERVIEW_SERVICE_URL || 'http://localhost:3004';
  }

  static getInstance(): InterviewServiceClient {
    if (!InterviewServiceClient.instance) {
      InterviewServiceClient.instance = new InterviewServiceClient();
    }
    return InterviewServiceClient.instance;
  }

  async initializeSession(params: {
    sessionId: string;
    userId: string;
    userName: string;
    targetJob: string;
    background?: string;
  }) {
    const response = await axios.post(`${this.interviewServiceUrl}/sessions/init`, params);
    return response.data;
  }

  async startIntroductionPhase(userId: string, userName: string, isFirstTime: boolean) {
    const response = await axios.post(`${this.interviewServiceUrl}/sessions/start-intro`, { userId, userName, isFirstTime });
    return response.data.sessionId; // Original service returned sessionId string
  }

  async collectUserInfo(sessionId: string, info: any) {
    const response = await axios.post(`${this.interviewServiceUrl}/sessions/${sessionId}/user-info`, info);
    return response.data.userInfo;
  }

  async processUserResponse(sessionId: string, text: string) {
    const response = await axios.post(`${this.interviewServiceUrl}/sessions/${sessionId}/response`, { text });
    return response.data;
  }

  async startInterviewPhase(sessionId: string) {
    const response = await axios.post(`${this.interviewServiceUrl}/sessions/${sessionId}/start-phase`);
    return response.data;
  }

  async startNextRound(sessionId: string) {
    const response = await axios.post(`${this.interviewServiceUrl}/sessions/${sessionId}/next-round`);
    return response.data.nextRound;
  }

  async endInterview(sessionId: string) {
    const response = await axios.post(`${this.interviewServiceUrl}/sessions/${sessionId}/end`);
    return response.data;
  }

  async getSession(sessionId: string) {
    const response = await axios.get(`${this.interviewServiceUrl}/sessions/${sessionId}`);
    return response.data;
  }

  async getAllSessions() {
    const response = await axios.get(`${this.interviewServiceUrl}/sessions`);
    return response.data.sessions;
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${this.interviewServiceUrl}/health`, { timeout: 2000 });
      return response.data;
    } catch {
      return null;
    }
  }
}

export const interviewServiceClient = InterviewServiceClient.getInstance();
