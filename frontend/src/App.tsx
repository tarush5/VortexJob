import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Layers, Briefcase, Cpu, Skull, LogOut,
  Plus, Pause, Play, RefreshCw, X, Search, ChevronLeft, ChevronRight,
  Activity, CheckCircle2, Clock, RotateCcw,
  Inbox, Server
} from 'lucide-react';
import { authApi, orgApi, projectApi, queueApi, jobApi, workerApi, dlqApi, statsApi, setToken, clearToken } from './api';
import './index.css';

/* ==========================================
   TYPES
   ========================================== */
type Page = 'dashboard' | 'queues' | 'jobs' | 'workers' | 'dlq';

/* ==========================================
   HELPER COMPONENTS
   ========================================== */
function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function TimeAgo({ date }: { date: string }) {
  if (!date) return <span className="text-muted">—</span>;
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 5) return <span>just now</span>;
  if (seconds < 60) return <span>{seconds}s ago</span>;
  if (seconds < 3600) return <span>{Math.floor(seconds / 60)}m ago</span>;
  if (seconds < 86400) return <span>{Math.floor(seconds / 3600)}h ago</span>;
  return <span>{Math.floor(seconds / 86400)}d ago</span>;
}

function Truncate({ text, max = 8 }: { text: string; max?: number }) {
  if (!text) return <span className="text-muted">—</span>;
  return <span className="truncate-id" title={text}>{text.slice(0, max)}…</span>;
}

/* ==========================================
   LOGIN PAGE
   ========================================== */
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        const res = await authApi.register(email, password, name);
        setToken(res.data.token);
      } else {
        const res = await authApi.login(email, password);
        setToken(res.data.token);
      }
      onLogin();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-shape" />
      <div className="login-bg-shape" />
      <div className="login-card">
        <div className="sidebar-logo" style={{ width: 48, height: 48, margin: '0 auto var(--space-5)', fontSize: '1.5rem' }}>V</div>
        <h1 className="login-title">VortexJob</h1>
        <p className="login-subtitle">{isRegister ? 'Create your account' : 'Sign in to your dashboard'}</p>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          <button className="btn btn-primary w-full" disabled={loading} style={{ padding: '12px', justifyContent: 'center', marginTop: 8 }}>
            {loading ? <span className="spinner" /> : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        <div className="login-toggle">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => { setIsRegister(!isRegister); setError(''); }}>{isRegister ? 'Sign In' : 'Sign Up'}</button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================
   DASHBOARD PAGE
   ========================================== */
