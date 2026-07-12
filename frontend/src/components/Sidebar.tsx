import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Layers, Briefcase, Server, AlertTriangle, LogOut, ChevronDown, Clock, GitMerge, Activity, Terminal, Zap, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';

export function Sidebar(): JSX.Element {
  const { user, projects, selectedProject, setSelectedProject, logout } = useAuth();
  const { wsConnected } = useWebSocket();

  return (
    <aside className="sidebar flex flex-col justify-between" style={{ padding: '24px 16px', overflowY: 'auto' }}>
      <div>
        {/* Logo / Brand */}
        <div className="flex items-center gap-3" style={{ marginBottom: '28px', padding: '0 8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-violet-light))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <Server size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>VortexJob</h1>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Distributed Scheduler</span>
          </div>
        </div>

        {/* Project Selector */}
        {projects.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '0 8px' }}>
            <span style={{ display: 'block', marginBottom: '6px', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Project</span>
            <div className="relative">
              <select
                className="form-select w-full"
                value={selectedProject?.id || ''}
                onChange={(e) => {
                  const p = projects.find((x) => x.id === e.target.value);
                  if (p) setSelectedProject(p);
                }}
                style={{ paddingRight: '32px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Categories */}
        <div className="flex flex-col gap-6 w-full">
          {/* MANAGEMENT */}
          <div className="flex flex-col gap-1 w-full">
            <h4 className="nav-section-label">Management</h4>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/jobs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Briefcase size={18} />
              <span>Jobs</span>
            </NavLink>
            <NavLink to="/queues" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Layers size={18} />
              <span>Queues</span>
            </NavLink>
            <NavLink to="/workers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Server size={18} />
              <span>Workers</span>
            </NavLink>
          </div>

          {/* SCHEDULING */}
          <div className="flex flex-col gap-1 w-full">
            <h4 className="nav-section-label">Scheduling</h4>
            <NavLink to="/schedules" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Clock size={18} />
              <span>Schedules</span>
            </NavLink>
            <NavLink to="/workflows" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <GitMerge size={18} />
              <span>Workflows</span>
            </NavLink>
            <NavLink to="/dlq" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <AlertTriangle size={18} />
              <span>Dead Letter</span>
            </NavLink>
          </div>

          {/* OBSERVABILITY */}
          <div className="flex flex-col gap-1 w-full">
            <h4 className="nav-section-label">Observability</h4>
            <NavLink to="/live-monitor" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Activity size={18} />
              <span>Live Monitor</span>
            </NavLink>
            <NavLink to="/logs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Terminal size={18} />
              <span>Logs</span>
            </NavLink>
            <NavLink to="/performance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Zap size={18} />
              <span>Performance</span>
            </NavLink>
          </div>

          {/* PLATFORM */}
          <div className="flex flex-col gap-1 w-full">
            <h4 className="nav-section-label">Platform</h4>
            <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Settings size={18} />
              <span>Settings</span>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Footer Info / User */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }} className="flex flex-col gap-3">
        {/* WS Live status */}
        <div className="flex items-center justify-between text-xs" style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-2">
            <span className={`status-dot ${wsConnected ? 'dot-pulse-success' : 'dot-pulse-error'}`} />
            <span>Real-time Stream</span>
          </span>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: wsConnected ? '#10b981' : '#f43f5e' }}>
            {wsConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* User Card */}
        {user && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div style={{
                width: '34px',
                height: '34px',
                minWidth: '34px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-violet-light))',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textTransform: 'uppercase',
              }}>
                {user.full_name ? user.full_name.charAt(0) : user.email.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name || 'Vortex User'}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              aria-label="Sign out"
              style={{
                padding: '6px',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
