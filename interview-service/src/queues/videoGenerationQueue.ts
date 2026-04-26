import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

/**
 * 视频生成任务队列
 * 负责调度 TTS→数字人视频 的异步生成
 */
export const videoGenerationQueue = new Queue('videoGeneration', {
  connection: redisConnection,
}); 