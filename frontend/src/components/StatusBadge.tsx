import type { JSX } from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps): JSX.Element {
  const normalizedStatus = status.toLowerCase();
  
  const getDotClass = () => {
    switch (normalizedStatus) {
      case 'queued':
      case 'scheduled':
        return 'dot-pulse-info';
      case 'claimed':
      case 'running':
        return 'dot-pulse-running';
      case 'completed':
        return 'dot-pulse-success';
      case 'failed':
      case 'dead':
        return 'dot-pulse-error';
      case 'active':
        return 'dot-pulse-success';
      case 'inactive':
      case 'stopped':
        return 'dot-pulse-muted';
      default:
        return 'dot-pulse-muted';
    }
  };

  return (
    <span className={`badge badge-${normalizedStatus} flex items-center gap-2 ${size === 'md' ? 'badge-md' : ''}`}>
      <span className={`status-dot ${getDotClass()}`} />
      <span style={{ textTransform: 'capitalize' }}>{status}</span>
    </span>
  );
}
