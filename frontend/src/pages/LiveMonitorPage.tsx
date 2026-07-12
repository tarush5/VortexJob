import React, { useState, useEffect, useRef } from 'react';
import { Activity, Server, Zap, Clock } from 'lucide-react';

interface LiveStats {
  activeWorkers: number;
  runningJobs: number;
  queuedJobs: number;
  timestamp: string;
}

const LiveMonitorPage: React.FC = () => {
  const [stats, setStats] = useState<LiveStats>({ activeWorkers: 0, runningJobs: 0, queuedJobs: 0, timestamp: '' });
  const [history, setHistory] = useState<LiveStats[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use the backend port directly for the websocket since proxy might not handle wss well
    const wsUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws') + '/ws'
      : `${protocol}//${window.location.hostname}:3000/ws`;
      
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'stats:update') {
          setStats(data.data);
          setHistory(prev => {
            const newHistory = [...prev, data.data];
            if (newHistory.length > 50) newHistory.shift();
            return newHistory;
          });
        }
      } catch (e) {
        console.error('WS Parse error', e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  // Calculate some derived stats for the charts
  const maxJobs = Math.max(...history.map(h => h.runningJobs + h.queuedJobs), 10);
  
  return (
    <div className="page-body" style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Live Monitor</h1>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-medium)',
              border: connected ? '1px solid var(--success-bg)' : '1px solid var(--error-bg)',
              background: connected ? 'var(--success-bg)' : 'var(--error-bg)',
              color: connected ? 'var(--success-light)' : 'var(--error-light)'
            }}>
              <span style={{ 
                width: '6px', height: '6px', borderRadius: '50%', 
                background: connected ? 'var(--success-light)' : 'var(--error-light)',
                animation: connected ? 'pulse 2s infinite' : 'none'
              }}></span>
              {connected ? 'LIVE' : 'DISCONNECTED'}
            </div>
          </div>
          <p className="page-description" style={{ marginTop: '4px' }}>Real-time observability of your distributed scheduler.</p>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="metrics-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="metric-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05, transition: 'transform 0.5s', transform: 'scale(1)' }}
               onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
               onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <Server size={100} color="var(--accent-violet-light)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ padding: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--accent-violet-light)', border: '1px solid var(--border-subtle)' }}>
              <Activity size={20} />
            </div>
            <h3 style={{ color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)', letterSpacing: '0.02em' }}>Active Workers</h3>
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 'var(--fw-light)', color: 'var(--text-primary)' }}>{stats.activeWorkers}</div>
        </div>

        <div className="metric-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05, transition: 'transform 0.5s', transform: 'scale(1)' }}
               onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
               onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <Zap size={100} color="var(--info-light)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ padding: '8px', background: 'var(--info-bg)', borderRadius: 'var(--radius-md)', color: 'var(--info-light)', border: '1px solid var(--border-subtle)' }}>
              <Zap size={20} />
            </div>
            <h3 style={{ color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)', letterSpacing: '0.02em' }}>Running Jobs</h3>
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 'var(--fw-light)', color: 'var(--text-primary)' }}>{stats.runningJobs}</div>
        </div>

        <div className="metric-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05, transition: 'transform 0.5s', transform: 'scale(1)' }}
               onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
               onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <Clock size={100} color="var(--warning-light)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ padding: '8px', background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', color: 'var(--warning-light)', border: '1px solid var(--border-subtle)' }}>
              <Clock size={20} />
            </div>
            <h3 style={{ color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)', letterSpacing: '0.02em' }}>Queued Jobs</h3>
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 'var(--fw-light)', color: 'var(--text-primary)' }}>{stats.queuedJobs}</div>
        </div>
      </div>

      {/* Real-time Activity Chart */}
      <div className="card" style={{ position: 'relative' }}>
        <h3 style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-light)', color: 'var(--text-primary)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} style={{ color: 'var(--accent-violet-light)' }} />
          System Throughput Pipeline
        </h3>
        
        <div style={{ height: '250px', display: 'flex', alignItems: 'flex-end', gap: '6px', position: 'relative' }}>
          {/* Y-axis lines */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '1px solid var(--border-subtle)', pointerEvents: 'none', paddingBottom: '32px' }}>
            <div style={{ width: '100%', borderTop: '1px solid var(--border-subtle)', height: 0, position: 'relative' }}><span style={{ position: 'absolute', left: '-32px', top: '-10px', fontSize: '10px', color: 'var(--text-muted)' }}>{maxJobs}</span></div>
            <div style={{ width: '100%', borderTop: '1px solid var(--border-subtle)', height: 0, position: 'relative' }}><span style={{ position: 'absolute', left: '-32px', top: '-10px', fontSize: '10px', color: 'var(--text-muted)' }}>{Math.floor(maxJobs * 0.75)}</span></div>
            <div style={{ width: '100%', borderTop: '1px solid var(--border-subtle)', height: 0, position: 'relative' }}><span style={{ position: 'absolute', left: '-32px', top: '-10px', fontSize: '10px', color: 'var(--text-muted)' }}>{Math.floor(maxJobs * 0.5)}</span></div>
            <div style={{ width: '100%', borderTop: '1px solid var(--border-subtle)', height: 0, position: 'relative' }}><span style={{ position: 'absolute', left: '-32px', top: '-10px', fontSize: '10px', color: 'var(--text-muted)' }}>{Math.floor(maxJobs * 0.25)}</span></div>
            <div style={{ width: '100%', borderTop: '1px solid var(--border-strong)', height: 0, position: 'relative' }}><span style={{ position: 'absolute', left: '-32px', top: '-10px', fontSize: '10px', color: 'var(--text-muted)' }}>0</span></div>
          </div>
          
          {/* Bars */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', gap: '4px', height: '100%', paddingBottom: '32px', overflow: 'hidden', paddingLeft: '8px' }}>
            {history.map((point, i) => {
              const runPct = Math.max((point.runningJobs / maxJobs) * 100, 1);
              const queuePct = Math.max((point.queuedJobs / maxJobs) * 100, 0);
              
              return (
                <div key={i} className="chart-bar" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minWidth: '12px', height: '100%', position: 'relative', cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement;
                    if (tooltip) {
                      tooltip.style.opacity = '1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement;
                    if (tooltip) {
                      tooltip.style.opacity = '0';
                    }
                  }}
                >
                  {/* Tooltip */}
                  <div className="tooltip" style={{ position: 'absolute', bottom: '100%', marginBottom: '8px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', fontSize: '10px', padding: '8px', borderRadius: '4px', boxShadow: 'var(--shadow-card)', opacity: 0, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10, transition: 'opacity 0.2s' }}>
                    <div>Running: <span style={{ color: 'var(--info-light)' }}>{point.runningJobs}</span></div>
                    <div>Queued: <span style={{ color: 'var(--warning-light)' }}>{point.queuedJobs}</span></div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginTop: '4px' }}>{new Date(point.timestamp).toLocaleTimeString()}</div>
                  </div>
                  
                  {/* Stacked bar */}
                  <div style={{ width: '100%', background: 'var(--warning-light)', borderRadius: '2px 2px 0 0', opacity: 0.8, height: `${queuePct}%` }}></div>
                  <div style={{ width: '100%', background: 'var(--info-light)', borderRadius: queuePct === 0 ? '2px 2px 0 0' : '0', opacity: 0.8, height: `${runPct}%` }}></div>
                </div>
              );
            })}
            
            {/* Fill empty space if history is short */}
            {Array.from({ length: Math.max(0, 50 - history.length) }).map((_, i) => (
              <div key={`empty-${i}`} style={{ flex: 1, minWidth: '12px' }}></div>
            ))}
          </div>
          
          {/* Legend */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--info-light)', opacity: 0.8 }}></div>
              <span>Running</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--warning-light)', opacity: 0.8 }}></div>
              <span>Queued</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { LiveMonitorPage };
