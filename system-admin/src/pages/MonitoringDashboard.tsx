import React, { useState, useEffect, useRef } from 'react';
import { config } from '../config/config';
import { systemStatusApi, ServiceStatus } from '../services/api';
import ReactECharts from 'echarts-for-react';
import io from 'socket.io-client';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  SyncOutlined,
  ThunderboltOutlined,
  UserOutlined,
  BankOutlined,
  ExperimentOutlined,
  ShoppingOutlined
} from '@ant-design/icons';

interface DashboardStats {
  overview: {
    users: { total: number; active: number; newThisPeriod: number; };
    companies: { total: number; active: number; verified: number; newThisPeriod: number; };
    interviews: { total: number; completed: number; completionRate: string; };
    jobs: { total: number; };
  };
  timeRange: string;
}

interface ServiceLogItem {
  id: string;
  time: string;
  level: string;
  message: string;
  serviceName: string;
}

const MonitoringDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [serviceLogs, setServiceLogs] = useState<ServiceLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('all'); // 日志过滤
  const socketRef = useRef<any>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // WebSocket 连接
  useEffect(() => {
    const apiBaseUrl = config.API_BASE_URL;
    const socketUrl = apiBaseUrl.startsWith('http') 
      ? apiBaseUrl.replace('/api', '') 
      : `${window.location.protocol}//${window.location.host}`;
    
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket 已连接');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket 已断开');
      setConnected(false);
    });

    // 监听系统微服务健康状态更新
    socket.on('system:status_update', (data: { serviceName: string; isHealthy: boolean; timestamp: string }) => {
      setServices(prev => 
        prev.map(s => 
          s.name === data.serviceName 
            ? { ...s, isHealthy: data.isHealthy, lastCheckTime: Date.now() }
            : s
        )
      );
    });

    // 监听实时运行日志
    socket.on('system:service_log', (data: { serviceName: string; level: string; message: string; timestamp: string }) => {
      console.log('📡 收到实时日志:', data);
      const newLog: ServiceLogItem = {
        id: `slog-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        time: new Date(data.timestamp).toLocaleTimeString('zh-CN', { hour12: false }),
        level: data.level || 'info',
        message: data.message,
        serviceName: data.serviceName,
      };

      setServiceLogs(prev => [newLog, ...prev].slice(0, 100));
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  // 获取业务统计数据
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem(config.TOKEN_KEY);
      if (!token) return;
      
      const response = await fetch(`${config.API_BASE_URL}/admin/dashboard/stats?timeRange=30d`, {
        headers: {
          'Authorization': `${config.AUTH_HEADER_PREFIX} ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  // 获取服务状态
  const fetchServices = async () => {
    try {
      const response = await systemStatusApi.getAll();
      if (response.success && response.data) {
        setServices(response.data.services);
      }
    } catch (error) {
      console.error('获取服务状态失败:', error);
    }
  };

  // 初始加载数据
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchServices()])
      .then(() => setLoading(false))
      .catch(() => setLoading(false));
  }, []);

  // 自动刷新数据（每30秒）
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      fetchServices();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // 日志自动滚动
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [serviceLogs]);

  // 业务指标卡片
  const MetricCard = ({ icon, title, value, subtitle, color }: any) => (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      border: '1px solid #0f3460',
      borderRadius: '12px',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.1, color }}>
        {icon}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '32px', marginRight: '12px', color }}>{icon}</div>
        <div>
          <div style={{ color: '#8892b0', fontSize: '14px', marginBottom: '4px' }}>{title}</div>
          <div style={{ color: '#fff', fontSize: '36px', fontWeight: 'bold' }}>{value}</div>
        </div>
      </div>
      <div style={{ color: '#8892b0', fontSize: '13px' }}>{subtitle}</div>
    </div>
  );

  // 服务状态指示器
  const ServiceIndicator = ({ service }: { service: ServiceStatus }) => (
    <div style={{
      background: service.isHealthy ? 'rgba(82, 196, 26, 0.1)' : 'rgba(255, 77, 79, 0.1)',
      border: `1px solid ${service.isHealthy ? '#52c41a' : '#ff4d4f'}`,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
            {service.isHealthy ? <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} /> : 
                                <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />}
            {service.description}
          </div>
          <div style={{ color: '#8892b0', fontSize: '12px' }}>{service.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {service.responseTime && (
            <div style={{ color: service.responseTime < 100 ? '#52c41a' : '#faad14', fontSize: '14px' }}>
              <ThunderboltOutlined /> {service.responseTime}ms
            </div>
          )}
          {service.consecutiveFailures > 0 && (
            <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
              连续失败 {service.consecutiveFailures} 次
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ECharts 配置
  const getResponseTimeChartOption = () => ({
    backgroundColor: 'transparent',
    title: {
      text: '服务响应时间趋势',
      left: 'center',
      textStyle: { color: '#fff', fontSize: 16 }
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['ASR', 'TTS', 'Interview', 'Analysis'],
      axisLine: { lineStyle: { color: '#0f3460' } },
      axisLabel: { color: '#8892b0' }
    },
    yAxis: {
      type: 'value',
      name: '响应时间 (ms)',
      axisLine: { lineStyle: { color: '#0f3460' } },
      axisLabel: { color: '#8892b0' },
      splitLine: { lineStyle: { color: '#0f3460', type: 'dashed' } }
    },
    series: [{
      data: services.map(s => s.responseTime || 0),
      type: 'bar',
      itemStyle: {
        color: (params: any) => {
          const value = params.value;
          if (value < 100) return '#52c41a';
          if (value < 300) return '#faad14';
          return '#ff4d4f';
        }
      },
      barWidth: '40%'
    }]
  });

  const getBusinessTrendOption = () => ({
    backgroundColor: 'transparent',
    title: {
      text: '业务趋势（近7天）',
      left: 'center',
      textStyle: { color: '#fff', fontSize: 16 }
    },
    tooltip: { trigger: 'axis' },
    legend: { data: ['用户', '面试', '企业'], textStyle: { color: '#8892b0' }, top: 30 },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisLine: { lineStyle: { color: '#0f3460' } },
      axisLabel: { color: '#8892b0' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#0f3460' } },
      axisLabel: { color: '#8892b0' },
      splitLine: { lineStyle: { color: '#0f3460', type: 'dashed' } }
    },
    series: [
      {
        name: '用户',
        type: 'line',
        smooth: true,
        data: [120, 132, 101, 134, 90, 230, 210],
        areaStyle: { opacity: 0.3 },
        lineStyle: { width: 3 },
        itemStyle: { color: '#1890ff' }
      },
      {
        name: '面试',
        type: 'line',
        smooth: true,
        data: [80, 92, 71, 94, 70, 150, 140],
        areaStyle: { opacity: 0.3 },
        lineStyle: { width: 3 },
        itemStyle: { color: '#52c41a' }
      },
      {
        name: '企业',
        type: 'line',
        smooth: true,
        data: [30, 35, 28, 40, 32, 50, 45],
        areaStyle: { opacity: 0.3 },
        lineStyle: { width: 3 },
        itemStyle: { color: '#fa8c16' }
      }
    ]
  });

  const getInterviewRadarOption = () => ({
    backgroundColor: 'transparent',
    title: {
      text: '面试能力维度分布',
      left: 'center',
      textStyle: { color: '#fff', fontSize: 16 }
    },
    radar: {
      indicator: [
        { name: '专业能力', max: 100 },
        { name: '学习成长', max: 100 },
        { name: '沟通协作', max: 100 },
        { name: '问题解决', max: 100 },
        { name: '成就执行', max: 100 },
        { name: '抗压韧性', max: 100 }
      ],
      axisName: { color: '#8892b0' },
      splitArea: { areaStyle: { color: ['rgba(15, 52, 96, 0.3)', 'rgba(15, 52, 96, 0.5)'] } },
      splitLine: { lineStyle: { color: '#0f3460' } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [78, 75, 88, 85, 82, 82],
        name: '平均分',
        areaStyle: { opacity: 0.4 },
        lineStyle: { width: 2 },
        itemStyle: { color: '#1890ff' }
      }]
    }]
  });

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '600px',
        background: '#0a0e27',
        color: '#8892b0'
      }}>
        <SyncOutlined spin style={{ fontSize: 24, marginRight: 12 }} />
        <span style={{ fontSize: 16 }}>加载监控数据...</span>
      </div>
    );
  }

  const healthyCount = services.filter(s => s.isHealthy).length;
  const unhealthyCount = services.length - healthyCount;

  return (
    <div style={{
      background: '#0a0e27',
      minHeight: '100vh',
      padding: '24px',
      color: '#fff'
    }}>
      {/* 页面标题 */}
      <div style={{ 
        marginBottom: '32px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', background: 'linear-gradient(90deg, #1890ff, #52c41a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📊 AI面试系统监控大屏
          </h2>
          <p style={{ margin: '8px 0 0 0', color: '#8892b0', fontSize: '14px' }}>
            实时监控系统运行状态和业务数据
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '8px 16px',
            background: connected ? 'rgba(82, 196, 26, 0.1)' : 'rgba(255, 77, 79, 0.1)',
            border: `1px solid ${connected ? '#52c41a' : '#ff4d4f'}`,
            borderRadius: '20px'
          }}>
            <div style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              background: connected ? '#52c41a' : '#ff4d4f',
              animation: connected ? 'pulse 2s infinite' : 'none'
            }} />
            <span style={{ fontSize: '13px', color: connected ? '#52c41a' : '#ff4d4f' }}>
              {connected ? '实时连接中' : '连接断开'}
            </span>
          </div>
          <div style={{ color: '#8892b0', fontSize: '13px' }}>
            最后更新: {new Date().toLocaleTimeString('zh-CN')}
          </div>
        </div>
      </div>

      {/* 核心业务指标 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '20px', 
        marginBottom: '24px' 
      }}>
        <MetricCard 
          icon={<UserOutlined />}
          title="用户总数"
          value={stats?.overview.users.total.toLocaleString() || '0'}
          subtitle={`活跃 ${stats?.overview.users.active} | 新增 ${stats?.overview.users.newThisPeriod}`}
          color="#1890ff"
        />
        <MetricCard 
          icon={<BankOutlined />}
          title="注册企业"
          value={stats?.overview.companies.total.toLocaleString() || '0'}
          subtitle={`认证 ${stats?.overview.companies.verified} | 活跃 ${stats?.overview.companies.active}`}
          color="#52c41a"
        />
        <MetricCard 
          icon={<ExperimentOutlined />}
          title="面试总数"
          value={stats?.overview.interviews.total.toLocaleString() || '0'}
          subtitle={`完成 ${stats?.overview.interviews.completed} | 完成率 ${stats?.overview.interviews.completionRate}%`}
          color="#722ed1"
        />
        <MetricCard 
          icon={<ShoppingOutlined />}
          title="发布职位"
          value={stats?.overview.jobs.total.toLocaleString() || '0'}
          subtitle={`平均每家企业 ${Math.round((stats?.overview.jobs.total || 0) / (stats?.overview.companies.total || 1))} 个`}
          color="#fa8c16"
        />
      </div>

      {/* 主监控区域 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr', 
        gap: '20px', 
        marginBottom: '24px' 
      }}>
        {/* 左侧：图表区域 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 业务趋势图 */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid #0f3460',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <ReactECharts 
              option={getBusinessTrendOption()} 
              style={{ height: '350px' }}
            />
          </div>

          {/* 服务响应时间 & 能力雷达图 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px' 
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '1px solid #0f3460',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <ReactECharts 
                option={getResponseTimeChartOption()} 
                style={{ height: '300px' }}
              />
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '1px solid #0f3460',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <ReactECharts 
                option={getInterviewRadarOption()} 
                style={{ height: '300px' }}
              />
            </div>
          </div>
        </div>

        {/* 右侧：服务状态 */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid #0f3460',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <div style={{ 
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
              ️ 系统服务状态
            </h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ color: '#52c41a', fontSize: '14px' }}>
                ✓ {healthyCount} 健康
              </span>
              <span style={{ color: '#ff4d4f', fontSize: '14px' }}>
                ✗ {unhealthyCount} 异常
              </span>
            </div>
          </div>
          <div style={{ maxHeight: '700px', overflowY: 'auto' }}>
            {services.map(service => (
              <ServiceIndicator key={service.name} service={service} />
            ))}
          </div>
        </div>
      </div>

      {/* 实时日志流 */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '1px solid #0f3460',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <div style={{ 
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
            📡 实时日志流
          </h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* 服务过滤器 */}
            <select 
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              style={{
                padding: '6px 12px',
                background: '#1a1a2e',
                border: '1px solid #0f3460',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <option value="all">所有服务</option>
              {services.map(s => (
                <option key={s.name} value={s.name}>{s.description}</option>
              ))}
            </select>
            <div style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              background: '#1890ff',
              animation: 'pulse 1.5s infinite'
            }} />
            <span style={{ color: '#8892b0', fontSize: '13px' }}>
              监听中 - 共 {selectedService === 'all' ? serviceLogs.length : serviceLogs.filter(l => l.serviceName === selectedService).length} 条日志
            </span>
            <button
              onClick={() => setServiceLogs([])}
              style={{
                padding: '6px 12px',
                background: '#ff4d4f',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              清空日志
            </button>
          </div>
        </div>
        <div style={{ 
          backgroundColor: '#000', 
          borderRadius: '8px',
          padding: '16px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '13px',
          lineHeight: '1.8',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {(() => {
            const filteredLogs = selectedService === 'all' 
              ? serviceLogs 
              : serviceLogs.filter(l => l.serviceName === selectedService);
            
            if (filteredLogs.length === 0) {
              return (
                <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                   等待日志输入... 触发服务业务逻辑时日志会在此实时显示
                </div>
              );
            }
            
            return filteredLogs.map((log) => {
              let levelColor = '#10b981';
              if (log.level === 'warn') levelColor = '#f59e0b';
              else if (log.level === 'error') levelColor = '#ef4444';
              
              return (
                <div key={log.id} style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#6b7280' }}>[{log.time}]</span>
                  <span style={{ 
                    color: levelColor, 
                    backgroundColor: `${levelColor}20`, 
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    marginRight: '8px'
                  }}>
                    {log.level.toUpperCase()}
                  </span>
                  <span style={{ color: '#1890ff', marginRight: '8px' }}>
                    [{log.serviceName}]
                  </span>
                  <span style={{ color: '#e5e7eb' }}>
                    {log.message}
                  </span>
                </div>
              );
            });
          })()}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* CSS 动画 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default MonitoringDashboard;
