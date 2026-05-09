import React, { useEffect, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

const COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#2dd4bf', '#fbbf24'];

/**
 * 浮动光粒子背景
 */
export const FloatingParticles: React.FC<{ count?: number }> = ({ count = 30 }) => {
  const particles = useRef<Particle[]>([]);

  useEffect(() => {
    particles.current = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
  }, [count]);

  return (
    <div className="particles-container">
      {particles.current.map((p) => (
        <div
          key={p.id}
          className="light-particle"
          style={{
            left: `${p.x}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.size}px ${p.color}44`,
          }}
        />
      ))}
    </div>
  );
};
