import type { JSX, ReactNode } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: string; // e.g., 'violet', 'success', 'warning', 'info', 'error'
  subtitle?: string;
  trendData?: { value: number }[];
}

const COLOR_MAP: Record<string, { bg: string; text: string; glow: string; iconBg: string }> = {
  violet: { bg: 'var(--accent-violet)', text: 'var(--accent-violet-light)', glow: 'var(--accent-violet-glow)', iconBg: 'rgba(163, 0, 47, 0.15)' },
  info: { bg: 'var(--info)', text: 'var(--info-light)', glow: 'var(--info-bg)', iconBg: 'var(--info-bg)' },
  success: { bg: 'var(--success)', text: 'var(--success-light)', glow: 'var(--success-bg)', iconBg: 'var(--success-bg)' },
  warning: { bg: 'var(--warning)', text: 'var(--warning-light)', glow: 'var(--warning-bg)', iconBg: 'var(--warning-bg)' },
  error: { bg: 'var(--error)', text: 'var(--error-light)', glow: 'var(--error-bg)', iconBg: 'var(--error-bg)' },
};

export function MetricCard({ title, value, icon, color, subtitle, trendData }: MetricCardProps): JSX.Element {
  const c = COLOR_MAP[color] || COLOR_MAP.violet;

  return (
    <div
      className="card card-animated relative overflow-hidden"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -2.5; // Max 2.5 degrees
        const rotateY = ((x - centerX) / centerX) * 2.5;
        e.currentTarget.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        e.currentTarget.style.zIndex = '10';
        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.8), 0 0 40px rgba(163, 0, 47, 0.15)';
        e.currentTarget.style.borderColor = 'rgba(163, 0, 47, 0.4)';
        
        // Update reflection position
        const reflection = e.currentTarget.querySelector('.mouse-reflection') as HTMLElement;
        if (reflection) {
          reflection.style.left = `${x}px`;
          reflection.style.top = `${y}px`;
          reflection.style.opacity = '1';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
        e.currentTarget.style.zIndex = '1';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        
        const reflection = e.currentTarget.querySelector('.mouse-reflection') as HTMLElement;
        if (reflection) {
          reflection.style.opacity = '0';
        }
      }}
      style={{
        minHeight: '120px',
        padding: '24px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-card)',
        transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.2s ease',
        transformStyle: 'preserve-3d',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'default',
      }}
    >
      {/* Mouse Reflection */}
      <div 
        className="mouse-reflection"
        style={{
          position: 'absolute',
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle, rgba(163, 0, 47, 0.15) 0%, transparent 60%)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.3s ease',
          zIndex: 0,
        }}
      />
      
      <div className="flex items-center justify-between" style={{ zIndex: 1, transform: 'translateZ(20px)' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
          <h3 style={{ margin: '8px 0 4px 0', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>{value}</h3>
          {subtitle && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>

        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '10px',
          background: c.iconBg,
          color: c.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 4px 12px ${c.glow}`
        }}>
          {icon}
        </div>
      </div>

      {/* Sparkline */}
      {trendData && trendData.length > 0 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', opacity: 0.4, transform: 'translateZ(10px)', pointerEvents: 'none' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Line type="monotone" dataKey="value" stroke={c.bg} strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={1000} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
