import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  TeamOutlined,
  FileTextOutlined,
  BankOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  VideoCameraOutlined,
  MessageOutlined,
  SafetyOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import logoImage from '../../assets/company-logo.png';

const { Header, Sider, Content } = Layout;

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '企业资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'profile':
        navigate('/company/profile');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'logout':
        logout();
        break;
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: 'jobs-group',
      icon: <BankOutlined />,
      label: '职位管理',
      children: [
        { key: '/jobs', label: '职位列表' },
        { key: '/jobs/create', label: '创建职位' },
      ],
    },
    {
      key: 'candidates-group',
      icon: <TeamOutlined />,
      label: '候选人管理',
      children: [
        { key: '/candidates', label: '候选人列表' },
        { key: '/interviews', label: '面试记录' },
      ],
    },
    {
      key: '/ai-interview-communication',
      icon: <VideoCameraOutlined />,
      label: 'AI 面试间',
    },
    {
      key: 'settings-group',
      icon: <SettingOutlined />,
      label: '系统设置',
      children: [
        { key: '/company/profile', label: '企业资料' },
        { key: '/company/verification', label: '实名认证' },
      ],
    },
  ];

  // 解析当前选中的菜单项
  const selectedKey = location.pathname;
  const openKeys = ['jobs-group', 'candidates-group', 'settings-group'].filter(
    (key) => {
      const children = menuItems.find((m) => m?.key === key) as any;
      return children?.children?.some((c: any) => location.pathname.startsWith(c.key));
    },
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="glass-sidebar"
        width={240}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        {/* Logo 区域 */}
        <div
          style={{
            height: 64,
            margin: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 12,
            padding: collapsed ? 0 : '0 12px',
            background: 'rgba(56, 189, 248, 0.06)',
            border: '1px solid rgba(56, 189, 248, 0.1)',
            borderRadius: 16,
          }}
        >
          <img
            src={logoImage}
            alt="U-Talent"
            style={{ width: 36, height: 36, borderRadius: 12 }}
          />
          {!collapsed && (
            <span
              style={{
                background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: -0.5,
              }}
            >
              U-Talent
            </span>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKeys}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ border: 'none' }}
        />
      </Sider>

      <Layout
        style={{
          marginLeft: collapsed ? 80 : 240,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'transparent',
        }}
      >
        <Header
          className="glass-header"
          style={{
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 9,
            height: 64,
          }}
        >
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: 18,
              cursor: 'pointer',
              color: '#94a3b8',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar
                icon={<UserOutlined />}
                style={{
                  background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
                }}
              />
              <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
                {user?.name || '企业用户'}
              </span>
            </Space>
          </Dropdown>
        </Header>

        <Content
          style={{
            margin: '24px',
            minHeight: 280,
          }}
        >
          <div className="page-enter">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
