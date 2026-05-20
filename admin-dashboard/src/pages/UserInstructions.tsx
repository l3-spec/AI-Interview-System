import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LegalPages.css';

type InstructionRow = {
  subject: string;
  content: string;
  note: string;
};

const serviceRows: InstructionRow[] = [
  {
    subject: '企业管理员/招聘人员',
    content: '创建企业账号、发布职位、管理候选人、发起 AI 面试、查看面试报告与招聘进度。',
    note: '应确保企业、职位、联系人和招聘需求真实、合法、有效。'
  },
  {
    subject: '求职者/候选人',
    content: '接收面试邀请、上传简历或材料、参加文字/语音/视频面试、查看与自身相关的通知。',
    note: '应确保简历、联系方式、身份或经历信息真实，不冒用他人身份。'
  },
  {
    subject: '访客',
    content: '浏览公开页面、查看服务介绍、注册或登录入口、法律文件与联系方式。',
    note: '未注册或未登录时，仅可使用基础浏览功能。'
  }
];

const riskRows: InstructionRow[] = [
  {
    subject: 'AI 面试与分析',
    content: '平台可能基于候选人的回答文本、语音转写、面试音视频和岗位要求生成辅助分析结果。',
    note: 'AI 结果仅作为招聘辅助参考，不应作为唯一录用或淘汰依据。'
  },
  {
    subject: '录音录像',
    content: '当您进入语音或视频面试、身份核验、面试复盘等功能时，系统可能调用麦克风、摄像头并生成记录。',
    note: '相关权限仅在具体功能触发时申请，您可在系统设置中关闭。'
  },
  {
    subject: '第三方服务',
    content: '为实现登录、云存储、内容安全、统计监控等功能，平台可能接入必要的第三方服务或 SDK。',
    note: '具体信息处理规则请以《隐私政策》的第三方 SDK 与共享说明为准。'
  }
];

/**
 * 《用户须知》独立页面。
 * 包含核心服务说明、账号注销、移动端嵌入页阅读提示等。
 */