function DashboardPage({ projectId }: { projectId: string }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await statsApi.project(projectId);
      setStats(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  if (loading) return <div className="empty-state"><div className="spinner spinner-lg" /></div>;
  if (!stats) return <div className="empty-state"><p>Failed to load stats</p></div>;

  const maxThroughput = Math.max(1, ...stats.throughput_per_hour.map((t: any) => t.count));

  return (
    <>
      <div className="metrics-grid mb-6">
        <div className="metric-card">
          <div className="metric-icon violet"><Briefcase size={22} /></div>
          <div><div className="metric-label">Total Jobs</div><div className="metric-value">{stats.total_jobs.toLocaleString()}</div></div>
        </div>
        <div className="metric-card">
          <div className="metric-icon green"><Cpu size={22} /></div>
          <div><div className="metric-label">Active Workers</div><div className="metric-value">{stats.active_workers}</div></div>
        </div>
        <div className="metric-card">
          <div className="metric-icon blue"><CheckCircle2 size={22} /></div>
          <div><div className="metric-label">Success Rate</div><div className="metric-value">{stats.success_rate}%</div></div>
        </div>
        <div className="metric-card">
          <div className="metric-icon amber"><Clock size={22} /></div>
          <div><div className="metric-label">Avg Duration</div><div className="metric-value">{stats.avg_duration_ms > 0 ? `${(stats.avg_duration_ms / 1000).toFixed(1)}s` : '—'}</div></div>
        </div>
      </div>

      <div className="section">
        <h3 className="section-title"><Activity size={18} /> Throughput (Last 24h)</h3>
        <div className="card">
          <div className="chart-bar-group">
            {stats.throughput_per_hour.map((t: any, i: number) => (
              <div key={i} className="chart-bar" style={{ height: `${Math.max(2, (t.count / maxThroughput) * 100)}%` }} title={`${t.hour}: ${t.count} jobs`} />
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-muted">
            <span>{stats.throughput_per_hour[0]?.hour || ''}</span>
            <span>Now</span>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="section">
          <h3 className="section-title"><Briefcase size={18} /> Status Breakdown</h3>
          <div className="card">
            {Object.entries(stats.status_breakdown).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <StatusBadge status={status} />
                <span className="fw-semibold">{(count as number).toLocaleString()}</span>
              </div>
            ))}
            {Object.keys(stats.status_breakdown).length === 0 && <p className="text-muted text-sm">No jobs yet</p>}
          </div>
        </div>
        <div className="section">
          <h3 className="section-title"><Layers size={18} /> Queue Breakdown</h3>
          <div className="card">
            {stats.queue_breakdown.map((q: any) => (
              <div key={q.queue_id} className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-sm">{q.queue_name}</span>
                <span className="text-sm text-muted">{q.total_jobs} jobs ({q.active_jobs} active)</span>
              </div>
            ))}
            {stats.queue_breakdown.length === 0 && <p className="text-muted text-sm">No queues yet</p>}
          </div>
        </div>
      </div>
    </>
  );
}

/* ==========================================
   QUEUES PAGE
   ========================================== */
function QueuesPage({ projectId }: { projectId: string }) {
  const [queues, setQueues] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState('');
  const [formConc, setFormConc] = useState('10');
  const [formPri, setFormPri] = useState('0');
  const [formRateLimitCount, setFormRateLimitCount] = useState('');
  const [formRateLimitWindow, setFormRateLimitWindow] = useState('');
  const [loading, setLoading] = useState(true);
  const [statsMap, setStatsMap] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    try {
      const res = await queueApi.list(projectId);
      setQueues(res.data);
      const sm: Record<string, any> = {};
      for (const q of res.data) {
        try {
          const s = await queueApi.stats(q.id);
          sm[q.id] = s.data;
        } catch { /* ignore */ }
      }
      setStatsMap(sm);
    } catch { /* ignore */ }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await queueApi.create(projectId, {
        name: formName,
        concurrency_limit: parseInt(formConc),
        priority: parseInt(formPri),
        rate_limit_count: formRateLimitCount ? parseInt(formRateLimitCount) : null,
        rate_limit_window_seconds: formRateLimitWindow ? parseInt(formRateLimitWindow) : null,
      });
      setShowCreate(false);
      setFormName(''); setFormConc('10'); setFormPri('0');
      setFormRateLimitCount(''); setFormRateLimitWindow('');
      load();
    } catch { /* ignore */ }
  };

  const handlePauseResume = async (queue: any) => {
    try {
      if (queue.is_paused) await queueApi.resume(queue.id);
      else await queueApi.pause(queue.id);
      load();
    } catch { /* ignore */ }
  };

  if (loading) return <div className="empty-state"><div className="spinner spinner-lg" /></div>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h3 className="section-title"><Layers size={18} /> {queues.length} Queue{queues.length !== 1 ? 's' : ''}</h3>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Create Queue</button>
      </div>

      <div className="queue-grid">
        {queues.map(q => {
          const s = statsMap[q.id];
          return (
            <div key={q.id} className="card">
              <div className="flex justify-between items-center mb-4">
                <h4 className="fw-semibold" style={{ fontSize: 'var(--fs-lg)' }}>{q.name}</h4>
                <StatusBadge status={q.is_paused ? 'inactive' : 'active'} />
              </div>
              <div className="text-xs text-muted mb-4 font-mono"><Truncate text={q.id} max={12} /></div>
              {s && (
                <div className="grid-3 mb-4" style={{ gap: 8 }}>
                  <div><div className="text-xs text-muted">Queued</div><div className="fw-semibold">{s.queued}</div></div>
                  <div><div className="text-xs text-muted">Running</div><div className="fw-semibold" style={{color:'var(--accent-violet-light)'}}>{s.running + s.claimed}</div></div>
                  <div><div className="text-xs text-muted">Done</div><div className="fw-semibold" style={{color:'var(--success)'}}>{s.completed}</div></div>
                  <div><div className="text-xs text-muted">Failed</div><div className="fw-semibold" style={{color:'var(--error)'}}>{s.failed}</div></div>
                  <div><div className="text-xs text-muted">Dead</div><div className="fw-semibold" style={{color:'var(--status-dead)'}}>{s.dead}</div></div>
                  <div><div className="text-xs text-muted">Limit</div><div className="fw-semibold">{q.concurrency_limit}</div></div>
                </div>
              )}
              {q.rate_limit_count != null && (
                <div className="text-xs text-muted mb-4" style={{borderTop: '1px solid var(--border-subtle)', paddingTop: '8px'}}>
                  Rate Limit: <span className="fw-semibold" style={{color: 'var(--accent-violet-light)'}}>{q.rate_limit_count} jobs / {q.rate_limit_window_seconds}s</span>
                </div>
              )}
              <div className="flex gap-2">
                <button className="btn btn-sm btn-secondary" onClick={() => handlePauseResume(q)}>
                  {q.is_paused ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause</>}
                </button>
                <button className="btn btn-sm btn-danger" onClick={async () => { if (confirm('Delete queue?')) { await queueApi.delete(q.id); load(); } }}>
                  <X size={14} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {queues.length === 0 && <div className="empty-state"><Inbox size={48} /><div className="empty-state-title">No queues yet</div><p>Create your first queue to start scheduling jobs.</p></div>}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Create Queue</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" required value={formName} onChange={e => setFormName(e.target.value)} placeholder="email-notifications" /></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Concurrency</label><input className="form-input" type="number" required min="1" value={formConc} onChange={e => setFormConc(e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Priority</label><input className="form-input" type="number" required value={formPri} onChange={e => setFormPri(e.target.value)} /></div>
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Rate Limit (Max Jobs)</label><input className="form-input" type="number" min="1" value={formRateLimitCount} onChange={e => setFormRateLimitCount(e.target.value)} placeholder="Unlimited" /></div>
                <div className="form-group"><label className="form-label">Rate Limit Window (s)</label><input className="form-input" type="number" min="1" value={formRateLimitWindow} onChange={e => setFormRateLimitWindow(e.target.value)} placeholder="e.g. 60" /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function JobsPage({ projectId }: { projectId: string }) {
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [jobLogs, setJobLogs] = useState<any[]>([]);
  const [jobExecs, setJobExecs] = useState<any[]>([]);
  const [jobDeps, setJobDeps] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newJobName, setNewJobName] = useState('');
  const [newJobPayload, setNewJobPayload] = useState('{}');
  const [newJobType, setNewJobType] = useState('immediate');
  const [newJobCron, setNewJobCron] = useState('');
  const [newJobRunAt, setNewJobRunAt] = useState('');
  const [selectedDeps, setSelectedDeps] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await queueApi.list(projectId);
        setQueues(res.data);
        if (res.data.length > 0) setSelectedQueue(res.data[0].id);
      } catch { /* ignore */ }
    })();
  }, [projectId]);

  const loadJobs = useCallback(async () => {
    if (!selectedQueue) { setLoading(false); return; }
    try {
      const params: Record<string, string> = { page: pagination.page.toString(), limit: '20' };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await jobApi.list(selectedQueue, params);
      setJobs(res.data);
      setPagination(res.pagination);
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedQueue, statusFilter, search, pagination.page]);

  useEffect(() => { setLoading(true); loadJobs(); }, [loadJobs]);

  const openJob = async (job: any) => {
    setSelectedJob(job);
    setAiSummary('');
    try {
      const [logsRes, execsRes, depsRes] = await Promise.all([
        jobApi.logs(job.id),
        jobApi.executions(job.id),
        jobApi.getDependencies(job.id)
      ]);
      setJobLogs(logsRes.data);
      setJobExecs(execsRes.data);
      setJobDeps(depsRes.data);
    } catch { /* ignore */ }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = {
        name: newJobName,
        payload: JSON.parse(newJobPayload),
        type: newJobType,
        depends_on: selectedDeps.length > 0 ? selectedDeps : undefined
      };
      if (newJobType === 'cron') data.cron_expression = newJobCron;
      if (newJobType === 'scheduled' || newJobType === 'delayed') data.run_at = newJobRunAt;
      await jobApi.create(selectedQueue, data);
      setShowCreate(false);
      setNewJobName(''); setNewJobPayload('{}'); setNewJobType('immediate'); setNewJobCron(''); setNewJobRunAt('');
      setSelectedDeps([]);
      loadJobs();
    } catch { /* ignore */ }
  };

  const handleAiSummary = async () => {
    if (!selectedJob) return;
    setLoadingAi(true);
    setAiSummary('');
    try {
      const res = await jobApi.aiSummary(selectedJob.id);
      setAiSummary(res.data.summary);
    } catch (err: any) {
      setAiSummary(`Failed to analyze: ${err.message}`);
    }
    setLoadingAi(false);
  };

  function renderSimpleMarkdown(text: string) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return <h5 key={i} style={{color: 'var(--accent-violet-light)', marginTop: '12px', marginBottom: '6px', fontSize: 'var(--fs-sm)'}}>{line.slice(4)}</h5>;
      }
      if (line.startsWith('- ')) {
        return <li key={i} style={{marginLeft: '16px', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: '4px'}}>{line.slice(2)}</li>;
      }
      if (line.startsWith('> ')) {
        return <blockquote key={i} style={{borderLeft: '2px solid var(--accent-violet)', paddingLeft: '8px', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', margin: '8px 0'}}>{line.slice(2)}</blockquote>;
      }
      const parts = line.split('**');
      if (parts.length > 1) {
        return (
          <p key={i} style={{fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: '6px'}}>
            {parts.map((p, idx) => idx % 2 === 1 ? <strong key={idx} style={{color: 'var(--text-primary)'}}>{p}</strong> : p)}
          </p>
        );
      }
      return <p key={i} style={{fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: '6px'}}>{line}</p>;
    });
  }

  return (
    <>
      <div className="filter-bar">
        <select className="form-select" value={selectedQueue} onChange={e => { setSelectedQueue(e.target.value); setPagination((p: any) => ({...p, page: 1})); }}>
          {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
        </select>
        <select className="form-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPagination((p: any) => ({...p, page: 1})); }}>
          <option value="">All statuses</option>
          {['queued','scheduled','claimed','running','completed','failed','dead'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{position:'relative', flex:1, minWidth:200}}>
          <Search size={16} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}} />
          <input className="form-input" style={{paddingLeft:36}} placeholder="Search by name or ID..." value={search} onChange={e => { setSearch(e.target.value); setPagination((p: any) => ({...p, page: 1})); }} />
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} disabled={!selectedQueue}><Plus size={16} /> New Job</button>
        <button className="btn btn-secondary" onClick={loadJobs}><RefreshCw size={16} /></button>
      </div>

      {loading ? <div className="empty-state"><div className="spinner spinner-lg" /></div> : jobs.length === 0 ? (
        <div className="empty-state"><Inbox size={48} /><div className="empty-state-title">No jobs found</div><p>Create a job or adjust your filters.</p></div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Priority</th><th>Retries</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} style={{cursor:'pointer'}} onClick={() => openJob(j)}>
                    <td><Truncate text={j.id} /></td>
                    <td style={{color:'var(--text-primary)', fontWeight:500}}>{j.name}</td>
                    <td><StatusBadge status={j.status} /></td>
                    <td>{j.priority}</td>
                    <td>{j.retry_count}/{j.max_retries}</td>
                    <td className="text-sm text-muted"><TimeAgo date={j.created_at} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {['failed','dead'].includes(j.status) && <button className="btn btn-sm btn-success" onClick={async () => { await jobApi.retry(j.id); loadJobs(); }}><RotateCcw size={12} /></button>}
                        {!['completed','dead'].includes(j.status) && <button className="btn btn-sm btn-danger" onClick={async () => { await jobApi.cancel(j.id); loadJobs(); }}><X size={12} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>Showing {jobs.length} of {pagination.total} jobs</span>
            <div className="pagination-buttons">
              <button className="btn btn-sm btn-secondary" disabled={pagination.page <= 1} onClick={() => setPagination((p: any) => ({...p, page: p.page - 1}))}><ChevronLeft size={14} /></button>
              <span className="text-sm" style={{padding:'4px 12px'}}>Page {pagination.page} of {pagination.totalPages || 1}</span>
              <button className="btn btn-sm btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination((p: any) => ({...p, page: p.page + 1}))}><ChevronRight size={14} /></button>
            </div>
          </div>
        </>
      )}

      {/* Job Detail Drawer */}
      {selectedJob && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedJob(null)} />
          <div className="drawer">
            <div className="drawer-header">
              <h3 className="drawer-title">{selectedJob.name}</h3>
              <button className="btn btn-ghost" onClick={() => setSelectedJob(null)}><X size={20} /></button>
            </div>
            <div className="drawer-body">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4"><StatusBadge status={selectedJob.status} /><span className="text-xs text-muted font-mono">{selectedJob.id}</span></div>
                <div className="grid-2" style={{gap:12}}>
                  <div><span className="text-xs text-muted">Priority</span><div className="fw-semibold">{selectedJob.priority}</div></div>
                  <div><span className="text-xs text-muted">Retries</span><div className="fw-semibold">{selectedJob.retry_count}/{selectedJob.max_retries}</div></div>
                  <div><span className="text-xs text-muted">Created</span><div className="text-sm"><TimeAgo date={selectedJob.created_at} /></div></div>
                  <div><span className="text-xs text-muted">Run At</span><div className="text-sm">{selectedJob.run_at ? new Date(selectedJob.run_at).toLocaleString() : '—'}</div></div>
                  {selectedJob.cron_expression && <div style={{gridColumn:'1/3'}}><span className="text-xs text-muted">Cron</span><div className="font-mono text-sm">{selectedJob.cron_expression}</div></div>}
                </div>
              </div>

              {jobDeps.length > 0 && (
                <div className="mb-6">
                  <h4 className="section-title text-sm">Parent Dependencies</h4>
                  <div className="card" style={{padding: '8px 12px'}}>
                    {jobDeps.map(dep => (
                      <div key={dep.id} className="flex justify-between items-center text-xs" style={{padding: '4px 0'}}>
                        <span className="fw-semibold">{dep.name}</span>
                        <StatusBadge status={dep.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {['failed', 'dead'].includes(selectedJob.status) && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="section-title text-sm" style={{margin: 0}}>AI Failure Analysis</h4>
                    <button className="btn btn-sm btn-primary" onClick={handleAiSummary} disabled={loadingAi}>
                      {loadingAi ? <span className="spinner" /> : 'Run AI Summary'}
                    </button>
                  </div>
                  {aiSummary && (
                    <div className="card" style={{padding: '12px 16px', background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.3)'}}>
                      {renderSimpleMarkdown(aiSummary)}
                    </div>
                  )}
                </div>
              )}

              <div className="mb-6">
                <h4 className="section-title text-sm">Payload</h4>
                <pre className="card" style={{fontSize:'var(--fs-xs)',overflow:'auto',maxHeight:150,fontFamily:'var(--font-mono)',color:'var(--text-secondary)'}}>{JSON.stringify(JSON.parse(selectedJob.payload || '{}'), null, 2)}</pre>
              </div>

              <div className="mb-6">
                <h4 className="section-title text-sm">Executions ({jobExecs.length})</h4>
                {jobExecs.map(ex => (
                  <div key={ex.id} className="card mb-4" style={{padding:'var(--space-3)'}}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2"><StatusBadge status={ex.status} /><span className="text-xs text-muted">Attempt {ex.attempt_number}</span></div>
                      <span className="text-xs text-muted">{ex.duration_ms != null ? `${ex.duration_ms}ms` : '—'}</span>
                    </div>
                    {ex.error_message && <div className="text-xs text-error mt-4" style={{fontFamily:'var(--font-mono)'}}>{ex.error_message}</div>}
                  </div>
                ))}
                {jobExecs.length === 0 && <p className="text-sm text-muted">No executions yet</p>}
              </div>

              <div className="mb-6">
                <h4 className="section-title text-sm">Logs ({jobLogs.length})</h4>
                <div className="card" style={{padding:'var(--space-3)', maxHeight: 300, overflowY: 'auto'}}>
                  {jobLogs.map(log => (
                    <div key={log.id} className="log-entry">
                      <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={`log-level ${log.level}`}>{log.level}</span>
                      <span className="log-message">{log.message}</span>
                    </div>
                  ))}
                  {jobLogs.length === 0 && <p className="text-sm text-muted">No logs yet</p>}
                </div>
              </div>

              <div className="flex gap-2">
                {['failed','dead'].includes(selectedJob.status) && <button className="btn btn-success" onClick={async () => { await jobApi.retry(selectedJob.id); setSelectedJob(null); loadJobs(); }}><RotateCcw size={14} /> Retry</button>}
                {!['completed','dead'].includes(selectedJob.status) && <button className="btn btn-danger" onClick={async () => { await jobApi.cancel(selectedJob.id); setSelectedJob(null); loadJobs(); }}><X size={14} /> Cancel</button>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Job Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Create Job</h2>
            <form onSubmit={handleCreateJob}>
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" required value={newJobName} onChange={e => setNewJobName(e.target.value)} placeholder="send-welcome-email" /></div>
              <div className="form-group"><label className="form-label">Type</label>
                <select className="form-select" value={newJobType} onChange={e => setNewJobType(e.target.value)}>
                  <option value="immediate">Immediate</option><option value="delayed">Delayed</option><option value="scheduled">Scheduled</option><option value="cron">Recurring (Cron)</option>
                </select>
              </div>
              {(newJobType === 'scheduled' || newJobType === 'delayed') && (
                <div className="form-group"><label className="form-label">Run At (ISO)</label><input className="form-input" type="datetime-local" value={newJobRunAt} onChange={e => setNewJobRunAt(e.target.value)} /></div>
              )}
              {newJobType === 'cron' && (
                <div className="form-group"><label className="form-label">Cron Expression</label><input className="form-input font-mono" value={newJobCron} onChange={e => setNewJobCron(e.target.value)} placeholder="*/5 * * * *" /></div>
              )}
              <div className="form-group">
                <label className="form-label">Parent Dependencies (DAG)</label>
                <select className="form-select" multiple value={selectedDeps} onChange={e => setSelectedDeps(Array.from(e.target.selectedOptions).map(o => o.value))} style={{height: '80px'}}>
                  {jobs.filter(j => j.status !== 'completed').map(j => (
                    <option key={j.id} value={j.id}>{j.name} ({j.status})</option>
                  ))}
                </select>
                <span className="text-xs text-muted" style={{marginTop: '4px', display: 'block'}}>Hold Ctrl/Cmd to select multiple parent jobs.</span>
              </div>
              <div className="form-group"><label className="form-label">Payload (JSON)</label><textarea className="form-input" rows={4} value={newJobPayload} onChange={e => setNewJobPayload(e.target.value)} style={{fontFamily:'var(--font-mono)', resize:'vertical'}} /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Job</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ==========================================
   WORKERS PAGE
   ========================================== */
function WorkersPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await workerApi.list();
      setWorkers(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  if (loading) return <div className="empty-state"><div className="spinner spinner-lg" /></div>;

  return (
    <>
      <h3 className="section-title mb-6"><Cpu size={18} /> {workers.length} Worker{workers.length !== 1 ? 's' : ''}</h3>
      {workers.length === 0 ? (
        <div className="empty-state"><Server size={48} /><div className="empty-state-title">No workers registered</div><p>Start a worker with: <code className="font-mono">npm run worker</code></p></div>
      ) : (
        <div className="queue-grid">
          {workers.map(w => (
            <div key={w.id} className="card">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <span className={`status-dot ${w.status}`} />
                  <h4 className="fw-semibold">{w.name}</h4>
                </div>
                <StatusBadge status={w.status} />
              </div>
              <div className="grid-2 text-sm" style={{gap:8}}>
                <div><span className="text-xs text-muted">Hostname</span><div>{w.hostname}</div></div>
                <div><span className="text-xs text-muted">PID</span><div className="font-mono">{w.pid}</div></div>
                <div><span className="text-xs text-muted">Concurrency</span><div>{w.concurrency}</div></div>
                <div><span className="text-xs text-muted">Last Heartbeat</span><div><TimeAgo date={w.last_heartbeat_at} /></div></div>
                <div><span className="text-xs text-muted">Started</span><div><TimeAgo date={w.started_at} /></div></div>
                {w.stopped_at && <div><span className="text-xs text-muted">Stopped</span><div><TimeAgo date={w.stopped_at} /></div></div>}
              </div>
              <div className="text-xs text-muted mt-4 font-mono"><Truncate text={w.id} max={16} /></div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ==========================================
   DLQ PAGE
   ========================================== */
function DLQPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await dlqApi.list();
      setEntries(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="empty-state"><div className="spinner spinner-lg" /></div>;

  return (
    <>
      <h3 className="section-title mb-6"><Skull size={18} /> Dead Letter Queue ({entries.length})</h3>
      {entries.length === 0 ? (
        <div className="empty-state"><CheckCircle2 size={48} /><div className="empty-state-title">DLQ is empty</div><p>No permanently failed jobs. Everything is running smoothly!</p></div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Job ID</th><th>Error</th><th>Retries</th><th>Failed At</th><th>Actions</th></tr></thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td><Truncate text={e.original_job_id} /></td>
                  <td className="text-sm" style={{maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--error-light)'}}>{e.error_message}</td>
                  <td>{e.retry_count}</td>
                  <td className="text-sm text-muted"><TimeAgo date={e.failed_at} /></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-sm btn-success" onClick={async () => { await dlqApi.retry(e.id); load(); }}><RotateCcw size={12} /> Retry</button>
                      <button className="btn btn-sm btn-ghost" onClick={async () => { await dlqApi.ignore(e.id); load(); }}>Ignore</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ==========================================
   MAIN APP
   ========================================== */
export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('vortexjob_token'));
  const [page, setPage] = useState<Page>('dashboard');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [initLoading, setInitLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  // Init: load user, orgs, projects
  const init = useCallback(async () => {
    try {
      const meRes = await authApi.me();
      setUser(meRes.data);

      const orgsRes = await orgApi.list();
      let orgList = orgsRes.data;

      // If no org exists, auto-create one
      if (orgList.length === 0) {
        const newOrg = await orgApi.create('My Organization');
        orgList = [newOrg.data];
      }

      const projRes = await projectApi.list(orgList[0].id);
      let projList = projRes.data;

      // If no project exists, auto-create one
      if (projList.length === 0) {
        const newProj = await projectApi.create(orgList[0].id, 'Default Project');
        projList = [newProj.data];
      }
      setProjects(projList);
      setSelectedProject(projList[0].id);
    } catch {
      clearToken();
      setAuthed(false);
    }
    setInitLoading(false);
  }, []);

  useEffect(() => { if (authed) init(); else setInitLoading(false); }, [authed, init]);

  // WebSocket connection
  useEffect(() => {
    if (!authed) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket;
    let reconnectTimer: number;

    function connect() {
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => setWsConnected(true);
        ws.onclose = () => { setWsConnected(false); reconnectTimer = window.setTimeout(connect, 3000); };
        ws.onerror = () => ws.close();
      } catch { /* ignore */ }
    }
    connect();

    return () => { clearTimeout(reconnectTimer); if (ws) ws.close(); };
  }, [authed]);

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
    setUser(null);
    setProjects([]);
    setSelectedProject('');
  };

  if (!authed) return <LoginPage onLogin={() => setAuthed(true)} />;
  if (initLoading) return <div className="login-page"><div className="spinner spinner-lg" /></div>;

  const navItems: { id: Page; icon: any; label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'queues', icon: Layers, label: 'Queues' },
    { id: 'jobs', icon: Briefcase, label: 'Jobs' },
    { id: 'workers', icon: Cpu, label: 'Workers' },
    { id: 'dlq', icon: Skull, label: 'Dead Letter Queue' },
  ];

  const pageTitle: Record<Page, string> = { dashboard: 'Dashboard', queues: 'Queue Management', jobs: 'Job Explorer', workers: 'Worker Monitor', dlq: 'Dead Letter Queue' };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">V</div>
          <div>
            <div className="sidebar-title">VortexJob</div>
            <div className="sidebar-subtitle">Job Scheduler</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(item => (
            <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}>
              <item.icon size={18} /> {item.label}
            </button>
          ))}

          <div className="nav-section-label" style={{marginTop:'auto'}}>Project</div>
          <select className="form-select" value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={{marginBottom: 8}}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <div style={{display:'flex', alignItems:'center', gap:8, padding:'12px', borderTop:'1px solid var(--border-subtle)', marginTop:8}}>
            <div style={{width:8,height:8,borderRadius:'50%',background: wsConnected ? 'var(--success)' : 'var(--error)',boxShadow: wsConnected ? '0 0 8px var(--success)' : 'none'}} />
            <span className="text-xs text-muted">{wsConnected ? 'Live' : 'Offline'}</span>
          </div>
        </nav>

        <div style={{padding:'16px', borderTop:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <div className="text-sm fw-semibold">{user?.full_name || user?.email}</div>
            <div className="text-xs text-muted">{user?.email}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Logout"><LogOut size={16} /></button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">{pageTitle[page]}</h1>
            <p className="page-description">
              {page === 'dashboard' && 'Real-time overview of your job scheduling system'}
              {page === 'queues' && 'Create, configure, and monitor your job queues'}
              {page === 'jobs' && 'Browse, inspect, retry, and manage jobs across all queues'}
              {page === 'workers' && 'Monitor worker health, heartbeats, and resource utilization'}
              {page === 'dlq' && 'Review permanently failed jobs and take corrective action'}
            </p>
          </div>
        </div>
        <div className="page-body">
          {page === 'dashboard' && selectedProject && <DashboardPage projectId={selectedProject} />}
          {page === 'queues' && selectedProject && <QueuesPage projectId={selectedProject} />}
          {page === 'jobs' && selectedProject && <JobsPage projectId={selectedProject} />}
          {page === 'workers' && <WorkersPage />}
          {page === 'dlq' && <DLQPage />}
        </div>
      </main>
    </div>
  );
}
