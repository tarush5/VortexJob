export type JobStatus = 'queued' | 'scheduled' | 'claimed' | 'running' | 'completed' | 'failed' | 'dead';
export type RetryStrategy = 'fixed' | 'linear' | 'exponential';
export type JobType = 'immediate' | 'delayed' | 'scheduled' | 'cron' | 'batch';
export type WorkerStatus = 'active' | 'draining' | 'inactive';
export type OrgRole = 'admin' | 'member';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type DLQResolution = 'retry' | 'ignore';
export type ExecutionStatus = 'running' | 'completed' | 'failed';
export type BatchStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  api_key: string;
  created_at: string;
  updated_at: string;
}

export interface RetryPolicy {
  id: string;
  project_id: string;
  name: string;
  strategy: RetryStrategy;
  max_retries: number;
  initial_delay_ms: number;
  backoff_factor: number;
  created_at: string;
  updated_at: string;
}

export interface Queue {
  id: string;
  project_id: string;
  name: string;
  description: string;
  priority: number;
  concurrency_limit: number;
  retry_policy_id: string | null;
  is_paused: number;
  rate_limit_count: number | null;
  rate_limit_window_seconds: number | null;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  queue_id: string;
  name: string;
  payload: string;
  status: JobStatus;
  priority: number;
  run_at: string;
  cron_expression: string | null;
  batch_id: string | null;
  retry_count: number;
  max_retries: number;
  retry_policy_id: string | null;
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
  worker_id: string | null;
  attempt_number: number;
  status: ExecutionStatus;
  error_message: string | null;
  duration_ms: number | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
}

export interface JobLog {
  id: string;
  job_id: string;
  execution_id: string | null;
  level: LogLevel;
  message: string;
  metadata: string | null;
  timestamp: string;
}

export interface Worker {
  id: string;
  name: string;
  hostname: string;
  pid: number;
  status: WorkerStatus;
  queues: string;
  concurrency: number;
  last_heartbeat_at: string;
  started_at: string;
  stopped_at: string | null;
}

export interface WorkerHeartbeat {
  id: string;
  worker_id: string;
  active_jobs: number;
  cpu_usage: number | null;
  memory_mb: number | null;
  timestamp: string;
}

export interface DeadLetterEntry {
  id: string;
  original_job_id: string;
  queue_id: string;
  payload: string;
  error_message: string;
  retry_count: number;
  failed_at: string;
  resolved: number;
  resolved_at: string | null;
  resolution: DLQResolution | null;
}

export interface Batch {
  id: string;
  project_id: string;
  name: string;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  status: BatchStatus;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: { message: string; code: string };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
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
