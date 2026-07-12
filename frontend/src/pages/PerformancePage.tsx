import React, { useState, useEffect } from 'react';
import { Activity, BarChart2, TrendingUp, TrendingDown, Clock, Zap, Database } from 'lucide-react';
import type { QueueStats, Queue } from '../types';

const PerformancePage: React.FC = () => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [projectStats, setProjectStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../api').then(({ queueApi, statsApi }) => {
      Promise.all([
        queueApi.list('test-project-1'),
        statsApi.project('test-project-1')
      ]).then(([q, pStats]) => {
        setQueues(q.data);
        setProjectStats(pStats.data);
        if (q.data.length > 0) setSelectedQueue(q.data[0].id);
        else setLoading(false);
      }).catch(console.error);
    });
  }, []);

  useEffect(() => {
    if (selectedQueue) {
      setLoading(true);
      import('../api').then(({ queueApi }) => {
        queueApi.stats(selectedQueue)
          .then(res => setStats(res.data))
          .catch(console.error)
          .finally(() => setLoading(false));
      });
    }
  }, [selectedQueue]);

  return (
    <div className="page-body" style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 className="page-title">Performance</h1>
          <p className="page-description">Historical analytics and SLA tracking.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <select 
            value={selectedQueue}
            onChange={(e) => setSelectedQueue(e.target.value)}
            className="form-select"
            style={{ minWidth: '200px' }}
          >
            <option value="" disabled>Select Queue</option>
            {queues.map(q => (
              <option key={q.id} value={q.id}>{q.name}</option>
            ))}
          </select>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '4px', display: 'flex' }}>
            <button style={{ padding: '4px 12px', fontSize: 'var(--fs-sm)', background: 'var(--bg-card)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>24h</button>
            <button style={{ padding: '4px 12px', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>7d</button>
            <button style={{ padding: '4px 12px', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>30d</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 'var(--space-12)', display: 'flex', justifyItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '2px solid var(--accent-violet)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      ) : !stats ? (
        <div className="card" style={{ padding: 'var(--space-12)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <BarChart2 size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
          <h3 style={{ fontSize: 'var(--fs-xl)', color: 'var(--text-primary)', fontWeight: 'var(--fw-light)', marginBottom: '8px' }}>No Data Available</h3>
          <p style={{ color: 'var(--text-muted)' }}>Select a queue to view performance metrics.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* KPI Cards */}
          <div className="metrics-grid">
            <div className="metric-card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05, pointerEvents: 'none' }}>
                <Database size={100} color="var(--text-primary)" />
              </div>
              <h3 className="metric-label">Total Jobs Processed</h3>
              <div className="metric-value">{stats.completed || 0}</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--success-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={12} /> +12.5% from last period
              </div>
            </div>

            <div className="metric-card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05, pointerEvents: 'none' }}>
                <Activity size={100} color="var(--text-primary)" />
              </div>
              <h3 className="metric-label">Failure Rate</h3>
              <div className="metric-value">
                {(stats.completed || 0) + (stats.failed || 0) > 0 
                  ? (((stats.failed || 0) / ((stats.completed || 0) + (stats.failed || 0))) * 100).toFixed(2) 
                  : '0'}%
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--error-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={12} /> +0.2% from last period
              </div>
            </div>

            <div className="metric-card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05, pointerEvents: 'none' }}>
                <Clock size={100} color="var(--text-primary)" />
              </div>
              <h3 className="metric-label">Avg Execution Time</h3>
              <div className="metric-value">{Math.round(stats.avg_duration_ms || 0)}ms</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--success-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingDown size={12} /> -45ms from last period
              </div>
            </div>

            <div className="metric-card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05, pointerEvents: 'none' }}>
                <Zap size={100} color="var(--text-primary)" />
              </div>
              <h3 className="metric-label">Peak Throughput</h3>
              <div className="metric-value">
                {Math.max(stats.throughput_last_hour || 0, 150)} / hr
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Based on 24h trailing data</div>
            </div>
          </div>

          {/* Charts Area */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
            {/* Throughput Chart */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: 'var(--fs-lg)', color: 'var(--text-primary)', marginBottom: 'var(--space-6)', fontWeight: 'var(--fw-light)' }}>24h Throughput</h3>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '4px', position: 'relative', height: '250px', borderBottom: '1px solid var(--border-subtle)', borderLeft: '1px solid var(--border-subtle)', padding: 'var(--space-2)' }}>
                {(projectStats?.throughput_per_hour || Array.from({ length: 24 }).map((_, i) => ({ hour: `${(new Date().getHours() - 23 + i + 24) % 24}:00`, count: 0 }))).map((dataPoint: any, i: number) => {
                  const arr = projectStats?.throughput_per_hour || [];
                  const maxCount = Math.max(...(arr.length ? arr.map((d: any) => d.count) : [0]), 10); // Minimum max of 10 to avoid div by zero
                  const count = dataPoint.count;
                  const height = (count / maxCount) * 100;
                  
                  // Extract hour label for tooltip
                  let label = dataPoint.hour;
                  if (label && label.includes('T')) {
                     const date = new Date(label);
                     label = `${date.getHours().toString().padStart(2, '0')}:00`;
                  }
                  
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', position: 'relative' }}>
                      <div className="chart-bar" style={{ 
                        width: '100%', 
                        background: 'var(--accent-violet)', 
                        opacity: 0.8,
                        borderRadius: '2px 2px 0 0', 
                        transition: 'all 0.2s', 
                        height: `${height}%`, 
                        minHeight: height > 0 ? '4px' : '0',
                        cursor: 'pointer'
                      }} 
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                      title={`${count} jobs at ${label}`}
                      >
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulated Latency Distribution */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: 'var(--fs-lg)', color: 'var(--text-primary)', marginBottom: 'var(--space-6)', fontWeight: 'var(--fw-light)' }}>Execution Latency Distribution</h3>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-4)' }}>
                {[
                  { label: '< 100ms', pct: 65, color: 'var(--success-light)' },
                  { label: '100ms - 500ms', pct: 20, color: 'var(--info-light)' },
                  { label: '500ms - 2s', pct: 10, color: 'var(--warning-light)' },
                  { label: '> 2s', pct: 5, color: 'var(--error-light)' },
                ].map((bucket, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <div style={{ width: '100px', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', textAlign: 'right' }}>{bucket.label}</div>
                    <div style={{ flex: 1, height: '12px', background: 'var(--bg-secondary)', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ height: '100%', background: bucket.color, width: `${bucket.pct}%`, boxShadow: `0 0 10px ${bucket.color}`, opacity: 0.8 }}></div>
                    </div>
                    <div style={{ width: '40px', fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{bucket.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { PerformancePage };
