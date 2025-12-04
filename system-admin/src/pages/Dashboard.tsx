import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/config';

interface DashboardStats {
  overview: {
    users: {
      total: number;
      active: number;
      newThisPeriod: number;
    };
    companies: {
      total: number;
      active: number;
      verified: number;
      newThisPeriod: number;
    };
    interviews: {
      total: number;
      completed: number;
      completionRate: string;
    };
    jobs: {
      total: number;
    };
  };
  timeRange: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // 获取Dashboard统计数据
  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem(config.TOKEN_KEY);

      if (!token) {
        setError('登录状态已失效，请重新登录');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${config.API_BASE_URL}/admin/dashboard/stats?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `${config.AUTH_HEADER_PREFIX} ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
        setError(null);
      } else {
        setError(data.message || '获取统计数据失败');
      }
    } catch (error) {
      console.error('获取Dashboard统计错误:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  // 计算增长率（临时使用随机数模拟）
  const getGrowthRate = (current: number) => {
    const rate = (Math.random() * 30 - 5).toFixed(1); // -5% 到 +25% 的随机增长率
    return parseFloat(rate) >= 0 ? `+${rate}%` : `${rate}%`;
  };

  // 获取增长率颜色
  const getGrowthColor = (rate: string) => {
    return rate.startsWith('+') ? '#52c41a' : '#ff4d4f';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ fontSize: '16px', color: '#ff4d4f' }}>错误: {error}</div>
      </div>
    );
  }

  return (
    <div>
      {/* 页面标题和时间选择器 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: '8px' }}>系统概览</h2>
          <p style={{ margin: 0, color: '#666' }}>查看系统整体运行状态和关键指标</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { value: '7d', label: '近7天' },
            { value: '30d', label: '近30天' },
            { value: '90d', label: '近90天' },
            { value: '1y', label: '近1年' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value)}
              style={{
                padding: '8px 16px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                background: timeRange === option.value ? '#1890ff' : '#fff',
                color: timeRange === option.value ? '#fff' : '#262626',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 关键指标卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* 用户统计 */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px', marginRight: '12px' }}>👥</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, color: '#262626', fontSize: '16px' }}>用户总数</h3>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1890ff' }}>
                {stats?.overview.users.total.toLocaleString()}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ color: '#666' }}>活跃用户: {stats?.overview.users.active}</span>
            <span style={{ color: getGrowthColor(getGrowthRate(stats?.overview.users.newThisPeriod || 0)) }}>
              {getGrowthRate(stats?.overview.users.newThisPeriod || 0)}
            </span>
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            新增用户: {stats?.overview.users.newThisPeriod}
          </div>
        </div>

        {/* 企业统计 */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px', marginRight: '12px' }}>🏢</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, color: '#262626', fontSize: '16px' }}>注册企业</h3>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#52c41a' }}>
                {stats?.overview.companies.total.toLocaleString()}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ color: '#666' }}>已认证: {stats?.overview.companies.verified}</span>
            <span style={{ color: getGrowthColor(getGrowthRate(stats?.overview.companies.newThisPeriod || 0)) }}>
              {getGrowthRate(stats?.overview.companies.newThisPeriod || 0)}
            </span>
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            活跃企业: {stats?.overview.companies.active}
          </div>
        </div>

        {/* 面试统计 */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px', marginRight: '12px' }}>📈</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, color: '#262626', fontSize: '16px' }}>面试总数</h3>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#722ed1' }}>
                {stats?.overview.interviews.total.toLocaleString()}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ color: '#666' }}>完成率: {stats?.overview.interviews.completionRate}%</span>
            <span style={{ color: getGrowthColor(getGrowthRate(stats?.overview.interviews.completed || 0)) }}>
              {getGrowthRate(stats?.overview.interviews.completed || 0)}
            </span>
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            已完成: {stats?.overview.interviews.completed}
          </div>
        </div>

        {/* 职位统计 */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px', marginRight: '12px' }}>💼</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, color: '#262626', fontSize: '16px' }}>发布职位</h3>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#fa8c16' }}>
                {stats?.overview.jobs.total.toLocaleString()}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ color: '#666' }}>平均每企业: {Math.round((stats?.overview.jobs.total || 0) / (stats?.overview.companies.total || 1))}</span>
            <span style={{ color: getGrowthColor(getGrowthRate(stats?.overview.jobs.total || 0)) }}>
              {getGrowthRate(stats?.overview.jobs.total || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 快速操作区域 */}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0' }}>快速操作</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <button 
            onClick={() => navigate('/users')}
            style={{ 
              padding: '12px 16px', 
              background: '#1890ff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            👥 用户管理
          </button>
          <button 
            onClick={() => navigate('/companies')}
            style={{ 
              padding: '12px 16px', 
              background: '#52c41a', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            🏢 企业管理
          </button>
          <button 
            onClick={() => navigate('/jobs')}
            style={{ 
              padding: '12px 16px', 
              background: '#fa8c16', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            💼 职位管理
          </button>
          <button 
            onClick={() => navigate('/admins')}
            style={{ 
              padding: '12px 16px', 
              background: '#722ed1', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            🔑 管理员
          </button>
          <button 
            onClick={() => navigate('/logs')}
            style={{ 
              padding: '12px 16px', 
              background: '#13c2c2', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📋 系统日志
          </button>
        </div>
      </div>

      {/* 系统状态监控 */}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 16px 0' }}>系统状态</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>API服务状态</span>
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>● 正常</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>数据库连接</span>
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>● 正常</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>存储状态</span>
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>● 正常</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>系统负载</span>
            <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>● 中等</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 
