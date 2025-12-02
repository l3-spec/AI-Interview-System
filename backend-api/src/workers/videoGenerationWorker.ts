import 'dotenv/config';
// @ts-ignore
import { Worker, QueueEvents } from 'bullmq';
import { redisConnection } from '../config/redis';
import { interviewMediaService } from '../services/interviewMediaService';

/**
 * Worker 监听 videoGeneration 队列并为每道题生成音频和视频
 */
export const videoGenerationWorker = new Worker(
  'videoGeneration',
  async (job: any) => {
    const { sessionId, regenerateMissingOnly } = job.data as {
      sessionId: string;
      regenerateMissingOnly?: boolean;
    };

    await interviewMediaService.processSession(sessionId, {
      regenerateMissingOnly: regenerateMissingOnly ?? false,
    });
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

// 侦听队列事件，便于调试
const queueEvents = new QueueEvents('videoGeneration', { connection: redisConnection });
queueEvents.on('waiting', (e) => console.log('[Queue] waiting', e.jobId));
queueEvents.on('active',  (e) => console.log('[Queue] active',  e.jobId));
queueEvents.on('completed', (e) => console.log('[Queue] done',    e.jobId));
queueEvents.on('failed', (e) => console.log('[Queue] failed',  e.jobId, e.failedReason));

console.log('[Worker] Wav2Lip 服务地址:', (process.env.WAV2LIP_SERVICE_URL || '未配置').slice(0, 64));
