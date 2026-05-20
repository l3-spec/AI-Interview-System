import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './LegalPages.css';

type InfoRow = {
  scene: string;
  info: string;
  purpose: string;
  trigger: string;
};

type PermissionRow = {
  permission: string;
  purpose: string;
  trigger: string;
  closePath: string;
};

type SdkRow = {
  name: string;
  provider: string;
  purpose: string;
  info: string;
  link: string;
};

const collectedInfoRows: InfoRow[] = [
  {
    scene: '账号注册、登录与身份识别',
    info: '手机号、邮箱、企业名称、联系人姓名、登录账号、密码加密摘要、验证码验证结果',
    purpose: '创建账号、验证登录身份、保障账号安全',
    trigger: '注册、登录、找回密码或进行企业认证时'
  },
  {
    scene: '招聘与面试服务',
    info: '职位信息、候选人姓名、联系方式、简历、面试记录、音视频面试材料、测评结果、沟通记录',
    purpose: '完成招聘流程、生成面试分析、向企业展示候选人匹配情况',
    trigger: '企业发布职位、导入候选人、发起或参与 AI 面试时'
  },
  {
    scene: 'AI 分析与服务优化',
    info: '面试文本、语音转写、回答内容、评分维度、系统操作日志、异常信息',
    purpose: '生成能力分析、提升识别准确性、排查服务故障',
    trigger: '使用 AI 面试、面试复盘、分析报告等功能时'
  },
  {
    scene: '设备与安全风控',
    info: '设备型号、操作系统、浏览器类型、IP 地址、网络状态、登录时间、访问页面、崩溃日志',
    purpose: '保障服务安全、防止欺诈与异常登录、进行问题定位',
    trigger: '访问网站、APP 或小程序，以及发生异常请求时'
  },
  {
    scene: '客服、投诉与权利响应',
    info: '联系方式、问题描述、沟通记录、必要的身份核验材料',
    purpose: '处理咨询、投诉、举报、个人信息权利申请',
    trigger: '您主动联系我们或提交权利申请时'
  }
];

const permissionRows: PermissionRow[] = [
  {
    permission: '摄像头',
    purpose: '用于视频面试、身份核验、录制面试视频',
    trigger: '仅在您点击进入视频面试、拍摄或上传认证材料时申请',
    closePath: '系统设置 - 应用权限 - 摄像头'
  },
  {
    permission: '麦克风',
    purpose: '用于语音面试、语音转写、面试录音',
    trigger: '仅在您进入语音或视频面试时申请',
    closePath: '系统设置 - 应用权限 - 麦克风'
  },
  {
    permission: '相册/文件',
    purpose: '用于上传简历、营业执照、认证材料或截图凭证',
    trigger: '仅在您主动选择上传文件或图片时申请',
    closePath: '系统设置 - 应用权限 - 照片/文件'
  },
  {
    permission: '通知',
    purpose: '用于发送面试安排、候选人进度、系统消息',
    trigger: '首次开启提醒或订阅消息时申请',
    closePath: '系统设置 - 通知 - 关闭本应用通知'
  }
];

