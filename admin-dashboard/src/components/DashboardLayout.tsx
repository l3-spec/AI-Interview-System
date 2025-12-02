import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  BankOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/company-logo.png';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 新增：加载中处理，防止页面空白
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <span style={{ fontSize: 18, color: '#888' }}>加载中...</span>
      </div>
    );
  }

  // 如果未登录，重定向到登录页
  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const isInterviewRoom = /^\/interviews\/[\w-]+$/.test(location.pathname);

  // 菜单项配置
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
      path: '/dashboard'
    },
    {
      key: 'jobs',
      icon: <BankOutlined />,
      label: '职位管理',
      path: '/jobs'
    },
    {
      key: 'candidates',
      icon: <TeamOutlined />,
      label: '候选人',
      path: '/candidates'
    },
    {
      key: 'interviews',
      icon: <ScheduleOutlined />,
      label: '面试管理',
      path: '/interviews'
    },
    {
      key: 'company',
      icon: <BankOutlined />,
      label: '企业管理',
      children: [
        {
          key: 'company-profile',
          label: '企业信息',
          path: '/company/profile'
        },
        {
          key: 'company-verification',
          label: '实名认证',
          path: '/company/verification'
        }
      ]
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      path: '/settings'
    }
  ];

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    const path = location.pathname;
    for (const item of menuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (child.path === path) {
            return [child.key];
          }
        }
      } else if (item.path === path) {
        return [item.key];
      }
    }
    return ['dashboard'];
  };

  // 获取展开的菜单项
  const getOpenKeys = () => {
    const path = location.pathname;
    for (const item of menuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (child.path === path) {
            return [item.key];
          }
        }
      }
    }
    return [];
  };

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    // 找到对应的菜单项
    for (const item of menuItems) {
      if (item.key === key && item.path) {
        navigate(item.path);
        return;
      }
      if (item.children) {
        for (const child of item.children) {
          if (child.key === key) {
            navigate(child.path);
            return;
          }
        }
      }
    }
  };

  // 用户下拉菜单 items
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />, 
      label: '个人设置',
      onClick: () => navigate('/settings/profile')
    },
    {
      key: 'verification',
      icon: <SafetyCertificateOutlined />, 
      label: (
        <Space>
          实名认证
          {!user?.isVerified && <Badge status="warning" />}
        </Space>
      ),
      onClick: () => navigate('/company/verification')
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />, 
      label: '退出登录',
      onClick: async () => {
        await logout();
        navigate('/');
      }
    }
  ];

  // 生成面包屑
  const getBreadcrumb = () => {
    const path = location.pathname;
    const breadcrumbItems = [
      { title: '首页' }
    ];

    if (path.includes('/jobs')) {
      breadcrumbItems.push({ title: '职位管理' });
    } else if (path.includes('/candidates')) {
      breadcrumbItems.push({ title: '候选人' });
    } else if (path.includes('/interviews')) {
      breadcrumbItems.push({ title: '面试管理' });
    } else if (path.includes('/company')) {
      breadcrumbItems.push({ title: '企业管理' });
      if (path.includes('/profile')) {
        breadcrumbItems.push({ title: '企业信息' });
      } else if (path.includes('/verification')) {
        breadcrumbItems.push({ title: '实名认证' });
      }
    } else if (path.includes('/settings')) {
      breadcrumbItems.push({ title: '设置' });
    }

    return breadcrumbItems;
  };

  if (isInterviewRoom) {
    return (
      <div className="interview-room-layout">
        <Outlet />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)'
        }}
      >
        {/* Logo区域 */}
        <div
          style={{
            padding: collapsed ? '16px 12px' : '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderBottom: '1px solid #f0f0f0',
            gap: collapsed ? 0 : 12
          }}
        >
          <img
            src={logo}
            alt="AI面试系统"
            style={{
              width: collapsed ? 32 : 40,
              height: collapsed ? 32 : 40,
              borderRadius: '12px'
            }}
          />
          {!collapsed && (
            <div style={{ textAlign: 'left' }}>
              <Text strong style={{ color: '#2563eb', fontSize: 18 }}>
                AI面试系统
              </Text>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>Enterprise Admin</div>
            </div>
          )}
        </div>

        {/* 导航菜单 */}
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>

      {/* 主要内容区域 */}
      <Layout style={{ background: '#f0f2f5' }}>
        {/* 顶部导航栏 */}
        <Header style={{ 
          padding: '0 24px',
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* 左侧：菜单折叠按钮 */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px' }}
          />

          {/* 右侧：用户信息和操作 */}
          <Space size={24} align="center" style={{ display: 'flex', alignItems: 'center' }}>
            {/* 通知铃铛 */}
            <Badge count={3} size="small">
              <Button type="text" icon={<BellOutlined />} style={{ height: 40 }} />
            </Badge>

            {/* 企业认证状态 */}
            {user?.isVerified ? (
              <Badge status="success" text="已认证" />
            ) : (
              <Badge status="warning" text="待认证" />
            )}

            {/* 用户下拉菜单 */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '4px 12px',
                  border: '1px solid #e6f4ff',
                  borderRadius: '24px',
                  background: '#f5f9ff',
                  cursor: 'pointer',
                  minHeight: 44
                }}
              >
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#2563eb' }} />
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
                    {user?.name || '未知企业'}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {user?.email}
                  </div>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>

        {/* 内容区域 */}
        <Content style={{ 
          margin: '24px',
          background: '#fff',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {/* 面包屑导航 */}
          <div style={{ 
            padding: '16px 24px',
            borderBottom: '1px solid #f0f0f0',
            background: '#fafafa'
          }}>
            <Breadcrumb items={getBreadcrumb()} />
          </div>

          {/* 页面内容 */}
          <div style={{ padding: '24px' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout; 
