import Redis from 'ioredis';
import { redisConnection } from './redis';

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
   */
  async getBestService(type: 'asr' | 'tts' | 'interview' | 'gateway'): Promise<ServiceInfo | null> {
    const services = await this.getServices(type);
    return services.length > 0 ? services[0] : null;
  }
}

export const serviceDiscoveryService = ServiceDiscoveryService.getInstance();
