import type { JSX } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = '20px', borderRadius = '4px', className = '', style }: SkeletonProps): JSX.Element {
  return (
    <div
      className={`skeleton-pulse ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'rgba(255, 255, 255, 0.05)',
        ...style,
      }}
    />
  );
}

export function MetricCardSkeleton(): JSX.Element {
  return (
    <div
      className="card flex items-center justify-between overflow-hidden relative"
      style={{
        minHeight: '120px',
        padding: '24px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ flex: 1 }}>
        <Skeleton width="60%" height="12px" borderRadius="4px" style={{ marginBottom: '12px' }} />
        <Skeleton width="80%" height="28px" borderRadius="4px" style={{ marginBottom: '8px' }} />
        <Skeleton width="40%" height="12px" borderRadius="4px" />
      </div>
      <Skeleton width="48px" height="48px" borderRadius="10px" style={{ flexShrink: 0 }} />
    </div>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number | string }): JSX.Element {
  return (
    <div
      className="card"
      style={{
        height,
        padding: '24px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Skeleton width="30%" height="20px" borderRadius="4px" style={{ marginBottom: '24px' }} />
      <Skeleton width="100%" height="100%" borderRadius="8px" style={{ flex: 1 }} />
    </div>
  );
}
