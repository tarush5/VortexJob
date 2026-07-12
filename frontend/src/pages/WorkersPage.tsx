import { useState, useEffect, type JSX } from 'react';
import { Server, RefreshCw, Cpu, Database, Calendar } from 'lucide-react';
import { workerApi } from '../api';
import type { WorkerInfo } from '../types';
import { usePolling } from '../hooks/usePolling';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import toast from 'react-hot-toast';

export function WorkersPage(): JSX.Element {
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkers = async (isSilent = false) => {
    try {
      const res = await workerApi.list();
      setWorkers(res.data);
    } catch (err: any) {
      if (!isSilent) {
        toast.error(err.message || 'Failed to list cluster worker nodes');
      }
    } finally {
      setLoading(false);
    }
  };

  // Poll workers list every 5 seconds
  usePolling(() => fetchWorkers(true), 5000);

  useEffect(() => {
    setLoading(true);
    fetchWorkers(false);
  }, []);

  const formatRelativeTime = (isoString: string) => {
    const elapsed = Date.now() - new Date(isoString).getTime();
    const seconds = Math.floor(elapsed / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  if (loading) {
    return <LoadingSpinner size="lg" skeleton="cards" />;
  }

  return (
    <div className="page-body flex flex-col gap-6">
      {/* Top refresh bar */}
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-subtle">
        <div className="flex items-center gap-3">
          <Server className="text-violet" size={18} />
          <span className="text-sm fw-semibold text-primary">Active Worker Nodes ({workers.length})</span>
        </div>
        <button className="btn btn-secondary flex items-center gap-2" onClick={() => fetchWorkers(false)}>
          <RefreshCw size={14} />
          <span>Sync Status</span>
        </button>
      </div>

      {workers.length === 0 ? (
        <EmptyState
          icon={<Server />}
          title="No Active Workers Detected"
          description="Your cluster currently has no running worker nodes. To process jobs, you need to start a worker daemon. Open your terminal in the backend directory and run: `npm run worker`."
          action={
            <button className="btn btn-secondary flex items-center gap-2" onClick={() => fetchWorkers(false)}>
              <RefreshCw size={14} />
              <span>Refresh Cluster</span>
            </button>
          }
        />
      ) : (
        <div className="queue-grid">
          {workers.map((w) => {
            const isInactive = w.status === 'inactive' || w.status === 'stopped';
            const queueList = JSON.parse(w.queues || '[]');

            return (
              <div key={w.id} className="card card-animated card-lift p-6 border border-subtle hover:border-strong transition flex flex-col justify-between" style={{ minHeight: '300px' }}>
                <div>
                  {/* Name and badge */}
                  <div className="flex justify-between items-start mb-4" style={{ marginBottom: '16px' }}>
                    <div>
                      <h3 className="text-base font-bold text-primary font-mono" style={{ margin: 0 }}>{w.name}</h3>
                      <span className="text-xs text-muted font-mono">{w.id.substring(0, 8)}...</span>
                    </div>
                    <StatusBadge status={w.status} />
                  </div>

                  {/* Node specifics */}
                  <div className="flex flex-col gap-2 bg-card p-4 rounded-lg text-xs font-mono mb-4" style={{ marginBottom: '16px' }}>
                    <div className="flex items-center gap-2 text-secondary">
                      <Cpu size={14} className="text-muted" />
                      <span>Host:</span>
                      <span className="text-primary fw-semibold">{w.hostname || 'local'} (PID: {w.pid})</span>
                    </div>
                    <div className="flex items-center gap-2 text-secondary">
                      <Database size={14} className="text-muted" />
                      <span>Thread Slots:</span>
                      <span className="text-primary fw-semibold">{w.concurrency} channels</span>
                    </div>
                    <div className="flex items-center gap-2 text-secondary">
                      <Calendar size={14} className="text-muted" />
                      <span>Heartbeat:</span>
                      <span className={isInactive ? 'text-error' : 'text-success'}>
                        {formatRelativeTime(w.last_heartbeat_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subscribed queues list */}
                <div>
                  <h4 className="text-xs text-muted uppercase tracking-wider fw-semibold mb-2" style={{ marginBottom: '8px' }}>Queue Subscriptions</h4>
                  {queueList.length === 0 ? (
                    <span className="text-xs text-muted">All active pipelines</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5" style={{ maxHeight: '60px', overflowY: 'auto' }}>
                      {queueList.map((qId: string) => (
                        <span key={qId} className="badge badge-inactive text-xs font-mono" style={{ fontSize: '0.7rem' }}>
                          {qId.substring(0, 8)}...
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
