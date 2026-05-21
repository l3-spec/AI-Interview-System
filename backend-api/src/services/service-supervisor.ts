import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

/**
 * 部署模式：
 * - local: 本地开发模式，通过 child_process 拉起子服务
 * - docker: Docker 部署模式，子服务由 docker-compose 管理，仅做健康监控
 */
type DeployMode = 'local' | 'docker';

interface ServiceConfig {
  name: string;
  /** 本地模式下的工作目录（Docker 模式无意义） */
  cwd: string;
  /** 本地模式下的启动命令 */
  command: string;
  /** 本地模式下的启动参数 */
  args: string[];
  /** 服务端口 */
  port: number;
  /** 健康检查路径 */
  healthEndpoint: string;
  /** 环境变量（本地模式用） */
  env?: Record<string, string>;
  /** 
   * Docker 模式下的服务地址（从 .env 读取）
   * 格式如 http://172.17.0.1:3002
   * 如果未配置则回退到 http://<DOCKER_HOST>:<port>
   */
  dockerUrl?: string;
  /**
   * Docker 模式下对应的容器名称，用于执行 docker restart
   * 如不配置，则不执行自动重启
   */
  dockerContainerName?: string;
}

export class ServiceSupervisor {
  private static instance: ServiceSupervisor;
  private services: Map<string, { 
    process: ChildProcess | null, 
    config: ServiceConfig, 
    restartCount: number,
    lastRestartTime?: number,
    consecutiveFailures: number
  }> = new Map();
  private readonly projectRoot: string;
  private readonly logDir: string;
  private isShuttingDown = false;
  /** 当前部署模式 */
  private readonly deployMode: DeployMode;
  /** Docker 宿主机地址（从容器内访问宿主） */
  private readonly dockerHost: string;

