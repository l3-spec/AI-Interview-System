import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './LegalPages.css';

/**
 * 《隐私条款》唯一权威正文（Web 展示与对外链接请统一使用本页 /privacy-policy）。
 * 主体为柚汀科技。
 */
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
          <span className="legal-page__title">隐私条款</span>
          <span style={{ width: 28, height: 28 }} aria-hidden="true" />
        </div>

        <main className="legal-page__content">
          <header className="legal-page__meta">
            <h1>柚汀科技隐私条款</h1>
            <p className="legal-page__effective-date">
              更新日期：2026 年 4 月 24 日 &nbsp;|&nbsp; 生效日期：2026 年 4 月 24 日
            </p>
          </header>

          <p className="legal-page__intro">
            <strong>柚汀科技</strong>（以下简称「我们」）深知个人信息对您的重要性。我们将恪守法律法规，采取相应安全保护措施，尽力保护您的个人信息安全可控。
          </p>
          <p className="legal-page__intro legal-page__note">
            <strong>【独立文档声明】</strong>本《隐私条款》为<strong>单独成文</strong>的法律文件，不构成其它协议的章节或附件。
          </p>

          <div className="legal-page__sections">
            <section className="legal-page__section">
              <h2 className="legal-page__section-title">一、适用范围</h2>
              <p>本条款适用于柚汀科技通过网站、客户端、小程序等形式向您提供的各项产品与服务。</p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">二、我们如何收集与使用信息</h2>
              <p>
                我们在提供服务时，会收集包括但不限于：您的账号信息（手机号）、求职/招聘信息（简历、职位）、设备信息（用于安全校验）等，以满足基本业务功能的实现。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">三、个性化、定向推送规则</h2>
              <p>
                为了向您展示更符合您需求的职位或内容，我们可能会根据您的搜索记录、浏览记录、个人偏好等，利用算法对您的兴趣进行画像，并向您进行<strong>个性化推荐与定向推送</strong>。
              </p>
              <div className="legal-page__subsection">
                <p className="legal-page__subsection-title">3.1 推送范围</p>
                <p>包括但不限于：站内职位推荐、系统通知、个性化内容流等。</p>
              </div>
              <div className="legal-page__subsection">
                <p className="legal-page__subsection-title">3.2 关闭方式（必须告知）</p>
                <p>
                  如果您不希望接收个性化推荐，您可以在本公司旗下的 <strong>APP 移动端</strong> 通过以下路径随时关闭：
                  <br />
                  <br />
                  <strong>路径：进入 [APP] —「我的」—「设置」—「隐私设置」—「个性化推送/定向推荐」，将其开关设置为关闭状态。</strong>
                </p>
                <p>
                  关闭后，我们将停止基于个人特征的个性化推荐，您看到的将是针对大众用户的通用内容。
                </p>
              </div>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">四、共享、转让与公开披露</h2>
              <p>我们不会在未经您单独同意的情况下，向第三方提供您的个人信息，法律法规另有规定或为了履行合同所必需的情况除外。</p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">五、存储地点与保护</h2>
              <p>
                您的个人信息存储在中华人民共和国境内。我们利用多重加密及访问控制技术，确保您的信息安全。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">六、您的权利与注销</h2>
              <p>
                您有权查阅、更正、删除您的个人信息。如需注销账号，请参阅
                <Link to="/user-instructions" className="legal-page__link-accent">
                  《用户须知》
                </Link>
                中的详细流程说明。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">七、联系我们</h2>
              <p>如对本条款有任何疑问，请联系我们：</p>
              <ul className="legal-page__section-list legal-page__section-list--disc">
                <li>
                  电子邮箱：
                  <a className="legal-page__link-accent" href="mailto:privacy@u-talent.cn">
                    privacy@u-talent.cn
                  </a>
                </li>
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

export default PrivacyPolicy;
