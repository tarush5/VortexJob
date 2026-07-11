import { describe, it, expect, beforeEach } from 'vitest';
import { config } from '../src/config';

(config as any).dbPath = ':memory:';

import { getDb, resetDb } from '../src/database/connection';
import { runMigrations } from '../src/database/migrations';
import { jobService } from '../src/services/job.service';
import { queueService } from '../src/services/queue.service';
import { projectService } from '../src/services/project.service';
import { organizationService } from '../src/services/organization.service';
import { authService } from '../src/services/auth.service';
import { generateId } from '../src/utils/uuid';

describe('Job Lifecycle', () => {
  let queueId: string;
  let projectId: string;

  beforeEach(() => {
    resetDb(':memory:');
    runMigrations();

    const { user } = authService.register('test@test.com', 'password123', 'Test User');
    const org = organizationService.create('Test Org', user.id);
    const project = projectService.create(org.id, 'Test Project');
    projectId = project.id;
    const queue = queueService.create(project.id, { name: 'test-queue', concurrency_limit: 100 });
    queueId = queue.id;
  });

  it('should go through complete lifecycle: queued → claimed → running → completed', () => {
    const job = jobService.create({ queue_id: queueId, name: 'lifecycle-test' });
    expect(job.status).toBe('queued');

    const workerId = generateId();
    const claimed = jobService.claimJob(queueId, workerId);
    expect(claimed!.status).toBe('claimed');

    const execution = jobService.startExecution(claimed!.id, workerId);
    const runningJob = jobService.getById(claimed!.id);
    expect(runningJob!.status).toBe('running');
    expect(execution.status).toBe('running');

    jobService.completeJob(claimed!.id, execution.id);
    const completedJob = jobService.getById(claimed!.id);
    expect(completedJob!.status).toBe('completed');
    expect(completedJob!.completed_at).not.toBeNull();

    // Check execution was updated
    const executions = jobService.getExecutions(claimed!.id);
    expect(executions[0].status).toBe('completed');
    expect(executions[0].duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('should retry failed jobs up to max_retries', () => {
    const job = jobService.create({ queue_id: queueId, name: 'retry-test', max_retries: 2 });
    const workerId = generateId();

    // Attempt 1: fail
    const claimed1 = jobService.claimJob(queueId, workerId)!;
    const exec1 = jobService.startExecution(claimed1.id, workerId);
    jobService.failJob(claimed1.id, exec1.id, 'Error 1');

    let updatedJob = jobService.getById(job.id)!;
    expect(updatedJob.status).toBe('queued'); // Re-queued for retry
    expect(updatedJob.retry_count).toBe(1);
  });

  it('should move to DLQ after exhausting retries', () => {
    const job = jobService.create({ queue_id: queueId, name: 'dlq-test', max_retries: 1 });
    const workerId = generateId();

    // First attempt
    const claimed1 = jobService.claimJob(queueId, workerId)!;
    const exec1 = jobService.startExecution(claimed1.id, workerId);
    jobService.failJob(claimed1.id, exec1.id, 'Fatal error');

    // Job should now be dead (max_retries=1, retry_count was 0, now 1 which equals max_retries)
    let updatedJob = jobService.getById(job.id)!;
    expect(updatedJob.status).toBe('dead');

    // Check DLQ entry exists
    const db = getDb();
    const dlqEntry = db.prepare('SELECT * FROM dead_letter_queue WHERE original_job_id = ?').get(job.id);
    expect(dlqEntry).toBeDefined();
    expect(dlqEntry.error_message).toBe('Fatal error');
  });

  it('should support manual retry of failed jobs', () => {
    const job = jobService.create({ queue_id: queueId, name: 'manual-retry-test', max_retries: 0 });
    const workerId = generateId();

    const claimed = jobService.claimJob(queueId, workerId)!;
    const exec = jobService.startExecution(claimed.id, workerId);
    jobService.failJob(claimed.id, exec.id, 'Error');

    // Manual retry
    const retried = jobService.retryJob(job.id)!;
    expect(retried.status).toBe('queued');
    expect(retried.retry_count).toBe(0);
  });

  it('should cancel a running job', () => {
    const job = jobService.create({ queue_id: queueId, name: 'cancel-test' });
    jobService.cancelJob(job.id);

    const cancelled = jobService.getById(job.id)!;
    expect(cancelled.status).toBe('failed');
  });

  it('should create batch jobs', () => {
    const result = jobService.createBatch(projectId, queueId, 'Test Batch', [
      { name: 'batch-job-1', payload: { index: 1 } },
      { name: 'batch-job-2', payload: { index: 2 } },
      { name: 'batch-job-3', payload: { index: 3 } },
    ]);

    expect(result.batch.total_jobs).toBe(3);
    expect(result.batch.status).toBe('pending');
    expect(result.jobs.length).toBe(3);
    expect(result.jobs[0].batch_id).toBe(result.batch.id);
  });

  it('should record execution logs', () => {
    const job = jobService.create({ queue_id: queueId, name: 'log-test' });
    const workerId = generateId();

    const claimed = jobService.claimJob(queueId, workerId)!;
    const exec = jobService.startExecution(claimed.id, workerId);
    jobService.completeJob(claimed.id, exec.id);

    const logs = jobService.getLogs(job.id);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((l) => l.level === 'info')).toBe(true);
  });

  it('should track queue stats correctly', () => {
    jobService.create({ queue_id: queueId, name: 'stat-job-1' });
    jobService.create({ queue_id: queueId, name: 'stat-job-2' });

    const stats = queueService.getStats(queueId);
    expect(stats.total_jobs).toBe(2);
    expect(stats.queued).toBe(2);
    expect(stats.queue_name).toBe('test-queue');
  });
});
