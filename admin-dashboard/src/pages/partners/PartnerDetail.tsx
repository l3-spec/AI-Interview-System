import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { findPartnerById, partners } from '../../data/partners';
import './PartnerDetail.css';

/**
 * 企业合作详情页
 * 包含：合作概览、关键指标、招聘方向介绍、合作里程碑、相关合作伙伴。
 */
const PartnerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const partner = id ? findPartnerById(id) : undefined;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [id]);

  if (!partner) {
    return (
      <div className="partner-detail-empty">
        <h2>未找到该合作伙伴</h2>
        <p>页面可能已经下线，您可以返回首页查看完整列表。</p>
        <button className="partner-detail__primary-btn" onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    );
  }

  const related = partners.filter((p) => p.id !== partner.id).slice(0, 4);

  return (
    <div className="partner-detail">
      <header className="partner-detail__nav">
        <div className="partner-detail__nav-inner">
          <Link to="/" className="partner-detail__back">← 返回首页</Link>
          <Link to="/#partners" className="partner-detail__back-secondary">
            查看全部合作伙伴
          </Link>
        </div>
      </header>

      {/* 头部介绍 */}
      <section
        className="partner-detail__hero"
        style={{
          background: `linear-gradient(135deg, ${partner.brandColor} 0%, ${partner.brandColor}b3 100%)`
        }}
      >
        <div className="partner-detail__hero-inner">
          <div
            className="partner-detail__hero-logo"
            style={{ color: partner.brandColor }}
          >
            {partner.logoUrl ? (
              <img src={partner.logoUrl} alt={`${partner.name} Logo`} />
            ) : (
              <span>{partner.shortLabel}</span>
            )}
          </div>

          <div className="partner-detail__hero-text">
            <span className="partner-detail__badge">U-Talent 合作客户</span>
            <h1>{partner.name}</h1>
            <p>{partner.cooperationSummary}</p>

            <ul className="partner-detail__meta">
              <li>
                <span>所属行业</span>
                <strong>{partner.industry}</strong>
              </li>
              <li>
                <span>企业规模</span>
                <strong>{partner.scale}</strong>
              </li>
              <li>
                <span>总部</span>
                <strong>{partner.region}</strong>
              </li>
              <li>
                <span>合作起始</span>
                <strong>{partner.cooperationSince} 年</strong>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 合作指标 */}
      {partner.metrics.length > 0 && (
        <section className="partner-detail__section">
          <div className="partner-detail__container">
            <h2 className="partner-detail__section-title">合作关键指标</h2>
            <div className="partner-detail__metrics">
              {partner.metrics.map((m) => (
                <div className="partner-detail__metric" key={m.label}>
                  <div
                    className="partner-detail__metric-value"
                    style={{ color: partner.brandColor }}
                  >
                    {m.value}
                  </div>
                  <div className="partner-detail__metric-label">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 合作亮点 */}
      <section className="partner-detail__section partner-detail__section--gray">
        <div className="partner-detail__container">
          <h2 className="partner-detail__section-title">合作亮点</h2>
          <ul className="partner-detail__highlights">
            {partner.cooperationHighlights.map((item, i) => (
              <li key={i}>
                <span
                  className="partner-detail__bullet"
                  style={{ background: partner.brandColor }}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 招聘方向介绍 */}
      <section className="partner-detail__section">
        <div className="partner-detail__container">
          <h2 className="partner-detail__section-title">企业招聘方向</h2>
          <p className="partner-detail__section-sub">
            U-Talent 已与 {partner.name} 沉淀完整的岗位画像与题库，
            涵盖以下重点招聘方向：
          </p>
          <div className="partner-detail__directions">
            {partner.recruitmentDirections.map((dir) => (
              <article className="partner-detail__direction" key={dir.title}>
                <header
                  className="partner-detail__direction-header"
                  style={{ borderColor: partner.brandColor }}
                >
                  <h3>{dir.title}</h3>
                </header>
                <p>{dir.description}</p>
                <div className="partner-detail__positions">
                  <span className="partner-detail__positions-label">代表岗位：</span>
                  {dir.positions.map((p) => (
                    <span
                      className="partner-detail__position"
                      key={p}
                      style={{
                        borderColor: `${partner.brandColor}66`,
                        color: partner.brandColor
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 合作里程碑 */}
      {partner.milestones.length > 0 && (
        <section className="partner-detail__section partner-detail__section--gray">
          <div className="partner-detail__container">
            <h2 className="partner-detail__section-title">合作里程碑</h2>
            <ol className="partner-detail__timeline">
              {partner.milestones.map((m, i) => (
                <li key={i}>
                  <div
                    className="partner-detail__timeline-dot"
                    style={{ background: partner.brandColor }}
                  />
                  <div className="partner-detail__timeline-content">
                    <strong>{m.date}</strong>
                    <span>{m.content}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="partner-detail__cta">
        <div className="partner-detail__container">
          <h2>想为您的企业定制相同的招聘解决方案？</h2>
          <p>U-Talent 提供专属顾问对接，帮助您快速复制行业最佳实践。</p>
          <div className="partner-detail__cta-actions">
            <button
              className="partner-detail__primary-btn"
              onClick={() => navigate('/?cta=trial')}
            >
              立即免费试用
            </button>
            <Link to="/#features" className="partner-detail__secondary-btn">
              了解产品特色
            </Link>
          </div>
        </div>
      </section>

      {/* 相关合作伙伴 */}
      {related.length > 0 && (
        <section className="partner-detail__section">
          <div className="partner-detail__container">
            <h2 className="partner-detail__section-title">其他合作伙伴</h2>
            <div className="partner-detail__related">
              {related.map((rp) => (
                <Link
                  to={`/partners/${rp.id}`}
                  key={rp.id}
                  className="partner-detail__related-item"
                >
                  <div
                    className="partner-detail__related-logo"
                    style={{
                      background: `linear-gradient(135deg, ${rp.brandColor} 0%, ${rp.brandColor}b3 100%)`
                    }}
                  >
                    {rp.shortLabel}
                  </div>
                  <div>
                    <div className="partner-detail__related-name">{rp.name}</div>
                    <div className="partner-detail__related-industry">
                      {rp.industry}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default PartnerDetail;
