import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LegalPages.css';

const PrivacyRights: React.FC = () => {
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
            <h1>隐私权利</h1>
          </header>

          <p className="legal-page__intro">
            欢迎使用星链未来（以下简称“本平台”）。在注册或使用本平台服务前，请仔细阅读并理解本《隐私权利》。一旦您点击“同意”或实际使用本平台，即视为已充分理解并接受以下条款：
          </p>

          <div className="legal-page__sections">
            <section className="legal-page__section">
              <h2 className="legal-page__section-title">一、服务说明</h2>
              <ol className="legal-page__section-list">
                <li>星链未来是一款提供求职与职业发展服务的移动应用，旨在帮助用户获取岗位信息、投递简历、与企业沟通并提升职业匹配效率。</li>
                <li>本平台不直接参与招聘过程，仅提供信息展示、沟通渠道及工具服务。</li>
                <li>平台保留对服务内容进行优化、调整、暂停或终止的权利，并会在合理范围内提前通知用户。</li>
              </ol>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">二、用户行为规范</h2>
              <ol className="legal-page__section-list">
                <li>用户应提供真实、准确、完整的注册信息，并及时更新。</li>
                <li>用户不得发布或传输任何虚假、违法、侵权、骚扰、诽谤、淫秽或其他不当信息。</li>
                <li>用户不得通过任何技术手段干扰平台运行，不得擅自抓取、复制或使用平台数据。</li>
                <li>用户在使用过程中应遵守国家相关法律法规及社会公德。</li>
              </ol>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">三、账户安全</h2>
              <ol className="legal-page__section-list">
                <li>用户账户仅限本人使用，禁止转让或出租。</li>
                <li>若发现账户被盗用或异常操作，应立即联系平台客服处理。</li>
                <li>因用户自行泄露信息或操作不当造成的损失，由用户自行承担。</li>
              </ol>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">四、免责声明</h2>
              <ol className="legal-page__section-list">
                <li>平台不对招聘方所发布岗位的真实性、合法性及有效性承担保证责任，请用户自行甄别。</li>
                <li>因第三方（如网络服务商、系统故障等）导致的服务中断、信息丢失，本平台不承担赔偿责任。</li>
                <li>用户因使用本平台信息进行的任何交易、交流等行为所引发的风险和损失，由用户自行承担。</li>
              </ol>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">五、知识产权</h2>
              <p>
                平台内的所有内容（包括但不限于文字、图片、图标、界面设计、程序代码等）均归星链未来或相关权利人所有，
                未经许可不得复制、修改、传播或用于商业用途。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">六、适用法律与争议解决</h2>
              <ol className="legal-page__section-list">
                <li>本协议受中华人民共和国法律管辖。</li>
                <li>若双方发生争议，应友好协商解决；协商不成的，可向平台所在地有管辖权的人民法院提起诉讼。</li>
              </ol>
            </section>
          </div>

          <p className="legal-page__note">
            感谢您信任星链未来。如您对本政策有任何疑问，请随时与我们联系，我们将尽快为您处理。
          </p>

          <div className="legal-page__download">
            <button type="button" onClick={() => window.print()}>
              下载
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PrivacyRights;