const sdkRows: SdkRow[] = [
  {
    name: '腾讯开放平台能力',
    provider: '深圳市腾讯计算机系统有限公司',
    purpose: '账号登录、应用分发审核、内容安全或平台合规能力',
    info: '设备信息、网络信息、应用信息、操作日志，具体以实际接入能力为准',
    link: 'https://privacy.qq.com/'
  },
  {
    name: '云服务与对象存储',
    provider: '云基础设施服务商',
    purpose: '存储简历、面试音视频、图片、日志等业务数据',
    info: '您主动上传或业务处理所必需的文件、访问日志、网络信息',
    link: ''
  },
  {
    name: '统计与错误监控',
    provider: '应用统计或错误监控服务商',
    purpose: '统计页面访问、定位崩溃与性能问题',
    info: '设备信息、浏览器信息、访问页面、错误堆栈、去标识化用户标识',
    link: ''
  }
];

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-page legal-page--policy">
      <div className="legal-page__phone">
        <div className="legal-page__nav">
          <button
            type="button"
            className="legal-page__back"
            onClick={() => navigate(-1)}
            aria-label="返回上一页"
          >
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M7.5 2.5L4 6l3.5 3.5" />
            </svg>
          </button>
          <span className="legal-page__title">隐私政策</span>
          <span style={{ width: 28, height: 28 }} aria-hidden="true" />
        </div>

        <main className="legal-page__content">
          <header className="legal-page__meta legal-page__meta--policy">
            <span className="legal-page__eyebrow">U-Talent Legal</span>
            <h1>柚汀科技隐私政策</h1>
            <p className="legal-page__effective-date">
              更新日期：2026 年 5 月 19 日 &nbsp;|&nbsp; 生效日期：2026 年 5 月 19 日
            </p>
          </header>

          <section className="legal-page__summary" aria-label="隐私政策摘要">
            <p>
              本政策适用于柚汀科技通过 U-Talent 网站、管理后台、APP、小程序以及嵌入式 H5 页面向您提供的招聘、AI 面试与人才管理服务。我们仅会为实现明确、合理、必要的业务目的处理个人信息。
            </p>
            <ul>
              <li>隐私政策为独立文件，不作为用户协议的附件或章节。</li>
              <li>敏感个人信息、摄像头、麦克风、相册等权限仅在具体功能触发时申请。</li>
              <li>个性化推荐可关闭，账号注销与个人信息权利申请均提供明确路径。</li>
            </ul>
          </section>

          <div className="legal-page__sections">
            <section className="legal-page__section">
              <h2 className="legal-page__section-title">一、我们是谁与适用范围</h2>
              <p>
                <strong>柚汀科技</strong>（以下简称“我们”）是 U-Talent 产品与服务的运营者。我们非常重视您的个人信息和隐私保护，并依据《中华人民共和国个人信息保护法》《中华人民共和国网络安全法》《中华人民共和国数据安全法》等法律法规处理您的个人信息。
              </p>
              <p>
                本政策适用于企业管理员、招聘人员、求职者、候选人以及访问公开页面的用户。若某一具体产品或功能另有独立隐私说明，该说明与本政策同时适用；不一致时，以更能保护您权益的规则为准。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">二、我们如何收集和使用个人信息</h2>
              <p>
                我们会按照合法、正当、必要和诚信原则收集信息。未获得您的同意或法律法规允许前，我们不会处理与服务无关的个人信息。
              </p>
              <div className="legal-page__table-wrap">
                <table className="legal-page__table legal-page__table--policy">
                  <thead>
                    <tr>
                      <th>使用场景</th>
                      <th>可能收集的信息</th>
                      <th>处理目的</th>
                      <th>触发方式</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collectedInfoRows.map((row) => (
                      <tr key={row.scene}>
                        <td>{row.scene}</td>
                        <td>{row.info}</td>
                        <td>{row.purpose}</td>
                        <td>{row.trigger}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                简历、面试音视频、身份或企业认证材料、精准联系方式、面试评价等可能属于敏感个人信息。我们仅在招聘、面试、认证、安全风控等必要场景中处理，并会通过页面提示、弹窗、勾选确认等方式取得您的单独同意。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">三、设备权限调用说明</h2>
              <p>
                您可以拒绝或关闭相关权限。关闭后，仅会影响对应功能，不影响您使用与该权限无关的服务。
              </p>
              <div className="legal-page__table-wrap">
                <table className="legal-page__table legal-page__table--policy">
                  <thead>
                    <tr>
                      <th>权限</th>
                      <th>用途</th>
                      <th>申请时机</th>
                      <th>关闭路径</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissionRows.map((row) => (
                      <tr key={row.permission}>
                        <td>{row.permission}</td>
                        <td>{row.purpose}</td>
                        <td>{row.trigger}</td>
                        <td>{row.closePath}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">四、第三方 SDK、共享、转让与公开披露</h2>
              <p>
                我们不会出售您的个人信息。为实现必要功能，我们可能与授权合作伙伴共享实现服务所必需的最少信息，并通过协议要求其按照本政策和安全要求处理信息。
              </p>
              <div className="legal-page__table-wrap">
                <table className="legal-page__table legal-page__table--policy">
                  <thead>
                    <tr>
                      <th>第三方/SDK</th>
                      <th>服务主体</th>
                      <th>使用目的</th>
                      <th>可能处理的信息</th>
                      <th>隐私政策</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sdkRows.map((row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        <td>{row.provider}</td>
                        <td>{row.purpose}</td>
                        <td>{row.info}</td>
                        <td>
                          {row.link ? (
                            <a href={row.link} target="_blank" rel="noopener noreferrer">
                              查看
                            </a>
                          ) : (
                            '以实际接入页面公示为准'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                涉及合并、分立、解散、被宣告破产等个人信息转让场景时，我们会告知接收方名称和联系方式，并要求其继续受本政策约束；接收方变更原处理目的或方式的，应重新取得您的同意。除法律法规、司法或行政机关要求外，我们不会公开披露您的个人信息。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">五、个性化推荐与定向推送</h2>
              <p>
                为提升招聘和求职匹配效率，我们可能基于职位、简历、浏览、搜索、投递、面试表现等信息，为您展示职位推荐、候选人推荐、内容提示或系统通知。
              </p>
              <div className="legal-page__notice">
                <strong>关闭路径：</strong>APP - 我的 - 设置 - 隐私设置 - 个性化推荐/定向推送，关闭对应开关。Web 管理端可进入 设置 - 通知与隐私 - 个性化推荐 关闭。
              </div>
              <p>
                关闭后，我们将停止基于个人特征的个性化推荐，但您仍可能看到通用排序、基础搜索结果或必要的服务通知。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">六、存储、安全与跨境</h2>
              <p>
                我们在中华人民共和国境内收集和产生的个人信息原则上存储在中国境内。除获得您的单独同意、履行法定义务或监管要求外，我们不会向境外提供您的个人信息。
              </p>
              <p>
                我们会在实现处理目的所必需的最短期限内保存个人信息。法律法规对保存期限另有规定的，从其规定。超过保存期限后，我们会删除或匿名化处理。
              </p>
              <p>
                我们采取访问控制、加密传输、权限隔离、日志审计、最小授权、员工保密要求等措施保护您的个人信息。发生个人信息安全事件时，我们将依法及时告知事件情况、可能影响、处置措施和补救方式。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">七、您的个人信息权利</h2>
              <p>
                您有权依法访问、复制、更正、补充、删除您的个人信息，撤回同意，限制或拒绝特定处理，获取个人信息副本，注销账号，以及要求我们解释个人信息处理规则。
              </p>
              <ul className="legal-page__section-list legal-page__section-list--disc">
                <li>账号资料更正：登录后进入「设置」或「企业资料」页面修改。</li>
                <li>
                  账号注销：请参阅
                  <Link to="/user-instructions" className="legal-page__link-accent">
                    《用户须知》
                  </Link>
                  中的注销流程；求职者端可在 APP - 我的 - 设置 - 账号与安全 - 注销账号 提交。
                </li>
                <li>其他权利申请：发送邮件至 privacy@u-talent.cn，我们将在 15 个工作日内完成核验并答复。</li>
              </ul>
              <p>
                当您撤回授权或删除信息后，我们可能无法继续提供依赖该信息的功能，但不影响此前基于您的同意已经进行的处理。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">八、未成年人保护</h2>
              <p>
                我们的服务主要面向具备完全民事行为能力的企业用户和求职者。若您为未成年人，请在监护人同意和指导下使用服务。我们不会主动面向未满十四周岁的儿童收集个人信息；如发现误收集儿童个人信息，我们将尽快删除或依法处理。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">九、本政策如何更新</h2>
              <p>
                当产品功能、个人信息处理目的、处理方式、共享对象、联系方式或用户权利行使方式发生重大变化时，我们会通过页面公告、弹窗、站内信、邮件或 APP 通知等显著方式告知。未经您明确同意，我们不会削减您按照本政策享有的权利。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">十、联系我们</h2>
              <p>如您对本政策或个人信息保护有任何疑问、投诉、举报或权利申请，请通过以下方式联系我们：</p>
              <ul className="legal-page__section-list legal-page__section-list--disc">
                <li>
                  隐私邮箱：
                  <a className="legal-page__link-accent" href="mailto:privacy@u-talent.cn">
                    privacy@u-talent.cn
                  </a>
                </li>
                <li>客服邮箱：support@u-talent.cn</li>
                <li>处理时限：通常在 15 个工作日内答复；复杂请求将依法说明原因并延长期限。</li>
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
