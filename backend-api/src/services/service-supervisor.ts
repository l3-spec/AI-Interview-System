import axios from 'axios';

/**
 * 服务监控器（Docker 部署模式）
 * 仅负责健康检查和状态监控，不再管理进程生命周期
 * 服务生命周期由 Docker/docker-compose 管理
 */

interface ServiceConfig {
  name: string;
  /** 服务端口 */
  port: number;
  /** 健康检查路径 */
  healthEndpoint: string;
  /** 
   * Docker 模式下的服务地址（从 .env 读取）
   * 格式如 http://asr-service:3002 或 http://172.17.0.1:3002
   */
  serviceUrl: string;
  /** 服务描述 */
  description: string;
}

export class ServiceSupervisor {
  private static instance: ServiceSupervisor;
  private services: Map<string, { 
    config: ServiceConfig, 
    isHealthy: boolean,
    lastCheckTime?: number,
    consecutiveFailures: number,
    responseTime?: number
  }> = new Map();
  private isShuttingDown = false;
  private statusChangeCallbacks: Array<(serviceName: string, isHealthy: boolean) => void> = [];

  private constructor() {
    console.log('[Supervisor] 服务监控器初始化（Docker 部署模式）');
    this.initServices();
  }

  public static getInstance(): ServiceSupervisor {
    if (!ServiceSupervisor.instance) {
      ServiceSupervisor.instance = new ServiceSupervisor();
    }
    return ServiceSupervisor.instance;
  }

  private initServices() {
    const configs: ServiceConfig[] = [
      {
        name: 'asr-service',
        port: 3002,
        healthEndpoint: '/health',
        serviceUrl: process.env.ASR_SERVICE_URL || 'http://localhost:3002',
        description: 'ASR 语音识别服务',
      },
      {
        name: 'tts-service',
        port: 3003,
        healthEndpoint: '/health',
        serviceUrl: process.env.TTS_SERVICE_URL || 'http://localhost:3003',
        description: 'TTS 语音合成服务',
      },
      {
        name: 'interview-service',
        port: 3004,
        healthEndpoint: '/health',
        serviceUrl: process.env.INTERVIEW_SERVICE_URL || 'http://localhost:3004',
        description: '面试流程服务',
      },
      {
        name: 'analysis-service',
        port: 3005,
        healthEndpoint: '/health',
        serviceUrl: process.env.ANALYSIS_SERVICE_URL || 'http://localhost:3005',
        description: '数据分析服务',
      },
    ];

    for (const config of configs) {
      this.services.set(config.name, { 
        config, 
        isHealthy: false,
        consecutiveFailures: 0
      });
    }
  }

  /**
   * 获取服务的健康检查完整 URL
   */
  private getHealthCheckUrl(config: ServiceConfig): string {
    return `${config.serviceUrl}${config.healthEndpoint}`;
  }

  /**
   * 注册状态变化回调（用于 WebSocket 推送）
   */
  public onStatusChange(callback: (serviceName: string, isHealthy: boolean) => void) {
    this.statusChangeCallbacks.push(callback);
  }

  /**
   * 启动所有服务的健康监控
   */
  public async startAll() {
    console.log('🔍 [Supervisor] 启动服务健康监控...');
    
    // 首次立即检查一次
    await this.checkHealthAll();
    
    // 每 10 秒检查一次
    setInterval(() => this.checkHealthAll(), 10000);
  }

  /**
   * 检查所有服务的健康状态
   */
  private async checkHealthAll() {
    if (this.isShuttingDown) return;

    for (const [name, service] of this.services.entries()) {
      const healthUrl = this.getHealthCheckUrl(service.config);
      const startTime = Date.now();
      
      try {
        const response = await axios.get(healthUrl, { timeout: 3000 });
        const responseTime = Date.now() - startTime;
        
        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        // 健康检查成功
        const wasHealthy = service.isHealthy;
        service.isHealthy = true;
        service.consecutiveFailures = 0;
        service.lastCheckTime = Date.now();
        service.responseTime = responseTime;
        
        if (!wasHealthy) {
          console.log(`✅ [Supervisor] 服务 ${name} 恢复正常 (响应时间: ${responseTime}ms)`);
          this.notifyStatusChange(name, true);
        }
      } catch (err: any) {
        service.consecutiveFailures++;
        service.isHealthy = false;
        service.lastCheckTime = Date.now();
        
        const wasHealthy = service.consecutiveFailures === 1;
        if (wasHealthy) {
          console.warn(`⚠️ [Supervisor] 服务 ${name} 健康检查失败 (${healthUrl}): ${err.message}`);
          this.notifyStatusChange(name, false);
        }
      }
    }
  }

  /**
   * 通知状态变化
   */
  private notifyStatusChange(serviceName: string, isHealthy: boolean) {
    for (const callback of this.statusChangeCallbacks) {
      try {
        callback(serviceName, isHealthy);
      } catch (err) {
        console.error('[Supervisor] 状态变化回调执行失败:', err);
      }
    }
  }

  /**
   * 获取所有服务的状态（用于 API 暴露）
   */
  public getServicesStatus() {
    const statuses = [];
    for (const [name, service] of this.services.entries()) {
      statuses.push({
        name: service.config.name,
        description: service.config.description,
        serviceUrl: service.config.serviceUrl,
        isHealthy: service.isHealthy,
        lastCheckTime: service.lastCheckTime,
        consecutiveFailures: service.consecutiveFailures,
        responseTime: service.responseTime,
      });
    }
    return statuses;
  }

  /**
   * 关闭监控
   */
  public shutdown() {
    this.isShuttingDown = true;
    console.log('[Supervisor] 服务监控已关闭');
  }
}

export const serviceSupervisor = ServiceSupervisor.getInstance();
