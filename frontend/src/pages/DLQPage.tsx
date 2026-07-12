import { useState, useEffect, type JSX } from 'react';
import { AlertTriangle, RefreshCw, XCircle, ShieldAlert } from 'lucide-react';
import { dlqApi } from '../api';
import type { DLQEntry } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import toast from 'react-hot-toast';

export function DLQPage(): JSX.Element {
  const [entries, setEntries] = useState<DLQEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDLQ = async (isSilent = false) => {
    try {
      const res = await dlqApi.list();
      setEntries(res.data.filter(e => e.resolved === 0)); // Only show unresolved dead jobs
    } catch (err: any) {
      if (!isSilent) {
        toast.error(err.message || 'Failed to fetch Dead Letter items');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDLQ(false);
  }, []);

  const handleRetry = async (id: string, originalJobId: string) => {
    const toastId = toast.loading('Rescheduling dead job...');
    try {
      await dlqApi.retry(id);
      toast.success(`Job ${originalJobId.substring(0, 8)}... manually retried`, { id: toastId });
      fetchDLQ(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to retry dead job', { id: toastId });
    }
  };

  const handleIgnore = async (id: string, originalJobId: string) => {
    const toastId = toast.loading('Archiving dead job...');
    try {
      await dlqApi.ignore(id);
      toast.success(`Job ${originalJobId.substring(0, 8)}... marked resolved (ignored)`, { id: toastId });
      fetchDLQ(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve dead job', { id: toastId });
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" skeleton="table" />;
  }

  return (
    <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <ShieldAlert style={{ color: 'var(--error-light)' }} size={18} />
          <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>Dead Letter Queue Quarantine ({entries.length})</span>
        </div>
        <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => fetchDLQ(false)}>
          <RefreshCw size={14} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle style={{ color: 'var(--success-light)' }} />}
          title="Quarantine Empty"
          description="Excellent! No jobs have failed exhausts or landed in the Dead Letter Queue."
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>Original ID</th>
                  <th style={{ textAlign: 'left' }}>Failed Cause</th>
                  <th style={{ textAlign: 'left' }}>Failed Count</th>
                  <th style={{ textAlign: 'left' }}>Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', width: '120px' }}>
                      {entry.original_job_id.substring(0, 8)}...
                    </td>
                    <td style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--error-light)', fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={entry.error_message}>
                      {entry.error_message}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{entry.retry_count} attempts</td>
                    <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                      {new Date(entry.failed_at).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px' }}>
                      <button className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--fs-sm)', padding: '4px 12px' }} onClick={() => handleRetry(entry.id, entry.original_job_id)}>
                        <RefreshCw size={12} />
                        <span>Retry</span>
                      </button>
                      <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--fs-sm)', padding: '4px 12px' }} onClick={() => handleIgnore(entry.id, entry.original_job_id)}>
                        <XCircle size={12} />
                        <span>Ignore</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
