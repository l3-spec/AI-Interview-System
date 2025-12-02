import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Typography, 
  Space,
  Table,
  Tag,
  Progress,
  Button,
  Avatar,
  message
} from 'antd';
import {
  TeamOutlined,
  BankOutlined,
  CalendarOutlined,
  TrophyOutlined,
  RiseOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { DashboardStats, Interview } from '../types/interview';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const DashboardContent: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInterviews, setRecentInterviews] = useState<Interview[]>([]);
  const { user } = useAuth();

  // 加载统计数据
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // 模拟数据加载
        setStats({
          users: 1000,
          interviews: 500,
          completionRate: "85%",
          totalJobs: 50,
          activeJobs: 30,
          totalCandidates: 2000,
          totalInterviews: 1500,
          passedInterviews: 1200,
          interviewPassRate: 80
        });
        setLoading(false);
      } catch (error) {
        console.error('加载仪表板数据失败:', error);
        message.error('加载数据失败');
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // 面试状态分布数据
  const interviewStatusData = [
    { name: '待面试', value: 30, color: '#faad14' },
    { name: '已完成', value: 50, color: '#52c41a' },
    { name: '已通过', value: 40, color: '#1890ff' },
    { name: '未通过', value: 10, color: '#ff4d4f' }
  ];

  // 职岗热度数据
  const jobHeatData = [
    { name: '前端开发', candidates: 120, interviews: 80, hires: 30 },
    { name: '后端开发', candidates: 150, interviews: 100, hires: 40 },
    { name: '产品经理', candidates: 80, interviews: 50, hires: 20 },
    { name: 'UI设计师', candidates: 60, interviews: 40, hires: 15 },
    { name: '测试工程师', candidates: 90, interviews: 60, hires: 25 }
  ];

  // 月度趋势数据
  const monthlyTrendData = [
    { month: '1月', interviews: 45, candidates: 89 },
    { month: '2月', interviews: 52, candidates: 96 },
    { month: '3月', interviews: 61, candidates: 108 },
    { month: '4月', interviews: 58, candidates: 112 },
    { month: '5月', interviews: 67, candidates: 125 },
    { month: '6月', interviews: 74, candidates: 138 }
  ];

  if (loading) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      {/* 欢迎信息 */}
      <Card style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
        <div style={{ color: 'white' }}>
          <Title level={2} style={{ color: 'white', marginBottom: '8px' }}>
            欢迎回来，{user?.name || '企业用户'}！
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
            今天是 {new Date().toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}，继续您的招聘工作吧
          </Text>
        </div>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="在招职位"
              value={stats?.totalJobs || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="候选人"
              value={stats?.totalCandidates || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="面试场次"
              value={stats?.totalInterviews || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="通过率"
              value={stats?.interviewPassRate?.toFixed(1) || 0}
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        {/* 职岗招聘热度 */}
        <Col span={12}>
          <Card title="职岗招聘热度" extra={<Button type="link">查看更多</Button>}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={jobHeatData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="candidates" fill="#8884d8" name="候选人" />
                <Bar dataKey="interviews" fill="#82ca9d" name="面试" />
                <Bar dataKey="hires" fill="#ffc658" name="录用" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 面试状态分布 */}
        <Col span={12}>
          <Card title="面试状态分布">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={interviewStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {interviewStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* 月度趋势 */}
        <Col span={16}>
          <Card title="招聘月度趋势" extra={<Button type="link">查看详细报告</Button>}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="interviews" 
                  stroke="#8884d8" 
                  name="面试数"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="candidates" 
                  stroke="#82ca9d" 
                  name="候选人数"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 快捷操作 */}
        <Col span={8}>
          <Card title="快捷操作">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="primary" block icon={<BankOutlined />}>
                创建新职岗
              </Button>
              <Button block icon={<TeamOutlined />}>
                查看候选人
              </Button>
              <Button block icon={<CalendarOutlined />}>
                安排面试
              </Button>
              <Button block icon={<RiseOutlined />}>
                查看报告
              </Button>
            </Space>
          </Card>

          {/* 认证状态提醒 */}
          {!user?.isVerified && (
            <Card 
              title="认证提醒" 
              style={{ marginTop: '16px' }}
              styles={{ body: { padding: '16px' } }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '12px', color: '#faad14' }}>
                  <ExclamationCircleOutlined style={{ fontSize: '24px' }} />
                </div>
                <Text>您还未完成企业实名认证</Text>
                <div style={{ marginTop: '12px' }}>
                  <Button type="primary" size="small">
                    立即认证
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default DashboardContent; 