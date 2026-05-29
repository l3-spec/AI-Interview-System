import Redis from 'ioredis';
import { redisConnection } from '../config/redis';

export interface ServiceInfo {
  id: string;
  type: 'asr' | 'tts' | 'interview' | 'gateway';
  url: string;
  load: number; // Current active connections or load score
  lastSeen: number;
}

export class ServiceDiscoveryService {
  private static instance: ServiceDiscoveryService;
  private redis: Redis;
  private readonly REGISTRY_KEY = 'service:registry';

  private constructor() {
    this.redis = new Redis(redisConnection);
    this.redis.on('error', (err) => console.error(`[ServiceDiscovery] Redis Error: ${err.message}`));
    // 显式连接，捕获初始连接失败
    this.redis.connect().catch((err) => {
      console.warn(`[ServiceDiscovery] 初始连接失败，将在后续命令时自动重连: ${err.message}`);
    });
  }

  public static getInstance(): ServiceDiscoveryService {
    if (!ServiceDiscoveryService.instance) {
      ServiceDiscoveryService.instance = new ServiceDiscoveryService();
    }
    return ServiceDiscoveryService.instance;
  }

  /**
   * Register or update service heartbeat
   */
  async heartbeat(info: ServiceInfo) {
    const key = `${this.REGISTRY_KEY}:${info.type}:${info.id}`;
    await this.redis.setex(key, 15, JSON.stringify({
      ...info,
      lastSeen: Date.now()
    }));
  }

  /**
   * Get all active services of a certain type
   */
  async getServices(type: 'asr' | 'tts' | 'interview' | 'gateway'): Promise<ServiceInfo[]> {
    const pattern = `${this.REGISTRY_KEY}:${type}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length === 0) return [];

    const results = await this.redis.mget(...keys);
    return results
      .filter((r): r is string => r !== null)
      .map(r => JSON.parse(r) as ServiceInfo)
      .sort((a, b) => a.load - b.load); // Return least loaded first
  }

  /**
   * Get the best available service of a type
   * 超时 3 秒返回 null（避免 Redis 不可用时阻塞 gateway/join）
   */
  async getBestService(type: 'asr' | 'tts' | 'interview' | 'gateway'): Promise<ServiceInfo | null> {
    const DISCOVERY_TIMEOUT_MS = 3000;
    try {
      const services = await Promise.race([
        this.getServices(type),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('ServiceDiscovery超时(3s)')), DISCOVERY_TIMEOUT_MS)
        ),
      ]);
      return services.length > 0 ? services[0] : null;
    } catch (err: any) {
      console.warn(`[ServiceDiscovery] getBestService(${type}) 失败: ${err.message}`);
      return null;
    }
  }
}

export const serviceDiscoveryService = ServiceDiscoveryService.getInstance();
