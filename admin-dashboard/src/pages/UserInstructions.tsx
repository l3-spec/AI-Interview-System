import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import './LegalPages.css';

/**
 * 《用户须知》独立页面。
 * 包含核心服务说明、注销流程等。
 */
const UserInstructions: React.FC = () => {
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
          <span className="legal-page__title">用户须知</span>
          <span style={{ width: 28, height: 28 }} aria-hidden="true" />
        </div>

        <main className="legal-page__content">
          <header className="legal-page__meta">
            <h1>用户须知</h1>
            <p className="legal-page__effective-date">
              更新日期：2026 年 4 月 24 日 &nbsp;|&nbsp; 生效日期：2026 年 4 月 24 日
            </p>
          </header>

          <p className="legal-page__intro">
            欢迎您使用由<strong>柚汀科技</strong>（以下简称“我们”）运营的相关产品与服务。本《用户须知》旨在向您说明使用本平台时的核心规则，特别是<strong>账号注销流程</strong>。请您在使用前仔细阅读。
          </p>

          <div className="legal-page__sections">
            <section className="legal-page__section">
              <h2 className="legal-page__section-title">一、服务说明</h2>
              <p>
                本平台为企业用户及求职者提供智能化的招聘、面试及人才管理服务。用户应确保注册信息的真实性与合法性。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">二、账号注销流程（重要）</h2>
              <p>
                我们尊重您的账号自主权，您可以随时申请注销账号。注销是不可逆的操作，注销后我们将删除或匿名化您的相关个人信息。
              </p>
              
              <div className="legal-page__subsection">
                <p className="legal-page__subsection-title">2.1 注销条件</p>
                <ul className="legal-page__section-list legal-page__section-list--disc">
                  <li>账号处于正常状态，无争议、纠纷；</li>
                  <li>账号内所有服务已结清，无未完成的订单或待处理的财务往来；</li>
                  <li>账号内无正在进行的面试或招聘流程。</li>
                </ul>
              </div>

              <div className="legal-page__subsection">
                <p className="legal-page__subsection-title">2.2 注销路径</p>
                <ol className="legal-page__section-list">
                  <li>
                    <strong>企业端（Web管理员）：</strong>登录后台 — 点击右上角头像 —「设置」 — 「账号管理」 — 「注销账号」。
                  </li>
                  <li>
                    <strong>求职者端（APP）：</strong>登录APP —「我的」— 右上角「设置」—「账号与安全」—「注销账号」。
                  </li>
                </ol>
              </div>

              <div className="legal-page__subsection">
                <p className="legal-page__subsection-title">2.3 处理时效</p>
                <p>
                  提交申请后，我们将在 <strong>15 个工作日内</strong> 完成审核并处理您的申请。审核期间请勿再次登录。
                </p>
              </div>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">三、用户行为规范</h2>
              <p>
                用户不得利用本服务从事违法活动，包括但不限于发布虚假招聘信息、色情低俗内容、侵犯他人隐私或知识产权等。一经发现，我们有权立即封禁账号并追究法律责任。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">四、知识产权</h2>
              <p>
                柚汀科技拥有的所有软件成果、界面设计、文字、视觉标识等知识产权受法律保护。未经授权，任何单位或个人不得复制、修改或传播。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">五、联系我们</h2>
              <p>
                如您在操作中遇到任何困难，或对服务有任何疑问，请通过以下方式联系：
              </p>
              <ul className="legal-page__section-list legal-page__section-list--disc">
                <li>客服电话：400-XXX-XXXX</li>
                <li>电子邮箱：support@u-talent.cn</li>
              </ul>
            </section>
          </div>

          <div className="legal-page__download">
            <button type="button" onClick={() => window.print()}>
              打印 / 保存 PDF
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserInstructions;
