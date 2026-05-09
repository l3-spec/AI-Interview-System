import React, { useState, useEffect } from 'react';
import { Row, Col, Button } from 'antd';
import {
  TeamOutlined,
  BankOutlined,
  RiseOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  VideoCameraOutlined,
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
  Line,
  AreaChart,
  Area,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import {
  LiquidCard,
  StatCard,
  ChartCard,
  GlassButton,
  WelcomeBanner,
} from '../components/GlassComponents';
import type { DashboardStats } from '../types/interview';

const PIE_COLORS = ['#38bdf8', '#a78bfa', '#2dd4bf', '#f472b6'];
const GRADIENT_ID = 'chartGradient';
const GRADIENT_ID2 = 'chartGradient2';

const DashboardContent: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        users: 1280,
        interviews: 1560,
        completionRate: '87.5',
        totalJobs: 52,
        activeJobs: 30,
        totalCandidates: 2480,
        totalInterviews: 1540,
        passedInterviews: 1280,
        interviewPassRate: 83.1,
      });
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const statusData = [
    { name: '待面试', value: 320, color: PIE_COLORS[0] },
    { name: '进行中', value: 180, color: PIE_COLORS[1] },
    { name: '已通过', value: 420, color: PIE_COLORS[2] },
    { name: '未通过', value: 80, color: PIE_COLORS[3] },
  ];

  const heatData = [
    { name: '前端', candidates: 320, interviews: 210 },
    { name: '后端', candidates: 280, interviews: 190 },
    { name: '产品', candidates: 150, interviews: 95 },
    { name: '设计', candidates: 120, interviews: 80 },
    { name: '数开', candidates: 90, interviews: 55 },
    { name: '运维', candidates: 60, interviews: 40 },
  ];

  const trendData = [
    { month: '1月', interviews: 145, candidates: 289 },
    { month: '2月', interviews: 152, candidates: 296 },
    { month: '3月', interviews: 161, candidates: 308 },
    { month: '4月', interviews: 158, candidates: 312 },
    { month: '5月', interviews: 167, candidates: 325 },
    { month: '6月', interviews: 174, candidates: 338 },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              border: '2px solid rgba(56,189,248,0.3)',
              borderTopColor: '#38bdf8',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#94a3b8' }}>正在加载数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Banner */}
      <WelcomeBanner
        badge="ELITE · 精英控制中心"
        title={`欢迎回来，${user?.name || '合作伙伴'}`}
        subtitle={`系统就绪 · ${new Date().toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })}`}
      />

      {/* 核心统计 */}
      <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<FileTextOutlined />}
            label="在招职位"
            value={stats?.totalJobs ?? '-'}
            trend={{ value: '+12% 较上月', up: true }}
            color="blue"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<TeamOutlined />}
            label="总候选人"
            value={(stats?.totalCandidates ?? 0).toLocaleString()}
            trend={{ value: '+8.5% 较上月', up: true }}
            color="purple"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<ThunderboltOutlined />}
            label="面试场次"
            value={(stats?.totalInterviews ?? 0).toLocaleString()}
            trend={{ value: '+15% 较上月', up: true }}
            color="teal"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<TrophyOutlined />}
            label="平均通过率"
            value={`${stats?.interviewPassRate ?? 0}%`}
            trend={{ value: '-2.1% 较上月', up: false }}
            color="pink"
          />
        </Col>
      </Row>

      {/* 图表区 */}
      <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
        <Col xs={24} lg={16}>
          <ChartCard title="📈 招聘趋势">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={GRADIENT_ID2} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,41,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    backdropFilter: 'blur(20px)',
                    color: '#f1f5f9',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="candidates"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fill={`url(#${GRADIENT_ID})`}
                  dot={false}
                  activeDot={{ r: 6, fill: '#38bdf8', strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="interviews"
                  stroke="#a78bfa"
                  strokeWidth={2.5}
                  fill={`url(#${GRADIENT_ID2})`}
                  dot={false}
                  activeDot={{ r: 6, fill: '#a78bfa', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={8}>
          <ChartCard title="🎯 面试状态分布">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,41,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    color: '#f1f5f9',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              {statusData.map((d, i) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: PIE_COLORS[i],
                    }}
                  />
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>
                    {d.name} {d.value}
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        </Col>
      </Row>

      {/* 热力图 + 快捷操作 */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={18}>
          <ChartCard title="🔥 岗位热度">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={heatData} barGap={6}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,41,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    color: '#f1f5f9',
                  }}
                />
                <Bar
                  dataKey="candidates"
                  fill="#38bdf8"
                  radius={[6, 6, 0, 0]}
                  name="候选人"
                />
                <Bar
                  dataKey="interviews"
                  fill="#a78bfa"
                  radius={[6, 6, 0, 0]}
                  name="面试数"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={6}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 快捷操作 */}
            <LiquidCard>
              <div style={{ padding: 24 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: 1.5,
                    marginBottom: 20,
                  }}
                >
                  快捷操作
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <GlassButton
                    variant="primary"
                    icon={<BankOutlined />}
                    onClick={() => (window.location.href = '/jobs/create')}
                  >
                    创建新职位
                  </GlassButton>
                  <GlassButton
                    icon={<TeamOutlined />}
                    onClick={() => (window.location.href = '/candidates')}
                  >
                    候选人管理
                  </GlassButton>
                  <GlassButton
                    icon={<VideoCameraOutlined />}
                    onClick={() => (window.location.href = '/ai-interview-communication')}
                  >
                    AI 面试间
                  </GlassButton>
                </div>
              </div>
            </LiquidCard>

            {/* 认证提示 */}
            {!user?.isVerified && (
              <LiquidCard>
                <div style={{ padding: 24 }}>
                  <ExclamationCircleOutlined
                    style={{ fontSize: 28, color: '#fbbf24', marginBottom: 12 }}
                  />
                  <div style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 6 }}>
                    需要实名认证
                  </div>
                  <div
                    style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}
                  >
                    完成企业认证以解锁更多高级功能
                  </div>
                  <GlassButton
                    variant="primary"
                    onClick={() => (window.location.href = '/company/verification')}
                  >
                    立即认证
                  </GlassButton>
                </div>
              </LiquidCard>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardContent;
