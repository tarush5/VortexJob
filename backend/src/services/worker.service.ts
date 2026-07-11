import { getDb } from '../database/connection';
import { generateId } from '../utils/uuid';
import { Worker, WorkerHeartbeat } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('WorkerService');

export class WorkerService {
  register(name: string, hostname: string, pid: number, queueIds: string[], concurrency: number): Worker {
    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO workers (id, name, hostname, pid, status, queues, concurrency, last_heartbeat_at, started_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`
    ).run(id, name, hostname, pid, JSON.stringify(queueIds), concurrency, now, now);
    log.info(`Worker registered: ${name} (${id})`);
    return db.prepare('SELECT * FROM workers WHERE id = ?').get(id) as Worker;
  }

  heartbeat(workerId: string, activeJobs: number): void {
    const db = getDb();
    const now = new Date().toISOString();
    const memUsage = process.memoryUsage();

    const txn = db.transaction(() => {
      db.prepare('UPDATE workers SET last_heartbeat_at = ? WHERE id = ?').run(now, workerId);
      const hbId = generateId();
      db.prepare(
        'INSERT INTO worker_heartbeats (id, worker_id, active_jobs, memory_mb, timestamp) VALUES (?, ?, ?, ?, ?)'
      ).run(hbId, workerId, activeJobs, Math.round(memUsage.heapUsed / 1024 / 1024), now);
    });
    txn();
  }

  setDraining(workerId: string): void {
    const db = getDb();
    db.prepare(`UPDATE workers SET status = 'draining' WHERE id = ?`).run(workerId);
    log.info(`Worker ${workerId} is draining`);
  }

  setInactive(workerId: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`UPDATE workers SET status = 'inactive', stopped_at = ? WHERE id = ?`).run(now, workerId);
    log.info(`Worker ${workerId} is now inactive`);
  }

  list(): Worker[] {
    const db = getDb();
    return db.prepare('SELECT * FROM workers ORDER BY started_at DESC').all() as Worker[];
  }

  getById(id: string): Worker | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM workers WHERE id = ?').get(id) as Worker | undefined;
  }

  getHeartbeats(workerId: string, limit: number = 50): WorkerHeartbeat[] {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM worker_heartbeats WHERE worker_id = ? ORDER BY timestamp DESC LIMIT ?'
    ).all(workerId, limit) as WorkerHeartbeat[];
  }

  getActiveWorkers(): Worker[] {
    const db = getDb();
    return db.prepare(`SELECT * FROM workers WHERE status = 'active'`).all() as Worker[];
  }
}

export const workerService = new WorkerService();
