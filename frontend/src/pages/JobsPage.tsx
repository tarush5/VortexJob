import { useState, useEffect, type JSX, type FormEvent } from 'react';
import { Briefcase, Plus, Search, Filter, RefreshCw, Layers } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { queueApi, jobApi } from '../api';
import type { Queue, Job, PaginationMeta } from '../types';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { JobDetailDrawer } from './JobDetailDrawer';
import toast from 'react-hot-toast';

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'dead', label: 'Dead' },
];

export function JobsPage(): JSX.Element {
  const { selectedProject } = useAuth();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Detail drawer state
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Create job states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newJobName, setNewJobName] = useState('');
  const [newJobType, setNewJobType] = useState('immediate');
  const [newJobPayload, setNewJobPayload] = useState('{\n  "url": "https://api.vortexjob.io/v1/ping"\n}');
  const [newJobCron, setNewJobCron] = useState('');
  const [newJobRunAt, setNewJobRunAt] = useState('');
  const [selectedDeps, setSelectedDeps] = useState<string[]>([]);
  const [allProjectJobs, setAllProjectJobs] = useState<Job[]>([]);

  // Search debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load initial queues for project
  useEffect(() => {
    const loadQueues = async () => {
      if (!selectedProject) return;
      try {
        const res = await queueApi.list(selectedProject.id);
        setQueues(res.data);
        if (res.data.length > 0) {
          setSelectedQueue(res.data[0].id);
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to load project queues');
      }
    };
    loadQueues();
  }, [selectedProject?.id]);

  // Load jobs matching current filters
  const loadJobs = async (isSilent = false) => {
    if (!selectedQueue) return;
    if (!isSilent) setLoading(true);

    try {
      const params: Record<string, string> = {
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      };
      if (statusFilter) params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await jobApi.list(selectedQueue, params);
      setJobs(res.data);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: any) {
      if (!isSilent) {
        toast.error(err.message || 'Failed to fetch jobs list');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [selectedQueue, statusFilter, debouncedSearch]);

  useEffect(() => {
    loadJobs(false);
  }, [selectedQueue, statusFilter, debouncedSearch, pagination.page]);

  // Fetch all potential parent jobs for DAG dependencies inside create modal
  const loadAllJobsForDeps = async () => {
    if (!selectedQueue) return;
    try {
      // Get a large list to pick dependencies
      const res = await jobApi.list(selectedQueue, { limit: '100', status: 'completed' });
      const activeRes = await jobApi.list(selectedQueue, { limit: '100', status: 'queued' });
      setAllProjectJobs([...res.data, ...activeRes.data]);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isCreateOpen) {
      loadAllJobsForDeps();
    }
  }, [isCreateOpen]);

  const handleCreateJob = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedQueue || !newJobName) return;

    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(newJobPayload);
    } catch {
      toast.error('Invalid JSON payload structure');
      return;
    }

    const toastId = toast.loading('Enqueuing job...');
    try {
      await jobApi.create(selectedQueue, {
        name: newJobName,
        payload: parsedPayload,
        type: newJobType,
        cron_expression: newJobType === 'cron' ? newJobCron : undefined,
        run_at: (newJobType === 'delayed' || newJobType === 'scheduled') && newJobRunAt ? new Date(newJobRunAt).toISOString() : undefined,
        depends_on: selectedDeps,
      });

      toast.success(`Job "${newJobName}" enqueued!`, { id: toastId });
      setIsCreateOpen(false);
      
      // Reset form
      setNewJobName('');
      setNewJobType('immediate');
      setNewJobPayload('{\n  "url": "https://api.vortexjob.io/v1/ping"\n}');
      setNewJobCron('');
      setNewJobRunAt('');
      setSelectedDeps([]);

      loadJobs(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to enqueue job', { id: toastId });
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  if (!selectedProject || queues.length === 0) {
    return (
      <EmptyState
        icon={<Layers />}
        title="No Queue Context Found"
        description="Jobs can only be enqueued inside an active Queue pipeline. Please construct a queue first."
      />
    );
  }

  return (
    <div className="page-body flex flex-col gap-6">
      {/* Filter and Action Bar */}
      <div className="card p-6 flex flex-col gap-4 border border-subtle">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Filter size={18} className="text-violet" />
            <span className="text-sm fw-semibold text-primary">Job Registry Filter</span>
          </div>

          <button className="btn btn-primary flex items-center gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} />
            <span>Enqueue Job</span>
          </button>
        </div>

        <div className="filter-bar flex flex-wrap gap-4 items-center">
          {/* Queue Selector */}
          <div className="form-group flex-1" style={{ minWidth: '200px', margin: 0 }}>
            <label className="form-label text-xs">Queue Pipeline</label>
            <select
              className="form-select w-full"
              value={selectedQueue}
              onChange={(e) => setSelectedQueue(e.target.value)}
            >
              {queues.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name} (Con: {q.concurrency_limit})
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="form-group flex-1" style={{ minWidth: '240px', margin: 0 }}>
            <label className="form-label text-xs">Search name or ID</label>
            <div className="relative">
              <input
                type="text"
                className="form-input w-full"
                placeholder="search jobs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
              <Search size={16} className="text-muted" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-2 mt-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`btn btn-sm ${statusFilter === f.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter(f.value)}
              style={{ padding: '6px 12px', borderRadius: '16px', fontSize: '0.75rem' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Table Container */}
      {loading ? (
        <LoadingSpinner skeleton="table" />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase />}
          title="No Matching Jobs"
          description="We couldn't locate any jobs inside this queue that match your filter selections."
          action={
            <button className="btn btn-secondary flex items-center gap-2" onClick={() => loadJobs(false)}>
              <RefreshCw size={14} />
              <span>Refresh Registry</span>
            </button>
          }
        />
      ) : (
        <div className="card p-0 border border-subtle overflow-hidden">
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left font-mono" style={{ fontSize: '0.7rem' }}>Job ID</th>
                  <th className="text-left">Name</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Priority</th>
                  <th className="text-left">Attempts</th>
                  <th className="text-left">Created At</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="cursor-pointer hover:bg-card-hover transition"
                    onClick={() => setSelectedJobId(job.id)}
                  >
                    <td className="font-mono text-xs text-muted" style={{ width: '120px' }}>
                      {job.id.substring(0, 8)}...
                    </td>
                    <td className="fw-semibold text-primary">{job.name}</td>
                    <td>
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="font-mono text-xs">{job.priority}</td>
                    <td className="font-mono text-xs">{job.retry_count} / {job.max_retries}</td>
                    <td className="text-xs text-muted">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-subtle" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}

      {/* Details Slide-in Drawer */}
      {selectedJobId && (
        <JobDetailDrawer
          jobId={selectedJobId}
          isOpen={!!selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onJobStateChange={() => loadJobs(true)}
        />
      )}

      {/* Enqueue Job Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Enqueue background job">
        <form onSubmit={handleCreateJob} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Job Name (Action Descriptor)</label>
            <input
              type="text"
              className="form-input w-full"
              placeholder="process-avatar-upload"
              value={newJobName}
              onChange={(e) => setNewJobName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Execution Type</label>
            <select
              className="form-select w-full"
              value={newJobType}
              onChange={(e) => setNewJobType(e.target.value)}
            >
              <option value="immediate">Immediate Dispatch</option>
              <option value="delayed">Delayed Execution</option>
              <option value="scheduled">Scheduled Interval</option>
              <option value="cron">Cron Recurring Job</option>
            </select>
          </div>

          {newJobType === 'cron' && (
            <div className="form-group">
              <label className="form-label">Cron Expression</label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="*/5 * * * *"
                value={newJobCron}
                onChange={(e) => setNewJobCron(e.target.value)}
                required
              />
            </div>
          )}

          {(newJobType === 'delayed' || newJobType === 'scheduled') && (
            <div className="form-group">
              <label className="form-label">Scheduled Run Time</label>
              <input
                type="datetime-local"
                className="form-input w-full"
                value={newJobRunAt}
                onChange={(e) => setNewJobRunAt(e.target.value)}
                required
              />
            </div>
          )}

          {/* DAG dependencies dropdown */}
          {allProjectJobs.length > 0 && (
            <div className="form-group">
              <label className="form-label">Parent Dependencies (DAG Blocks)</label>
              <select
                multiple
                className="form-select w-full"
                style={{ height: '80px' }}
                value={selectedDeps}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions, (o) => o.value);
                  setSelectedDeps(opts);
                }}
              >
                {allProjectJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name} ({j.status})
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted mt-1" style={{ display: 'block', marginTop: '4px' }}>Hold Ctrl/Cmd to select multiple dependencies. Job will not run until parents complete successfully.</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Payload Data (JSON Object)</label>
            <textarea
              className="form-input w-full font-mono text-xs"
              style={{ height: '110px', resize: 'vertical' }}
              value={newJobPayload}
              onChange={(e) => setNewJobPayload(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-4" style={{ marginTop: '16px' }}>
            Enqueue Job Context
          </button>
        </form>
      </Modal>
    </div>
  );
}
