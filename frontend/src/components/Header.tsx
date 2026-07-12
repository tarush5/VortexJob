import { useState, useEffect, type JSX } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight, Search, Bell, Plus, RefreshCw } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

export function Header(): JSX.Element {
  const location = useLocation();
  const path = location.pathname.substring(1);
  const { wsStatus } = useWebSocket();
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState('24H');

  useEffect(() => {
    const handleWsMessage = () => {
      setLastSync(new Date());
    };
    window.addEventListener('ws-message', handleWsMessage);
    return () => window.removeEventListener('ws-message', handleWsMessage);
  }, []);

  const getPageMeta = () => {
    switch (path) {
      case 'dashboard': return { title: 'System Dashboard' };
      case 'queues': return { title: 'Queue Orchestration' };
      case 'jobs': return { title: 'Job Registry' };
      case 'workers': return { title: 'Worker Nodes' };
      case 'dlq': return { title: 'Dead Letter Queue' };
      default: return { title: 'Overview' };
    }
  };

  const meta = getPageMeta();

  const getStatusColor = () => {
    switch (wsStatus) {
      case 'connected': return 'var(--success)';
      case 'reconnecting': return 'var(--warning)';
      case 'connecting': return 'var(--info)';
      case 'disconnected': return 'var(--error)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <header className="header flex items-center justify-between" style={{
      padding: '0 32px',
      height: '64px',
      background: 'rgba(11, 11, 15, 0.75)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div className="flex items-center gap-6">
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1" style={{ marginBottom: '2px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Platform</span>
            <ChevronRight size={12} />
            <span style={{ textTransform: 'capitalize', color: 'var(--accent-violet-light)', fontWeight: 500 }}>{path || 'Overview'}</span>
          </div>
          
          {/* Title */}
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{meta.title}</h2>
        </div>

        {/* Live Status Indicator */}
        <div className="hide-mobile flex items-center gap-2" style={{ paddingLeft: '16px', borderLeft: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', width: '8px', height: '8px' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: getStatusColor() }} />
            {wsStatus === 'connected' && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: getStatusColor(), animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
            )}
          </div>
          <div className="flex flex-col">
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: getStatusColor(), textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {wsStatus === 'connected' ? 'Live' : wsStatus}
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Sync: {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search pill */}
        <div 
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-violet)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
        >
          <Search size={14} />
          <span>Search...</span>
          <span style={{ marginLeft: '12px', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>⌘K</span>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 4px' }} />
        
        {/* Time Range Selector */}
        <div className="hide-mobile flex items-center bg-secondary" style={{ padding: '2px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          {['1H', '6H', '24H', '7D'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: timeRange === range ? 600 : 500,
                color: timeRange === range ? 'white' : 'var(--text-muted)',
                background: timeRange === range ? 'rgba(163, 0, 47, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 150ms ease'
              }}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <button className="icon-button" style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 150ms ease' }}>
          <RefreshCw size={14} onClick={() => window.dispatchEvent(new CustomEvent('manual-refresh'))} />
        </button>
        
        <button className="icon-button" style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 150ms ease' }}>
          <Bell size={14} />
        </button>

        <button 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 16px',
            borderRadius: '8px',
            background: 'var(--accent-violet)',
            color: 'var(--accent-violet-light)',
            border: 'none',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            boxShadow: '0 0 15px rgba(163, 0, 47, 0.2)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          onClick={() => window.dispatchEvent(new CustomEvent('open-create-job'))}
        >
          <Plus size={14} />
          <span className="hide-mobile">Create Job</span>
        </button>
      </div>
    </header>
  );
}
