import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { config } from '../src/config';

// Override DB to use in-memory for tests
(config as any).dbPath = ':memory:';

import { getDb, resetDb } from '../src/database/connection';
import { runMigrations } from '../src/database/migrations';
import { jobService } from '../src/services/job.service';
import { queueService } from '../src/services/queue.service';
import { projectService } from '../src/services/project.service';
import { organizationService } from '../src/services/organization.service';
import { authService } from '../src/services/auth.service';
import { workerService } from '../src/services/worker.service';
import { generateId } from '../src/utils/uuid';

describe('Atomic Job Claiming', () => {
  let queueId: string;
  let projectId: string;

  beforeEach(() => {
    resetDb(':memory:');
    runMigrations();

    // Setup: create user, org, project, queue
    const { user } = authService.register('test@test.com', 'password123', 'Test User');
    const org = organizationService.create('Test Org', user.id);
    const project = projectService.create(org.id, 'Test Project');
    projectId = project.id;
    const queue = queueService.create(project.id, { name: 'test-queue', concurrency_limit: 100 });
    queueId = queue.id;
  });

  it('should claim a single job atomically', () => {
    const job = jobService.create({ queue_id: queueId, name: 'test-job', payload: { key: 'value' } });
    const workerId = generateId();

    const claimed = jobService.claimJob(queueId, workerId);
    expect(claimed).not.toBeNull();
    expect(claimed!.id).toBe(job.id);
    expect(claimed!.status).toBe('claimed');
    expect(claimed!.locked_by_worker_id).toBe(workerId);
  });

  it('should not allow two workers to claim the same job', () => {
    jobService.create({ queue_id: queueId, name: 'test-job' });

    const worker1 = generateId();
    const worker2 = generateId();

    const claim1 = jobService.claimJob(queueId, worker1);
    const claim2 = jobService.claimJob(queueId, worker2);

    expect(claim1).not.toBeNull();
    expect(claim2).toBeNull(); // No more jobs to claim
  });

  it('should claim jobs in priority order (highest first)', () => {
    jobService.create({ queue_id: queueId, name: 'low-priority', priority: 1 });
    jobService.create({ queue_id: queueId, name: 'high-priority', priority: 10 });
    jobService.create({ queue_id: queueId, name: 'medium-priority', priority: 5 });

    const workerId = generateId();

    const first = jobService.claimJob(queueId, workerId);
    expect(first!.name).toBe('high-priority');

    const second = jobService.claimJob(queueId, workerId);
    expect(second!.name).toBe('medium-priority');

    const third = jobService.claimJob(queueId, workerId);
    expect(third!.name).toBe('low-priority');
  });

  it('should not claim jobs from a paused queue', () => {
    jobService.create({ queue_id: queueId, name: 'test-job' });
    queueService.pause(queueId);

    const workerId = generateId();
    const claimed = jobService.claimJob(queueId, workerId);
    expect(claimed).toBeNull();
  });

  it('should respect concurrency limits', () => {
    // Set concurrency to 2
    queueService.update(queueId, { concurrency_limit: 2 });

    jobService.create({ queue_id: queueId, name: 'job-1' });
    jobService.create({ queue_id: queueId, name: 'job-2' });
    jobService.create({ queue_id: queueId, name: 'job-3' });

    const w1 = generateId();
    const w2 = generateId();
    const w3 = generateId();

    const claim1 = jobService.claimJob(queueId, w1);
    const claim2 = jobService.claimJob(queueId, w2);
    const claim3 = jobService.claimJob(queueId, w3);

    expect(claim1).not.toBeNull();
    expect(claim2).not.toBeNull();
    expect(claim3).toBeNull(); // Concurrency limit reached
  });

  it('should not claim scheduled jobs whose run_at is in the future', () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    jobService.create({ queue_id: queueId, name: 'future-job', type: 'scheduled', run_at: futureDate });

    const workerId = generateId();
    const claimed = jobService.claimJob(queueId, workerId);
    expect(claimed).toBeNull();
  });

  it('should support idempotent job creation', () => {
    const job1 = jobService.create({ queue_id: queueId, name: 'idempotent-job', idempotency_key: 'unique-key-123' });
    const job2 = jobService.create({ queue_id: queueId, name: 'idempotent-job', idempotency_key: 'unique-key-123' });

    expect(job1.id).toBe(job2.id); // Same job returned
  });
});
