import { useState, useEffect, type JSX, type FormEvent } from 'react';
import { Layers, Play, Pause, Trash2, Plus, Sliders, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { queueApi } from '../api';
import type { Queue, QueueStats } from '../types';
import { Modal } from '../components/Modal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import toast from 'react-hot-toast';

export function QueuesPage(): JSX.Element {
  const { selectedProject } = useAuth();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, QueueStats>>({});
  const [loading, setLoading] = useState(true);

  // Create queue modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formConcurrency, setFormConcurrency] = useState(10);
  const [formPriority, setFormPriority] = useState(0);
  const [formRateLimitCount, setFormRateLimitCount] = useState<string>('');
  const [formRateLimitWindow, setFormRateLimitWindow] = useState<string>('');

  // Custom confirmation modal states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');

  const loadData = async () => {
    if (!selectedProject) return;
    try {
      const qRes = await queueApi.list(selectedProject.id);
      const queueList = qRes.data;
      setQueues(queueList);

      // Fetch stats for all queues in parallel to avoid N+1 sequential await lag
      const statsList = await Promise.all(
        queueList.map(async (q) => {
          try {
            const res = await queueApi.stats(q.id);
            return { id: q.id, stats: res.data };
          } catch {
            return { id: q.id, stats: null };
          }
        })
      );

      const map: Record<string, QueueStats> = {};
      for (const item of statsList) {
        if (item.stats) map[item.id] = item.stats;
      }
      setStatsMap(map);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load queues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [selectedProject?.id]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !formName) return;

    const rateCount = formRateLimitCount ? parseInt(formRateLimitCount) : null;
    const rateWindow = formRateLimitWindow ? parseInt(formRateLimitWindow) : null;

    const toastId = toast.loading('Creating queue...');
    try {
      await queueApi.create(selectedProject.id, {
        name: formName,
        concurrency_limit: formConcurrency,
        priority: formPriority,
        rate_limit_count: rateCount,
        rate_limit_window_seconds: rateWindow,
      });

      toast.success(`Queue "${formName}" created!`, { id: toastId });
      setIsCreateOpen(false);
      
      // Reset form
      setFormName('');
      setFormConcurrency(10);
      setFormPriority(0);
      setFormRateLimitCount('');
      setFormRateLimitWindow('');

      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create queue', { id: toastId });
    }
  };

  const handlePause = async (id: string, name: string) => {
    const toastId = toast.loading(`Pausing "${name}"...`);
    try {
      await queueApi.pause(id);
      toast.success(`Queue "${name}" paused`, { id: toastId });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to pause queue', { id: toastId });
    }
  };

  const handleResume = async (id: string, name: string) => {
    const toastId = toast.loading(`Resuming "${name}"...`);
    try {
      await queueApi.resume(id);
      toast.success(`Queue "${name}" resumed`, { id: toastId });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resume queue', { id: toastId });
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmTitle('Delete Queue');
    setConfirmMessage(`Are you sure you want to permanently delete the queue "${name}"? All jobs under this queue will be purged.`);
    setConfirmAction(() => async () => {
      const toastId = toast.loading(`Deleting queue "${name}"...`);
      try {
        await queueApi.delete(id);
        toast.success(`Queue "${name}" deleted`, { id: toastId });
        loadData();
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete queue', { id: toastId });
      } finally {
        setIsConfirmOpen(false);
      }
    });
    setIsConfirmOpen(true);
  };

  if (loading) {
    return <LoadingSpinner size="lg" skeleton="table" />;
  }

  return (
    <div className="page-body flex flex-col gap-6">
      {/* Header action bar */}
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-subtle">
        <div className="flex items-center gap-3">
          <Sliders className="text-violet" size={18} />
          <span className="text-sm fw-semibold text-primary">Orchestrate Pipelines ({queues.length})</span>
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} />
          <span>New Queue</span>
        </button>
      </div>

      {queues.length === 0 ? (
        <EmptyState
          icon={<Layers />}
          title="No Queues Initialized"
          description="Create your first queue to coordinate background executions, configure priorities, and throttle workloads."
          action={
            <button className="btn btn-primary flex items-center gap-2" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} />
              <span>Initialize Queue</span>
            </button>
          }
        />
      ) : (
        <div className="queue-grid">
          {queues.map((q) => {
            const stats = statsMap[q.id];
            const isPaused = q.is_paused === 1;
            
            const total = stats?.total_jobs || 0;
            const completed = stats?.completed || 0;
            const running = stats?.running || 0;
            const failed = stats?.failed || 0;
            const dead = stats?.dead || 0;
            const queued = stats?.queued || 0;

            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div key={q.id} className={`card card-animated card-lift flex flex-col justify-between border ${isPaused ? 'border-dashed border-strong opacity-80' : 'border-subtle hover:border-strong'} transition p-6 relative`} style={{ minHeight: '340px' }}>
                
                {/* Paused Overlay Text */}
                {isPaused && (
                  <div className="absolute top-2 right-2 bg-warning-bg border border-warning text-warning text-xs px-2 py-0.5 rounded fw-medium uppercase tracking-wider scale-90" style={{ transform: 'scale(0.85)' }}>
                    Paused
                  </div>
                )}

                <div>
                  {/* Name and ID */}
                  <div className="flex justify-between items-start mb-4" style={{ marginBottom: '16px' }}>
                    <div>
                      <h3 className="text-base font-bold text-primary" style={{ margin: 0 }}>{q.name}</h3>
                      <span className="text-xs text-muted font-mono">{q.id}</span>
                    </div>
                  </div>

                  {/* Settings specs */}
                  <div className="flex flex-wrap gap-2 mb-4" style={{ marginBottom: '16px' }}>
                    <span className="badge badge-inactive text-xs font-mono">Priority: {q.priority}</span>
                    <span className="badge badge-inactive text-xs font-mono">Concurrency: {q.concurrency_limit}</span>
                    {q.rate_limit_count && (
                      <span className="badge badge-inactive text-xs font-mono" style={{ color: 'var(--accent-violet-light)' }}>
                        Limit: {q.rate_limit_count} req / {q.rate_limit_window_seconds}s
                      </span>
                    )}
                  </div>

                  {/* Progress completion bar */}
                  <div className="mb-4" style={{ marginBottom: '16px' }}>
                    <div className="flex justify-between text-xs text-muted mb-1 font-mono" style={{ marginBottom: '4px' }}>
                      <span>Completion:</span>
                      <span>{completionRate}% ({completed} / {total})</span>
                    </div>
                    <div className="progress-bar-container bg-primary" style={{ height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        className="progress-bar-fill bg-success"
                        style={{
                          width: `${completionRate}%`,
                          height: '100%',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Sub-counters */}
                  <div className="grid-3 gap-2 p-3 bg-card rounded-lg mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', marginBottom: '24px' }}>
                    <div className="text-center">
                      <div className="text-xs text-muted font-mono">Queued</div>
                      <div className="text-sm font-bold font-mono text-primary mt-1" style={{ color: 'var(--info)' }}>{queued}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted font-mono">Running</div>
                      <div className="text-sm font-bold font-mono text-primary mt-1" style={{ color: 'var(--accent-violet-light)' }}>{running}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted font-mono">Failed</div>
                      <div className="text-sm font-bold font-mono text-primary mt-1" style={{ color: 'var(--error-light)' }}>{failed + dead}</div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="flex gap-2 pt-4 border-t border-subtle" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  {isPaused ? (
                    <button className="btn btn-success flex-1 flex items-center justify-center gap-2 py-2" onClick={() => handleResume(q.id, q.name)}>
                      <Play size={14} />
                      <span>Resume</span>
                    </button>
                  ) : (
                    <button className="btn btn-secondary flex-1 flex items-center justify-center gap-2 py-2" onClick={() => handlePause(q.id, q.name)}>
                      <Pause size={14} />
                      <span>Pause</span>
                    </button>
                  )}
                  <button className="btn btn-danger p-2" onClick={() => handleDelete(q.id, q.name)} aria-label="Delete queue">
                    <Trash2 size={14} />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Create Queue Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Queue">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Queue Name</label>
            <input
              type="text"
              className="form-input w-full"
              placeholder="image-processing-queue"
              value={formName}
              onChange={(e) => setFormName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Concurrency Limit</label>
            <input
              type="number"
              className="form-input w-full"
              min={1}
              max={100}
              value={formConcurrency}
              onChange={(e) => setFormConcurrency(parseInt(e.target.value))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Queue Priority (Higher runs first)</label>
            <input
              type="number"
              className="form-input w-full"
              value={formPriority}
              onChange={(e) => setFormPriority(parseInt(e.target.value))}
              required
            />
          </div>

          <div className="grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">Rate Limit Count (Optional)</label>
              <input
                type="number"
                className="form-input w-full"
                placeholder="No limit"
                value={formRateLimitCount}
                onChange={(e) => setFormRateLimitCount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Window Seconds (Optional)</label>
              <input
                type="number"
                className="form-input w-full"
                placeholder="60"
                value={formRateLimitWindow}
                onChange={(e) => setFormRateLimitWindow(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full mt-4" style={{ marginTop: '16px' }}>
            Initialize Queue
          </button>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} title={confirmTitle}>
        <div className="flex flex-col gap-4 text-center">
          <div className="flex justify-center text-error mb-2">
            <AlertTriangle size={48} />
          </div>
          <p className="text-sm text-primary">{confirmMessage}</p>
          <div className="flex gap-3 mt-4" style={{ marginTop: '16px' }}>
            <button className="btn btn-secondary flex-1" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-danger flex-1" onClick={confirmAction || undefined}>
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
