import { getDb } from '../database/connection';
import { generateId } from '../utils/uuid';
import { Queue, QueueStats, RetryPolicy } from '../types';

export class QueueService {
  create(projectId: string, data: {
    name: string; description?: string; priority?: number; concurrency_limit?: number;
    retry_policy_id?: string; rate_limit_count?: number; rate_limit_window_seconds?: number; tags?: string[];
  }): Queue {
    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO queues (id, project_id, name, description, priority, concurrency_limit, retry_policy_id, is_paused, rate_limit_count, rate_limit_window_seconds, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`
    ).run(
      id, projectId, data.name, data.description || '', data.priority || 0,
      data.concurrency_limit || 10, data.retry_policy_id || null,
      data.rate_limit_count ?? null, data.rate_limit_window_seconds ?? null,
      JSON.stringify(data.tags || []), now, now
    );
    return this.getById(id)!;
  }

  listByProject(projectId: string): Queue[] {
    const db = getDb();
    return db.prepare('SELECT * FROM queues WHERE project_id = ? ORDER BY priority DESC, name ASC').all(projectId) as Queue[];
  }

  getById(id: string): Queue | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM queues WHERE id = ?').get(id) as Queue | undefined;
  }

  update(id: string, data: Partial<Pick<Queue, 'name' | 'description' | 'priority' | 'concurrency_limit' | 'retry_policy_id' | 'rate_limit_count' | 'rate_limit_window_seconds' | 'tags'>>): Queue | undefined {
    const db = getDb();
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now];
    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
    if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description); }
    if (data.priority !== undefined) { sets.push('priority = ?'); params.push(data.priority); }
    if (data.concurrency_limit !== undefined) { sets.push('concurrency_limit = ?'); params.push(data.concurrency_limit); }
    if (data.retry_policy_id !== undefined) { sets.push('retry_policy_id = ?'); params.push(data.retry_policy_id); }
    if (data.rate_limit_count !== undefined) { sets.push('rate_limit_count = ?'); params.push(data.rate_limit_count); }
    if (data.rate_limit_window_seconds !== undefined) { sets.push('rate_limit_window_seconds = ?'); params.push(data.rate_limit_window_seconds); }
    if (data.tags !== undefined) { sets.push('tags = ?'); params.push(data.tags); }
    params.push(id);
    db.prepare(`UPDATE queues SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.getById(id);
  }

  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM queues WHERE id = ?').run(id);
    return result.changes > 0;
  }

  pause(id: string): Queue | undefined {
    const db = getDb();
    db.prepare('UPDATE queues SET is_paused = 1, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
    return this.getById(id);
  }

  resume(id: string): Queue | undefined {
    const db = getDb();
    db.prepare('UPDATE queues SET is_paused = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
    return this.getById(id);
  }

  getStats(id: string): QueueStats {
    const db = getDb();
    const queue = this.getById(id);
    if (!queue) throw Object.assign(new Error('Queue not found'), { status: 404, code: 'NOT_FOUND' });

    const counts = db.prepare(
      `SELECT status, COUNT(*) as count FROM jobs WHERE queue_id = ? GROUP BY status`
    ).all(id) as { status: string; count: number }[];

    const statusMap: Record<string, number> = {};
    let total = 0;
    for (const row of counts) {
      statusMap[row.status] = row.count;
      total += row.count;
    }

    const avgDuration = db.prepare(
      `SELECT AVG(duration_ms) as avg_ms FROM job_executions WHERE job_id IN (SELECT id FROM jobs WHERE queue_id = ?) AND status = 'completed'`
    ).get(id) as { avg_ms: number | null };

    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const throughput = db.prepare(
      `SELECT COUNT(*) as count FROM jobs WHERE queue_id = ? AND status = 'completed' AND completed_at >= ?`
    ).get(id, oneHourAgo) as { count: number };

    return {
      queue_id: id,
      queue_name: queue.name,
      total_jobs: total,
      queued: statusMap['queued'] || 0,
      scheduled: statusMap['scheduled'] || 0,
      claimed: statusMap['claimed'] || 0,
      running: statusMap['running'] || 0,
      completed: statusMap['completed'] || 0,
      failed: statusMap['failed'] || 0,
      dead: statusMap['dead'] || 0,
      avg_duration_ms: avgDuration.avg_ms ? Math.round(avgDuration.avg_ms) : null,
      throughput_last_hour: throughput.count,
    };
  }

  // Retry policy CRUD
  createRetryPolicy(projectId: string, data: { name: string; strategy: string; max_retries: number; initial_delay_ms: number; backoff_factor: number }): RetryPolicy {
    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO retry_policies (id, project_id, name, strategy, max_retries, initial_delay_ms, backoff_factor, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, projectId, data.name, data.strategy, data.max_retries, data.initial_delay_ms, data.backoff_factor, now, now);
    return db.prepare('SELECT * FROM retry_policies WHERE id = ?').get(id) as RetryPolicy;
  }

  listRetryPolicies(projectId: string): RetryPolicy[] {
    const db = getDb();
    return db.prepare('SELECT * FROM retry_policies WHERE project_id = ? ORDER BY name').all(projectId) as RetryPolicy[];
  }

  updateRetryPolicy(id: string, data: Partial<RetryPolicy>): RetryPolicy | undefined {
    const db = getDb();
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now];
    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
    if (data.strategy !== undefined) { sets.push('strategy = ?'); params.push(data.strategy); }
    if (data.max_retries !== undefined) { sets.push('max_retries = ?'); params.push(data.max_retries); }
    if (data.initial_delay_ms !== undefined) { sets.push('initial_delay_ms = ?'); params.push(data.initial_delay_ms); }
    if (data.backoff_factor !== undefined) { sets.push('backoff_factor = ?'); params.push(data.backoff_factor); }
    params.push(id);
    db.prepare(`UPDATE retry_policies SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return db.prepare('SELECT * FROM retry_policies WHERE id = ?').get(id) as RetryPolicy | undefined;
  }

  deleteRetryPolicy(id: string): boolean {
    const db = getDb();
    return db.prepare('DELETE FROM retry_policies WHERE id = ?').run(id).changes > 0;
  }
}

export const queueService = new QueueService();
