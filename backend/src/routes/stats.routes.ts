import { Router, Request, Response } from 'express';
import { getDb } from '../database/connection';

const router = Router();

router.get('/projects/:projectId/stats', (req: Request, res: Response) => {
  const db = getDb();
  const projectId = req.params.projectId as string;

  // Get all queue IDs for this project
  const queues = db.prepare('SELECT id, name FROM queues WHERE project_id = ?').all(projectId) as { id: string; name: string }[];
  const queueIds = queues.map((q) => q.id);

  if (queueIds.length === 0) {
    res.json({
      success: true,
      data: { total_jobs: 0, active_workers: 0, success_rate: 0, avg_duration_ms: 0, throughput_per_hour: [], status_breakdown: {}, queue_breakdown: [] },
    });
    return;
  }

  const placeholders = queueIds.map(() => '?').join(',');

  // Total jobs
  const totalJobs = (db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE queue_id IN (${placeholders})`).get(...queueIds) as { count: number }).count;

  // Status breakdown
  const statusBreakdown = db.prepare(
    `SELECT status, COUNT(*) as count FROM jobs WHERE queue_id IN (${placeholders}) GROUP BY status`
  ).all(...queueIds) as { status: string; count: number }[];

  const statusMap: Record<string, number> = {};
  for (const row of statusBreakdown) {
    statusMap[row.status] = row.count;
  }

  // Success rate
  const completed = statusMap['completed'] || 0;
  const failed = (statusMap['failed'] || 0) + (statusMap['dead'] || 0);
  const successRate = completed + failed > 0 ? Math.round((completed / (completed + failed)) * 100) : 100;

  // Average duration
  const avgDuration = db.prepare(
    `SELECT AVG(duration_ms) as avg_ms FROM job_executions WHERE status = 'completed' AND job_id IN (SELECT id FROM jobs WHERE queue_id IN (${placeholders}))`
  ).get(...queueIds) as { avg_ms: number | null };

  // Active workers
  const activeWorkers = (db.prepare(`SELECT COUNT(*) as count FROM workers WHERE status = 'active'`).get() as { count: number }).count;

  // Throughput per hour (last 24 hours)
  const throughputPerHour: { hour: string; count: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const hourStart = new Date(Date.now() - i * 3600000).toISOString();
    const hourEnd = new Date(Date.now() - (i - 1) * 3600000).toISOString();
    const count = (db.prepare(
      `SELECT COUNT(*) as count FROM jobs WHERE queue_id IN (${placeholders}) AND status = 'completed' AND completed_at >= ? AND completed_at < ?`
    ).get(...queueIds, hourStart, hourEnd) as { count: number }).count;
    const label = new Date(Date.now() - i * 3600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    throughputPerHour.push({ hour: label, count });
  }

  // Queue-level breakdown
  const queueBreakdown = queues.map((q) => {
    const total = (db.prepare('SELECT COUNT(*) as count FROM jobs WHERE queue_id = ?').get(q.id) as { count: number }).count;
    const running = (db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE queue_id = ? AND status IN ('claimed', 'running')`).get(q.id) as { count: number }).count;
    return { queue_id: q.id, queue_name: q.name, total_jobs: total, active_jobs: running };
  });

  res.json({
    success: true,
    data: {
      total_jobs: totalJobs,
      active_workers: activeWorkers,
      success_rate: successRate,
      avg_duration_ms: avgDuration.avg_ms ? Math.round(avgDuration.avg_ms) : 0,
      status_breakdown: statusMap,
      throughput_per_hour: throughputPerHour,
      queue_breakdown: queueBreakdown,
    },
  });
});

export default router;
