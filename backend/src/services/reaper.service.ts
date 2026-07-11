import { getDb } from '../database/connection';
import { Job, Worker } from '../types';
import { config } from '../config';
import { createLogger } from '../utils/logger';
import { jobService } from './job.service';

const log = createLogger('Reaper');

export class ReaperService {
  /**
   * Find workers whose heartbeat has expired and reclaim their jobs.
   * This prevents jobs from being permanently locked by dead workers.
   */
  reap(): { staleWorkers: number; reclaimedJobs: number } {
    const db = getDb();
    const cutoff = new Date(Date.now() - config.heartbeatTimeoutMs).toISOString();
    const now = new Date().toISOString();

    // Find stale active workers
    const staleWorkers = db.prepare(
      `SELECT * FROM workers WHERE status = 'active' AND last_heartbeat_at < ?`
    ).all(cutoff) as Worker[];

    let reclaimedJobs = 0;

    for (const worker of staleWorkers) {
      log.warn(`Stale worker detected: ${worker.name} (${worker.id}), last heartbeat: ${worker.last_heartbeat_at}`);

      // Mark worker as inactive
      db.prepare(`UPDATE workers SET status = 'inactive', stopped_at = ? WHERE id = ?`).run(now, worker.id);

      // Find all claimed/running jobs locked by this worker
      const orphanedJobs = db.prepare(
        `SELECT * FROM jobs WHERE locked_by_worker_id = ? AND status IN ('claimed', 'running')`
      ).all(worker.id) as Job[];

      for (const job of orphanedJobs) {
        log.warn(`Reclaiming orphaned job: ${job.name} (${job.id})`);
        // Re-queue the job
        db.prepare(
          `UPDATE jobs SET status = 'queued', locked_by_worker_id = NULL, locked_at = NULL, updated_at = ? WHERE id = ?`
        ).run(now, job.id);
        jobService.addLog(job.id, null, 'warn', `Job reclaimed from dead worker ${worker.name} (${worker.id})`);
        reclaimedJobs++;
      }
    }

    if (staleWorkers.length > 0) {
      log.info(`Reaper cycle: ${staleWorkers.length} stale workers, ${reclaimedJobs} jobs reclaimed`);
    }

    return { staleWorkers: staleWorkers.length, reclaimedJobs };
  }
}

export const reaperService = new ReaperService();
