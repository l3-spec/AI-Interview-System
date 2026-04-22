import React from 'react';
import { Link } from 'react-router-dom';
import { LEGAL_STORAGE_KEYS } from '../config/constants';
import './FirstLaunchPrivacyModal.css';

const ACCENT = '#0091FF';

export function hasPrivacyFirstLaunchConsent(): boolean {
  try {
    return window.localStorage.getItem(LEGAL_STORAGE_KEYS.PRIVACY_FIRST_LAUNCH_CONSENT) === '1';
  } catch {
    return false;
  }
}

export function setPrivacyFirstLaunchConsent(): void {
  try {
    window.localStorage.setItem(LEGAL_STORAGE_KEYS.PRIVACY_FIRST_LAUNCH_CONSENT, '1');
  } catch {
    /* ignore quota / private mode */
  }
}

interface FirstLaunchPrivacyModalProps {
  open: boolean;
  onAgree: () => void;
  onDisagree: () => void;
}

/**
 * 首次进入站点时的隐私政策显著提示（Web 端）。
 * 《隐私政策》为独立页面 /privacy-policy，与用户协议分离。
 */
const FirstLaunchPrivacyModal: React.FC<FirstLaunchPrivacyModalProps> = ({
  open,
  onAgree,
  onDisagree
}) => {
  if (!open) return null;

  return (
    <div
      className="first-privacy-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-privacy-title"
    >
      <div className="first-privacy-backdrop" aria-hidden="true" />
      <div className="first-privacy-card">
        <div className="first-privacy-icon" style={{ color: ACCENT }} aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M9 12l2 2 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 id="first-privacy-title" className="first-privacy-heading">
          隐私政策
        </h2>
        <p className="first-privacy-body">
          欢迎您使用由<strong>柚汀科技</strong>提供的产品与服务。我们非常重视您的个人信息与隐私保护。
        </p>
        <p className="first-privacy-body">
          请您在使用前仔细阅读
          <Link to="/privacy-policy" className="first-privacy-link" target="_blank" rel="noopener noreferrer">
            《隐私政策》
          </Link>
          （为独立文档，不构成《用户协议》的一部分）。您通过外链访问的《隐私政策》全文与本站
          <Link to="/privacy-policy" className="first-privacy-link" target="_blank" rel="noopener noreferrer">
            /privacy-policy
          </Link>
          页面展示内容一致。
        </p>
        <p className="first-privacy-body">
          点击「同意」即表示您已阅读并理解上述说明；点击「不同意」将无法继续使用登录、注册等需要处理个人信息的功能（您仍可浏览公开介绍内容）。
        </p>
        <div className="first-privacy-actions">
          <button type="button" className="first-privacy-btn first-privacy-btn--secondary" onClick={onDisagree}>
            不同意
          </button>
          <button
            type="button"
            className="first-privacy-btn first-privacy-btn--primary"
            style={{ background: ACCENT }}
            onClick={onAgree}
          >
            同意
          </button>
        </div>
      </div>
    </div>
  );
};

export default FirstLaunchPrivacyModal;
