import React, { useState, useEffect } from 'react';
import { Calendar, Play, Clock, Pause, Plus, Search, Filter } from 'lucide-react';
import type { Job, Queue } from '../types';
import { jobApi, queueApi } from '../api';

const SchedulesPage: React.FC = () => {
  const [schedules, setSchedules] = useState<Job[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load queues first to get a context for schedules
    queueApi.list('test-project-1')
      .then(res => {
        setQueues(res.data);
        if (res.data.length > 0) {
          setSelectedQueue(res.data[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedQueue) {
      setLoading(true);
      jobApi.schedules(selectedQueue)
        .then(res => setSchedules(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedQueue]);

  return (
    <div className="page-body" style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 className="page-title">Schedules</h1>
          <p className="page-description">Manage recurring cron jobs and timed tasks.</p>
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
          <button className="btn btn-primary" style={{ padding: '8px 16px' }}>
            <Plus size={18} />
            <span>New Schedule</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input 
              type="text" 
              placeholder="Search schedules..." 
              className="form-input"
              style={{ paddingLeft: '40px', paddingRight: '16px', background: 'var(--bg-card)', minHeight: '40px' }}
            />
          </div>
          <button className="btn btn-secondary" style={{ padding: '10px' }}>
            <Filter size={18} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
              <div style={{ width: '32px', height: '32px', border: '2px solid var(--accent-violet)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
          ) : schedules.length === 0 ? (
            <div style={{ padding: 'var(--space-16)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)' }}>
                <Calendar size={32} style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 style={{ fontSize: 'var(--fs-xl)', color: 'var(--text-primary)', fontWeight: 'var(--fw-light)', marginBottom: '8px' }}>No Active Schedules</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>You don't have any recurring cron jobs scheduled in this queue.</p>
            </div>
          ) : (
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '16px 24px', fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)' }}>Job Name</th>
                  <th style={{ padding: '16px 24px', fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)' }}>Cron Expression</th>
                  <th style={{ padding: '16px 24px', fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)' }}>Next Run</th>
                  <th style={{ padding: '16px 24px', fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)' }}>Status</th>
                  <th style={{ padding: '16px 24px', fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(job => (
                  <tr key={job.id} className="table-row" style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background var(--transition-base)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--fw-medium)' }}>{job.name}</span>
                        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{job.id.substring(0, 8)}...</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--accent-violet-light)' }}>
                        <Clock size={14} />
                        {job.cron_expression}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      {job.run_at ? new Date(job.run_at).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className="badge" style={{ background: 'var(--info-bg)', color: 'var(--info-light)', border: '1px solid var(--border-strong)' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--info-light)' }}></span>
                        {job.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="icon-btn" title="Trigger Now" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '4px', transition: 'all 0.2s' }}
                          onClick={() => {
                            import('react-hot-toast').then(({ default: toast }) => {
                              toast.success(`Job ${job.name} triggered immediately`);
                            });
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          <Play size={16} />
                        </button>
                        <button className="icon-btn" title="Pause Schedule" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '4px', transition: 'all 0.2s' }}
                          onClick={() => {
                            import('react-hot-toast').then(({ default: toast }) => {
                              toast.success(`Schedule ${job.name} paused`);
                            });
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          <Pause size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export { SchedulesPage };
