import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card, Table, Tag, Space, Statistic, Row, Col, Typography, Badge, Tooltip, Tabs } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { systemStatusApi, ServiceStatus } from '../services/api';
import io from 'socket.io-client';
import { config } from '../config/config';

const { Title, Text } = Typography;

interface StatusLog {
  id: string;
  time: string;
  serviceName: string;
  isHealthy: boolean;
  message: string;
}

interface ServiceLogItem {
  id: string;
  time: string;
  level: string;
  message: string;
}

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  'backend-api': '后端主服务',
  'asr-service': 'ASR 语音识别服务',
  'tts-service': 'TTS 语音合成服务',
  'interview-service': '面试流程服务',
  'analysis-service': '数据分析服务',
};

const SystemLogs: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  
  // 实时运行日志状态
  const [serviceLogs, setServiceLogs] = useState<Record<string, ServiceLogItem[]>>({});
  const [activeService, setActiveService] = useState('backend-api');
  const [autoScroll, setAutoScroll] = useState(true);

  // 动态生成服务日志控制台的 Tab 列表（包含主后端及动态获取的微服务）
  const serviceTabs = useMemo(() => {
    const base = [
      { key: 'backend-api', label: '后端主服务 (backend-api)' }
    ];
    const dynamic = services.map(s => ({
      key: s.name,
      label: `${s.description || s.name} (${s.name})`
    }));
    return [...base, ...dynamic];
  }, [services]);

  const socketRef = useRef<any>(null);
  const statusLogIdCounter = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  // 获取服务健康检查状态
  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await systemStatusApi.getAll();
      if (response.success && response.data) {
        setServices(response.data.services);
      }
    } catch (error) {
      console.error('获取服务状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 添加系统健康状态变更日志
  const addStatusLog = (serviceName: string, isHealthy: boolean) => {
    const desc = SERVICE_DESCRIPTIONS[serviceName] || serviceName;
    const log: StatusLog = {
      id: `status-log-${statusLogIdCounter.current++}`,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      serviceName,
      isHealthy,
      message: isHealthy 
        ? `${desc} 恢复正常` 
        : `${desc} 健康检查失败`,
    };
    
    setStatusLogs(prev => [log, ...prev].slice(0, 100)); // 最多保留 100 条
  };

  // 实时运行日志自动滚动
  useEffect(() => {
    if (autoScroll) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serviceLogs, activeService, autoScroll]);

  // 初始化 WebSocket 连接
  useEffect(() => {
    const apiBaseUrl = config.API_BASE_URL;
    const socketUrl = apiBaseUrl.startsWith('http') 
      ? apiBaseUrl.replace('/api', '') 
      : `${window.location.protocol}//${window.location.host}`;
    
    console.log('🔌 正在连接 WebSocket:', socketUrl);
    
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

    // 1. 监听系统微服务健康状态更新
    socket.on('system:status_update', (data: { serviceName: string; isHealthy: boolean; timestamp: string }) => {
      console.log('📡 收到服务状态更新:', data);
      addStatusLog(data.serviceName, data.isHealthy);
      
      // 同步更新服务状态列表
      setServices(prev => 
        prev.map(s => 
          s.name === data.serviceName 
            ? { ...s, isHealthy: data.isHealthy, lastCheckTime: Date.now() }
            : s
        )
      );
    });

    // 2. 监听微服务吐出的实时运行日志
    socket.on('system:service_log', (data: { serviceName: string; level: string; message: string; timestamp: string }) => {
      const newLog: ServiceLogItem = {
        id: `slog-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        time: new Date(data.timestamp).toLocaleTimeString('zh-CN', { hour12: false }),
        level: data.level || 'info',
        message: data.message,
      };

      setServiceLogs(prev => {
        const list = prev[data.serviceName] || [];
        return {
          ...prev,
          [data.serviceName]: [...list, newLog].slice(-500), // 内存中最多保留 500 条
        };
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []); // 仅在 Mounted 时挂载一次，规避 services 改变引起的 socket 重新连结

  // 初始加载服务状态
  useEffect(() => {
    fetchServices();
  }, []);

  // 服务状态表格列
  const columns = [
    {
      title: '服务名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ServiceStatus) => (
        <Space>
          <Text strong>{record.description}</Text>
          <Text type="secondary" copyable={{ text: record.serviceUrl }}>
            ({name})
          </Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isHealthy',
      key: 'isHealthy',
      render: (isHealthy: boolean) => (
        isHealthy ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            健康
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            异常
          </Tag>
        )
      ),
    },
    {
      title: '响应时间',
      dataIndex: 'responseTime',
      key: 'responseTime',
      render: (responseTime?: number) => (
        responseTime ? (
          <Space>
            <ThunderboltOutlined style={{ color: responseTime < 100 ? '#52c41a' : responseTime < 300 ? '#faad14' : '#ff4d4f' }} />
            <Text>{responseTime}ms</Text>
          </Space>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: '连续失败',
      dataIndex: 'consecutiveFailures',
      key: 'consecutiveFailures',
      render: (count: number) => (
        count > 0 ? (
          <Tag color="error">{count} 次</Tag>
        ) : (
          <Tag color="success">0</Tag>
        )
      ),
    },
    {
      title: '最后检查',
      dataIndex: 'lastCheckTime',
      key: 'lastCheckTime',
      render: (time?: number) => (
        time ? (
          <Space>
            <ClockCircleOutlined />
            <Text type="secondary">
              {new Date(time).toLocaleTimeString('zh-CN', { hour12: false })}
            </Text>
          </Space>
        ) : (
          <Text type="secondary">未检查</Text>
        )
      ),
    },
  ];

  // 统计信息
  const healthyCount = services.filter(s => s.isHealthy).length;
  const unhealthyCount = services.length - healthyCount;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>系统监控日志</Title>
        <Text type="secondary">实时展示各微服务的健康状态和运行日志</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="监控子服务数"
              value={services.length}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="健康服务"
              value={healthyCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="异常服务"
              value={unhealthyCount}
              valueStyle={{ color: unhealthyCount > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Space>
              <Badge status={connected ? 'success' : 'error'} />
              <Text>{connected ? 'WebSocket 已连接' : 'WebSocket 未连接'}</Text>
            </Space>
            <div style={{ marginTop: 8 }}>
              <Tooltip title="刷新服务状态">
                <ReloadOutlined 
                  onClick={fetchServices} 
                  spin={loading}
                  style={{ cursor: 'pointer', fontSize: 20 }}
                />
              </Tooltip>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 服务状态列表 */}
      <Card 
        title="服务状态" 
        style={{ marginBottom: 24 }}
        extra={
          <Tooltip title="刷新">
            <ReloadOutlined onClick={fetchServices} spin={loading} />
          </Tooltip>
        }
      >
        <Table
          columns={columns}
          dataSource={services}
          rowKey="name"
          loading={loading}
          pagination={false}
          size="middle"
        />
      </Card>

      {/* 实时运行日志控制台 */}
      <Card
        title="服务实时控制台"
        style={{ marginBottom: 24 }}
        extra={
          <Space size="large">
            <Badge status="processing" text="滚动监听中" />
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <input 
                type="checkbox" 
                checked={autoScroll} 
                onChange={(e) => setAutoScroll(e.target.checked)} 
                id="auto-scroll-checkbox"
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="auto-scroll-checkbox" style={{ cursor: 'pointer', marginLeft: 4, userSelect: 'none' }}>
                自动滚动
              </label>
            </span>
            <Tag 
              color="volcano" 
              style={{ cursor: 'pointer', borderRadius: '4px' }} 
              onClick={() => setServiceLogs(prev => ({ ...prev, [activeService]: [] }))}
            >
              清空控制台
            </Tag>
          </Space>
        }
      >
        <Tabs 
          activeKey={activeService} 
          onChange={(key) => setActiveService(key)}
          items={serviceTabs}
          style={{ marginBottom: 16 }}
        />
        
        <div 
          style={{ 
            backgroundColor: '#111827', 
            color: '#e5e7eb', 
            fontFamily: 'Consolas, Monaco, "Courier New", Courier, monospace',
            padding: '20px',
            borderRadius: '6px',
            height: '420px',
            overflowY: 'auto',
            fontSize: '13px',
            lineHeight: '1.7',
            boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.6)'
          }}
        >
          {(serviceLogs[activeService] || []).length === 0 ? (
            <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
              📡 暂无该服务的实时日志输出。触发服务业务逻辑（如进行面试交互）时日志会在此输出。
            </div>
          ) : (
            (serviceLogs[activeService] || []).map((log) => {
              let levelColor = '#10b981'; // info -> green
              let levelBg = 'rgba(16, 185, 129, 0.1)';
              if (log.level === 'warn') {
                levelColor = '#f59e0b'; // warn -> yellow
                levelBg = 'rgba(245, 158, 11, 0.1)';
              } else if (log.level === 'error') {
                levelColor = '#ef4444'; // error -> red
                levelBg = 'rgba(239, 68, 68, 0.1)';
              }
              
              return (
                <div key={log.id} style={{ marginBottom: 6, display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ color: '#6b7280', marginRight: 12, flexShrink: 0 }}>[{log.time}]</span>
                  <span 
                    style={{ 
                      color: levelColor, 
                      backgroundColor: levelBg, 
                      padding: '1px 6px',
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      marginRight: 12,
                      flexShrink: 0,
                      border: `1px solid ${levelColor}33`
                    }}
                  >
                    {log.level.toUpperCase()}
                  </span>
                  <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', flexGrow: 1 }}>
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>
      </Card>

      {/* 服务健康变更状态日志 */}
      <Card title="健康状态变更日志" extra={<Text type="secondary">仅保留最近 100 条服务上线/下线变更</Text>}>
        <div style={{ maxHeight: 250, overflowY: 'auto' }}>
          {statusLogs.length === 0 ? (
            <Text type="secondary">暂无状态变更日志</Text>
          ) : (
            <div>
              {statusLogs.map(log => (
                <div
                  key={log.id}
                  style={{
                    padding: '8px 12px',
                    marginBottom: 8,
                    backgroundColor: log.isHealthy ? '#f6ffed' : '#fff2f0',
                    border: `1px solid ${log.isHealthy ? '#b7eb8f' : '#ffccc7'}`,
                    borderRadius: 4,
                  }}
                >
                  <Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>{log.time}</Text>
                    {log.isHealthy ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    )}
                    <Text strong>{log.message}</Text>
                  </Space>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SystemLogs;
