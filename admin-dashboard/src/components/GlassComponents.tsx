import React, { useState, useCallback, useRef } from 'react';

/* ═══════════════════════════════════════════════════
   Quantum Liquid Glass Component Library
   量子液态玻璃组件库
   ═══════════════════════════════════════════════════ */

/**
 * 鼠标光效 Hook
 */
const useMouseGlow = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return { ref, position, opacity, handleMouseMove, handleMouseEnter, handleMouseLeave };
};

/* ── 液态玻璃卡片 ── */
export const LiquidCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  hoverable?: boolean;
}> = ({ children, className = '', style, onClick, hoverable = true }) => {
  const { ref, position, opacity, handleMouseMove, handleMouseEnter, handleMouseLeave } = useMouseGlow();

  return (
    <div
      ref={ref}
      className={`liquid-card ${hoverable ? 'liquid-card--hoverable' : ''} ${className}`}
      style={style}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 动态光效层 */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, rgba(56, 189, 248, 0.08), transparent 80%)`,
          opacity,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};

/* ── 渐变边框卡片 ── */
export const GradientBorderCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, className = '', style }) => (
  <div className={`gradient-border-card ${className}`} style={style}>
    {children}
  </div>
);

/* ── 统计卡片 ── */
export const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: string; up: boolean };
  color?: 'blue' | 'purple' | 'pink' | 'teal';
}> = ({ icon, label, value, trend, color = 'blue' }) => {
  const colorMap = {
    blue: '',
    purple: 'stat-card__icon--purple',
    pink: 'stat-card__icon--pink',
    teal: 'stat-card__icon--teal',
  };

  return (
    <LiquidCard className="stat-card">
      <div className={`stat-card__icon ${colorMap[color]}`}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">{value}</div>
        {trend && (
          <div className={`stat-card__trend stat-card__trend--${trend.up ? 'up' : 'down'}`}>
            {trend.up ? '↑' : '↓'} {trend.value}
          </div>
        )}
      </div>
    </LiquidCard>
  );
};

/* ── 光效按钮 ── */
export const GlassButton: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  icon?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
}> = ({ children, variant = 'secondary', onClick, className = '', style, disabled, icon, type = 'button' }) => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();

      setRipples((prev) => [...prev, { id, x, y }]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);

      onClick?.(e);
    },
    [onClick, disabled],
  );

  return (
    <button
      ref={buttonRef}
      type={type}
      className={`glass-btn glass-btn--${variant} ${className}`}
      style={style}
      onClick={handleClick}
      disabled={disabled}
    >
      <span className="glass-btn__shimmer" />
      {icon}
      <span style={{ position: 'relative', zIndex: 2 }}>{children}</span>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="glass-btn__ripple"
          style={{ left: r.x, top: r.y }}
        />
      ))}
    </button>
  );
};

/* ── 图表容器 ── */
export const ChartCard: React.FC<{
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ title, children, style }) => (
  <div className="chart-container" style={style}>
    <div className="chart-container__title">{title}</div>
    {children}
  </div>
);

/* ── 头部 Banner ── */
export const WelcomeBanner: React.FC<{
  title: string;
  subtitle: string;
  badge?: string;
}> = ({ title, subtitle, badge }) => (
  <LiquidCard style={{ marginBottom: 32, padding: 48, background: 'radial-gradient(circle at top right, rgba(56, 189, 248, 0.05), transparent 60%)' }}>
    <div style={{ position: 'relative', zIndex: 1 }}>
      {badge && (
        <span
          style={{
            display: 'inline-block',
            padding: '6px 14px',
            background: 'rgba(56,189,248,0.1)',
            border: '1px solid rgba(56,189,248,0.2)',
            borderRadius: 8,
            color: '#38bdf8',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 16
          }}
        >
          {badge}
        </span>
      )}
      <h1
        style={{
          color: '#f8fafc',
          margin: '0 0 12px',
          fontSize: 42,
          fontWeight: 900,
          letterSpacing: -1.5,
          lineHeight: 1.1
        }}
      >
        {title}
      </h1>
      <p style={{ color: '#94a3b8', fontSize: 18, margin: 0, maxWidth: 600 }}>{subtitle}</p>
    </div>
  </LiquidCard>
);

/* 保留旧版兼容 */
export { LiquidCard as GlassCard };
export { AuroraBackground, AuroraBackground as BackgroundBlobs } from './AuroraBackground';

