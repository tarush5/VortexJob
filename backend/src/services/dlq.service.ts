import { getDb } from '../database/connection';
import { generateId } from '../utils/uuid';
import { DeadLetterEntry, Job } from '../types';
import { jobService } from './job.service';
import { createLogger } from '../utils/logger';

const log = createLogger('DLQService');

export class DlqService {
  listByQueue(queueId: string, page: number = 1, limit: number = 20): { entries: DeadLetterEntry[]; total: number } {
    const db = getDb();
    const offset = (page - 1) * limit;
    const total = (db.prepare('SELECT COUNT(*) as count FROM dead_letter_queue WHERE queue_id = ?').get(queueId) as { count: number }).count;
    const entries = db.prepare(
      'SELECT * FROM dead_letter_queue WHERE queue_id = ? ORDER BY failed_at DESC LIMIT ? OFFSET ?'
    ).all(queueId, limit, offset) as DeadLetterEntry[];
    return { entries, total };
  }

  listAll(page: number = 1, limit: number = 20): { entries: DeadLetterEntry[]; total: number } {
    const db = getDb();
    const offset = (page - 1) * limit;
    const total = (db.prepare('SELECT COUNT(*) as count FROM dead_letter_queue WHERE resolved = 0').get() as { count: number }).count;
    const entries = db.prepare(
      'SELECT * FROM dead_letter_queue WHERE resolved = 0 ORDER BY failed_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset) as DeadLetterEntry[];
    return { entries, total };
  }

  retry(dlqId: string): Job | undefined {
    const db = getDb();
    const entry = db.prepare('SELECT * FROM dead_letter_queue WHERE id = ?').get(dlqId) as DeadLetterEntry | undefined;
    if (!entry) return undefined;

    const now = new Date().toISOString();
    db.prepare('UPDATE dead_letter_queue SET resolved = 1, resolved_at = ?, resolution = ? WHERE id = ?').run(now, 'retry', dlqId);

    // Re-queue the original job
    return jobService.retryJob(entry.original_job_id);
  }

  ignore(dlqId: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare('UPDATE dead_letter_queue SET resolved = 1, resolved_at = ?, resolution = ? WHERE id = ?').run(now, 'ignore', dlqId);
  }
}

export const dlqService = new DlqService();
