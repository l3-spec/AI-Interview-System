import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FirstLaunchPrivacyModal, {
  hasPrivacyFirstLaunchConsent,
  setPrivacyFirstLaunchConsent
} from '../components/FirstLaunchPrivacyModal';
import { GlassCard, GlassButton, BackgroundBlobs } from '../components/GlassComponents';
import companyLogo from '../assets/company-logo.png';

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
  const [showPrivacyGateModal, setShowPrivacyGateModal] = useState(false);
  const [loginAgreedPolicies, setLoginAgreedPolicies] = useState(false);
  const [registerAgreedPolicies, setRegisterAgreedPolicies] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  const caseStudies = [
    { name: '中粮集团', quote: '"U-Talent 帮助我们实现了校招流程的全面数字化，面试效率提升显著。"', resultLabel: '效率提升', resultValue: '+85%' },
    { name: '百年人寿', quote: '"AI 数字人面试官不仅减轻了 HR 的压力，更提升了候选人的整体面试体验。"', resultLabel: '好评度', resultValue: '96%' },
    { name: '民生银行', quote: '"精准的能力评估报告为我们的关键岗位选拔提供了重要的科学依据。"', resultLabel: '匹配度', resultValue: '+70%' }
  ];

  const partnerCompanies = [
    '中粮集团', '百年人寿', '民生银行', '安华保险', '外交人事局',
    '联通北分', '中华联合财险', '京东方物业', '中化学生态环境',
    '中国水环境', '中石化北分', '当代置业', '在线途游',
    '中信医疗健康产业', '优路教育'
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      setShowFloatingButton(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const requestOpenLogin = () => {
    if (!hasPrivacyFirstLaunchConsent()) { setShowPrivacyGateModal(true); return; }
    setShowLoginModal(true);
  };

  const requestOpenRegister = () => {
    if (!hasPrivacyFirstLaunchConsent()) { setShowPrivacyGateModal(true); return; }
    setShowRegisterModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginAgreedPolicies) { setError('请先同意隐私政策。'); return; }
    setLoading(true);
    setError('');
    try {
      const success = await login(email, password);
      if (success) setShowLoginModal(false);
      else setError('邮箱或密码错误。');
    } catch (err) { setError('登录失败，请重试。'); }
    finally { setLoading(false); }
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterFormData({ ...registerFormData, [e.target.name]: e.target.value });
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerAgreedPolicies) { setRegisterError('请先同意平台条款。'); return; }
    if (registerFormData.password !== registerFormData.confirmPassword) { setRegisterError('两次输入的密码不一致。'); return; }
    setRegisterLoading(true);
    try {
      const res = await fetch('/api/company/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerFormData),
      });
      if (res.ok) {
        await login(registerFormData.email, registerFormData.password);
        setShowRegisterModal(false);
      } else { setRegisterError('注册失败，请联系管理员。'); }
    } catch (err) { setRegisterError('注册过程中发生错误。'); }
    finally { setRegisterLoading(false); }
  };

  return (
    <div className="quantum-home">
      <BackgroundBlobs />

      <header className={`quantum-nav ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container nav-inner">
          <div className="brand">
            <img src={companyLogo} alt="U-Talent 柚汀教育科技" className="brand-logo-full" />
            <div className="brand-halo"></div>
          </div>
          <nav className="nav-links">
            <a href="#features">核心技术</a>
            <a href="#cases">标杆客户</a>
            <div className="nav-divider"></div>
            <GlassButton variant="primary" onClick={requestOpenLogin} className="nav-login-btn">
              进入系统
            </GlassButton>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero-quantum">
          <div className="hero-glow-layer"></div>
          <div className="container hero-inner">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="dot"></span>
                Quantum Intelligence 3.0
              </div>
              <h1 className="hero-title">
                开启 <br />
                <span className="gradient-text-liquid">招聘新纪元</span>
              </h1>
              <p className="hero-description">
                融合超写实数字交互与多模态评估引擎。为全球精英企业提供秒级响应、零偏见的招聘全链路自动化解决方案。
              </p>
              <div className="hero-actions">
                <GlassButton variant="primary" onClick={requestOpenRegister} className="btn-huge">
                  立即体验
                </GlassButton>
                <GlassButton variant="secondary" className="btn-huge outline">
                  技术白皮书
                </GlassButton>
              </div>

              <div className="client-trust">
                <p>Top Tier 行业领军企业信赖</p>
                <div className="client-logos">
                  {partnerCompanies.slice(0, 5).map(name => (
                    <span key={name} className="client-tag">{name}</span>
                  ))}
                  <span className="client-tag more">+1000...</span>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="quantum-sphere-wrap">
                <div className="quantum-sphere">
                  <div className="sphere-core"></div>
                  <div className="sphere-ring ring-1"></div>
                  <div className="sphere-ring ring-2"></div>
                  <div className="sphere-ring ring-3"></div>
                </div>
                <GlassCard className="floating-data card-v1">
                  <div className="data-icon">⚡</div>
                  <div className="data-text">
                    <span className="val">300ms</span>
                    <span className="lbl">交互延迟</span>
                  </div>
                </GlassCard>
                <GlassCard className="floating-data card-v2">
                  <div className="data-icon">🛡️</div>
                  <div className="data-text">
                    <span className="val">99.9%</span>
                    <span className="lbl">评估精度</span>
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section-bento">
          <div className="container">
            <div className="section-header-center">
              <span className="sub">Core Technologies</span>
              <h2 className="gradient-text-liquid">定义未来的核心能力</h2>
            </div>
            <div className="bento-layout">
              <GlassCard className="bento-box hero-box">
                <div className="box-content">
                  <div className="box-icon">🎭</div>
                  <h3>超写实交互数字人</h3>
                  <p>基于情感计算的多模态交互系统，提供如真人般富有温度的对话体验，让面试不再冰冷。</p>
                  <div className="box-visual-ai">
                    <div className="wave-bar"></div>
                    <div className="wave-bar"></div>
                    <div className="wave-bar"></div>
                    <div className="wave-bar"></div>
                  </div>
                </div>
              </GlassCard>

              <div className="bento-column">
                <GlassCard className="bento-box small-box">
                  <div className="box-content">
                    <div className="box-icon">🧠</div>
                    <h3>深度行为语义分析</h3>
                    <p>自动解析候选人的逻辑架构、专业深度与软性素质，构建立体人才画像。</p>
                  </div>
                </GlassCard>
                <GlassCard className="bento-box small-box">
                  <div className="box-content">
                    <div className="box-icon">⚖️</div>
                    <h3>公平算法评估引擎</h3>
                    <p>基于科学建模的客观评分系统，从源头切断人为偏见，确保公平竞争。</p>
                  </div>
                </GlassCard>
              </div>

              <GlassCard className="bento-box feature-box">
                <div className="box-content">
                  <div className="box-icon">🌐</div>
                  <h3>全球级分布式调度</h3>
                  <p>支持万人级并发面试，轻松应对全球化校招与大规模人才筛选需求。</p>
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        <section id="cases" className="section-proof">
          <div className="container">
            <div className="section-header-side">
              <h2 className="gradient-text-liquid">标杆客户的共同选择</h2>
              <p>不仅仅是工具，更是企业人才战略的数字化加速器。</p>
            </div>

            <div className="proof-grid">
              {caseStudies.map((item, i) => (
                <GlassCard key={item.name} className="proof-card" style={{ animationDelay: `${i * 0.2}s` }}>
                  <div className="proof-header">
                    <span className="client-name">{item.name}</span>
                    <span className="result-badge">{item.resultValue}</span>
                  </div>
                  <p className="proof-quote">{item.quote}</p>
                  <div className="proof-footer">
                    <span className="proof-tag">{item.resultLabel}</span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        <section className="section-cta-liquid">
          <div className="container">
            <GlassCard className="cta-master-card">
              <div className="cta-inner-content">
                <h2>重塑您的人才竞争优势</h2>
                <p>加入 10,000+ 先锋企业，立即开启 AI 驱动的招聘数字化转型之旅。</p>
                <div className="cta-buttons">
                  <GlassButton variant="primary" onClick={requestOpenRegister} className="btn-cta">
                    免费开启试用
                  </GlassButton>
                  <Link to="/user-instructions" className="cta-link">了解更多服务条款 →</Link>
                </div>
              </div>
              <div className="cta-background-glow"></div>
            </GlassCard>
          </div>
        </section>
      </main>

      <footer className="quantum-footer">
        <div className="container footer-content">
          <div className="footer-info">
            <img src={companyLogo} alt="Logo" className="footer-logo" />
            <p>定义 AI 招聘新未来 · 柚汀教育科技</p>
            <div className="copyright">© {new Date().getFullYear()} U-Talent Tech. All Rights Reserved.</div>
          </div>
          <div className="footer-links">
            <div className="link-group">
              <h4>产品中心</h4>
              <a href="#features">核心技术</a>
              <a href="#">更新日志</a>
            </div>
            <div className="link-group">
              <h4>法律合规</h4>
              <Link to="/privacy-policy">隐私政策</Link>
              <Link to="/user-instructions">服务协议</Link>
              <Link to="/user-agreement">用户须知</Link>
            </div>
          </div>
        </div>
      </footer>

      {showLoginModal && (
        <div className="modal-root" onClick={() => setShowLoginModal(false)}>
          <GlassCard className="modal-window login-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>企业登录</h2>
              <button className="btn-close" onClick={() => setShowLoginModal(false)}></button>
            </div>
            <form onSubmit={handleSubmit} className="quantum-form">
              <div className="input-field">
                <input type="email" placeholder="企业邮箱" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="input-field">
                <input type="password" placeholder="登录密码" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <label className="checkbox-field">
                <input type="checkbox" checked={loginAgreedPolicies} onChange={e => setLoginAgreedPolicies(e.target.checked)} />
                <span>我已阅读并同意 <Link to="/privacy-policy">隐私政策</Link></span>
              </label>
              {error && <div className="error-msg">{error}</div>}
              <GlassButton type="submit" disabled={loading} className="btn-submit">
                {loading ? '安全验证中...' : '立即进入控制台'}
              </GlassButton>
              <div className="form-footer">
                还没有账号？ <button type="button" onClick={() => { setShowLoginModal(false); setShowRegisterModal(true); }}>立即注册</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {showRegisterModal && (
        <div className="modal-root" onClick={() => setShowRegisterModal(false)}>
          <GlassCard className="modal-window register-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>创建企业工作区</h2>
              <button className="btn-close" onClick={() => setShowRegisterModal(false)}></button>
            </div>
            <form onSubmit={handleRegisterSubmit} className="quantum-form grid">
              <div className="input-field span-2">
                <input type="text" name="companyName" placeholder="企业全称" value={registerFormData.companyName} onChange={handleRegisterChange} required />
              </div>
              <div className="input-field">
                <input type="text" name="contactName" placeholder="联系人姓名" value={registerFormData.contactName} onChange={handleRegisterChange} required />
              </div>
              <div className="input-field">
                <input type="tel" name="contactPhone" placeholder="联系电话" value={registerFormData.contactPhone} onChange={handleRegisterChange} required />
              </div>
              <div className="input-field span-2">
                <input type="email" name="email" placeholder="业务邮箱" value={registerFormData.email} onChange={handleRegisterChange} required />
              </div>
              <div className="input-field">
                <input type="password" name="password" placeholder="设置密码" value={registerFormData.password} onChange={handleRegisterChange} required />
              </div>
              <div className="input-field">
                <input type="password" name="confirmPassword" placeholder="确认密码" value={registerFormData.confirmPassword} onChange={handleRegisterChange} required />
              </div>
              <label className="checkbox-field span-2">
                <input type="checkbox" checked={registerAgreedPolicies} onChange={e => setRegisterAgreedPolicies(e.target.checked)} />
                <span>同意 <Link to="/user-instructions">平台服务条款</Link> 与 <Link to="/privacy-policy">隐私政策</Link></span>
              </label>
              {registerError && <div className="error-msg span-2">{registerError}</div>}
              <div className="span-2">
                <GlassButton type="submit" disabled={registerLoading} className="btn-submit">
                  {registerLoading ? '正在初始化环境...' : '开启企业授权'}
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      <FirstLaunchPrivacyModal
        open={showPrivacyGateModal}
        onAgree={() => { setPrivacyFirstLaunchConsent(); setShowPrivacyGateModal(false); }}
        onDisagree={() => setShowPrivacyGateModal(false)}
      />

      <style dangerouslySetInnerHTML={{
        __html: `
        .quantum-home { min-height: 100vh; position: relative; color: var(--text-main); }
        .container { max-width: var(--container-max); margin: 0 auto; padding: 0 40px; }
        
        .gradient-text-liquid { 
          background: linear-gradient(135deg, #fff 0%, var(--accent) 50%, #818cf8 100%); 
          -webkit-background-clip: text; 
          -webkit-text-fill-color: transparent; 
          background-size: 200% auto;
          animation: shine 5s linear infinite;
        }

        @keyframes shine {
          to { background-position: 200% center; }
        }

        /* Nav */
        .quantum-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; padding: 40px 0; transition: all 0.6s var(--ease-out-expo); }
        .quantum-nav.scrolled { padding: 16px 0; background: rgba(2, 6, 23, 0.7); backdrop-filter: blur(30px) saturate(2); border-bottom: 1px solid var(--glass-border); }
        .nav-inner { display: flex; justify-content: space-between; align-items: center; }
        
        .brand { position: relative; display: flex; align-items: center; }
        .brand-logo-full { height: 140px; width: auto; transition: all 0.5s var(--ease-out-expo); z-index: 2; filter: drop-shadow(0 0 20px rgba(56, 189, 248, 0.15)); }
        .brand-halo { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 140px; height: 80px; background: radial-gradient(circle, var(--glow-primary) 0%, transparent 70%); opacity: 0; transition: opacity 0.5s; z-index: 1; }
        .brand:hover .brand-halo { opacity: 0.3; }
        .quantum-nav.scrolled .brand-logo-full { height: 56px; }


        .nav-links { display: flex; align-items: center; gap: 48px; }
        .nav-links a { font-size: 14px; font-weight: 700; color: var(--text-secondary); text-decoration: none; transition: all 0.3s; letter-spacing: 1px; text-transform: uppercase; }
        .nav-links a:hover { color: var(--text-main); transform: translateY(-1px); }
        .nav-divider { width: 1px; height: 24px; background: var(--glass-border); }
        .nav-login-btn { height: 44px !important; padding: 0 32px !important; border-radius: 12px !important; font-size: 13px !important; letter-spacing: 1px !important; }

        /* Hero */
        .hero-quantum { position: relative; padding: 240px 0 160px; overflow: hidden; }
        .hero-glow-layer { position: absolute; top: -20%; right: -10%; width: 60%; height: 80%; background: radial-gradient(circle, var(--glow-primary) 0%, transparent 70%); opacity: 0.2; filter: blur(120px); pointer-events: none; }
        .hero-inner { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 80px; align-items: center; }
        
        .hero-badge { display: inline-flex; align-items: center; gap: 10px; padding: 10px 20px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 100px; color: var(--accent); font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 40px; }
        .hero-badge .dot { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 10px var(--accent); animation: pulse 2s infinite; }
        
        .hero-title { font-size: 108px; font-weight: 950; line-height: 0.95; letter-spacing: -6px; margin-bottom: 40px; }
        .hero-description { font-size: 24px; color: var(--text-secondary); line-height: 1.5; max-width: 620px; margin-bottom: 64px; }
        
        .hero-actions { display: flex; gap: 24px; }
        .btn-huge { height: 72px !important; padding: 0 56px !important; font-size: 20px !important; font-weight: 800 !important; border-radius: 20px !important; }
        .btn-huge.outline { background: rgba(255,255,255,0.03) !important; border: 1px solid var(--glass-border) !important; color: white !important; }
        
        .client-trust { margin-top: 80px; }
        .client-trust p { font-size: 13px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px; }
        .client-logos { display: flex; gap: 16px; flex-wrap: wrap; }
        .client-tag { padding: 8px 18px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 10px; font-size: 13px; font-weight: 600; color: var(--text-secondary); transition: all 0.3s; }
        .client-tag:hover { background: rgba(56, 189, 248, 0.1); border-color: var(--accent); color: var(--text-main); }
        .client-tag.more { border-style: dashed; }

        /* Hero Visual */
        .hero-visual { position: relative; }
        .quantum-sphere-wrap { position: relative; width: 100%; height: 500px; display: flex; align-items: center; justify-content: center; }
        .quantum-sphere { position: relative; width: 300px; height: 300px; }
        .sphere-core { position: absolute; inset: 20%; background: radial-gradient(circle, var(--accent), var(--glass-secondary)); border-radius: 50%; filter: blur(30px); opacity: 0.6; animation: orb-float 4s ease-in-out infinite alternate; }
        .sphere-ring { position: absolute; border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; }
        .ring-1 { inset: 0; border-color: rgba(56, 189, 248, 0.2); animation: rotate 20s linear infinite; }
        .ring-2 { inset: -40px; border-color: rgba(129, 140, 248, 0.15); animation: rotate 15s linear infinite reverse; }
        .ring-3 { inset: -80px; border-color: rgba(255, 255, 255, 0.05); animation: rotate 30s linear infinite; }
        
        .floating-data { position: absolute; padding: 20px 24px; display: flex; align-items: center; gap: 16px; min-width: 200px; }
        .card-v1 { top: 0; right: -40px; transform: rotate(5deg); }
        .card-v2 { bottom: 40px; left: -80px; transform: rotate(-5deg); }
        .data-icon { font-size: 24px; }
        .data-text .val { display: block; font-size: 20px; font-weight: 900; line-height: 1; }
        .data-text .lbl { font-size: 12px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; }

        /* Bento Grid */
        .section-bento { padding: 160px 0; }
        .section-header-center { text-align: center; margin-bottom: 80px; }
        .section-header-center .sub { font-size: 13px; font-weight: 800; color: var(--accent); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px; display: block; }
        .section-header-center h2 { font-size: 64px; font-weight: 950; letter-spacing: -3px; }
        
        .bento-layout { display: grid; grid-template-columns: 1.5fr 1fr 1fr; grid-template-rows: repeat(2, 300px); gap: 24px; }
        .bento-box { height: 100%; }
        .hero-box { grid-row: span 2; }
        .bento-column { grid-row: span 2; display: flex; flexDirection: column; gap: 24px; }
        .small-box { flex: 1; }
        .feature-box { grid-column: 3; grid-row: span 2; }
        
        .box-content { padding: 48px; height: 100%; display: flex; flex-direction: column; }
        .box-icon { font-size: 40px; margin-bottom: 32px; }
        .box-content h3 { font-size: 28px; font-weight: 800; margin-bottom: 20px; letter-spacing: -1px; }
        .box-content p { font-size: 16px; color: var(--text-secondary); line-height: 1.6; }
        
        .box-visual-ai { margin-top: auto; display: flex; gap: 8px; align-items: flex-end; height: 60px; }
        .wave-bar { width: 8px; background: var(--accent); border-radius: 4px; animation: wave 1.5s ease-in-out infinite; }
        .wave-bar:nth-child(1) { height: 40%; animation-delay: 0s; }
        .wave-bar:nth-child(2) { height: 80%; animation-delay: 0.2s; }
        .wave-bar:nth-child(3) { height: 100%; animation-delay: 0.4s; }
        .wave-bar:nth-child(4) { height: 60%; animation-delay: 0.6s; }

        /* Proof Grid */
        .section-proof { padding: 120px 0; background: linear-gradient(180deg, transparent, rgba(56, 189, 248, 0.03), transparent); }
        .section-header-side { margin-bottom: 80px; }
        .section-header-side h2 { font-size: 56px; font-weight: 900; letter-spacing: -2.5px; margin-bottom: 24px; }
        .section-header-side p { font-size: 20px; color: var(--text-secondary); }
        
        .proof-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
        .proof-card { padding: 40px; transition: transform 0.4s; }
        .proof-card:hover { transform: scale(1.02); }
        .proof-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .client-name { font-size: 18px; font-weight: 900; color: var(--accent); }
        .result-badge { padding: 6px 14px; background: rgba(56, 189, 248, 0.1); border: 1px solid var(--accent); border-radius: 8px; font-weight: 900; font-size: 16px; }
        .proof-quote { font-size: 18px; color: var(--text-primary); line-height: 1.7; font-style: italic; margin-bottom: 32px; }
        .proof-tag { font-size: 12px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; }

        /* CTA */
        .section-cta-liquid { padding: 160px 0; }
        .cta-master-card { position: relative; padding: 100px; text-align: center; overflow: hidden; border-radius: 40px !important; }
        .cta-inner-content { position: relative; z-index: 2; }
        .cta-master-card h2 { font-size: 72px; font-weight: 950; letter-spacing: -4px; margin-bottom: 32px; }
        .cta-master-card p { font-size: 24px; color: var(--text-secondary); margin-bottom: 64px; max-width: 800px; margin-left: auto; margin-right: auto; }
        .cta-buttons { display: flex; flex-direction: column; align-items: center; gap: 32px; }
        .btn-cta { height: 80px !important; padding: 0 80px !important; font-size: 24px !important; border-radius: 24px !important; box-shadow: 0 20px 60px var(--glow-primary) !important; }
        .cta-link { color: var(--text-muted); text-decoration: none; font-size: 15px; font-weight: 700; transition: color 0.3s; }
        .cta-link:hover { color: var(--text-main); }
        .cta-background-glow { position: absolute; bottom: -50%; left: 50%; transform: translateX(-50%); width: 80%; height: 100%; background: radial-gradient(circle, var(--glow-primary) 0%, transparent 70%); opacity: 0.3; filter: blur(100px); pointer-events: none; }

        /* Footer */
        .quantum-footer { padding: 120px 0 60px; border-top: 1px solid var(--glass-border); }
        .footer-content { display: flex; justify-content: space-between; align-items: flex-start; }
        .footer-logo { height: 150px; margin-bottom: 32px; }
        .footer-info p { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; }
        .copyright { font-size: 13px; color: var(--text-muted); }
        
        .footer-links { display: flex; gap: 100px; }
        .link-group h4 { font-size: 14px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 32px; }
        .link-group a { display: block; color: var(--text-secondary); text-decoration: none; font-size: 15px; margin-bottom: 16px; transition: color 0.3s; }
        .link-group a:hover { color: white; }

        /* Modals */
        .modal-root { position: fixed; inset: 0; background: rgba(0,0,0,0.92); backdrop-filter: blur(40px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 40px; }
        .modal-window { width: 100%; max-width: 520px; padding: 64px !important; border-radius: 32px !important; }
        .register-window { max-width: 720px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 48px; }
        .modal-header h2 { font-size: 36px; font-weight: 900; letter-spacing: -1.5px; }
        .btn-close { width: 48px; height: 48px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 12px; cursor: pointer; position: relative; }
        .btn-close::before, .btn-close::after { content: ''; position: absolute; top: 50%; left: 50%; width: 20px; height: 2px; background: white; transform-origin: center; }
        .btn-close::before { transform: translate(-50%, -50%) rotate(45deg); }
        .btn-close::after { transform: translate(-50%, -50%) rotate(-45deg); }
        .btn-close:hover { background: rgba(255,255,255,0.1); }

        .quantum-form { display: flex; flex-direction: column; gap: 24px; }
        .quantum-form.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .span-2 { grid-column: span 2; }
        .input-field input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 16px; padding: 20px 28px; color: white; font-size: 17px; transition: all 0.3s var(--ease-out-expo); outline: none; }
        .input-field input:focus { border-color: var(--accent); background: rgba(255,255,255,0.06); box-shadow: 0 0 30px rgba(56, 189, 248, 0.15); }
        .checkbox-field { display: flex; align-items: center; gap: 14px; font-size: 14px; color: var(--text-secondary); cursor: pointer; }
        .btn-submit { height: 64px !important; font-size: 18px !important; font-weight: 800 !important; border-radius: 16px !important; width: 100%; margin-top: 12px; }
        .error-msg { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5; padding: 16px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; }
        .form-footer { text-align: center; font-size: 14px; color: var(--text-muted); margin-top: 16px; }
        .form-footer button { background: none; border: none; color: var(--accent); font-weight: 800; cursor: pointer; padding: 0 4px; }

        @keyframes orb-float { from { transform: scale(1) translateY(0); } to { transform: scale(1.1) translateY(-20px); } }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes wave { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.4); } }

        @media (max-width: 1200px) {
          .hero-title { font-size: 80px; }
          .bento-layout { grid-template-columns: 1fr 1fr; grid-template-rows: auto; }
          .feature-box { grid-column: span 2; }
        }
      `}} />
    </div>
  );
};

export default HomePage;
