import { Redis } from 'ioredis';
import { redisConnection } from '../config/redis';

export class RedisStreamService {
  private static instance: RedisStreamService;
  private redis: Redis;

  private constructor() {
    this.redis = new Redis(redisConnection);
  }

  public static getInstance(): RedisStreamService {
    if (!RedisStreamService.instance) {
      RedisStreamService.instance = new RedisStreamService();
    }
    return RedisStreamService.instance;
  }

  /**
   * Add message to a stream
   */
  async add(streamName: string, data: Record<string, any>, maxLen: number = 10000) {
    try {
      // Use XADD with MAXLEN to prevent stream from growing indefinitely
      return await this.redis.xadd(streamName, 'MAXLEN', '~', maxLen, '*', 'data', JSON.stringify(data));
    } catch (err) {
      console.error(`[RedisStream] Failed to add to ${streamName}:`, err);
      throw err;
    }
  }

  /**
   * Create a consumer group if it doesn't exist
   */
  async createConsumerGroup(streamName: string, groupName: string) {
    try {
      await this.redis.xgroup('CREATE', streamName, groupName, '0', 'MKSTREAM');
    } catch (err: any) {
      if (err.message.includes('BUSYGROUP')) {
        // Group already exists
        return;
      }
      console.error(`[RedisStream] Failed to create group ${groupName} for ${streamName}:`, err);
    }
  }

  /**
   * Read from a stream using a consumer group
   */
  async readGroup(streamName: string, groupName: string, consumerName: string, count: number = 1) {
    try {
      // Read new messages ('>')
      const result = await (this.redis.xreadgroup(
        'GROUP', groupName, consumerName,
        'COUNT', count,
        'BLOCK', 5000,
        'STREAMS', streamName, '>'
      ) as Promise<any>);

      if (!result || result.length === 0) return [];

      const [_stream, messages] = result[0];
      return messages.map(([id, fields]: [string, string[]]) => {
        const dataIndex = fields.indexOf('data');
        const data = dataIndex !== -1 ? JSON.parse(fields[dataIndex + 1]) : {};
        return { id, data };
      });
    } catch (err) {
      console.error(`[RedisStream] Failed to read from ${streamName}:`, err);
      return [];
    }
  }

  /**
   * Acknowledge a message
   */
  async ack(streamName: string, groupName: string, id: string) {
    return await this.redis.xack(streamName, groupName, id);
  }
}

export const redisStreamService = RedisStreamService.getInstance();
