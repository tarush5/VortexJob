export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  api_key: string;
}

export interface Queue {
  id: string;
  project_id: string;
  name: string;
  description: string;
  priority: number;
  concurrency_limit: number;
  is_paused: number;
  rate_limit_count: number | null;
  rate_limit_window_seconds: number | null;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface QueueStats {
  queue_id: string;
  queue_name: string;
  total_jobs: number;
  queued: number;
  scheduled: number;
  claimed: number;
  running: number;
  completed: number;
  failed: number;
  dead: number;
  avg_duration_ms: number | null;
  throughput_last_hour: number;
}

export interface Job {
  id: string;
  queue_id: string;
  name: string;
  payload: string;
  status: string;
  priority: number;
  run_at: string;
  cron_expression: string | null;
  batch_id: string | null;
  retry_count: number;
  max_retries: number;
  locked_by_worker_id: string | null;
  locked_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobExecution {
  id: string;
  job_id: string;
  worker_id: string;
  attempt_number: number;
  status: string;
  error_message: string | null;
  duration_ms: number | null;
  started_at: string;
  finished_at: string | null;
}

export interface JobLog {
  id: string;
  job_id: string;
  execution_id: string | null;
  level: string;
  message: string;
  metadata: string | null;
  timestamp: string;
}

export interface WorkerInfo {
  id: string;
  name: string;
  hostname: string;
  pid: number;
  status: string;
  queues: string;
  concurrency: number;
  last_heartbeat_at: string;
  started_at: string;
  stopped_at: string | null;
}

export interface DLQEntry {
  id: string;
  original_job_id: string;
  queue_id: string;
  payload: string;
  error_message: string;
  retry_count: number;
  failed_at: string;
  resolved: number;
  resolved_at: string | null;
  resolution: string | null;
}

export interface DashboardStats {
  total_jobs: number;
  active_workers: number;
  success_rate: number;
  avg_duration_ms: number;
  throughput_per_hour: { hour: string; count: number }[];
  status_breakdown: Record<string, number>;
  queue_breakdown: { queue_id: string; queue_name: string; total_jobs: number; active_jobs: number }[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
