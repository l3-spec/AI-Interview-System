import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { PartnerInfo } from '../data/partners';

interface PartnerCardProps {
  partner: PartnerInfo;
}

/**
 * 合作伙伴 / 成功案例卡片
 * - 优先显示官方 Logo（partner.logoUrl）
 * - 缺省时使用品牌色 + 中文短名兜底
 * - 点击跳转至合作详情页
 */
const PartnerCard: React.FC<PartnerCardProps> = ({ partner }) => {
  const navigate = useNavigate();

  const handleOpen = () => {
    navigate(`/partners/${partner.id}`);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpen();
    }
  };

  const directionTitles = partner.recruitmentDirections
    .slice(0, 3)
    .map((d) => d.title);

  return (
    <div
      className="partner-card"
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKey}
      title={`查看 ${partner.name} 的合作详情`}
    >
      <div
        className="partner-card__logo"
        style={{
          background: `linear-gradient(135deg, ${partner.brandColor} 0%, ${partner.brandColor}cc 100%)`
        }}
      >
        {partner.logoUrl ? (
          <img src={partner.logoUrl} alt={`${partner.name} Logo`} />
        ) : (
          <span className="partner-card__logo-text">{partner.shortLabel}</span>
        )}
      </div>

      <div className="partner-card__body">
        <h3 className="partner-card__name">{partner.name}</h3>
        <p className="partner-card__industry">{partner.industry}</p>

        <div className="partner-card__tags">
          {directionTitles.map((title) => (
            <span className="partner-card__tag" key={title}>
              {title}
            </span>
          ))}
        </div>

        <div className="partner-card__footer">
          <span className="partner-card__since">合作自 {partner.cooperationSince}</span>
          <span className="partner-card__more">查看详情 →</span>
        </div>
      </div>
    </div>
  );
};

export default PartnerCard;
