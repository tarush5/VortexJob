import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, resetDb } from '../src/database/connection';
import { runMigrations } from '../src/database/migrations';
import { jobService } from '../src/services/job.service';
import { queueService } from '../src/services/queue.service';
import { projectService } from '../src/services/project.service';
import { organizationService } from '../src/services/organization.service';

import { authService } from '../src/services/auth.service';

describe('Job Workflow Dependencies (DAG)', () => {
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
    const queue = queueService.create(projectId, { name: 'test-queue', concurrency_limit: 5 });
    queueId = queue.id;
  });

  it('should not claim a child job until its parent job completes successfully', () => {
    // 1. Create parent job
    const parentJob = jobService.create({
      queue_id: queueId,
      name: 'parent-task',
      type: 'immediate',
    });

    // 2. Create child job depending on parent
    const childJob = jobService.create({
      queue_id: queueId,
      name: 'child-task',
      type: 'immediate',
      depends_on: [parentJob.id],
    });

    // 3. Attempt to claim child job first — should return NULL or parent first
    const firstClaim = jobService.claimJob(queueId, workerId);
    expect(firstClaim).not.toBeNull();
    expect(firstClaim!.id).toBe(parentJob.id); // Parent should be claimed first

    // 4. Try claiming again (parent is claimed/running, not completed) — should return NULL (child cannot run yet)
    const secondClaim = jobService.claimJob(queueId, workerId);
    expect(secondClaim).toBeNull();

    // 5. Complete parent job
    const execution = jobService.startExecution(parentJob.id, workerId);
    jobService.completeJob(parentJob.id, execution.id);

    // 6. Try claiming again — now child should be claimed!
    const thirdClaim = jobService.claimJob(queueId, workerId);
    expect(thirdClaim).not.toBeNull();
    expect(thirdClaim!.id).toBe(childJob.id);
  });

  it('should support checking multiple parent dependencies', () => {
    const parent1 = jobService.create({ queue_id: queueId, name: 'p1', priority: 10 });
    const parent2 = jobService.create({ queue_id: queueId, name: 'p2', priority: 5 });
    const child = jobService.create({
      queue_id: queueId,
      name: 'child',
      depends_on: [parent1.id, parent2.id],
    });

    // Claim parent 1
    const c1 = jobService.claimJob(queueId, workerId);
    expect(c1!.id).toBe(parent1.id);
    const ex1 = jobService.startExecution(parent1.id, workerId);
    jobService.completeJob(parent1.id, ex1.id);

    // Child still cannot run because parent 2 is not completed
    const c2 = jobService.claimJob(queueId, workerId);
    expect(c2!.id).toBe(parent2.id); // Claims parent 2

    const c3 = jobService.claimJob(queueId, workerId);
    expect(c3).toBeNull(); // Child still waiting for parent 2 to complete

    // Complete parent 2
    const ex2 = jobService.startExecution(parent2.id, workerId);
    jobService.completeJob(parent2.id, ex2.id);

    // Now child is free
    const c4 = jobService.claimJob(queueId, workerId);
    expect(c4!.id).toBe(child.id);
  });
});
