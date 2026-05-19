import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space, message, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, BuildOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FirstLaunchPrivacyModal, {
  hasPrivacyFirstLaunchConsent,
  setPrivacyFirstLaunchConsent
} from '../components/FirstLaunchPrivacyModal';

import logoImage from '../assets/company-logo.png';

const { Title, Text } = Typography;

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPrivacyGateModal, setShowPrivacyGateModal] = useState(false);
  const [agreedPolicies, setAgreedPolicies] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasPrivacyFirstLaunchConsent()) {
      setShowPrivacyGateModal(true);
    }
  }, []);

  const handleSubmit = async (values: { email: string; password: string }) => {
    if (!agreedPolicies) {
      message.warning('请先阅读并勾选同意《用户须知》和《隐私条款》');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const success = await login(values.email, values.password);
      if (success) {
        message.success('登录成功！');
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          navigate('/dashboard');
        }
      } else {
        const errorMessage = '邮箱或密码错误，请检查后重试';
        setError(errorMessage);
        message.error(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err?.message || '登录失败，请稍后重试';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: '400px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}
        bodyStyle={{ padding: '40px' }}
      >
        {/* 头部信息 */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
            <img 
              src={logoImage} 
              alt="U-Talent Logo" 
              style={{ width: 80, height: 80, borderRadius: 20, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }} 
            />
          </div>
          <Title level={2} style={{ margin: 0, color: '#333' }}>
            U-Talent
          </Title>
          <Text type="secondary">企业招聘管理平台</Text>
        </div>

        {/* 错误提示 */}
        {error && (
          <Alert
            message={error}
            type="error"
            style={{ marginBottom: '24px' }}
            showIcon
          />
        )}

        {/* 登录表单 */}
        <Form
          name="login"
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="企业邮箱"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="登录密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Checkbox checked={agreedPolicies} onChange={(e) => setAgreedPolicies(e.target.checked)}>
              <span style={{ fontSize: 13, color: '#595959' }}>
                我已阅读并同意
                <Link to="/user-instructions" target="_blank" rel="noopener noreferrer" style={{ color: '#0091ff' }}>
                  《用户须知》
                </Link>
                和
                <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#0091ff' }}>
                  《隐私条款》
                </Link>
              </span>
            </Checkbox>
          </Form.Item>

          <Form.Item style={{ marginBottom: '16px' }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: '48px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '6px'
              }}
            >
              {loading ? '登录中...' : '企业登录'}
            </Button>
          </Form.Item>
        </Form>

        {/* 测试账号提示 */}
        <Card 
          size="small" 
          style={{ 
            background: '#f8f9fa', 
            border: '1px dashed #d9d9d9',
            marginTop: '24px'
          }}
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text strong style={{ color: '#1890ff' }}>
              <BuildOutlined /> 测试账号
            </Text>
            <div>
              <Text type="secondary">邮箱：</Text>
              <Text code copyable>admin@test.com</Text>
            </div>
            <div>
              <Text type="secondary">密码：</Text>
              <Text code copyable>123456</Text>
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              💡 输入任意有效邮箱和密码即可登录
            </Text>
          </Space>
        </Card>

        {/* 底部信息 */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '32px',
          color: '#999',
          fontSize: '12px'
        }}>
          <div>© 2024 U-Talent 柚汀教育科技. All rights reserved.</div>
          <div style={{ marginTop: '8px' }}>
            <Text type="secondary">智能招聘，精准匹配</Text>
          </div>
        </div>
      </Card>

      <FirstLaunchPrivacyModal
        open={showPrivacyGateModal}
        onAgree={() => {
          setPrivacyFirstLaunchConsent();
          setShowPrivacyGateModal(false);
        }}
        onDisagree={() => setShowPrivacyGateModal(false)}
      />
    </div>
  );
};

export default LoginPage;
