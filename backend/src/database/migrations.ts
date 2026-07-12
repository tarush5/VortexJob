import { getDb } from './connection';
import { createLogger } from '../utils/logger';

const log = createLogger('Migrations');

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS organization_members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);

CREATE TABLE IF NOT EXISTS retry_policies (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  strategy TEXT NOT NULL DEFAULT 'exponential',
  max_retries INTEGER NOT NULL DEFAULT 3,
  initial_delay_ms INTEGER NOT NULL DEFAULT 1000,
  backoff_factor REAL NOT NULL DEFAULT 2.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_retry_policies_project ON retry_policies(project_id);

CREATE TABLE IF NOT EXISTS queues (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 0,
  concurrency_limit INTEGER NOT NULL DEFAULT 10,
  retry_policy_id TEXT REFERENCES retry_policies(id) ON DELETE SET NULL,
  is_paused INTEGER NOT NULL DEFAULT 0,
  rate_limit_count INTEGER,
  rate_limit_window_seconds INTEGER,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, name)
);
CREATE INDEX IF NOT EXISTS idx_queues_project ON queues(project_id);

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  total_jobs INTEGER NOT NULL DEFAULT 0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  failed_jobs INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_batches_project ON batches(project_id);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued',
  priority INTEGER NOT NULL DEFAULT 0,
  run_at TEXT NOT NULL DEFAULT (datetime('now')),
  cron_expression TEXT,
  batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  retry_policy_id TEXT REFERENCES retry_policies(id) ON DELETE SET NULL,
  locked_by_worker_id TEXT,
  locked_at TEXT,
  completed_at TEXT,
  failed_at TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_jobs_claim ON jobs(status, run_at, priority);
CREATE INDEX IF NOT EXISTS idx_jobs_queue_status ON jobs(queue_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_batch ON jobs(batch_id);
CREATE INDEX IF NOT EXISTS idx_jobs_cron ON jobs(cron_expression) WHERE cron_expression IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_locked_worker ON jobs(locked_by_worker_id) WHERE locked_by_worker_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS job_executions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'running',
  error_message TEXT,
  duration_ms INTEGER,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_executions_job ON job_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_executions_worker ON job_executions(worker_id);

CREATE TABLE IF NOT EXISTS job_logs (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  execution_id TEXT REFERENCES job_executions(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_logs_job ON job_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_logs_execution ON job_logs(execution_id);

CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hostname TEXT NOT NULL DEFAULT '',
  pid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  queues TEXT NOT NULL DEFAULT '[]',
  concurrency INTEGER NOT NULL DEFAULT 5,
  last_heartbeat_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  stopped_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);

CREATE TABLE IF NOT EXISTS worker_heartbeats (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  active_jobs INTEGER NOT NULL DEFAULT 0,
  cpu_usage REAL,
  memory_mb REAL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_heartbeats_worker ON worker_heartbeats(worker_id);

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id TEXT PRIMARY KEY,
  original_job_id TEXT NOT NULL REFERENCES jobs(id),
  queue_id TEXT NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
  payload TEXT NOT NULL DEFAULT '{}',
  error_message TEXT NOT NULL DEFAULT '',
  retry_count INTEGER NOT NULL DEFAULT 0,
  failed_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved INTEGER NOT NULL DEFAULT 0,
  resolved_at TEXT,
  resolution TEXT
);
CREATE INDEX IF NOT EXISTS idx_dlq_queue ON dead_letter_queue(queue_id);
CREATE INDEX IF NOT EXISTS idx_dlq_resolved ON dead_letter_queue(resolved);

CREATE TABLE IF NOT EXISTS job_dependencies (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  depends_on_job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(job_id, depends_on_job_id)
);
CREATE INDEX IF NOT EXISTS idx_dependencies_job ON job_dependencies(job_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_parent ON job_dependencies(depends_on_job_id);

CREATE INDEX IF NOT EXISTS idx_jobs_completed_at ON jobs(queue_id, status, completed_at);
CREATE INDEX IF NOT EXISTS idx_jobs_cron_status ON jobs(cron_expression, status) WHERE cron_expression IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dlq_original_job ON dead_letter_queue(original_job_id);
CREATE INDEX IF NOT EXISTS idx_heartbeats_ts ON worker_heartbeats(worker_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_workers_heartbeat ON workers(status, last_heartbeat_at);
`;

export function runMigrations(): void {
  const db = getDb();
  log.info('Running database migrations...');
  db.exec(SCHEMA_SQL);
  log.info('Migrations completed successfully');
}
