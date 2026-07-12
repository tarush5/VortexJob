import { useState, useEffect, type JSX } from 'react';
import { Briefcase, Activity, Terminal, Sparkles, RefreshCw, XCircle } from 'lucide-react';
import { jobApi } from '../api';
import type { Job, JobExecution, JobLog } from '../types';
import { Drawer } from '../components/Drawer';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

interface JobDetailDrawerProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
  onJobStateChange: () => void;
}

export function JobDetailDrawer({ jobId, isOpen, onClose, onJobStateChange }: JobDetailDrawerProps): JSX.Element {
  const [job, setJob] = useState<Job | null>(null);
  const [executions, setExecutions] = useState<JobExecution[]>([]);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'executions' | 'logs' | 'ai'>('overview');
  
  // AI summary states
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  const loadJobDetails = async () => {
    setLoading(true);
    try {
      const [jRes, exRes, logRes] = await Promise.all([
        jobApi.get(jobId),
        jobApi.executions(jobId),
        jobApi.logs(jobId),
      ]);
      setJob(jRes.data);
      setExecutions(exRes.data);
      setLogs(logRes.data);
      setAiSummary(''); // Clear previous AI summary
    } catch (err: any) {
      toast.error(err.message || 'Failed to load job specifics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && jobId) {
      loadJobDetails();
      setActiveTab('overview');
    }
  }, [jobId, isOpen]);

  const handleRetry = async () => {
    if (!job) return;
    const toastId = toast.loading('Rescheduling job...');
    try {
      await jobApi.retry(job.id);
      toast.success('Job manually re-queued for execution', { id: toastId });
      onJobStateChange();
      loadJobDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to retry job', { id: toastId });
    }
  };

  const handleCancel = async () => {
    if (!job) return;
    const toastId = toast.loading('Cancelling job...');
    try {
      await jobApi.cancel(job.id);
      toast.success('Job execution cancelled', { id: toastId });
      onJobStateChange();
      loadJobDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel job', { id: toastId });
    }
  };

  const fetchAiSummary = async () => {
    if (!job) return;
    setLoadingAi(true);
    const toastId = toast.loading('Generating expert Gemini diagnostic summary...');
    try {
      const res = await jobApi.aiSummary(job.id);
      setAiSummary(res.data.summary);
      toast.success('Failure analysis generated!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate failure diagnostics', { id: toastId });
    } finally {
      setLoadingAi(false);
    }
  };

  // Simple parser to render markdown into HTML inside the AI panel
  const renderSimpleMarkdown = (markdown: string) => {
    if (!markdown) return null;
    
    // Split into lines and parse paragraphs or lists
    const lines = markdown.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return <h4 key={i} className="text-base font-bold text-primary mt-4 mb-2">{trimmed.replace(/^###\s*/, '')}</h4>;
      }
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return <h5 key={i} className="text-sm font-bold text-primary mt-3 mb-1">{trimmed.replace(/\*\*/g, '')}</h5>;
      }
      if (trimmed.startsWith('-')) {
        return <li key={i} className="text-sm text-secondary ml-4" style={{ listStyleType: 'disc', margin: '4px 0 4px 16px' }}>{trimmed.replace(/^-\s*/, '')}</li>;
      }
      if (trimmed.startsWith('>')) {
        return (
          <blockquote key={i} className="bg-card p-3 rounded border-l-4 border-violet text-xs text-muted font-mono my-3" style={{ borderLeft: '4px solid var(--accent-violet)' }}>
            {trimmed.replace(/^>\s*/, '')}
          </blockquote>
        );
      }
      if (trimmed === '') return <div key={i} className="h-2" />;
      
      // Inline bold parser
      const cleanLine = trimmed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      return (
        <p
          key={i}
          className="text-sm text-secondary mb-2"
          dangerouslySetInnerHTML={{ __html: cleanLine }}
        />
      );
    });
  };

  const getLogColorClass = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'text-error';
      case 'warn':
      case 'warning': return 'text-warning';
      case 'debug': return 'text-muted';
      default: return 'text-primary';
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Job Specifics: ${job?.name || ''}`}>
      {loading ? (
        <LoadingSpinner size="lg" />
      ) : !job ? (
        <div className="text-center text-muted p-6">Job detail records missing.</div>
      ) : (
        <div className="flex flex-col gap-6 h-full">
          {/* Action Row */}
          <div className="flex gap-2">
            {['completed', 'failed', 'dead'].includes(job.status) && (
              <button className="btn btn-success flex-1 flex items-center justify-center gap-2 py-2" onClick={handleRetry}>
                <RefreshCw size={14} />
                <span>Retry Job</span>
              </button>
            )}
            {!['completed', 'failed', 'dead'].includes(job.status) && (
              <button className="btn btn-danger flex-1 flex items-center justify-center gap-2 py-2" onClick={handleCancel}>
                <XCircle size={14} />
                <span>Cancel Job</span>
              </button>
            )}
          </div>

          {/* Tabs bar */}
          <div className="tabs flex border-b border-subtle" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <button className={`tab flex items-center gap-2 p-3 ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              <Briefcase size={14} />
              <span>Overview</span>
            </button>
            <button className={`tab flex items-center gap-2 p-3 ${activeTab === 'executions' ? 'active' : ''}`} onClick={() => setActiveTab('executions')}>
              <Activity size={14} />
              <span>Executions ({executions.length})</span>
            </button>
            <button className={`tab flex items-center gap-2 p-3 ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
              <Terminal size={14} />
              <span>Logs ({logs.length})</span>
            </button>
            {['failed', 'dead'].includes(job.status) && (
              <button className={`tab flex items-center gap-2 p-3 ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
                <Sparkles size={14} />
                <span>AI Diagnose</span>
              </button>
            )}
          </div>

          {/* Tab Panel contents */}
          <div className="tab-content flex-1 pt-2">
            
            {/* 1. Overview tab */}
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-3 bg-card rounded-lg">
                  <span className="text-sm text-muted">Current status:</span>
                  <StatusBadge status={job.status} size="md" />
                </div>

                <div className="grid-2 gap-4">
                  <div className="p-3 bg-card rounded-lg">
                    <span className="text-xs text-muted block uppercase tracking-wider">Priority</span>
                    <span className="text-base font-bold font-mono text-primary mt-1 block">{job.priority}</span>
                  </div>
                  <div className="p-3 bg-card rounded-lg">
                    <span className="text-xs text-muted block uppercase tracking-wider">Retries</span>
                    <span className="text-base font-bold font-mono text-primary mt-1 block">{job.retry_count} / {job.max_retries}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-3 bg-card rounded-lg text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted">Created:</span>
                    <span className="text-secondary">{new Date(job.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Target Run At:</span>
                    <span className="text-secondary">{new Date(job.run_at).toLocaleString()}</span>
                  </div>
                  {job.completed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted">Completed At:</span>
                      <span className="text-success">{new Date(job.completed_at).toLocaleString()}</span>
                    </div>
                  )}
                  {job.failed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted">Failed At:</span>
                      <span className="text-error">{new Date(job.failed_at).toLocaleString()}</span>
                    </div>
                  )}
                  {job.cron_expression && (
                    <div className="flex justify-between">
                      <span className="text-muted">Cron Interval:</span>
                      <span className="text-violet fw-semibold">{job.cron_expression}</span>
                    </div>
                  )}
                  {job.idempotency_key && (
                    <div className="flex justify-between">
                      <span className="text-muted">Idempotency Key:</span>
                      <span className="text-secondary">{job.idempotency_key}</span>
                    </div>
                  )}
                </div>

                {/* JSON Payload viewer */}
                <div>
                  <h4 className="text-xs text-muted uppercase tracking-wider fw-semibold mb-2" style={{ marginBottom: '8px' }}>Input Payload</h4>
                  <pre className="p-4 bg-primary rounded-lg border border-subtle text-xs font-mono text-secondary overflow-x-auto" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {JSON.stringify(JSON.parse(job.payload), null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* 2. Executions list tab */}
            {activeTab === 'executions' && (
              <div className="flex flex-col gap-4">
                {executions.length === 0 ? (
                  <div className="text-center text-muted py-6">No execution cycles attempted yet.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {executions.map((ex) => (
                      <div key={ex.id} className="p-4 bg-card rounded-lg border border-subtle flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm fw-semibold text-primary">Attempt #{ex.attempt_number}</span>
                          <StatusBadge status={ex.status} />
                        </div>

                        <div className="text-xs text-muted font-mono flex flex-col gap-1">
                          <div>Worker Node: <span className="text-secondary">{ex.worker_id || 'Unknown'}</span></div>
                          <div>Started At: <span className="text-secondary">{new Date(ex.started_at).toLocaleString()}</span></div>
                          {ex.finished_at && <div>Finished At: <span className="text-secondary">{new Date(ex.finished_at).toLocaleString()}</span></div>}
                          {ex.duration_ms && <div>Execution Duration: <span className="text-violet fw-semibold">{ex.duration_ms}ms</span></div>}
                        </div>

                        {ex.error_message && (
                          <div className="mt-2 p-3 bg-error-bg border border-error rounded text-xs text-error-light font-mono overflow-x-auto" style={{ marginTop: '8px' }}>
                            {ex.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Console Logs tab */}
            {activeTab === 'logs' && (
              <div className="flex flex-col gap-2 font-mono text-xs bg-primary p-4 rounded-lg border border-subtle" style={{ minHeight: '300px', maxHeight: '420px', overflowY: 'auto' }}>
                {logs.length === 0 ? (
                  <div className="text-center text-muted py-6">Console buffer empty. No logs enqueued.</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-2 py-0.5 border-b border-subtle" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <span className="text-muted" style={{ minWidth: '70px' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`fw-semibold ${getLogColorClass(log.level)}`} style={{ minWidth: '46px', textTransform: 'uppercase' }}>
                        [{log.level}]
                      </span>
                      <span className="text-secondary flex-1">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 4. AI failure summary tab */}
            {activeTab === 'ai' && (
              <div className="flex flex-col gap-4">
                {!aiSummary ? (
                  <div className="text-center py-8">
                    <Sparkles size={32} className="text-violet mb-4 mx-auto animate-pulse" style={{ display: 'block', margin: '0 auto 16px auto' }} />
                    <h4 className="text-base font-bold text-primary mb-2">AI Diagnostics Engine</h4>
                    <p className="text-sm text-muted mb-6" style={{ marginBottom: '24px' }}>Analyze the stack logs and error reasons to generate root causes and fixes.</p>
                    <button className="btn btn-primary flex items-center gap-2 mx-auto" onClick={fetchAiSummary} disabled={loadingAi}>
                      {loadingAi ? 'Analyzing Stack...' : 'Generate Failure Summary'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-card p-6 rounded-lg border border-subtle flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-violet border-b border-subtle pb-3" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                      <Sparkles size={16} />
                      <span className="text-xs fw-semibold uppercase tracking-wider">Gemini Cognitive Diagnosis</span>
                    </div>
                    <div className="markdown-body text-secondary">
                      {renderSimpleMarkdown(aiSummary)}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </Drawer>
  );
}
