import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import './LegalPages.css';

/**
 * 《用户服务协议》独立页面，与《隐私政策》分离。
 */
const UserAgreement: React.FC = () => {
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
          <span className="legal-page__title">用户服务协议</span>
          <span style={{ width: 28, height: 28 }} aria-hidden="true" />
        </div>

        <main className="legal-page__content">
          <header className="legal-page__meta">
            <h1>用户服务协议</h1>
            <p className="legal-page__effective-date">
              更新日期：2026 年 4 月 22 日 &nbsp;|&nbsp; 生效日期：2026 年 4 月 22 日
            </p>
          </header>

          <p className="legal-page__intro">
            欢迎您使用由<strong>柚汀科技</strong>运营的相关产品与服务（以下简称「本平台」）。请您审慎阅读、充分理解本协议各条款，特别是免除或限制责任条款。
            关于个人信息的处理规则，请您另行阅读并充分理解
            <Link to="/privacy-policy" className="legal-page__link-accent">
              《隐私政策》
            </Link>
            ——该文档为<strong>独立文件</strong>，不构成本协议的附件或章节。
          </p>

          <div className="legal-page__sections">
            <section className="legal-page__section">
              <h2 className="legal-page__section-title">一、协议的接受与变更</h2>
              <p>
                您通过网络页面点击确认或以其他方式选择接受本协议，即视为您已阅读并同意签署本协议。柚汀科技有权在必要时修订本协议，并以网站公告、应用内提示等显著方式告知；若您不同意变更，请停止使用服务。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">二、账户与安全</h2>
              <p>
                您应使用真实、准确、合法的信息注册企业或管理员账户，并妥善保管账号与密码。因您保管不善导致的损失，除法律另有规定或柚汀科技存在过错外，由您自行承担。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">三、服务内容与规范</h2>
              <p>
                本平台向企业用户提供招聘、面试管理、数据分析等能力。您承诺遵守法律法规及公序良俗，不得利用本平台从事侵权、欺诈、骚扰、传播违法信息等行为。柚汀科技有权依规则采取警告、限制功能、终止服务等措施。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">四、知识产权</h2>
              <p>
                本平台所包含的软件、界面、文案、标识等知识产权归柚汀科技或相关权利人所有。未经许可，您不得复制、修改、传播或用于商业目的。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">五、责任限制</h2>
              <p>
                在适用法律允许的最大范围内，因不可抗力、网络故障、第三方原因等导致的服务中断或数据丢失，柚汀科技将在合理范围内协助恢复，但不承担超出法律规定的赔偿责任。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">六、联系我们</h2>
              <p>
                如您对本协议有疑问，可通过本网站公示的客服渠道或
                <a className="legal-page__link-accent" href="mailto:privacy@u-talent.cn">
                  privacy@u-talent.cn
                </a>
                与我们联系。
              </p>
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

export default UserAgreement;
