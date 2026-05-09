import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Layout, 
  Menu, 
  Avatar, 
  Dropdown, 
  Button, 
  Space, 
  Typography,
  Badge,
  Breadcrumb
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  ScheduleOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  CommentOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { GlassCard, GlassButton, BackgroundBlobs } from './GlassComponents';
import logo from '../assets/company-logo.png';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <BackgroundBlobs />
        <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>正在初始化精英工作区...</span>
      </div>
    );
  }

  React.useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const isInterviewRoom = /^\/interviews\/[\w-]+$/.test(location.pathname);

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘', path: '/dashboard' },
    { key: 'jobs', icon: <BankOutlined />, label: '职位管理', path: '/jobs' },
    { key: 'candidates', icon: <TeamOutlined />, label: '候选人', path: '/candidates' },
    { key: 'interviews', icon: <ScheduleOutlined />, label: '面试管理', path: '/interviews' },
    { key: 'ai-interview-communication', icon: <CommentOutlined />, label: 'AI 面试沟通', path: '/ai-interview-communication' },
    {
      key: 'company',
      icon: <BankOutlined />,
      label: '企业管理',
      children: [
        { key: 'company-profile', label: '企业信息', path: '/company/profile' },
        { key: 'company-verification', label: '实名认证', path: '/company/verification' }
      ]
    },
    { key: 'settings', icon: <SettingOutlined />, label: '设置中心', path: '/settings' }
  ];

  const getSelectedKeys = () => {
    const path = location.pathname;
    for (const item of menuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (child.path === path) return [child.key];
        }
      } else if (item.path === path) return [item.key];
    }
    return ['dashboard'];
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    for (const item of menuItems) {
      if (item.key === key && item.path) { navigate(item.path); return; }
      if (item.children) {
        for (const child of item.children) {
          if (child.key === key) { navigate(child.path); return; }
        }
      }
    }
  };

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人资料', onClick: () => navigate('/settings/profile') },
    { key: 'verification', icon: <SafetyCertificateOutlined />, label: <Space>实名认证 {!user?.isVerified && <Badge status="warning" />}</Space>, onClick: () => navigate('/company/verification') },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: async () => { await logout(); navigate('/'); } }
  ];

  if (isInterviewRoom) return <div className="interview-room-layout"><Outlet /></div>;

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-main)', position: 'relative' }}>
      <BackgroundBlobs />
      
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={260}
        style={{
          background: 'rgba(2, 6, 23, 0.4)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--glass-border)',
          zIndex: 10
        }}
      >
        <div style={{ padding: collapsed ? '24px 12px' : '24px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img 
            src={logo} 
            alt="U-Talent" 
            style={{ 
              width: collapsed ? 32 : '85%', 
              height: 'auto', 
              maxHeight: collapsed ? 32 : 48,
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.1))'
            }} 
          />
        </div>


        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ background: 'transparent', borderRight: 0, marginTop: 16 }}
          className="elite-sidebar-menu"
        />
      </Sider>

      <Layout style={{ background: 'transparent' }}>
        <Header style={{ 
          padding: '0 32px',
          background: 'rgba(2, 6, 23, 0.4)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 80,
          zIndex: 9
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '20px', color: 'var(--text-muted)' }}
          />

          <Space size={32} align="center">
            <Badge count={3} size="small" offset={[0, 8]}>
              <Button type="text" icon={<BellOutlined />} style={{ color: 'var(--text-muted)', fontSize: 18 }} />
            </Badge>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="user-profile-trigger">
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: 'var(--primary)' }} />
                <div className="user-info">
                  <div className="user-name">{user?.name || '企业用户'}</div>
                  <div className="user-status">{user?.isVerified ? '已认证合作伙伴' : '待实名认证'}</div>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: '32px', overflow: 'initial' }}>
          <Outlet />
        </Content>
      </Layout>

      <style dangerouslySetInnerHTML={{ __html: `
        .elite-sidebar-menu .ant-menu-item {
          height: 48px !important;
          line-height: 48px !important;
          border-radius: 12px !important;
          margin: 4px 12px !important;
          color: var(--text-muted) !important;
        }
        .elite-sidebar-menu .ant-menu-item-selected {
          background: rgba(42, 157, 143, 0.15) !important;
          color: var(--text-main) !important;
          border-right: 3px solid var(--primary) !important;
          border: 1px solid rgba(42, 157, 143, 0.3) !important;
        }
        .elite-sidebar-menu .ant-menu-item:hover {
          color: var(--text-main) !important;
        }
        
        .user-profile-trigger {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 16px;
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          cursor: pointer;
          transition: all 0.3s;
        }
        .user-profile-trigger:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: var(--primary);
        }
        .user-info { line-height: 1.2; }
        .user-name { font-size: 14px; font-weight: 700; color: var(--text-main); }
        .user-status { font-size: 11px; color: var(--text-muted); font-weight: 600; }
        
        .ant-breadcrumb-link, .ant-breadcrumb-separator {
          color: var(--text-muted) !important;
        }
      `}} />
    </Layout>
  );
};

export default DashboardLayout;
