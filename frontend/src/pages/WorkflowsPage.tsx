import React, { useState } from 'react';
import { GitMerge, Plus, Play, MoreVertical, CheckCircle2, Circle, AlertCircle, Clock } from 'lucide-react';

// Mock data for workflows visualization to show the premium DAG UI
const MOCK_WORKFLOWS = [
  {
    id: 'wf-1',
    name: 'Nightly Data ETL',
    description: 'Extracts data from 3 DBs, transforms, and loads into Data Warehouse',
    status: 'completed',
    lastRun: '2 hours ago',
    nodes: [
      { id: 'n1', label: 'Extract Users', status: 'completed' },
      { id: 'n2', label: 'Extract Orders', status: 'completed' },
      { id: 'n3', label: 'Extract Payments', status: 'completed' },
      { id: 'n4', label: 'Transform Join', status: 'completed', dependsOn: ['n1', 'n2', 'n3'] },
      { id: 'n5', label: 'Load DWH', status: 'completed', dependsOn: ['n4'] },
    ]
  },
  {
    id: 'wf-2',
    name: 'User Onboarding Sequence',
    description: 'Sends welcome emails, provisions workspace, sets up billing',
    status: 'running',
    lastRun: 'Just now',
    nodes: [
      { id: 'n1', label: 'Create Account', status: 'completed' },
      { id: 'n2', label: 'Provision VM', status: 'running', dependsOn: ['n1'] },
      { id: 'n3', label: 'Setup Billing', status: 'queued', dependsOn: ['n1'] },
      { id: 'n4', label: 'Send Welcome Email', status: 'queued', dependsOn: ['n2', 'n3'] },
    ]
  },
  {
    id: 'wf-3',
    name: 'Weekly Report Generation',
    description: 'Aggregates stats and generates PDF reports for enterprise clients',
    status: 'failed',
    lastRun: '1 day ago',
    nodes: [
      { id: 'n1', label: 'Fetch Stats', status: 'completed' },
      { id: 'n2', label: 'Generate PDF', status: 'failed', dependsOn: ['n1'] },
      { id: 'n3', label: 'Upload to S3', status: 'queued', dependsOn: ['n2'] },
      { id: 'n4', label: 'Notify Clients', status: 'queued', dependsOn: ['n3'] },
    ]
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle2 size={16} className="text-success" />;
    case 'running': return <Clock size={16} className="text-info" style={{ animation: 'pulse 2s infinite' }} />;
    case 'failed': return <AlertCircle size={16} className="text-error" />;
    default: return <Circle size={16} style={{ color: 'var(--text-muted)' }} />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return { border: 'var(--border-strong)', background: 'var(--success-bg)', color: 'var(--success-light)' };
    case 'running': return { border: 'var(--border-strong)', background: 'var(--info-bg)', color: 'var(--info-light)' };
    case 'failed': return { border: 'var(--border-strong)', background: 'var(--error-bg)', color: 'var(--error-light)' };
    default: return { border: 'var(--border-subtle)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' };
  }
};

const WorkflowsPage: React.FC = () => {
  const [selectedWorkflow, setSelectedWorkflow] = useState(MOCK_WORKFLOWS[0]);

  return (
    <div className="page-body" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - var(--header-height))' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 className="page-title">Workflows</h1>
          <p className="page-description">Design and monitor complex multi-step job pipelines.</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={18} />
          <span>New Workflow</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-6)', flex: 1, minHeight: '600px' }}>
        {/* Left Sidebar - Workflow List */}
        <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {MOCK_WORKFLOWS.map(wf => (
            <div 
              key={wf.id}
              onClick={() => setSelectedWorkflow(wf)}
              className="card-clickable"
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid',
                borderColor: selectedWorkflow.id === wf.id ? 'var(--border-strong)' : 'var(--border-subtle)',
                background: selectedWorkflow.id === wf.id ? 'var(--bg-card-active)' : 'var(--bg-card)',
                boxShadow: selectedWorkflow.id === wf.id ? 'var(--shadow-glow)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <h3 style={{ color: 'var(--text-primary)', fontWeight: 'var(--fw-medium)' }}>{wf.name}</h3>
                {getStatusIcon(wf.status)}
              </div>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{wf.description}</p>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={12} />
                Last run: {wf.lastRun}
              </div>
            </div>
          ))}
        </div>

        {/* Right Area - DAG Visualizer */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', padding: 'var(--space-6)' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, padding: 'var(--space-8)', opacity: 0.05, color: 'var(--accent-violet-light)', pointerEvents: 'none' }}>
            <GitMerge size={120} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-8)', position: 'relative', zIndex: 10 }}>
            <div>
              <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-medium)', color: 'var(--text-primary)', marginBottom: '8px' }}>{selectedWorkflow.name}</h2>
              <p style={{ color: 'var(--text-muted)' }}>{selectedWorkflow.description}</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" style={{ padding: '8px' }}>
                <Play size={16} />
              </button>
              <button className="btn btn-secondary" style={{ padding: '8px' }}>
                <MoreVertical size={16} />
              </button>
            </div>
          </div>

          {/* Minimalist Grid-based DAG Representation */}
          <div style={{ 
            flex: 1, 
            background: 'var(--bg-secondary)', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border-subtle)', 
            padding: 'var(--space-8)', 
            position: 'relative', 
            overflow: 'hidden', 
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Ambient Background Grid for the canvas */}
            <div style={{ 
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}></div>

            <div style={{ position: 'relative', width: '100%', maxWidth: '800px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', alignItems: 'center', width: '100%' }}>
                {/* Level 1 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', width: '100%' }}>
                  {selectedWorkflow.nodes.filter(n => !n.dependsOn).map(node => {
                    const style = getStatusColor(node.status);
                    return (
                      <div key={node.id} style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${style.border}`,
                        background: style.background,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        minWidth: '120px',
                        boxShadow: 'var(--shadow-card)',
                        zIndex: 20
                      }}>
                        {getStatusIcon(node.status)}
                        <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)', color: style.color }}>{node.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Level 2+ */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', width: '100%', position: 'relative' }}>
                  {selectedWorkflow.nodes.filter(n => n.dependsOn).map(node => {
                    const style = getStatusColor(node.status);
                    return (
                      <div key={node.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ height: '48px', width: '1px', background: 'linear-gradient(to bottom, rgba(255,255,255,0.2), rgba(255,255,255,0.05))', position: 'absolute', top: '-48px' }}></div>
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${style.border}`,
                          background: style.background,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          minWidth: '120px',
                          boxShadow: 'var(--shadow-card)',
                          zIndex: 20
                        }}>
                          {getStatusIcon(node.status)}
                          <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)', color: style.color, textAlign: 'center' }}>{node.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { WorkflowsPage };
