import { getDb } from '../database/connection';
import { generateId } from '../utils/uuid';
import { Job, JobExecution, JobLog, Batch, RetryPolicy } from '../types';
import { retryService } from './retry.service';
import { createLogger } from '../utils/logger';

const log = createLogger('JobService');

export class JobService {
  create(data: {
    queue_id: string; name: string; payload?: any; type?: string;
    run_at?: string; cron_expression?: string; priority?: number;
    max_retries?: number; idempotency_key?: string; retry_policy_id?: string;
    depends_on?: string[];
  }): Job {
    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();
    let status: string = 'queued';
    let runAt = data.run_at || now;

    if (data.type === 'delayed' || data.type === 'scheduled') {
      status = 'scheduled';
    }
    if (data.type === 'cron' && data.cron_expression) {
      status = 'scheduled';
      // Calculate next run from cron
      try {
        const cronParser = require('cron-parser');
        const interval = cronParser.parseExpression(data.cron_expression);
        runAt = interval.next().toISOString();
      } catch {
        // Keep current run_at if parsing fails
      }
    }

    // Check idempotency
    if (data.idempotency_key) {
      const existing = db.prepare('SELECT * FROM jobs WHERE idempotency_key = ?').get(data.idempotency_key) as Job | undefined;
      if (existing) return existing;
    }

    const maxRetries = data.max_retries ?? 3;

    const txn = db.transaction(() => {
      db.prepare(
        `INSERT INTO jobs (id, queue_id, name, payload, status, priority, run_at, cron_expression, batch_id, retry_count, max_retries, retry_policy_id, idempotency_key, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?, ?, ?, ?)`
      ).run(
        id, data.queue_id, data.name, JSON.stringify(data.payload || {}),
        status, data.priority || 0, runAt, data.cron_expression || null,
        maxRetries, data.retry_policy_id || null, data.idempotency_key || null, now, now
      );

      if (data.depends_on && data.depends_on.length > 0) {
        const insertDep = db.prepare('INSERT INTO job_dependencies (id, job_id, depends_on_job_id) VALUES (?, ?, ?)');
        for (const parentId of data.depends_on) {
          insertDep.run(generateId(), id, parentId);
        }
      }
    });
    txn();

    log.info(`Job created: ${id} (${data.name}) in queue ${data.queue_id}`);
    return db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Job;
  }

