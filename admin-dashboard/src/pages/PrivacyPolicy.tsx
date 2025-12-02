import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LegalPages.css';

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-page">
      <div className="legal-page__phone">

        <div className="legal-page__nav">
          <button
            type="button"
            className="legal-page__back"
            onClick={() => navigate(-1)}
            aria-label="返回上一页"
          >
            <svg viewBox="0 0 12 12">
              <path d="M7.5 2.5L4 6l3.5 3.5" />
            </svg>
          </button>
          <span className="legal-page__title">隐私政策</span>
          <span style={{ width: 28, height: 28 }} aria-hidden="true" />
        </div>

        <main className="legal-page__content">
          <header className="legal-page__meta">
            <h1>隐私政策</h1>
            <p className="legal-page__effective-date">生效日期：2025 年 10 月 15 日</p>
          </header>

          <p className="legal-page__intro">
            星链未来非常重视您的个人信息保护。本《隐私政策》旨在说明我们如何收集、使用、存储、共享及保护您的信息。
          </p>

          <div className="legal-page__sections">
            <section className="legal-page__section">
              <h2 className="legal-page__section-title">一、信息收集</h2>
              <p>我们会根据服务功能的不同，收集以下类型的信息：</p>
              <ol className="legal-page__section-list">
                <li>注册信息：手机号、邮箱、昵称、密码等。</li>
                <li>求职信息：教育经历、工作经历、简历内容、期望岗位等。</li>
                <li>使用数据：操作日志、设备信息、网络环境、访问记录等。</li>
                <li>第三方授权信息：当您使用微信、支付宝等账号登录时，我们会获取必要的授权信息（如头像、昵称）。</li>
              </ol>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">二、信息使用</h2>
              <p>我们收集您的信息主要用于：</p>
              <ol className="legal-page__section-list">
                <li>提供求职与招聘服务（如简历投递、职位推荐）。</li>
                <li>优化用户体验与产品功能。</li>
                <li>进行匿名化的统计分析与算法优化。</li>
                <li>履行法律法规要求的义务。</li>
              </ol>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">三、信息共享</h2>
              <ol className="legal-page__section-list">
                <li>我们仅在必要时与招聘方共享求职相关信息，并在法律允许范围内进行。</li>
                <li>除法律法规规定或用户授权外，我们不会将您的个人信息出售或提供给任何第三方。</li>
                <li>我们会与经过严格审查的服务供应商合作（如云存储、消息推送），并要求其遵守保密义务。</li>
              </ol>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">四、信息存储与保护</h2>
              <ol className="legal-page__section-list">
                <li>您的个人信息将被安全地存储在中国境内的服务器上。</li>
                <li>我们采取加密、访问控制、日志审计等技术手段防止信息泄露、损毁或被非法访问。</li>
                <li>当您注销账户后，我们将在合理期限内删除或匿名化处理您的个人信息。</li>
              </ol>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">五、您的权利</h2>
              <p>您有权：</p>
              <ul className="legal-page__section-list legal-page__section-list--disc">
                <li>查询、更正、删除您的个人信息；</li>
                <li>撤回授权或注销账户；</li>
                <li>获取关于您信息使用方式的说明。</li>
              </ul>
              <p>可通过【设置 - 隐私中心】或联系客服行使以上权利。</p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">六、未成年人保护</h2>
              <p>若您未满 18 周岁，请在监护人指导下使用本平台。未经监护人同意，我们不会主动收集未成年人信息。</p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">七、政策更新</h2>
              <p>我们可能会不时更新本政策，并通过应用内通知或弹窗提示的方式告知您重要变更。</p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">八、联系我们</h2>
              <p>
                如您对本政策有任何疑问、意见或投诉，请通过以下方式联系我们：
                <br />
                邮箱：privacy@xinglianfuture.com
                <br />
                客服电话：400-XXXX-XXX（工作日 9:00-18:00）
              </p>
            </section>
          </div>

          <div className="legal-page__download">
            <button type="button" onClick={() => window.print()}>
              下载协议
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
