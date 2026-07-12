import os from 'os';
import { config } from '../config';
import { runMigrations } from '../database/migrations';
import { getDb } from '../database/connection';
import { jobService } from '../services/job.service';
import { workerService } from '../services/worker.service';
import { createLogger } from '../utils/logger';
import { Worker, Queue } from '../types';

const log = createLogger('WorkerProcess');

// Initialize
runMigrations();

const WORKER_NAME = `worker-${process.pid}`;
let workerRecord: Worker | null = null;
let isShuttingDown = false;
const activeJobs = new Map<string, Promise<void>>();

// Exponential backoff state
let consecutiveEmptyPolls = 0;
const BASE_POLL_MS = 1000;
const BACKOFF_STEP_MS = 500;
const MAX_POLL_MS = 5000;

// Queue list cache
let cachedQueues: { id: string }[] = [];
let queueCacheExpiry = 0;
const QUEUE_CACHE_TTL_MS = 30000;

function getCurrentPollInterval(): number {
  return Math.min(BASE_POLL_MS + consecutiveEmptyPolls * BACKOFF_STEP_MS, MAX_POLL_MS);
}

async function start() {
  // Get all queues to poll (in a real system, this would be configurable)
  const db = getDb();
  const allQueues = db.prepare('SELECT id FROM queues').all() as { id: string }[];
  const queueIds = allQueues.map((q) => q.id);

  workerRecord = workerService.register(
    WORKER_NAME,
    os.hostname(),
    process.pid,
    queueIds,
    config.defaultConcurrency
  );

  log.info(`Worker started: ${WORKER_NAME} (${workerRecord.id}), polling ${queueIds.length} queues`);

  // Start heartbeat loop
  const heartbeatInterval = setInterval(() => {
    if (workerRecord) {
      workerService.heartbeat(workerRecord.id, activeJobs.size);
    }
  }, config.heartbeatIntervalMs);

  // Start polling loop with dynamic interval
  let pollTimeout: ReturnType<typeof setTimeout>;

  async function pollTick() {
    if (isShuttingDown) return;
    if (activeJobs.size >= config.defaultConcurrency) {
      pollTimeout = setTimeout(pollTick, getCurrentPollInterval());
      return;
    }

    // Refresh queue list from cache (only re-query every 30 seconds)
    const now = Date.now();
    if (now >= queueCacheExpiry) {
      cachedQueues = db.prepare(`SELECT id FROM queues WHERE is_paused = 0`).all() as { id: string }[];
      queueCacheExpiry = now + QUEUE_CACHE_TTL_MS;
    }

    let claimedAny = false;

    for (const queue of cachedQueues) {
      if (activeJobs.size >= config.defaultConcurrency) break;
      if (isShuttingDown) break;

      try {
        const job = jobService.claimJob(queue.id, workerRecord!.id);
        if (job) {
          claimedAny = true;
          log.info(`Claimed job: ${job.name} (${job.id})`);
          const promise = executeJob(job.id).finally(() => {
            activeJobs.delete(job.id);
          });
          activeJobs.set(job.id, promise);
        }
      } catch (err: any) {
        log.error(`Error claiming from queue ${queue.id}: ${err.message}`);
      }
    }

    // Exponential backoff: track consecutive empty polls
    if (claimedAny) {
      consecutiveEmptyPolls = 0;
    } else {
      consecutiveEmptyPolls++;
    }

    if (!isShuttingDown) {
      pollTimeout = setTimeout(pollTick, getCurrentPollInterval());
    }
  }

  // Kick off the first poll
  pollTimeout = setTimeout(pollTick, BASE_POLL_MS);

  // Graceful shutdown
  async function shutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    log.info(`Received ${signal}, starting graceful shutdown...`);

    if (workerRecord) {
      workerService.setDraining(workerRecord.id);
    }

    clearTimeout(pollTimeout);

    // Wait for active jobs to finish
    if (activeJobs.size > 0) {
      log.info(`Waiting for ${activeJobs.size} active jobs to complete...`);
      await Promise.allSettled(Array.from(activeJobs.values()));
    }

    clearInterval(heartbeatInterval);

    if (workerRecord) {
      workerService.setInactive(workerRecord.id);
    }

    log.info('Worker shut down complete');
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Simulate job execution.
 * In a real system, this would dispatch to actual job handlers.
 */
async function executeJob(jobId: string): Promise<void> {
  const execution = jobService.startExecution(jobId, workerRecord!.id);
  log.info(`Executing job ${jobId} (attempt ${execution.attempt_number})`);

  try {
    // Simulate work: random duration between 1-5 seconds
    const duration = Math.floor(Math.random() * 4000) + 1000;
    await new Promise((resolve) => setTimeout(resolve, duration));

    // Simulate ~80% success rate
    if (Math.random() < 0.2) {
      const errors = [
        'Connection timeout to external API',
        'Rate limit exceeded',
        'Invalid response format from upstream service',
        'Memory allocation failed during processing',
        'Database deadlock detected',
      ];
      throw new Error(errors[Math.floor(Math.random() * errors.length)]);
    }

    jobService.completeJob(jobId, execution.id);
    log.info(`Job ${jobId} completed successfully`);
  } catch (err: any) {
    log.error(`Job ${jobId} failed: ${err.message}`);
    jobService.failJob(jobId, execution.id, err.message);
  }
}

start().catch((err) => {
  log.error(`Worker failed to start: ${err.message}`);
  process.exit(1);
});
