import { useState, useEffect, type JSX } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Briefcase, Server, CheckCircle2, Clock, Activity, HardDrive, ArrowRight, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePolling } from '../hooks/usePolling';
import { statsApi, jobApi } from '../api';
import type { DashboardStats, Job } from '../types';
import { MetricCard } from '../components/MetricCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  failed: '#f43f5e',
  dead: '#991b1b',
  running: '#a3002f',
  claimed: '#f59e0b',
  queued: '#626a75',
  scheduled: '#0ea5e9',
};

export function DashboardPage(): JSX.Element {
  const { selectedProject } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStats = async (isSilent = false) => {
    if (!selectedProject) return;
    try {
      const res = await statsApi.project(selectedProject.id);
      setStats(res.data);
      
      // Try fetching recent jobs from the first active queue for the activity feed
      if (res.data.queue_breakdown.length > 0) {
        const topQueue = res.data.queue_breakdown[0];
        const jobsRes = await jobApi.list(topQueue.queue_id, { limit: '5', sort: 'updated_at', order: 'desc' });
        if (jobsRes.data) {
          setRecentJobs(jobsRes.data.slice(0, 5));
        }
      }
    } catch (err: any) {
      if (!isSilent) {
        toast.error(err.message || 'Failed to fetch dashboard metrics');
      }
    } finally {
      setLoading(false);
    }
  };

  usePolling(() => fetchStats(true), 5000, [selectedProject?.id]);

  useEffect(() => {
    setLoading(true);
    fetchStats(false);
  }, [selectedProject?.id]);

  if (loading) {
    return <LoadingSpinner size="lg" skeleton="cards" />;
  }

  if (!stats) {
    return (
      <EmptyState
        icon={<Briefcase />}
        title="No Stats Available"
        description="We couldn't retrieve statistics for the selected project. Please verify that a queue and job have been created."
      />
    );
  }

  const pieData = Object.entries(stats.status_breakdown)
    .map(([status, count]) => ({ name: status, value: count }))
    .filter((d) => d.value > 0);

  const totalStatusJobs = pieData.reduce((acc, curr) => acc + curr.value, 0);

  const formatDuration = (ms: number) => {
    if (ms === 0) return '0ms';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Generate fake trend data based on real throughput for sparklines
  const trendData = stats.throughput_per_hour.map(d => ({ value: d.count }));

  return (
    <div className="page-body flex flex-col gap-6" style={{ background: 'transparent', minHeight: 'calc(100vh - 64px)' }}>
      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Total Jobs"
          value={stats.total_jobs.toLocaleString()}
          icon={<Briefcase size={22} />}
          color="violet"
          trendData={trendData}
        />
        <MetricCard
          title="Active Workers"
          value={stats.active_workers.toLocaleString()}
          icon={<Server size={22} />}
          color="info"
        />
        <MetricCard
          title="Success Rate"
          value={`${stats.success_rate}%`}
          icon={<CheckCircle2 size={22} />}
          color="success"
        />
        <MetricCard
          title="Avg Run Time"
          value={formatDuration(stats.avg_duration_ms)}
          icon={<Clock size={22} />}
          color="warning"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid-2 gap-6">
        {/* Throughput Area Chart */}
        <div className="card card-animated card-lift flex flex-col" style={{ minHeight: '380px' }}>
          <h4 style={{ marginBottom: '16px', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8898aa' }}>Hourly Throughput (Last 24 Hours)</h4>
          {stats.throughput_per_hour.length === 0 ? (
            <div className="flex-1 flex items-center justify-center" style={{ fontSize: '0.8125rem', color: '#8898aa' }}>No throughput recorded</div>
          ) : (
            <div className="flex-1" style={{ width: '100%', height: '100%', minHeight: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.throughput_per_hour} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-violet-light)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--accent-violet-light)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="hour" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(tick) => {
                    const d = new Date(tick);
                    return isNaN(d.getTime()) ? tick : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  }} />
                  <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ stroke: 'var(--accent-violet)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{
                      background: 'rgba(11, 11, 15, 0.85)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="var(--accent-violet-light)" strokeWidth={3} fillOpacity={1} fill="url(#colorThroughput)" name="Completed Jobs" activeDot={{ r: 6, fill: 'var(--accent-violet-light)', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="card card-animated card-lift flex flex-col items-center justify-between" style={{ minHeight: '380px' }}>
          <div className="w-full">
            <h4 style={{ marginBottom: '16px', textAlign: 'left', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8898aa' }}>Status Distribution</h4>
          </div>
          {pieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center" style={{ fontSize: '0.8125rem', color: '#8898aa' }}>No jobs recorded in project</div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-6 w-full flex-1" style={{ flexDirection: 'row' }}>
              <div style={{ width: '200px', height: '200px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={1500}
                      animationEasing="ease-out"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name.toLowerCase()] || '#8898aa'} style={{ filter: `drop-shadow(0 0 8px ${STATUS_COLORS[entry.name.toLowerCase()] || '#8898aa'}40)` }} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(11, 11, 15, 0.85)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translateY(-50%) translateX(-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{totalStatusJobs}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
                </div>
              </div>

              {/* Legends */}
              <div className="flex flex-col gap-2 flex-1" style={{ width: '100%', maxWidth: '200px' }}>
                {pieData.map((entry) => {
                  const pieColor = STATUS_COLORS[entry.name.toLowerCase()] || '#8898aa';
                  const pct = totalStatusJobs > 0 ? Math.round((entry.value / totalStatusJobs) * 100) : 0;
                  return (
                    <div key={entry.name} className="flex items-center justify-between" style={{ fontSize: '0.75rem', padding: '6px 8px', borderRadius: '6px', transition: 'background 150ms ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pieColor, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 8px ${pieColor}` }} />
                        <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-secondary)' }}>{entry.name}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{entry.value} ({pct}%)</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2 gap-6">
        {/* Cluster Health Overview */}
        <div className="card card-animated card-lift flex flex-col">
          <h4 style={{ marginBottom: '16px', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8898aa' }}>Cluster Health</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <Activity size={14} color="var(--success)" /> Scheduler Status
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Healthy</div>
            </div>
            <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <HardDrive size={14} color="var(--info)" /> Processing Capacity
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{stats.active_workers * 10} j/s</div>
            </div>
            <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <CheckCircle2 size={14} color="var(--accent-violet-light)" /> Total Queues
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{stats.queue_breakdown.length}</div>
            </div>
            <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <XCircle size={14} color="var(--error)" /> Failed Jobs (All Time)
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--error)', fontFamily: 'var(--font-mono)' }}>{stats.status_breakdown.failed || 0}</div>
            </div>
          </div>
        </div>

        {/* Recent System Activity */}
        <div className="card card-animated card-lift flex flex-col">
          <h4 style={{ marginBottom: '16px', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8898aa' }}>Recent Activity</h4>
          {recentJobs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center" style={{ fontSize: '0.8125rem', color: '#8898aa' }}>No recent activity found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentJobs.map(job => (
                <div key={job.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[job.status] || '#8898aa', marginTop: '6px', flexShrink: 0, boxShadow: `0 0 8px ${STATUS_COLORS[job.status]}` }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Job {job.status}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{job.name} ({job.id.substring(0, 8)})</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(job.updated_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Queue Breakdown Grid Section */}
      <div className="card card-animated card-lift flex flex-col">
        <h4 style={{ marginBottom: '16px', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8898aa' }}>Active Queues Performance</h4>
        {stats.queue_breakdown.length === 0 ? (
          <div style={{ fontSize: '0.8125rem', color: '#8898aa', textAlign: 'center', padding: '32px 0' }}>No queues initialized. Go to the Queues page to create one.</div>
        ) : (
          <div className="queue-grid">
            {stats.queue_breakdown.map((q) => {
              const activeCount = q.active_jobs;
              const totalCount = q.total_jobs;
              const loadPercentage = totalCount > 0 ? Math.min(100, Math.round((activeCount / totalCount) * 100)) : 0;

              return (
                <div key={q.queue_id} style={{
                  padding: '24px',
                  borderRadius: '12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  transition: 'all 200ms ease',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const rotateX = ((y - rect.height / 2) / rect.height) * -2;
                    const rotateY = ((x - rect.width / 2) / rect.width) * 2;
                    e.currentTarget.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
                    e.currentTarget.style.borderColor = 'rgba(163, 0, 47, 0.3)';
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(163, 0, 47, 0.1)';
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)'; 
                    e.currentTarget.style.boxShadow = 'none'; 
                  }}
                  onClick={() => navigate(`/jobs?queue_id=${q.queue_id}`)}
                >
                  <div className="flex justify-between items-start" style={{ position: 'relative', zIndex: 1 }}>
                    <div>
                      <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{q.queue_name}</h5>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{q.queue_id.substring(0, 8)}...</span>
                    </div>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', zIndex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Active</span>
                      <span style={{ fontSize: '1rem', color: 'var(--accent-violet-light)', fontWeight: 600 }}>{activeCount}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total</span>
                      <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>{totalCount}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: '6px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(0,0,0,0.4)', zIndex: 1 }}>
                    <div style={{
                      width: `${loadPercentage}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--accent-violet), var(--accent-violet-light))',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease',
                      boxShadow: '0 0 10px var(--accent-violet-light)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
