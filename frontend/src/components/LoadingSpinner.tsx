import type { JSX } from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  skeleton?: 'table' | 'cards' | 'logs';
}

export function LoadingSpinner({ size = 'md', fullPage = false, skeleton }: LoadingSpinnerProps): JSX.Element {
  if (skeleton === 'table') {
    return (
      <div className="w-full flex flex-col gap-3 p-4">
        <div className="skeleton-row header-shimmer" style={{ height: '36px', width: '100%', borderRadius: '4px' }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton-row shimmer" style={{ height: '48px', width: '100%', borderRadius: '6px' }} />
        ))}
      </div>
    );
  }

  if (skeleton === 'cards') {
    return (
      <div className="grid-3 gap-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card skeleton-card shimmer" style={{ height: '180px', borderRadius: '12px' }} />
        ))}
      </div>
    );
  }

  if (skeleton === 'logs') {
    return (
      <div className="w-full flex flex-col gap-2 p-4 font-mono">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shimmer" style={{ height: '20px', width: `${90 - i * 8}%`, borderRadius: '3px' }} />
        ))}
      </div>
    );
  }

  const spinnerClass = size === 'sm' ? 'spinner-sm' : size === 'lg' ? 'spinner-lg' : 'spinner';

  if (fullPage) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-primary">
        <div className={`${spinnerClass} text-violet`} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className={`${spinnerClass} text-violet`} />
    </div>
  );
}
