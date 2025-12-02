import { PrismaClient } from '@prisma/client';
import { ttsService } from './ttsService';
import { digitalHumanService } from './digitalHumanService';

const prisma = new PrismaClient();

interface ProcessSessionOptions {
  regenerateMissingOnly?: boolean;
}

interface QuestionRecord {
  id: string;
  questionIndex: number;
  questionText: string;
  audioUrl: string | null;
  audioPath: string | null;
  videoUrl: string | null;
  status: string | null;
}

class InterviewMediaService {
  async processSession(sessionId: string, options: ProcessSessionOptions = {}): Promise<void> {
    try {
      const session = await prisma.aIInterviewSession.findUnique({
        where: { id: sessionId },
        include: {
          questions: {
            orderBy: { questionIndex: 'asc' },
          },
        },
      });

      if (!session) {
        console.warn(`[InterviewMedia] 面试会话不存在: ${sessionId}`);
        return;
      }

      const regenerateMissingOnly = options.regenerateMissingOnly ?? false;

      for (const question of session.questions as QuestionRecord[]) {
        const alreadyReady =
          question.status === 'READY' &&
          !!question.audioUrl &&
          !!question.videoUrl;

        if (regenerateMissingOnly && alreadyReady) {
          continue;
        }

        await prisma.aIInterviewQuestion.update({
          where: { id: question.id },
          data: {
            status: 'PROCESSING',
          },
        });

        const ttsResult = await ttsService.textToSpeech({
          text: question.questionText,
          sessionId,
          questionIndex: question.questionIndex,
        });

        if (!ttsResult.success || (!ttsResult.audioPath && !ttsResult.audioUrl)) {
          await prisma.aIInterviewQuestion.update({
            where: { id: question.id },
            data: {
              status: 'FAILED',
            },
          });
          console.error(
            `[InterviewMedia] TTS生成失败: session=${sessionId}, question=${question.questionIndex}, error=${ttsResult.error}`
          );
          continue;
        }

        const audioPath = ttsResult.audioPath || question.audioPath || null;
        const audioUrl = ttsResult.audioUrl || question.audioUrl || null;

        await prisma.aIInterviewQuestion.update({
          where: { id: question.id },
          data: {
            audioPath,
            audioUrl,
            status: 'AUDIO_READY',
          },
        });

        const videoResult = await digitalHumanService.generateVideo({
          prompt: question.questionText,
          sessionId,
          questionIndex: question.questionIndex,
          audioPath: audioPath || undefined,
          audioUrl: audioUrl || undefined,
        });

        if (!videoResult.success || !videoResult.videoUrl) {
          await prisma.aIInterviewQuestion.update({
            where: { id: question.id },
            data: {
              status: 'AUDIO_READY',
            },
          });
          console.error(
            `[InterviewMedia] 数字人视频生成失败: session=${sessionId}, question=${question.questionIndex}, error=${videoResult.error}`
          );
          continue;
        }

        await prisma.aIInterviewQuestion.update({
          where: { id: question.id },
          data: {
            videoUrl: videoResult.videoUrl,
            status: 'READY',
          },
        });
      }

      await prisma.aIInterviewSession.update({
        where: { id: sessionId },
        data: {
          status: 'IN_PROGRESS',
        },
      });
    } catch (error) {
      console.error(`[InterviewMedia] 处理会话媒体失败: session=${sessionId}`, error);
    }
  }
}

export const interviewMediaService = new InterviewMediaService();
