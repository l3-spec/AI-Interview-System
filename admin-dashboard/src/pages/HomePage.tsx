import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';
import companyLogo from '../assets/company-logo.png';
import alibabaLogo from '../assets/alibaba-logo.svg';
import bytedanceLogo from '../assets/bytedance-logo.svg';
import antGroupLogo from '../assets/antgroup-logo.svg';
import huaweiLogo from '../assets/huawei-logo.svg';
import baiduLogo from '../assets/baidu-logo.svg';
import jdLogo from '../assets/jd-logo.svg';
import didiLogo from '../assets/didi-logo.svg';
import oppoLogo from '../assets/oppo-logo.svg';

const HomePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [registerFormData, setRegisterFormData] = useState({
    companyName: '',
    contactName: '',
    contactPhone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [navScrollProgress, setNavScrollProgress] = useState(0);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const caseStudies = [
    {
      name: '阿里巴巴',
      logo: alibabaLogo,
      quote: '"AI面试系统帮助我们提升了面试效率，候选人体验也更好了"',
      resultLabel: '面试效率提升',
      resultValue: '85%'
    },
    {
      name: '字节跳动',
      logo: bytedanceLogo,
      quote: '"智能筛选功能让我们能够快速找到最合适的技术人才"',
      resultLabel: '招聘成功率提升',
      resultValue: '70%'
    },
    {
      name: '蚂蚁金服',
      logo: antGroupLogo,
      quote: '"AI分析报告非常专业，为我们的招聘决策提供了有力支持"',
      resultLabel: '招聘成本降低',
      resultValue: '60%'
    }
  ];

  const partnerCompanies = [
    { name: '华为', logo: huaweiLogo },
    { name: '阿里巴巴', logo: alibabaLogo },
    { name: '百度', logo: baiduLogo },
    { name: '京东', logo: jdLogo },
    { name: '字节跳动', logo: bytedanceLogo },
    { name: '滴滴出行', logo: didiLogo },
    { name: '蚂蚁集团', logo: antGroupLogo },
    { name: 'OPPO', logo: oppoLogo }
  ];
  const currentYear = new Date().getFullYear();

  // 监听滚动事件，控制悬浮按钮的显示
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setShowFloatingButton(currentScroll > 300);
      const progress = Math.min(1, Math.max(0, currentScroll / 160));
      setNavScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    // 自动填充邮箱
    const storedUser = localStorage.getItem('adminUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.email) setEmail(user.email);
      } catch {}
    }
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    console.log('HomePage: isAuthenticated 状态变化:', isAuthenticated);
    if (isAuthenticated) {
      console.log('HomePage: 用户已认证，跳转到dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('开始登录，邮箱:', email);
    console.log('阻止默认行为:', e.defaultPrevented);
    console.log('当前URL:', window.location.href);
    setLoading(true);
    setError('');
    
    try {
      const success = await login(email, password);
      console.log('登录结果:', success);
      if (success) {
        console.log('登录成功，关闭弹窗');
        setShowLoginModal(false);
        // 登录成功后会自动跳转到dashboard
      } else {
        console.log('登录失败，显示错误信息');
        setError('邮箱或密码错误，请检查后重试');
        // 保持错误信息显示，不清除
        setTimeout(() => {
          setError(''); // 5秒后自动清除错误信息
        }, 5000);
      }
    } catch (error: any) {
      console.error('登录错误:', error);
      setError('登录失败，请稍后重试');
      // 保持错误信息显示，不清除
      setTimeout(() => {
        setError('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterLoading(true);

    // 表单验证
    if (!registerFormData.companyName || !registerFormData.contactName || !registerFormData.contactPhone || !registerFormData.email || !registerFormData.password) {
      setRegisterError('请填写所有必填项');
      setRegisterLoading(false);
      return;
    }

    if (registerFormData.password !== registerFormData.confirmPassword) {
      setRegisterError('两次输入的密码不一致');
      setRegisterLoading(false);
      return;
    }

    try {
      // 调用注册API
      const registerResponse = await fetch('/api/company/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: registerFormData.companyName,
          contactName: registerFormData.contactName,
          contactPhone: registerFormData.contactPhone,
          email: registerFormData.email,
          password: registerFormData.password,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json().catch(() => ({}));
        throw new Error(errorData.message || '注册失败，请稍后重试');
      }

      // 注册成功后直接用 useAuth 的 login 登录
      await login(registerFormData.email, registerFormData.password);
      setShowRegisterModal(false);
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : '注册失败，请稍后重试');
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="home-page">
      {/* 顶部导航栏 */}
      <header
        className="navbar"
        style={{ ['--nav-progress' as any]: navScrollProgress }}
      >
        <div className="nav-container">
          <div className="logo">
            <img
              src={companyLogo}
              alt="AI面试系统"
              className="logo-image"
            />
            <span className="logo-text">AI面试系统</span>
          </div>
          <nav className="nav-menu">
            <a href="#features">产品特色</a>
            <a href="#cases">成功案例</a>
            <a href="#partners">合作伙伴</a>
            <div className="nav-download">
              <span className="nav-link">APP 下载</span>
              <div className="download-dropdown" aria-label="Android 客户端下载">
                <div className="dropdown-header">Android 版下载</div>
                <div className="dropdown-body">
                  <div className="dropdown-qr">
                    <img src="/downloads/ai-interview-app-qr.png" alt="Android APK 下载二维码" />
                    <span>扫码立即下载</span>
                  </div>
                  <a
                    className="dropdown-download-btn"
                    href="/downloads/ai-interview-app.apk"
                    download
                  >
                    立即下载 APK 安装包
                  </a>
                  <span className="dropdown-filename">文件名：ai-interview-app.apk</span>
                </div>
              </div>
            </div>
            <button 
              className="login-btn"
              onClick={() => setShowLoginModal(true)}
            >
              企业登录
            </button>
          </nav>
        </div>
      </header>

      {/* Hero区域 */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">智能AI面试平台</h1>
            <h2 className="hero-subtitle">让招聘更智能1，让面试更高效</h2>
            <p className="hero-description">
              基于先进AI技术，为企业提供智能化面试解决方案，
              帮助企业快速识别优秀人才，提升招聘效率
            </p>
            <div className="hero-buttons">
              <button 
                className="cta-primary"
                onClick={() => setShowRegisterModal(true)}
                style={{
                  background: '#1890ff',
                  color: 'white',
                  padding: '14px 32px',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(24, 144, 255, 0.5)',
                  transition: 'all 0.3s'
                }}
              >
                立即免费试用
              </button>
              <button className="cta-secondary">
                了解更多
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">10,000+</div>
                <div className="stat-label">企业用户</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">500,000+</div>
                <div className="stat-label">面试场次</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">95%</div>
                <div className="stat-label">客户满意度</div>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-visual">
              <div className="floating-card card-1">📊 智能分析</div>
              <div className="floating-card card-2">🎯 精准匹配</div>
              <div className="floating-card card-3">⚡ 高效筛选</div>
            </div>
          </div>
        </div>
      </section>

      {/* 产品特色 */}
      <section id="features" className="features-section">
        <div className="container">
          <h2 className="section-title">产品特色</h2>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">🤖</div>
              <h3>AI智能面试</h3>
              <p>基于深度学习技术，智能生成面试问题，自动评估候选人表现</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <h3>数据分析</h3>
              <p>多维度数据分析，为企业提供科学的人才评估报告</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">⚡</div>
              <h3>高效筛选</h3>
              <p>快速筛选简历，精准匹配岗位需求，节省80%招聘时间</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🎯</div>
              <h3>精准匹配</h3>
              <p>智能算法匹配最适合的候选人，提升招聘成功率</p>
            </div>
          </div>
        </div>
      </section>

      {/* 成功案例 */}
      <section id="cases" className="cases-section">
        <div className="container">
          <h2 className="section-title">成功案例</h2>
          <div className="cases-grid">
            {caseStudies.map(caseItem => (
              <div className="case-item" key={caseItem.name}>
                <div className="case-logo">
                  <img src={caseItem.logo} alt={`${caseItem.name} logo`} />
                </div>
                <h3>{caseItem.name}</h3>
                <p>{caseItem.quote}</p>
                <div className="case-result">
                  {caseItem.resultLabel} <strong>{caseItem.resultValue}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 合作伙伴 */}
      <section id="partners" className="partners-section">
        <div className="container">
          <h2 className="section-title">合作伙伴</h2>
          <div className="partners-grid">
            {partnerCompanies.map(partner => (
              <div className="partner-logo" key={partner.name} title={partner.name}>
                <img src={partner.logo} alt={`${partner.name} logo`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 移动端下载 */}
      <section id="download" className="download-section">
        <div className="container">
          <div className="download-card">
            <div className="download-content">
              <h2 className="section-title">Android 版下载</h2>
              <p className="download-description">
                将安卓客户端安装包部署到官网，支持管理员或体验用户直接下载安装。
              </p>
              <div className="download-actions">
                <a
                  className="download-link"
                  href="/downloads/ai-interview-app.apk"
                  download
                >
                  立即下载 APK 安装包
                </a>
                <span className="download-filename">文件名：ai-interview-app.apk</span>
              </div>
            </div>
            <div className="download-qr">
              <img
                src="/downloads/ai-interview-app-qr.png"
                alt="Android APK 下载二维码"
              />
              <p>手机扫码获取安装包</p>
            </div>
          </div>
        </div>
      </section>

      {/* 底部CTA */}
      <section className="cta-section">
        <div className="container">
          <h2>准备开始智能招聘了吗？</h2>
          <p>立即注册，体验AI面试系统带来的招聘革命</p>
          <button 
            className="cta-primary large"
            onClick={() => setShowRegisterModal(true)}
            style={{
              background: '#1890ff',
              color: 'white',
              padding: '16px 40px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(24, 144, 255, 0.5)',
              transition: 'all 0.3s'
            }}
          >
            立即免费试用
          </button>
        </div>
      </section>

      <footer className="home-footer">
        <div className="home-footer__container">
          <div className="home-footer__links">
            <a href="/privacy-policy" className="home-footer__link">隐私政策</a>
            <span className="home-footer__separator">|</span>
            <a href="/privacy-rights" className="home-footer__link">隐私权利</a>
          </div>
          <p className="home-footer__copy">© {currentYear} 星链未来 · 保留所有权利</p>
        </div>
      </footer>

      {/* 悬浮的免费试用按钮 */}
      {showFloatingButton && (
        <div style={{
          position: 'fixed',
          right: '30px',
          bottom: '30px',
          zIndex: 1000
        }}>
          <button
            onClick={() => setShowRegisterModal(true)}
            style={{
              background: '#1890ff',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '30px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(24, 144, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s',
              animation: 'pulse 2s infinite'
            }}
          >
            <span style={{ fontSize: '20px' }}>🚀</span> 免费试用
          </button>
        </div>
      )}

      {/* 登录弹窗 */}
      {showLoginModal && (
        <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>企业登录</h3>
              <button 
                className="close-btn"
                onClick={() => setShowLoginModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="login-form" onReset={(e) => e.preventDefault()}>
              <div className="form-item">
                <input
                  type="email"
                  placeholder="邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    fontSize: '14px',
                    height: '36px'
                  }}
                />
              </div>

              <div className="form-item">
                <input
                  type="password"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    fontSize: '14px',
                    height: '36px'
                  }}
                />
              </div>

              {error && (
                <div className="error-message" style={{
                  color: '#ff4d4f',
                  background: '#fff2f0',
                  border: '1px solid #ffccc7',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  animation: 'shake 0.5s ease-in-out',
                  boxShadow: '0 2px 8px rgba(255, 77, 79, 0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    {error}
                  </div>
                  <button
                    onClick={() => setError('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ff4d4f',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '0',
                      marginLeft: '8px',
                      opacity: 0.7,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                  >
                    ×
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: loading ? '#bae7ff' : '#1890ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>

            <div style={{ margin: '16px 0 0 0', textAlign: 'center', fontSize: '14px' }}>
              没有账号？
              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(false);
                  setShowRegisterModal(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1890ff',
                  cursor: 'pointer',
                  padding: '0 4px'
                }}
              >
                立即注册
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 注册弹窗 */}
      {showRegisterModal && (
        <div className="login-modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="login-modal register-modal" onClick={(e) => e.stopPropagation()} style={{ 
            maxWidth: '520px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div className="modal-header" style={{ padding: '15px 20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>企业免费注册</h3>
              <button 
                className="close-btn"
                onClick={() => setShowRegisterModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleRegisterSubmit} className="login-form" style={{ 
              padding: '15px 20px',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              margin: 0
            }} autoComplete="off">
              <div className="form-item" style={{ gridColumn: '1 / 3', marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>企业名称 *</label>
                <input
                  type="text"
                  name="companyName"
                  placeholder="请输入企业名称"
                  value={registerFormData.companyName}
                  onChange={handleRegisterChange}
                  required
                  style={{ padding: '8px 12px', height: '36px', width: '100%' }}
                />
              </div>

              <div className="form-item" style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>联系人姓名 *</label>
                <input
                  type="text"
                  name="contactName"
                  placeholder="请输入联系人姓名"
                  value={registerFormData.contactName}
                  onChange={handleRegisterChange}
                  required
                  style={{ padding: '8px 12px', height: '36px', width: '100%' }}
                />
              </div>

              <div className="form-item" style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>联系电话 *</label>
                <input
                  type="tel"
                  name="contactPhone"
                  placeholder="请输入联系电话"
                  value={registerFormData.contactPhone}
                  onChange={handleRegisterChange}
                  required
                  style={{ padding: '8px 12px', height: '36px', width: '100%' }}
                />
              </div>

              <div className="form-item" style={{ marginBottom: '8px', gridColumn: '1 / 2' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>邮箱 *</label>
                <input
                  type="email"
                  name="email"
                  placeholder="请输入邮箱地址"
                  value={registerFormData.email}
                  onChange={handleRegisterChange}
                  required
                  autoComplete="off"
                  style={{ padding: '8px 12px', height: '36px', width: '100%' }}
                />
              </div>

              <div className="form-item" style={{ marginBottom: '8px', gridColumn: '1 / 2' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>密码 *</label>
                <input
                  type="password"
                  name="password"
                  placeholder="请设置登录密码"
                  value={registerFormData.password}
                  onChange={handleRegisterChange}
                  required
                  autoComplete="new-password"
                  style={{ padding: '8px 12px', height: '36px', width: '100%' }}
                />
              </div>
              <div className="form-item" style={{ marginBottom: '8px', gridColumn: '2 / 3' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>确认密码 *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="请再次输入密码"
                  value={registerFormData.confirmPassword}
                  onChange={handleRegisterChange}
                  required
                  autoComplete="new-password"
                  style={{ padding: '8px 12px', height: '36px', width: '100%' }}
                />
              </div>

              {registerError && (
                <div className="error-message" style={{ gridColumn: '1 / 3', padding: '8px', marginBottom: '8px' }}>
                  {registerError}
                </div>
              )}

              <div style={{ gridColumn: '1 / 3', display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <button
                  type="submit"
                  disabled={registerLoading}
                  style={{
                    width: '200px',
                    padding: '12px',
                    background: registerLoading ? '#bae7ff' : '#1890ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px',
                    cursor: registerLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {registerLoading ? '注册中...' : '立即注册'}
                </button>
              </div>

              <div style={{ gridColumn: '1 / 3', marginTop: '10px', textAlign: 'center', fontSize: '14px' }}>
                已有账号？
                <button
                  type="button"
                  onClick={() => {
                    setShowRegisterModal(false);
                    setShowLoginModal(true);
                  }}
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
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0% {
              transform: scale(1);
              box-shadow: 0 4px 12px rgba(24, 144, 255, 0.5);
            }
            50% {
              transform: scale(1.05);
              box-shadow: 0 4px 20px rgba(24, 144, 255, 0.7);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 4px 12px rgba(24, 144, 255, 0.5);
            }
          }
          
          .register-modal {
            max-height: 90vh;
            overflow-y: auto;
          }
        `
      }} />
    </div>
  );
};

export default HomePage;