  createBatch(projectId: string, queueId: string, batchName: string, jobsData: Array<{ name: string; payload?: any; priority?: number; max_retries?: number }>): { batch: Batch; jobs: Job[] } {
    const db = getDb();
    const batchId = generateId();
    const now = new Date().toISOString();

    const txn = db.transaction(() => {
      db.prepare(
        'INSERT INTO batches (id, project_id, name, total_jobs, completed_jobs, failed_jobs, status, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?)'
      ).run(batchId, projectId, batchName, jobsData.length, 'pending', now, now);

      const insertJob = db.prepare(
        `INSERT INTO jobs (id, queue_id, name, payload, status, priority, run_at, batch_id, retry_count, max_retries, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'queued', ?, ?, ?, 0, ?, ?, ?)`
      );

      const jobs: Job[] = [];
      for (const jd of jobsData) {
        const jobId = generateId();
        insertJob.run(jobId, queueId, jd.name, JSON.stringify(jd.payload || {}), jd.priority || 0, now, batchId, jd.max_retries ?? 3, now, now);
        jobs.push(db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as Job);
      }
      return jobs;
    });

    const jobs = txn();
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId) as Batch;
    return { batch, jobs };
  }

  listByQueue(queueId: string, options: { status?: string; page?: number; limit?: number; search?: string }): { jobs: Job[]; total: number } {
    const db = getDb();
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    let where = 'WHERE queue_id = ?';
    const params: any[] = [queueId];

    if (options.status) {
      where += ' AND status = ?';
      params.push(options.status);
    }
    if (options.search) {
      where += ' AND (name LIKE ? OR id LIKE ?)';
      params.push(`%${options.search}%`, `%${options.search}%`);
    }

    const total = (db.prepare(`SELECT COUNT(*) as count FROM jobs ${where}`).get(...params) as { count: number }).count;
    const jobs = db.prepare(`SELECT * FROM jobs ${where} ORDER BY priority DESC, created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as Job[];
    return { jobs, total };
  }

  getById(id: string): Job | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Job | undefined;
  }

  getExecutions(jobId: string): JobExecution[] {
    const db = getDb();
    return db.prepare('SELECT * FROM job_executions WHERE job_id = ? ORDER BY attempt_number DESC').all(jobId) as JobExecution[];
  }

  getLogs(jobId: string): JobLog[] {
    const db = getDb();
    return db.prepare('SELECT * FROM job_logs WHERE job_id = ? ORDER BY timestamp ASC').all(jobId) as JobLog[];
  }

  addLog(jobId: string, executionId: string | null, level: string, message: string, metadata?: any): void {
    const db = getDb();
    const id = generateId();
    db.prepare(
      'INSERT INTO job_logs (id, job_id, execution_id, level, message, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, jobId, executionId, level, message, metadata ? JSON.stringify(metadata) : null, new Date().toISOString());
  }

  /**
   * Atomically claim a job from a specific queue.
   * Uses BEGIN IMMEDIATE to prevent race conditions in SQLite.
   */
  claimJob(queueId: string, workerId: string): Job | null {
    const db = getDb();
    const now = new Date().toISOString();

    // Check if queue is paused or has rate limits
    const queue = db.prepare('SELECT is_paused, concurrency_limit, rate_limit_count, rate_limit_window_seconds FROM queues WHERE id = ?').get(queueId) as {
      is_paused: number;
      concurrency_limit: number;
      rate_limit_count: number | null;
      rate_limit_window_seconds: number | null;
    } | undefined;
    if (!queue || queue.is_paused) return null;

    // Check concurrency limit
    const runningCount = (db.prepare(
      `SELECT COUNT(*) as count FROM jobs WHERE queue_id = ? AND status IN ('claimed', 'running')`
    ).get(queueId) as { count: number }).count;
    if (runningCount >= queue.concurrency_limit) return null;

    // Check rate limiting window
    if (queue.rate_limit_count != null && queue.rate_limit_window_seconds != null) {
      const windowStart = new Date(Date.now() - queue.rate_limit_window_seconds * 1000).toISOString();
      const countInWindow = (db.prepare(
        `SELECT COUNT(*) as count FROM job_executions ex
         JOIN jobs j ON ex.job_id = j.id
         WHERE j.queue_id = ? AND ex.started_at >= ?`
      ).get(queueId, windowStart) as { count: number }).count;

      if (countInWindow >= queue.rate_limit_count) {
        return null; // Rate limit exceeded
      }
    }

    // Atomic claim using transaction
    const claim = db.transaction(() => {
      const candidate = db.prepare(
        `SELECT id FROM jobs
         WHERE queue_id = ? AND status IN ('queued', 'scheduled') AND run_at <= ?
           AND NOT EXISTS (
             SELECT 1 FROM job_dependencies jd
             JOIN jobs parent ON jd.depends_on_job_id = parent.id
             WHERE jd.job_id = jobs.id AND parent.status != 'completed'
           )
         ORDER BY priority DESC, run_at ASC, id ASC
         LIMIT 1`
      ).get(queueId, now) as { id: string } | undefined;

      if (!candidate) return null;

      db.prepare(
        `UPDATE jobs SET status = 'claimed', locked_by_worker_id = ?, locked_at = ?, updated_at = ? WHERE id = ?`
      ).run(workerId, now, now, candidate.id);

      return db.prepare('SELECT * FROM jobs WHERE id = ?').get(candidate.id) as Job;
    });

    return claim();
  }

  /**
   * Mark a job as running and create an execution record.
   */
  startExecution(jobId: string, workerId: string): JobExecution {
    const db = getDb();
    const now = new Date().toISOString();
    const job = this.getById(jobId);
    if (!job) throw new Error('Job not found');

    const executionId = generateId();
    const attemptNumber = job.retry_count + 1;

    const txn = db.transaction(() => {
      db.prepare(`UPDATE jobs SET status = 'running', updated_at = ? WHERE id = ?`).run(now, jobId);
      db.prepare(
        `INSERT INTO job_executions (id, job_id, worker_id, attempt_number, status, started_at, created_at) VALUES (?, ?, ?, ?, 'running', ?, ?)`
      ).run(executionId, jobId, workerId, attemptNumber, now, now);
    });
    txn();

    this.addLog(jobId, executionId, 'info', `Job execution started (attempt ${attemptNumber})`, { workerId });
    return db.prepare('SELECT * FROM job_executions WHERE id = ?').get(executionId) as JobExecution;
  }

  /**
   * Complete a job execution successfully.
   */
  completeJob(jobId: string, executionId: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    const execution = db.prepare('SELECT * FROM job_executions WHERE id = ?').get(executionId) as JobExecution | undefined;
    const durationMs = execution ? new Date(now).getTime() - new Date(execution.started_at).getTime() : 0;

    const txn = db.transaction(() => {
      db.prepare(`UPDATE jobs SET status = 'completed', completed_at = ?, locked_by_worker_id = NULL, locked_at = NULL, updated_at = ? WHERE id = ?`).run(now, now, jobId);
      db.prepare(`UPDATE job_executions SET status = 'completed', finished_at = ?, duration_ms = ? WHERE id = ?`).run(now, durationMs, executionId);

      // Update batch counters if applicable
      const job = db.prepare('SELECT batch_id FROM jobs WHERE id = ?').get(jobId) as { batch_id: string | null };
      if (job.batch_id) {
        db.prepare('UPDATE batches SET completed_jobs = completed_jobs + 1, updated_at = ? WHERE id = ?').run(now, job.batch_id);
        this.updateBatchStatus(job.batch_id);
      }
    });
    txn();

    this.addLog(jobId, executionId, 'info', `Job completed successfully in ${durationMs}ms`);
  }

  /**
   * Fail a job execution. If retries remain, re-queue it. Otherwise, move to DLQ.
   */
  failJob(jobId: string, executionId: string, errorMessage: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    const job = this.getById(jobId);
    if (!job) return;

    const execution = db.prepare('SELECT * FROM job_executions WHERE id = ?').get(executionId) as JobExecution | undefined;
    const durationMs = execution ? new Date(now).getTime() - new Date(execution.started_at).getTime() : 0;

    db.prepare(`UPDATE job_executions SET status = 'failed', error_message = ?, finished_at = ?, duration_ms = ? WHERE id = ?`).run(errorMessage, now, durationMs, executionId);
    this.addLog(jobId, executionId, 'error', `Job failed: ${errorMessage}`);

    const newRetryCount = job.retry_count + 1;

    if (newRetryCount < job.max_retries) {
      // Re-queue with backoff
      let strategy: any = 'exponential';
      let initialDelayMs = 1000;
      let backoffFactor = 2;

      // Load retry policy if exists
      const policyId = job.retry_policy_id;
      if (policyId) {
        const policy = db.prepare('SELECT * FROM retry_policies WHERE id = ?').get(policyId) as RetryPolicy | undefined;
        if (policy) {
          strategy = policy.strategy;
          initialDelayMs = policy.initial_delay_ms;
          backoffFactor = policy.backoff_factor;
        }
      }

      const nextRunAt = retryService.calculateNextRunAt(strategy, newRetryCount, initialDelayMs, backoffFactor);

      db.prepare(
        `UPDATE jobs SET status = 'queued', retry_count = ?, run_at = ?, failed_at = ?, locked_by_worker_id = NULL, locked_at = NULL, updated_at = ? WHERE id = ?`
      ).run(newRetryCount, nextRunAt, now, now, jobId);

      this.addLog(jobId, executionId, 'warn', `Job scheduled for retry ${newRetryCount}/${job.max_retries} at ${nextRunAt}`);
    } else {
      // Move to DLQ
      const dlqId = generateId();
      const txn = db.transaction(() => {
        db.prepare(`UPDATE jobs SET status = 'dead', failed_at = ?, locked_by_worker_id = NULL, locked_at = NULL, updated_at = ? WHERE id = ?`).run(now, now, jobId);
        db.prepare(
          `INSERT INTO dead_letter_queue (id, original_job_id, queue_id, payload, error_message, retry_count, failed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(dlqId, jobId, job.queue_id, job.payload, errorMessage, newRetryCount, now);

        // Update batch counters
        if (job.batch_id) {
          db.prepare('UPDATE batches SET failed_jobs = failed_jobs + 1, updated_at = ? WHERE id = ?').run(now, job.batch_id);
          this.updateBatchStatus(job.batch_id);
        }
      });
      txn();

      this.addLog(jobId, null, 'error', `Job moved to Dead Letter Queue after ${newRetryCount} attempts`);
    }
  }

  retryJob(jobId: string): Job | undefined {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE jobs SET status = 'queued', retry_count = 0, run_at = ?, locked_by_worker_id = NULL, locked_at = NULL, failed_at = NULL, completed_at = NULL, updated_at = ? WHERE id = ?`
    ).run(now, now, jobId);
    this.addLog(jobId, null, 'info', 'Job manually retried');
    return this.getById(jobId);
  }

  cancelJob(jobId: string): Job | undefined {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE jobs SET status = 'failed', failed_at = ?, locked_by_worker_id = NULL, locked_at = NULL, updated_at = ? WHERE id = ? AND status NOT IN ('completed', 'dead')`
    ).run(now, now, jobId);
    this.addLog(jobId, null, 'warn', 'Job cancelled by user');
    return this.getById(jobId);
  }

  private updateBatchStatus(batchId: string): void {
    const db = getDb();
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId) as Batch | undefined;
    if (!batch) return;
    const done = batch.completed_jobs + batch.failed_jobs;
    let newStatus = batch.status;
    if (done >= batch.total_jobs) {
      newStatus = batch.failed_jobs > 0 ? 'failed' : 'completed';
    } else if (done > 0) {
      newStatus = 'running';
    }
    if (newStatus !== batch.status) {
      db.prepare('UPDATE batches SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, new Date().toISOString(), batchId);
    }
  }

  addDependency(jobId: string, dependsOnJobId: string): void {
    const db = getDb();
    const id = generateId();
    db.prepare(
      'INSERT INTO job_dependencies (id, job_id, depends_on_job_id) VALUES (?, ?, ?)'
    ).run(id, jobId, dependsOnJobId);
  }

  getDependencies(jobId: string): { id: string; name: string; status: string }[] {
    const db = getDb();
    return db.prepare(
      `SELECT j.id, j.name, j.status FROM job_dependencies jd
       JOIN jobs j ON jd.depends_on_job_id = j.id
       WHERE jd.job_id = ?`
    ).all(jobId) as { id: string; name: string; status: string }[];
  }
}

export const jobService = new JobService();
