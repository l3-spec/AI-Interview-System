import React, { useEffect } from 'react';

/**
 * 极光动态光斑背景 + 鼠标跟随光效
 */
export const AuroraBackground: React.FC = () => {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const x = (clientX / window.innerWidth) * 100;
      const y = (clientY / window.innerHeight) * 100;
      
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="aurora-blobs">
      <div className="aurora-blob aurora-blob--1" />
      <div className="aurora-blob aurora-blob--2" />
      <div className="aurora-blob aurora-blob--3" />
      <div className="aurora-blob aurora-blob--4" />
      {/* 鼠标焦点光晕 */}
      <div 
        className="mouse-glow-orb" 
        style={{ 
          position: 'fixed',
          left: 'var(--mouse-x)',
          top: 'var(--mouse-y)',
          transform: 'translate(-50%, -50%)',
          width: '40vw',
          height: '40vw',
          background: 'radial-gradient(circle, var(--glow-primary) 0%, transparent 70%)',
          filter: 'blur(80px)',
          opacity: 0.15,
          pointerEvents: 'none',
          zIndex: -1,
          transition: 'left 0.1s ease-out, top 0.1s ease-out'
        }}
      />
    </div>
  );
};

