import React, { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import utalentLogo from '../assets/utalent-logo.png';

const SystemLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, loading } = useAuth();

  // 检查认证状态
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  // 如果正在加载或未认证，显示加载状态
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '16px',
        color: '#666'
      }}>
        正在加载...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // 重定向中，不显示任何内容
  }

  const menuItems = [
    { path: '/dashboard', label: '系统概览', icon: '📊' },
    { path: '/users', label: '用户管理', icon: '👥' },
    { path: '/companies', label: '企业管理', icon: '🏢' },
    { path: '/jobs', label: '职位管理', icon: '💼' },
    { path: '/messages', label: '消息中心', icon: '💬' },
    { path: '/job-dictionary', label: '职岗字典', icon: '🗂️' },
    { path: '/region-dictionary', label: '地区字典', icon: '📍' },
    { path: '/home-content', label: '首页内容', icon: '🎯' },
    { path: '/posts', label: '帖子管理', icon: '📰' },
    { path: '/assessments', label: '职业测评', icon: '📝' },
    { path: '/dimensions', label: '维度配置', icon: '📐' },
    { path: '/app-versions', label: '版本管理', icon: '📱' },
    { path: '/interview-analysis', label: '面试/简历分析', icon: '🤖' },
    { path: '/admins', label: '管理员', icon: '🔑' },
    { path: '/logs', label: '系统日志', icon: '📋' },
    { path: '/permissions', label: '权限管理', icon: '🔐' },
    { path: '/billing', label: '计费管理', icon: '💰' },
    { path: '/settings', label: '系统设置', icon: '⚙️' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <div style={{
        width: '250px',
        background: '#001529',
        color: 'white',
        padding: '0',
        position: 'relative'
      }}>
        {/* Logo区域 */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #1f1f1f',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
            <img
              src={utalentLogo}
              alt="U-Talent"
              style={{ width: 48, height: 48, borderRadius: 12 }}
            />
          </div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>U-Talent 管理</h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#8c8c8c' }}>
            超级管理员控制台
          </p>
        </div>

        {/* 导航菜单 */}
        <nav style={{ padding: '20px 0', paddingBottom: '120px' }}>
          {menuItems.map(item => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 20px',
                  color: isActive ? '#1890ff' : '#fff',
                  textDecoration: 'none',
                  background: isActive ? 'rgba(24, 144, 255, 0.1)' : 'transparent',
                  borderRight: isActive ? '3px solid #1890ff' : 'none'
                }}
              >
                <span style={{ marginRight: '10px', fontSize: '16px' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 用户信息区域 - 固定在左下角 */}
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          background: '#001529',
          borderTop: '1px solid #1f1f1f',
          padding: '15px 20px 20px 20px'
        }}>
          <div style={{ marginBottom: '10px', fontSize: '12px', color: '#8c8c8c' }}>
            当前用户: {user?.name}
          </div>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '8px',
              background: '#ff4d4f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            退出登录
          </button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div style={{ flex: 1, background: '#f0f2f5' }}>
        {/* 顶部导航栏 */}
        <header style={{
          background: '#fff',
          padding: '16px 24px',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#262626' }}>
            {menuItems.find(item => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))?.label || '系统管理'}
          </h1>
          <div style={{ fontSize: '14px', color: '#666' }}>
            U-Talent v1.0 | 系统管理后台
          </div>
        </header>

        {/* 页面内容 */}
        <main style={{ padding: '24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SystemLayout; 
