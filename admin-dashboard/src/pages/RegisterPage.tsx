import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AUTH_CONSTANTS } from '../config/constants';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactPhone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 表单验证
    if (!formData.companyName || !formData.contactName || !formData.contactPhone || !formData.email || !formData.password) {
      setError('请填写所有必填项');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    try {
      // 调用注册API
      const registerResponse = await fetch('/api/companies/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: formData.companyName,
          contactName: formData.contactName,
          contactPhone: formData.contactPhone,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!registerResponse.ok) {
        throw new Error('注册失败，请稍后重试');
      }

      // 注册成功后直接登录
      const loginResponse = await fetch('/api/companies/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!loginResponse.ok) {
        throw new Error('登录失败，请手动登录');
      }

      const loginData = await loginResponse.json();
      
      // 保存token和用户信息
      localStorage.setItem(AUTH_CONSTANTS.TOKEN_KEY, loginData.token);
      localStorage.setItem(AUTH_CONSTANTS.USER_KEY, JSON.stringify(loginData.company));
      
      // 直接跳转到仪表盘
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f2f5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px'
    }}>
      {/* Logo和标题 */}
      <div style={{ 
        marginBottom: '40px',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '28px',
          color: '#1890ff',
          margin: '0 0 8px 0'
        }}>
          AI面试系统
        </h1>
        <p style={{ 
          fontSize: '16px',
          color: '#666',
          margin: 0
        }}>
          开启智能招聘新时代
        </p>
      </div>

      {/* 注册表单 */}
      <div style={{
        background: '#fff',
        padding: '32px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ 
          margin: '0 0 24px 0',
          fontSize: '20px',
          textAlign: 'center'
        }}>
          企业免费注册
        </h2>

        {error && (
          <div style={{
            background: '#fff2f0',
            border: '1px solid #ffccc7',
            color: '#ff4d4f',
            padding: '8px 12px',
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#262626'
            }}>
              企业名称 *
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              placeholder="请输入企业名称"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#262626'
            }}>
              联系人姓名 *
            </label>
            <input
              type="text"
              name="contactName"
              value={formData.contactName}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              placeholder="请输入联系人姓名"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#262626'
            }}>
              联系电话 *
            </label>
            <input
              type="tel"
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              placeholder="请输入联系电话"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#262626'
            }}>
              邮箱 *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              placeholder="请输入邮箱地址"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#262626'
            }}>
              密码 *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              placeholder="请设置登录密码"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#262626'
            }}>
              确认密码 *
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              placeholder="请再次输入密码"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#bae7ff' : '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s'
            }}
          >
            {loading ? '注册中...' : '立即注册'}
          </button>

          <div style={{
            marginTop: '16px',
            textAlign: 'center',
            fontSize: '14px',
            color: '#666'
          }}>
            已有账号？
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                background: 'none',
                border: 'none',
                color: '#1890ff',
                cursor: 'pointer',
                padding: '0 4px'
              }}
            >
              立即登录
            </button>
          </div>
        </form>
      </div>

      {/* 底部说明 */}
      <div style={{
        marginTop: '24px',
        textAlign: 'center',
        color: '#666',
        fontSize: '12px'
      }}>
        注册即表示同意
        <a href="/terms" style={{ color: '#1890ff', textDecoration: 'none' }}>服务条款</a>
        和
        <a href="/privacy" style={{ color: '#1890ff', textDecoration: 'none' }}>隐私政策</a>
      </div>
    </div>
  );
};

export default RegisterPage;