const UserInstructions: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-page legal-page--instructions">
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
          <span className="legal-page__title">用户须知</span>
          <span style={{ width: 28, height: 28 }} aria-hidden="true" />
        </div>

        <main className="legal-page__content">
          <header className="legal-page__meta legal-page__meta--policy">
            <span className="legal-page__eyebrow">U-Talent Legal</span>
            <h1>柚汀科技用户须知</h1>
            <p className="legal-page__effective-date">
              更新日期：2026 年 5 月 19 日 &nbsp;|&nbsp; 生效日期：2026 年 5 月 19 日
            </p>
          </header>

          <section className="legal-page__summary" aria-label="用户须知摘要">
            <p>
              欢迎您使用由<strong>柚汀科技</strong>（以下简称“我们”）运营的 U-Talent 网站、管理后台、APP、小程序及嵌入式 H5 页面。本《用户须知》用于向您说明服务范围、使用规则、AI 面试注意事项、账号注销与权利救济路径。
            </p>
            <ul>
              <li>本须知为独立文件，与《隐私政策》《用户服务协议》分别展示。</li>
              <li>涉及个人信息处理、权限调用、第三方 SDK、个性化推荐和账号注销的详细规则，请同步阅读《隐私政策》。</li>
              <li>移动端或 APP 内嵌页面中，您可通过顶部返回按钮回到上一页，并可横向滑动查看表格内容。</li>
            </ul>
          </section>

          <div className="legal-page__sections">
            <section className="legal-page__section">
              <h2 className="legal-page__section-title">一、适用范围与文件关系</h2>
              <p>
                本须知适用于企业管理员、招聘人员、求职者、候选人及访问公开页面的用户。您通过点击同意、注册登录、参加面试、上传材料或继续使用服务，即表示您已阅读并理解本须知。
              </p>
              <p>
                本须知重点说明服务使用规则和操作事项。关于我们如何收集、使用、存储、共享和保护个人信息，请另行阅读
                <Link to="/privacy-policy" className="legal-page__link-accent">
                  《隐私政策》
                </Link>
                ；关于双方服务合同权利义务，请阅读
                <Link to="/user-agreement" className="legal-page__link-accent">
                  《用户服务协议》
                </Link>
                。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">二、服务对象与功能说明</h2>
              <p>
                本平台为企业招聘、AI 面试、候选人管理和人才分析提供工具。不同身份可使用的功能存在差异，具体以页面展示和账号权限为准。
              </p>
              <div className="legal-page__table-wrap">
                <table className="legal-page__table legal-page__table--instructions">
                  <thead>
                    <tr>
                      <th>使用身份</th>
                      <th>主要功能</th>
                      <th>注意事项</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceRows.map((row) => (
                      <tr key={row.subject}>
                        <td>{row.subject}</td>
                        <td>{row.content}</td>
                        <td>{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">三、注册、登录与账号安全</h2>
              <ul className="legal-page__section-list legal-page__section-list--disc">
                <li>您应使用真实、准确、合法的信息注册和使用账号，不得冒用他人身份、企业名称、联系方式或资质材料。</li>
                <li>您应妥善保管账号、密码、验证码及登录设备。发现账号被盗用、异常登录或资料被篡改时，请及时联系我们处理。</li>
                <li>企业账号的管理员应合理分配成员权限，及时移除离职或不再参与招聘流程的人员访问权限。</li>
                <li>同一账号仅限账号所有人或经授权人员使用，不得出租、出借、售卖或转让。</li>
              </ul>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">四、AI 面试、录音录像与权限提示</h2>
              <p>
                AI 面试和智能分析功能可能涉及摄像头、麦克风、相册/文件、通知等系统权限，以及面试文本、语音、视频、简历和评价信息。我们会在具体功能触发时申请必要权限。
              </p>
              <div className="legal-page__table-wrap">
                <table className="legal-page__table legal-page__table--instructions">
                  <thead>
                    <tr>
                      <th>事项</th>
                      <th>说明</th>
                      <th>用户须知</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskRows.map((row) => (
                      <tr key={row.subject}>
                        <td>{row.subject}</td>
                        <td>{row.content}</td>
                        <td>{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="legal-page__notice">
                <strong>权限关闭路径：</strong>APP 可通过「我的 - 设置 - 隐私设置」管理平台内开关；系统权限可通过手机「系统设置 - 应用权限」关闭摄像头、麦克风、照片/文件或通知权限。关闭后，仅影响对应功能。
              </div>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">五、用户行为规范</h2>
              <p>您在使用本平台时不得从事以下行为：</p>
              <ul className="legal-page__section-list legal-page__section-list--disc">
                <li>发布虚假职位、虚假简历、违法招聘信息、歧视性条件或误导性内容；</li>
                <li>上传、传播违法违规、侵权、侮辱诽谤、色情低俗、暴力恐怖、骚扰或垃圾信息；</li>
                <li>未经授权收集、复制、导出、传播他人简历、联系方式、面试记录或其他个人信息；</li>
                <li>干扰平台正常运行，包括恶意刷量、攻击系统、绕过权限控制、逆向工程或批量抓取数据；</li>
                <li>利用平台从事欺诈、传销、洗钱、侵犯知识产权或其他违反法律法规、公序良俗的活动。</li>
              </ul>
              <p>
                如您违反上述规则，我们有权依法采取提示整改、限制功能、暂停服务、冻结或注销账号、保存证据并向主管机关报告等措施。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">六、账号注销流程（重要）</h2>
              <p>
                我们尊重您的账号自主权，您可以依法申请注销账号。注销是不可逆操作，注销完成后，我们将删除或匿名化与账号相关的个人信息，但法律法规要求留存或为解决争议所必需的信息除外。
              </p>
              
              <div className="legal-page__subsection">
                <p className="legal-page__subsection-title">6.1 注销条件</p>
                <ul className="legal-page__section-list legal-page__section-list--disc">
                  <li>账号处于正常状态，无未处理的争议、投诉、违规或安全风险；</li>
                  <li>账号内所有服务已结清，无未完成的订单或待处理的财务往来；</li>
                  <li>账号内无正在进行的面试、招聘流程、候选人沟通或企业认证事项；</li>
                  <li>企业管理员注销前，应妥善处理成员权限、候选人数据、合同和业务资料。</li>
                </ul>
              </div>

              <div className="legal-page__subsection">
                <p className="legal-page__subsection-title">6.2 注销路径</p>
                <ol className="legal-page__section-list">
                  <li>
                    <strong>企业端（Web 管理员）：</strong>登录后台 - 点击右上角头像 -「设置」-「账号管理」-「注销账号」。
                  </li>
                  <li>
                    <strong>求职者端（APP）：</strong>登录 APP -「我的」- 右上角「设置」-「账号与安全」-「注销账号」。
                  </li>
                  <li>
                    <strong>无法登录或嵌入页场景：</strong>可使用注册手机号/邮箱发送注销申请至
                    <a className="legal-page__link-accent" href="mailto:privacy@u-talent.cn">
                      privacy@u-talent.cn
                    </a>
                    ，邮件标题建议为「账号注销申请」。
                  </li>
                </ol>
              </div>

              <div className="legal-page__subsection">
                <p className="legal-page__subsection-title">6.3 处理时效与结果</p>
                <p>
                  提交申请后，我们将在 <strong>15 个工作日内</strong> 完成身份核验、条件审核并处理您的申请。审核期间请勿再次登录或继续使用需注销的账号；如申请不满足条件，我们会告知原因和补正方式。
                </p>
              </div>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">七、个人信息与隐私保护</h2>
              <p>
                我们仅会为实现明确、合理、必要的业务目的处理个人信息。您可以依法访问、复制、更正、补充、删除个人信息，撤回授权同意，关闭个性化推荐，注销账号，或要求我们解释个人信息处理规则。
              </p>
              <p>
                请勿在职位、简历、面试回答、备注或沟通内容中上传与招聘目的无关的身份证件、银行卡号、健康信息、精确定位、家庭住址等敏感信息。确因认证、核验或履约需要提供的，请按照页面提示提交。
              </p>
              <div className="legal-page__notice">
                详细的信息收集清单、权限调用说明、第三方 SDK、共享转让、存储安全、跨境、未成年人保护和权利行使方式，请查看
                <Link to="/privacy-policy" className="legal-page__link-accent">
                  《隐私政策》
                </Link>
                。
              </div>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">八、未成年人使用提示</h2>
              <p>
                本平台主要面向具备完全民事行为能力的企业用户、招聘人员和求职者。未成年人使用本平台前，应取得监护人同意并在监护人指导下使用。企业用户不得通过本平台发布违反未成年人保护、劳动用工和招聘管理要求的信息。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">九、知识产权与用户内容</h2>
              <p>
                平台的软件、界面、文案、标识、模型配置、数据结构及相关技术成果受法律保护。未经授权，任何单位或个人不得复制、修改、传播、反向工程或用于商业目的。
              </p>
              <p>
                您上传或提交的简历、职位、面试材料等内容仍归相应权利人所有。您应确保已取得必要授权，并允许我们在提供招聘、面试、分析、存储、客服和安全保障服务所必需的范围内处理相关内容。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">十、须知更新与通知</h2>
              <p>
                当服务内容、账号注销路径、用户权利行使方式、联系方式或其他重要事项发生变化时，我们会通过页面公告、弹窗、站内信、邮件、短信或 APP 通知等方式提示。若您不同意更新内容，请停止使用相关服务。
              </p>
            </section>

            <section className="legal-page__section">
              <h2 className="legal-page__section-title">十一、联系我们</h2>
              <p>
                如您在账号注销、权限管理、个人信息权利申请、招聘内容投诉或服务使用中遇到问题，请通过以下方式联系：
              </p>
              <ul className="legal-page__section-list legal-page__section-list--disc">
                <li>
                  隐私与账号注销邮箱：
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

export default UserInstructions;
