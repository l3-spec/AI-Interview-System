import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './LegalPages.css';

/**
 * 《隐私政策》唯一权威正文（Web 展示与对外链接请统一使用本页 /privacy-policy）。
 * 与《用户服务协议》分离；主体为柚汀科技。
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
          <span className="legal-page__title">隐私政策</span>
          <span style={{ width: 28, height: 28 }} aria-hidden="true" />
        </div>

        <main className="legal-page__content">
          <header className="legal-page__meta">
            <h1>柚汀科技隐私政策</h1>
            <p className="legal-page__effective-date">
              更新日期：2026 年 4 月 22 日 &nbsp;|&nbsp; 生效日期：2026 年 4 月 22 日
            </p>
          </header>

          <p className="legal-page__intro">
            <strong>柚汀科技</strong>（以下简称「我们」）深知个人信息对您的重要性。我们将恪守法律法规，采取相应安全保护措施，尽力保护您的个人信息安全可控。
          </p>
          <p className="legal-page__intro legal-page__note">
            <strong>【独立文档声明】</strong>本《隐私政策》为<strong>单独成文</strong>的法律文件，不构成
            <Link to="/user-agreement" className="legal-page__link-accent">
              《用户服务协议》
            </Link>
            或其他协议的章节或附件；您通过任何外链打开的《隐私政策》全文，应与站内本页面内容保持一致。
          </p>

          <div className="legal-page__sections">
            <section className="legal-page__section">
              <h2 className="legal-page__section-title">一、适用范围</h2>
              <p>本政策适用于柚汀科技通过网站、客户端、小程序等形式向您提供的各项产品与服务。若某服务设有专门隐私说明，则在该场景下优先适用专门说明；未约定事项仍以本政策为准。</p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">二、我们如何收集与使用信息</h2>
              <p>我们可能根据合法、正当、必要原则，收集与使用为实现下列功能所必需的信息（具体字段以产品实际界面与授权为准）：</p>
              <ol className="legal-page__section-list">
                <li>
                  <strong>账号与身份：</strong>如手机号、邮箱、登录凭证、企业名称、联系人信息，用于注册登录、身份核验与安全风控。
                </li>
                <li>
                  <strong>求职与招聘业务：</strong>如简历、教育/工作经历、面试录音录像（如开启）、测评结果，用于匹配岗位、生成报告与履行合同。
                </li>
                <li>
                  <strong>设备与日志：</strong>如设备型号、操作系统版本、网络信息、操作日志、崩溃信息，用于保障服务稳定、统计分析与反作弊。
                </li>
                <li>
                  <strong>客服与争议处理：</strong>您主动提供的联系方式与沟通记录，用于响应咨询、投诉与纠纷处理。
                </li>
              </ol>
              <p>在取得您的单独同意或法律另有规定前，我们不会将上述信息用于本政策未载明的其他目的。</p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">三、Cookie 与同类技术</h2>
              <p>我们可能使用 Cookie 或同类技术以保障登录状态、记住偏好、衡量流量。您可通过浏览器设置管理 Cookie；若禁用，部分功能可能无法正常使用。</p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">四、共享、转让与公开披露</h2>
              <ol className="legal-page__section-list">
                <li>我们<strong>不会出售</strong>您的个人信息。</li>
                <li>
                  在招聘场景中，经您同意或按岗位投递规则，我们可能向<strong>招聘企业或经授权的合作方</strong>提供实现服务所必需的信息。
                </li>
                <li>我们可能委托云存储、消息推送、安全服务等供应商处理信息，并要求其遵守保密与安全义务。</li>
                <li>因合并、分立、资产转让等原因涉及个人信息转移时，我们将要求继受方继续受本政策约束，否则将重新征得您的同意（法律另有规定的除外）。</li>
                <li>根据法律法规、诉讼争议解决需要，或行政、司法机关依法提出要求时，我们可能依法披露。</li>
              </ol>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">五、存储地点与保护</h2>
              <p>
                原则上，我们在<strong>中华人民共和国境内</strong>存储收集的个人信息。我们采取加密、访问控制、审计等技术与管理措施，防止未经授权的访问、泄露、篡改或丢失。发生安全事件时，我们将按法律要求启动应急预案并告知您。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">六、您的权利</h2>
              <p>在符合适用法律的前提下，您有权：</p>
              <ul className="legal-page__section-list legal-page__section-list--disc">
                <li>查阅、复制您的个人信息；</li>
                <li>更正、补充不准确的信息；</li>
                <li>删除个人信息或注销账号（详见下文「注销流程」）；</li>
                <li>撤回同意、限制处理、拒绝自动化决策（如适用）；</li>
                <li>获取个人信息副本、解释说明处理规则。</li>
              </ul>
              <p>
                您可通过产品内「设置」、客服渠道或本政策末尾联系方式向我们提出申请。我们将在法定期限内答复；必要时可能要求您完成身份验证以保障账号安全。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">七、儿童个人信息保护</h2>
              <p>
                我们的产品与服务主要面向成年人。若您是未满 14 周岁的儿童，请在监护人陪同与指导下阅读本政策，并在取得监护人同意后使用。我们不会主动面向儿童进行营销。
              </p>
              <p>
                若我们在未获可证实的监护人同意的情况下收集了儿童个人信息，将尽快删除。监护人如发现儿童未经同意向我们提供了信息，可通过本政策「联系我们」与我们沟通处理。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">八、个性化内容与推荐</h2>
              <p>
                为向您展示更相关的职位、课程或内容，我们可能基于您的浏览、投递、搜索等行为进行<strong>个性化推荐</strong>。您可在产品内「设置 — 隐私设置」关闭「个性化推荐」；关闭后，我们将停止基于个人画像的推荐，但您仍可能看到非个性化的通用内容或广告位。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">九、注销流程</h2>
              <p>
                在符合法律法规及服务协议约定的前提下，您可随时申请注销账号。注销后，我们将停止为您提供产品或服务，并在<strong>合理期限</strong>内删除或匿名化处理您的个人信息（法律法规要求留存或技术上难以删除的除外）。
              </p>
              <div className="legal-page__subsection">
                <p className="legal-page__subsection-title">9.1 企业端（招聘管理后台）注销</p>
                <ol className="legal-page__section-list">
                  <li>使用管理员账号登录企业管理后台；</li>
                  <li>进入「设置」或「账号与安全」等相关入口；</li>
                  <li>选择「注销企业/账号」，阅读注销后果说明（包括但不限于数据不可恢复、合同关系终止等）；</li>
                  <li>按页面提示完成身份验证（如短信、邮箱或人工审核）；</li>
                  <li>提交申请后，我们将在<strong>15 个工作日</strong>内完成审核与处理，并通过您预留的联系方式告知结果。</li>
                </ol>
              </div>
              <div className="legal-page__subsection">
                <p className="legal-page__subsection-title">9.2 求职者端（APP）注销</p>
                <ol className="legal-page__section-list">
                  <li>登录求职者客户端；</li>
                  <li>进入「我的 — 设置 — 账号与安全」（或同等路径）；</li>
                  <li>选择「注销账号」，阅读并确认注销提示；</li>
                  <li>完成短信或其他验证方式；</li>
                  <li>提交后，我们将在<strong>15 个工作日</strong>内处理；处理完毕后，您的账号将无法登录，关联简历与投递记录将按规则删除或匿名化。</li>
                </ol>
              </div>
              <p className="legal-page__note">
                若产品暂未开放自助注销入口，或您存在未结清费用、争议处理中等情形，我们可能暂缓注销直至条件消除。您也可通过下方联系方式申请人工协助。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">十、政策更新</h2>
              <p>
                我们可能适时修订本政策。变更后，我们将通过应用内弹窗、公告等<strong>显著方式</strong>提示您；若变更涉及处理目的、方式、类型等重大调整，我们将依法重新取得您的同意（如适用）。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">十一、联系我们</h2>
              <p>如您对本政策或个人信息处理有任何疑问、意见或投诉，请联系柚汀科技：</p>
              <ul className="legal-page__section-list legal-page__section-list--disc">
                <li>
                  电子邮箱：
                  <a className="legal-page__link-accent" href="mailto:privacy@xinglianfuture.com">
                    privacy@xinglianfuture.com
                  </a>
                </li>
                <li>您也可通过产品内在线客服、公示的客服电话与我们联系（如有更新以产品内展示为准）。</li>
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
