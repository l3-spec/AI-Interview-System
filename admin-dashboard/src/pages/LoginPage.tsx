import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Alert, message, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, BuildOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FirstLaunchPrivacyModal, {
  hasPrivacyFirstLaunchConsent,
} from '../components/FirstLaunchPrivacyModal';
import logoImage from '../assets/company-logo.png';

const { Text } = Typography;

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
        if (onLoginSuccess) onLoginSuccess();
        else navigate('/dashboard');
      } else {
        setError('邮箱或密码错误，请检查后重试');
      }
    } catch (err: any) {
      setError(err?.message || '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: 20,
      }}
    >
      {/* 登录卡片 */}
      <div
        className="liquid-card"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 44,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <img
            src={logoImage}
            alt="U-Talent"
            style={{ height: 64, width: 'auto', marginBottom: 8, filter: 'drop-shadow(0 0 15px rgba(56, 189, 248, 0.2))' }}
          />
          <div style={{ color: '#94a3b8', fontSize: 13, letterSpacing: 2, fontWeight: 600, textTransform: 'uppercase' }}>
            Enterprise Management
          </div>
        </div>


        {/* 错误提示 */}
        {error && (
          <Alert
            message={error}
            type="error"
            style={{
              marginBottom: 20,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10,
            }}
            showIcon
          />
        )}

        {/* 表单 */}
        <Form name="login" onFinish={handleSubmit} layout="vertical" size="large">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#64748b' }} />}
              placeholder="企业邮箱"
              autoComplete="email"
              className="glass-input"
              style={{ height: 48 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#64748b' }} />}
              placeholder="登录密码"
              autoComplete="current-password"
              className="glass-input"
              style={{ height: 48 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Checkbox
              checked={agreedPolicies}
              onChange={(e) => setAgreedPolicies(e.target.checked)}
            >
              <span style={{ fontSize: 12, color: '#64748b' }}>
                我已阅读并同意{' '}
                <Link to="/user-instructions" target="_blank" style={{ color: '#38bdf8' }}>
                  《用户须知》
                </Link>{' '}
                和{' '}
                <Link to="/privacy-policy" target="_blank" style={{ color: '#38bdf8' }}>
                  《隐私条款》
                </Link>
              </span>
            </Checkbox>
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <button
              type="submit"
              className="glass-btn glass-btn--primary"
              style={{ width: '100%', height: 48, fontSize: 15 }}
              disabled={loading}
            >
              <span className="glass-btn__shimmer" />
              {loading ? '登录中...' : '企业登录'}
            </button>
          </Form.Item>
        </Form>

        {/* 测试账号 */}
        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: 'rgba(251,191,36,0.06)',
            border: '1px solid rgba(251,191,36,0.12)',
            borderRadius: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <BuildOutlined style={{ color: '#fbbf24' }} />
            <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: 13 }}>测试账号</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>邮箱：</span>
            <Text code style={{ color: '#38bdf8', fontSize: 12 }} copyable>
              admin@test.com
            </Text>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>密码：</span>
            <Text code style={{ color: '#38bdf8', fontSize: 12 }} copyable>
              123456
            </Text>
          </div>
        </div>

        {/* 底部 */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text style={{ color: '#475569', fontSize: 12 }}>
            © 2026 U-Talent · 柚汀教育科技
          </Text>
        </div>
      </div>

      {/* 隐私弹窗 */}
      {showPrivacyGateModal && (
        <FirstLaunchPrivacyModal
          visible={showPrivacyGateModal}
          onAccept={() => setShowPrivacyGateModal(false)}
        />
      )}
    </div>
  );
};

export default LoginPage;
