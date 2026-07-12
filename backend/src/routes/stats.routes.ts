import { Router, Request, Response } from 'express';
import { getDb } from '../database/connection';

const router = Router();

// Simple in-memory cache with 5-second TTL
let statsCache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5000;

router.get('/projects/:projectId/stats', (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;

  // Check cache
  if (statsCache && statsCache.data?.projectId === projectId && Date.now() < statsCache.expiresAt) {
    res.json(statsCache.data.response);
    return;
  }

  const db = getDb();

  // Get all queue IDs for this project
  const queues = db.prepare('SELECT id, name FROM queues WHERE project_id = ?').all(projectId) as { id: string; name: string }[];
  const queueIds = queues.map((q) => q.id);

  if (queueIds.length === 0) {
    const response = {
      success: true,
      data: { total_jobs: 0, active_workers: 0, success_rate: 0, avg_duration_ms: 0, throughput_per_hour: [], status_breakdown: {}, queue_breakdown: [] },
    };
    statsCache = { data: { projectId, response }, expiresAt: Date.now() + CACHE_TTL_MS };
    res.json(response);
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

  // Average duration — optimized with JOIN instead of subquery
  const avgDuration = db.prepare(
    `SELECT AVG(e.duration_ms) as avg_ms FROM job_executions e JOIN jobs j ON e.job_id = j.id WHERE j.queue_id IN (${placeholders}) AND e.status = 'completed'`
  ).get(...queueIds) as { avg_ms: number | null };

  // Active workers
  const activeWorkers = (db.prepare(`SELECT COUNT(*) as count FROM workers WHERE status = 'active'`).get() as { count: number }).count;

  // Throughput per hour (last 24 hours) — single query instead of 24 iterations
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600000).toISOString();
  const throughputRows = db.prepare(
    `SELECT strftime('%Y-%m-%dT%H:00:00', completed_at) as hour_bucket, COUNT(*) as count
     FROM jobs
     WHERE queue_id IN (${placeholders}) AND status = 'completed' AND completed_at >= ?
     GROUP BY hour_bucket
     ORDER BY hour_bucket`
  ).all(...queueIds, twentyFourHoursAgo) as { hour_bucket: string; count: number }[];

  // Build a map from hour_bucket to count
  const throughputMap = new Map<string, number>();
  for (const row of throughputRows) {
    throughputMap.set(row.hour_bucket, row.count);
  }

  // Fill in missing hours with count=0
  const throughputPerHour: { hour: string; count: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const hourDate = new Date(Date.now() - i * 3600000);
    const bucketKey = hourDate.toISOString().slice(0, 13) + ':00:00';
    throughputPerHour.push({ hour: bucketKey + 'Z', count: throughputMap.get(bucketKey) || 0 });
  }

  // Queue-level breakdown
  const queueBreakdown = queues.map((q) => {
    const total = (db.prepare('SELECT COUNT(*) as count FROM jobs WHERE queue_id = ?').get(q.id) as { count: number }).count;
    const running = (db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE queue_id = ? AND status IN ('claimed', 'running')`).get(q.id) as { count: number }).count;
    return { queue_id: q.id, queue_name: q.name, total_jobs: total, active_jobs: running };
  });

  const response = {
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
  };

  // Update cache
  statsCache = { data: { projectId, response }, expiresAt: Date.now() + CACHE_TTL_MS };

  res.json(response);
});

export default router;
