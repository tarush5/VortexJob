import React, { useState } from 'react';
import { Settings, Key, Shield, Bell, Database, Users, Save } from 'lucide-react';

const tabs = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'security', label: 'Security & Auth', icon: Shield },
  { id: 'retention', label: 'Data Retention', icon: Database },
  { id: 'team', label: 'Team & Access', icon: Users },
  { id: 'alerts', label: 'Alerts & Webhooks', icon: Bell },
];

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="page-body" style={{ animation: 'fadeIn 0.3s ease', paddingBottom: '3rem' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 className="page-title">Platform Settings</h1>
          <p className="page-description">Configure global platform preferences and security.</p>
        </div>
        <button className="btn btn-primary" style={{ padding: '8px 24px' }}>
          <Save size={18} />
          <span>Save Changes</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
        {/* Settings Navigation Sidebar */}
        <div style={{ flex: '0 0 250px', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)',
                  background: isActive ? 'var(--bg-card-hover)' : 'transparent',
                  border: isActive ? '1px solid var(--border-strong)' : '1px solid transparent',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: 'all var(--transition-base)',
                  textAlign: 'left',
                  boxShadow: isActive ? '0 0 15px rgba(163,0,47,0.15)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--bg-card)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <Icon size={18} className={isActive ? "text-violet" : ""} />
                <span style={{ fontWeight: isActive ? 'var(--fw-medium)' : 'var(--fw-normal)' }}>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Content Area */}
        <div style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          {activeTab === 'general' ? (
            <>
              {/* Global Configuration */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                  <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-medium)', color: 'var(--text-primary)' }}>Global Configuration</h2>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>Manage core behaviors of the VortexJob cluster.</p>
                </div>
                
                <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Default Retry Policy</label>
                      <select className="form-select">
                        <option>Exponential Backoff</option>
                        <option>Fixed Interval</option>
                        <option>Immediate Retry</option>
                        <option>No Retries</option>
                      </select>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Applies when a job doesn't specify its own policy.</p>
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Max Retries</label>
                      <input type="number" defaultValue={5} className="form-input" />
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Worker Stale Timeout (Seconds)</label>
                      <input type="number" defaultValue={60} className="form-input" />
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Time before the Reaper claims orphaned jobs.</p>
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Log Level</label>
                      <select defaultValue="Info" className="form-select">
                        <option>Debug</option>
                        <option>Info</option>
                        <option>Warning</option>
                        <option>Error</option>
                      </select>
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-4) 0' }} />
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <h3 style={{ color: 'var(--text-primary)', fontWeight: 'var(--fw-medium)', fontSize: 'var(--fs-sm)' }}>Feature Flags</h3>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div>
                        <h4 style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)', color: 'var(--text-primary)' }}>Enable Dead Letter Queue (DLQ)</h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Move permanently failed jobs to the DLQ instead of deleting them.</p>
                      </div>
                      <div style={{ width: '48px', height: '24px', background: 'var(--accent-violet)', borderRadius: '9999px', position: 'relative', cursor: 'pointer', boxShadow: 'var(--shadow-glow)' }}>
                        <div style={{ position: 'absolute', right: '4px', top: '4px', width: '16px', height: '16px', background: '#fff', borderRadius: '50%' }}></div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div>
                        <h4 style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)', color: 'var(--text-primary)' }}>Strict Payload Validation</h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Reject jobs that don't conform to the queue's registered JSON schema.</p>
                      </div>
                      <div style={{ width: '48px', height: '24px', background: 'var(--bg-tertiary)', borderRadius: '9999px', position: 'relative', cursor: 'pointer', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ position: 'absolute', left: '4px', top: '3px', width: '16px', height: '16px', background: 'var(--text-muted)', borderRadius: '50%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div style={{ 
                border: '1px solid rgba(244, 63, 94, 0.3)', 
                borderRadius: 'var(--radius-lg)', 
                background: 'var(--error-bg)',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{ padding: 'var(--space-6)', position: 'relative', zIndex: 10 }}>
                  <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-medium)', color: 'var(--error-light)', marginBottom: '8px' }}>Danger Zone</h2>
                  <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>Irreversible actions that affect the entire cluster.</p>
                  
                  <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" style={{ flex: '1', display: 'flex', justifyContent: 'center', borderColor: 'rgba(244, 63, 94, 0.3)', color: 'var(--error-light)' }}>
                      <Database size={16} />
                      Purge Completed Jobs
                    </button>
                    <button className="btn btn-danger" style={{ flex: '1', display: 'flex', justifyContent: 'center' }}>
                      Reset Cluster State
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: 'var(--space-10) var(--space-8)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
                {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Settings, { size: 32, className: "text-muted" })}
              </div>
              <h3 style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                {tabs.find(t => t.id === activeTab)?.label}
              </h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '400px', lineHeight: 1.6 }}>
                This section is currently under development. The configuration options for {tabs.find(t => t.id === activeTab)?.label?.toLowerCase()} will be available in a future update.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { SettingsPage };