  private constructor() {
    this.projectRoot = path.resolve(__dirname, '../../..');
    this.logDir = path.resolve(__dirname, '../../logs');

    // 根据环境变量决定部署模式
    // DEPLOY_MODE=docker 表示 Docker 部署，否则为本地开发
    this.deployMode = (process.env.DEPLOY_MODE || 'local') as DeployMode;
    // Docker 宿主机地址，默认 172.17.0.1（Docker 默认桥接网络网关）
    this.dockerHost = process.env.DOCKER_HOST_IP || '172.17.0.1';

    console.log(`[Supervisor] 部署模式: ${this.deployMode}, Docker宿主机: ${this.dockerHost}`);
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
        cwd: path.join(this.projectRoot, 'asr-service'),
        command: 'npm',
        args: ['run', 'dev'],
        port: 3002,
        healthEndpoint: '/health',
        env: { PORT: '3002' },
        // 从环境变量读取 Docker 模式下的服务地址
        dockerUrl: process.env.ASR_SERVICE_URL,
        dockerContainerName: process.env.ASR_CONTAINER_NAME || 'asr-service',
      },
      {
        name: 'tts-service',
        cwd: path.join(this.projectRoot, 'tts-service'),
        command: 'npm',
        args: ['run', 'dev'],
        port: 3003,
        healthEndpoint: '/health',
        env: { PORT: '3003' },
        dockerUrl: process.env.TTS_SERVICE_URL,
        dockerContainerName: process.env.TTS_CONTAINER_NAME || 'tts-service',
      },
      {
        name: 'interview-service',
        cwd: path.join(this.projectRoot, 'interview-service'),
        command: 'npm',
        args: ['run', 'dev'],
        port: 3004,
        healthEndpoint: '/health',
        env: { PORT: '3004' },
        dockerUrl: process.env.INTERVIEW_SERVICE_URL,
        dockerContainerName: process.env.INTERVIEW_CONTAINER_NAME || 'interview-service',
      },
      {
        name: 'analysis-service',
        cwd: path.join(this.projectRoot, 'analysis-service'),
        command: 'npm',
        args: ['run', 'start'],
        port: 3005,
        healthEndpoint: '/health',
        env: { PORT: '3005' },
        dockerUrl: process.env.ANALYSIS_SERVICE_URL || `http://${this.dockerHost}:3005`,
        dockerContainerName: process.env.ANALYSIS_CONTAINER_NAME || 'analysis-service',
      },
    ];

    for (const config of configs) {
      this.services.set(config.name, { 
        process: null, 
        config, 
        restartCount: 0,
        consecutiveFailures: 0
      });
    }
  }

  /**
   * 获取服务的健康检查完整 URL
   * - 本地模式: http://localhost:<port><healthEndpoint>
   * - Docker 模式: <dockerUrl><healthEndpoint>（如 http://172.17.0.1:3002/health）
   */
  private getHealthCheckUrl(config: ServiceConfig): string {
    if (this.deployMode === 'docker' && config.dockerUrl) {
      return `${config.dockerUrl}${config.healthEndpoint}`;
    }
    return `http://localhost:${config.port}${config.healthEndpoint}`;
  }

  public async startAll() {
    if (this.deployMode === 'docker') {
      console.log('🐳 [Supervisor] Docker 部署模式 — 子服务由 Docker/docker-compose 管理');
      console.log('🐳 [Supervisor] 仅执行健康检查监控，不通过 spawn 拉起进程');
      // Docker 模式下仅启动监控，不拉起进程
      setInterval(() => this.checkHealthAll(), 10000);
      // 首次立即检查一次
      setTimeout(() => this.checkHealthAll(), 3000);
      return;
    }

    // 本地模式：原有逻辑 —— spawn 子进程
    console.log('🚀 [Supervisor] 本地开发模式 — 正在启动所有子服务...');
    for (const serviceName of this.services.keys()) {
      await this.startService(serviceName);
    }
    // 启动健康检查定时器
    setInterval(() => this.checkHealthAll(), 10000);
  }

  /**
   * 拉起服务（仅本地模式有效）
   */
  private async startService(name: string) {
    if (this.deployMode === 'docker') {
      // Docker 模式下不通过 spawn 拉起服务
      console.log(`🐳 [Supervisor] Docker 模式：跳过 spawn ${name}，请确保容器已启动`);
      return;
    }

    const service = this.services.get(name);
    if (!service) return;

    if (service.process) {
      console.log(`[Supervisor] 服务 ${name} 已经在运行中 (PID: ${service.process.pid})`);
      return;
    }

    console.log(`[Supervisor] 正在拉起服务: ${name} (CWD: ${service.config.cwd})`);

    const child = spawn(service.config.command, service.config.args, {
      cwd: service.config.cwd,
      env: { 
        ...process.env, 
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH}`,
        ...service.config.env 
      },
      stdio: 'pipe',
      shell: true,
    });

    service.process = child;

    // 记录日志
    if (!fs.existsSync(this.logDir)) fs.mkdirSync(this.logDir, { recursive: true });
    const logStream = fs.createWriteStream(path.join(this.logDir, `${name}.log`), { flags: 'a' });
    
    child.stdout?.pipe(logStream);
    child.stderr?.pipe(logStream);

    child.on('exit', (code, signal) => {
      service.process = null;
      if (!this.isShuttingDown) {
        console.error(`❌ [Supervisor] 服务 ${name} 已退出 (代码: ${code}, 信号: ${signal})。准备重启...`);
        service.restartCount++;
        
        // 重启退避逻辑：基础 3s，随连续失败次数增加
        const backoff = Math.min(30000, 3000 * Math.pow(1.5, service.consecutiveFailures));
        console.log(`[Supervisor] 服务 ${name} 将在 ${Math.round(backoff/1000)}s 后尝试重启 (连续失败: ${service.consecutiveFailures})`);
        
        setTimeout(() => this.startService(name), backoff);
      }
    });

    child.on('error', (err) => {
      console.error(`❌ [Supervisor] 服务 ${name} 启动错误:`, err);
    });

    // 等待服务端口就绪（可选）
  }

  /**
   * Docker 模式下尝试重启容器
   * 通过执行 docker restart <containerName> 命令实现
   */
  private async restartDockerContainer(name: string, containerName: string) {
    console.log(`🐳 [Supervisor] 尝试重启 Docker 容器: ${containerName}`);
    try {
      const { execSync } = require('child_process');
      execSync(`docker restart ${containerName}`, { timeout: 30000 });
      console.log(`✅ [Supervisor] Docker 容器 ${containerName} 重启成功`);
    } catch (err: any) {
      console.error(`❌ [Supervisor] Docker 容器 ${containerName} 重启失败: ${err.message}`);
      console.error(`   提示: 请确保 backend-api 容器有权限访问 Docker socket (挂载 /var/run/docker.sock)`);
    }
  }

  private async checkHealthAll() {
    if (this.isShuttingDown) return;

    for (const [name, service] of this.services.entries()) {
      const healthUrl = this.getHealthCheckUrl(service.config);
      try {
        const response = await axios.get(healthUrl, { timeout: 3000 });
        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}`);
        }
        // 健康检查成功，重置连续失败计数
        if (service.consecutiveFailures > 0) {
          console.log(`✅ [Supervisor] 服务 ${name} 恢复正常 (之前连续失败 ${service.consecutiveFailures} 次)`);
        }
        service.consecutiveFailures = 0;
      } catch (err: any) {
        service.consecutiveFailures++;
        console.warn(`⚠️ [Supervisor] 服务 ${name} 健康检查失败 (${healthUrl}): ${err.message} (连续失败: ${service.consecutiveFailures})`);
        
        if (this.deployMode === 'docker') {
          // Docker 模式：连续失败多次后尝试 docker restart
          if (service.consecutiveFailures >= 3 && service.config.dockerContainerName) {
            // 避免频繁重启：上次重启后至少等 60s
            const now = Date.now();
            if (!service.lastRestartTime || (now - service.lastRestartTime) > 60000) {
              service.lastRestartTime = now;
              await this.restartDockerContainer(name, service.config.dockerContainerName);
            } else {
              console.log(`[Supervisor] 服务 ${name} 距上次重启不足 60s，跳过重启`);
            }
          }
        } else {
          // 本地模式：原有逻辑
          if (service.process) {
             if (service.consecutiveFailures >= 3) {
               console.log(`[Supervisor] 服务 ${name} 连续 ${service.consecutiveFailures} 次健康检查失败，强制重启卡死的进程`);
               service.process.kill('SIGKILL');
             }
          } else {
             // 进程不在，尝试启动
             await this.startService(name);
          }
        }
      }
    }
  }

  /**
   * 获取所有服务的状态摘要（用于 API 暴露）
   */
  public getServicesStatus(): Array<{
    name: string;
    mode: DeployMode;
    healthUrl: string;
    consecutiveFailures: number;
    restartCount: number;
    containerName?: string;
  }> {
    const statuses = [];
    for (const [name, service] of this.services.entries()) {
      statuses.push({
        name,
        mode: this.deployMode,
        healthUrl: this.getHealthCheckUrl(service.config),
        consecutiveFailures: service.consecutiveFailures,
        restartCount: service.restartCount,
        containerName: this.deployMode === 'docker' ? service.config.dockerContainerName : undefined,
      });
    }
    return statuses;
  }

  public shutdown() {
    this.isShuttingDown = true;
    console.log('[Supervisor] 正在关闭所有子服务...');
    if (this.deployMode === 'local') {
      for (const [name, service] of this.services.entries()) {
        if (service.process) {
          service.process.kill('SIGTERM');
        }
      }
    }
    // Docker 模式下不杀容器，由 docker-compose down 管理
    console.log(`[Supervisor] 部署模式: ${this.deployMode}，已完成关闭`);
  }
}

export const serviceSupervisor = ServiceSupervisor.getInstance();
