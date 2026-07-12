import React, { useState, useEffect } from 'react';
import { Terminal, Search, Filter, AlertTriangle, Info, XCircle, ArrowDown } from 'lucide-react';
import type { JobLog } from '../types';
import { jobApi, queueApi } from '../api';

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // In a real implementation, we would have a global logs API.
    // For this mock finalization, we'll fetch jobs from a queue and get their logs.
    const fetchLogs = async () => {
      try {
        setLoading(true);
        // Get the first queue
        const queuesRes = await queueApi.list('test-project-1');
        const queues = queuesRes.data;
        if (queues.length === 0) return;
        
        // Get recent jobs
        const jobsRes = await jobApi.list(queues[0].id, { limit: '10' });
        const jobs = jobsRes.data;
        
        // Fetch logs for these jobs
        let allLogs: JobLog[] = [];
        for (const job of jobs) {
          const jobLogsRes = await jobApi.logs(job.id);
          allLogs = [...allLogs, ...jobLogsRes.data];
        }
        
        // Sort by timestamp descending
        allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(allLogs);
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
  }, []);

  const getLogIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return <XCircle size={14} style={{ color: 'var(--error-light)' }} />;
      case 'warn': return <AlertTriangle size={14} style={{ color: 'var(--warning-light)' }} />;
      default: return <Info size={14} style={{ color: 'var(--info-light)' }} />;
    }
  };

  const getLogColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return { color: 'var(--error-light)', background: 'var(--error-bg)', borderColor: 'var(--border-strong)' };
      case 'warn': return { color: 'var(--warning-light)', background: 'var(--warning-bg)', borderColor: 'var(--border-strong)' };
      default: return { color: 'var(--info-light)', background: 'var(--info-bg)', borderColor: 'var(--border-strong)' };
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.level.toLowerCase() === filter;
    const matchesSearch = searchQuery === '' || log.message.toLowerCase().includes(searchQuery.toLowerCase()) || log.job_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="page-body" style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-height) - 40px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)', flexShrink: 0 }}>
        <div>
          <h1 className="page-title">System Logs</h1>
          <p className="page-description">Global cluster execution logs and worker diagnostics.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
          {(['all', 'error', 'warn', 'info'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--fs-sm)',
                transition: 'all var(--transition-base)',
                background: filter === f ? 'var(--bg-card)' : 'transparent',
                color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
                border: filter === f ? '1px solid var(--border-subtle)' : '1px solid transparent',
                cursor: 'pointer'
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal View */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px var(--space-4)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <Terminal size={16} />
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>vortex-cluster-stdout</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={14} />
              <input 
                type="text" 
                placeholder="grep logs..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px', paddingRight: '8px', paddingTop: '4px', paddingBottom: '4px', fontSize: 'var(--fs-xs)', width: '200px', minHeight: '32px' }}
              />
            </div>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Tail Logs">
              <ArrowDown size={16} />
            </button>
          </div>
        </div>

        {/* Log Lines */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', background: '#0a0a0f' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
              <div style={{ width: '24px', height: '24px', border: '2px solid var(--accent-violet)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginTop: '48px' }}>
              <Filter size={32} style={{ marginBottom: '12px', opacity: 0.2 }} />
              <span>No logs found matching current filters.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredLogs.map((log) => {
                const style = getLogColor(log.level);
                return (
                  <div key={log.id} style={{ display: 'flex', gap: 'var(--space-4)', padding: '4px 8px', margin: '0 -8px', borderRadius: '4px', cursor: 'default' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ color: 'var(--text-muted)', flexShrink: 0, width: '160px' }}>
                      {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                    </div>
                    <div style={{ flexShrink: 0, width: '90px' }}>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em',
                        color: style.color, background: style.background, border: `1px solid ${style.borderColor}`
                      }}>
                        {getLogIcon(log.level)}
                        {log.level}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', flexShrink: 0, width: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.job_id}>
                      [{log.job_id.substring(0, 8)}]
                    </div>
                    <div style={{ wordBreak: 'break-all', color: log.level === 'error' ? 'var(--error-light)' : 'var(--text-secondary)' }}>
                      {log.message}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { LogsPage };
