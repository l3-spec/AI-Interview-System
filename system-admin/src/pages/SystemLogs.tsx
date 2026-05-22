import React, { useEffect, useState, useRef } from 'react';
import { Card, Table, Tag, Space, Statistic, Row, Col, Typography, Badge, Tooltip } from 'antd';
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

const SystemLogs: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [logs, setLogs] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<any>(null);
  const logIdCounter = useRef(0);

  // 获取服务状态
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

  // 添加日志
  const addLog = (serviceName: string, isHealthy: boolean) => {
    const service = services.find(s => s.name === serviceName);
    const log: StatusLog = {
      id: `log-${logIdCounter.current++}`,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      serviceName,
      isHealthy,
      message: isHealthy 
        ? `${service?.description || serviceName} 恢复正常` 
        : `${service?.description || serviceName} 健康检查失败`,
    };
    
    setLogs(prev => [log, ...prev].slice(0, 100)); // 最多保留100条日志
  };

  // 初始化 WebSocket 连接
  useEffect(() => {
    // 从 API_BASE_URL 中提取 WebSocket 地址
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

    // 监听系统状态更新
    socket.on('system:status_update', (data: { serviceName: string; isHealthy: boolean; timestamp: string }) => {
      console.log('📡 收到状态更新:', data);
      addLog(data.serviceName, data.isHealthy);
      
      // 同时更新服务列表
      setServices(prev => 
        prev.map(s => 
          s.name === data.serviceName 
            ? { ...s, isHealthy: data.isHealthy, lastCheckTime: Date.now() }
            : s
        )
      );
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [services]);

  // 初始加载
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
        <Text type="secondary">实时展示各微服务的健康状态和变化</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="服务总数"
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

      {/* 服务状态表格 */}
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

      {/* 实时日志 */}
      <Card title="实时状态变更日志" extra={<Text type="secondary">最多显示 100 条</Text>}>
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {logs.length === 0 ? (
            <Text type="secondary">暂无状态变更日志</Text>
          ) : (
            <div>
              {logs.map(log => (
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
