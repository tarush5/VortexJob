import type { JSX, ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps): JSX.Element {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 32px',
      margin: '24px auto',
      width: '100%',
      maxWidth: '540px',
      background: 'linear-gradient(180deg, rgba(163, 0, 47, 0.03) 0%, rgba(11, 11, 15, 0.6) 100%)',
      border: '1px dashed var(--border-subtle)',
      borderRadius: '16px',
      textAlign: 'center',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'rgba(163, 0, 47, 0.1)',
        color: 'var(--accent-violet-light)',
        marginBottom: '24px',
        boxShadow: '0 0 30px rgba(163, 0, 47, 0.15), inset 0 0 10px rgba(163, 0, 47, 0.2)',
        border: '1px solid rgba(163, 0, 47, 0.2)',
      }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '12px',
        letterSpacing: '-0.01em',
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '0.875rem',
        color: 'var(--text-muted)',
        lineHeight: 1.6,
        marginBottom: action ? '32px' : '0',
        maxWidth: '400px',
      }}>
        {description}
      </p>
      {action && (
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}>
          {action}
        </div>
      )}
    </div>
  );
}
