import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '../src/database/connection';
import { runMigrations } from '../src/database/migrations';
import { jobService } from '../src/services/job.service';
import { queueService } from '../src/services/queue.service';
import { projectService } from '../src/services/project.service';
import { organizationService } from '../src/services/organization.service';

import { authService } from '../src/services/auth.service';

describe('Queue-Level Rate Limiting', () => {
  let projectId: string;
  let queueId: string;
  const workerId = 'test-worker-1';

  beforeEach(() => {
    resetDb(':memory:');
    runMigrations();
    const { user } = authService.register('test@test.com', 'password123', 'Test User');
    const org = organizationService.create('E2E Org', user.id);
    const project = projectService.create(org.id, 'E2E Project');
    projectId = project.id;
  });

  it('should restrict claiming when the execution rate limit threshold is crossed within the window', () => {
    // 1. Create a queue with a rate limit of 2 jobs per 10 seconds
    const queue = queueService.create(projectId, {
      name: 'rate-limited-queue',
      concurrency_limit: 5,
      rate_limit_count: 2,
      rate_limit_window_seconds: 10,
    });
    queueId = queue.id;

    // 2. Create 3 immediate jobs
    const j1 = jobService.create({ queue_id: queueId, name: 'job-1' });
    const j2 = jobService.create({ queue_id: queueId, name: 'job-2' });
    const j3 = jobService.create({ queue_id: queueId, name: 'job-3' });

    // 3. Claim job 1 and start execution
    const claim1 = jobService.claimJob(queueId, workerId);
    expect(claim1).not.toBeNull();
    jobService.startExecution(claim1!.id, workerId);

    // 4. Claim job 2 and start execution (total 2 executions in window)
    const claim2 = jobService.claimJob(queueId, workerId);
    expect(claim2).not.toBeNull();
    jobService.startExecution(claim2!.id, workerId);

    // 5. Attempt to claim job 3 — should return NULL because 2 jobs have executed in the 10s window
    const claim3 = jobService.claimJob(queueId, workerId);
    expect(claim3).toBeNull();
  });
});
