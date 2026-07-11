import { getDb } from '../database/connection';
import { Job } from '../types';
import { jobService } from './job.service';
import { createLogger } from '../utils/logger';

const log = createLogger('Scheduler');

export class SchedulerService {
  /**
   * Processes recurring cron jobs. Finds completed cron jobs and
   * creates the next scheduled instance for each.
   */
  processCronJobs(): number {
    const db = getDb();
    let processed = 0;

    // Find all completed cron jobs that need rescheduling
    const completedCronJobs = db.prepare(
      `SELECT * FROM jobs WHERE cron_expression IS NOT NULL AND status = 'completed'`
    ).all() as Job[];

    for (const job of completedCronJobs) {
      try {
        const cronParser = require('cron-parser');
        const interval = cronParser.parseExpression(job.cron_expression!);
        const nextRun = interval.next().toISOString();

        // Create a new job instance for the next cron run
        const newJob = jobService.create({
          queue_id: job.queue_id,
          name: job.name,
          payload: JSON.parse(job.payload),
          type: 'cron',
          run_at: nextRun,
          cron_expression: job.cron_expression!,
          priority: job.priority,
          max_retries: job.max_retries,
          retry_policy_id: job.retry_policy_id || undefined,
        });

        // Mark the old job so it won't be rescheduled again (remove its cron_expression)
        db.prepare(`UPDATE jobs SET cron_expression = NULL WHERE id = ?`).run(job.id);

        log.debug(`Cron job rescheduled: ${job.name} → next run at ${nextRun}`);
        processed++;
      } catch (err: any) {
        log.error(`Failed to reschedule cron job ${job.id}: ${err.message}`);
      }
    }

    return processed;
  }

  /**
   * Promote scheduled jobs whose run_at has arrived to 'queued' status.
   */
  promoteScheduledJobs(): number {
    const db = getDb();
    const now = new Date().toISOString();
    const result = db.prepare(
      `UPDATE jobs SET status = 'queued', updated_at = ? WHERE status = 'scheduled' AND run_at <= ?`
    ).run(now, now);
    if (result.changes > 0) {
      log.debug(`Promoted ${result.changes} scheduled jobs to queued`);
    }
    return result.changes;
  }
}

export const schedulerService = new SchedulerService();
