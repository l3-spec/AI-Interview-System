import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

interface ServiceConfig {
  name: string;
  cwd: string;
  command: string;
  args: string[];
  port: number;
  healthEndpoint: string;
  env?: Record<string, string>;
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

  private constructor() {
    this.projectRoot = path.resolve(__dirname, '../../..');
    this.logDir = path.resolve(__dirname, '../../logs');
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
      },
      {
        name: 'tts-service',
        cwd: path.join(this.projectRoot, 'tts-service'),
        command: 'npm',
        args: ['run', 'dev'],
        port: 3003,
        healthEndpoint: '/health',
        env: { PORT: '3003' },
      },
      {
        name: 'interview-service',
        cwd: path.join(this.projectRoot, 'interview-service'),
        command: 'npm',
        args: ['run', 'dev'],
        port: 3004,
        healthEndpoint: '/health',
        env: { PORT: '3004' },
      },
      {
        name: 'analysis-service',
        cwd: path.join(this.projectRoot, 'analysis-service'),
        command: 'npm',
        args: ['run', 'start'],
        port: 3005,
        healthEndpoint: '/health',
        env: { PORT: '3005' },
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

  public async startAll() {
    console.log('🚀 [Supervisor] 正在启动所有子服务...');
    for (const serviceName of this.services.keys()) {
      await this.startService(serviceName);
    }

    // 启动健康检查定时器
    setInterval(() => this.checkHealthAll(), 10000);
  }

  private async startService(name: string) {
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

  private async checkHealthAll() {
    if (this.isShuttingDown) return;

    for (const [name, service] of this.services.entries()) {
      try {
        const response = await axios.get(`http://localhost:${service.config.port}${service.config.healthEndpoint}`, { timeout: 3000 });
        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}`);
        }
        // 健康检查成功，重置连续失败计数
        service.consecutiveFailures = 0;
      } catch (err: any) {
        service.consecutiveFailures++;
        console.warn(`⚠️ [Supervisor] 服务 ${name} 健康检查失败: ${err.message} (连续失败: ${service.consecutiveFailures})`);
        
        // 如果进程在但健康检查连续失败多次，才强制重启
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

  public shutdown() {
    this.isShuttingDown = true;
    console.log('[Supervisor] 正在关闭所有子服务...');
    for (const [name, service] of this.services.entries()) {
      if (service.process) {
        service.process.kill('SIGTERM');
      }
    }
  }
}

export const serviceSupervisor = ServiceSupervisor.getInstance();
