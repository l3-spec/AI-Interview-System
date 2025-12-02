import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('superadmin@aiinterview.com');
  const [password, setPassword] = useState('superadmin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // 先调用API登录
      const response = await authApi.login(email, password);
      
      if (response.success && response.data) {
        // 更新本地认证状态
      await login(email, password);
      navigate('/dashboard');
      } else {
        setError(response.message || '登录失败');
      }
    } catch (error: any) {
      console.error('登录错误:', error);
      const errorMessage = error.response?.data?.message || error.message || '网络错误，请稍后重试';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2rem',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            color: '#2d3748',
            marginBottom: '0.5rem'
          }}>
            AI面试系统
          </h1>
          <p style={{ 
            color: '#718096',
            fontSize: '16px',
            marginBottom: '0.5rem'
          }}>
            系统管理后台
          </p>
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: '#ebf4ff',
            color: '#4299e1',
            borderRadius: '16px',
            fontSize: '14px'
          }}>
            超级管理员入口
          </div>
          </div>
          
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              placeholder="管理员邮箱"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '16px'
              }}
                required
              />
            </div>

          <div style={{ marginBottom: '1rem' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              placeholder="管理员密码"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '16px'
              }}
                required
              />
            </div>

            {error && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              background: '#fff5f5',
              color: '#c53030',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading ? '#718096' : '#4299e1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            >
              {loading ? '登录中...' : '管理员登录'}
            </button>
          </form>

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#f7fafc',
          borderRadius: '4px'
        }}>
          <p style={{ 
            margin: '0 0 0.5rem 0',
            color: '#4a5568',
            fontSize: '14px'
          }}>
            超级管理员账号：
          </p>
          <div style={{
            fontFamily: 'monospace',
            color: '#718096',
            fontSize: '14px'
          }}>
            <div>superadmin@aiinterview.com</div>
            <div>superadmin123</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 