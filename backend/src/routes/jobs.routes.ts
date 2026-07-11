import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { jobService } from '../services/job.service';
import { geminiService } from '../services/gemini-service';

const router = Router();

const createJobSchema = z.object({
  name: z.string().min(1),
  payload: z.any().optional(),
  type: z.enum(['immediate', 'delayed', 'scheduled', 'cron', 'batch']).default('immediate'),
  run_at: z.string().optional(),
  cron_expression: z.string().optional(),
  priority: z.number().int().optional(),
  max_retries: z.number().int().min(0).optional(),
  idempotency_key: z.string().optional(),
  retry_policy_id: z.string().uuid().optional(),
  depends_on: z.array(z.string().uuid()).optional(),
});

const batchSchema = z.object({
  queue_id: z.string().uuid(),
  name: z.string().min(1).default('Batch'),
  project_id: z.string().uuid(),
  jobs: z.array(z.object({
    name: z.string().min(1),
    payload: z.any().optional(),
    priority: z.number().int().optional(),
    max_retries: z.number().int().min(0).optional(),
  })).min(1),
});

// Create a single job
router.post('/queues/:queueId/jobs', validate(createJobSchema), (req: Request, res: Response) => {
  try {
    const job = jobService.create({ ...req.body, queue_id: req.params.queueId as string });
    res.status(201).json({ success: true, data: job });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message, code: 'BAD_REQUEST' } });
  }
});

// List jobs in a queue
router.get('/queues/:queueId/jobs', (req: Request, res: Response) => {
  const { status, page, limit, search } = req.query;
  const result = jobService.listByQueue(req.params.queueId as string, {
    status: status as string,
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    search: search as string,
  });
  const p = parseInt((page as string) || '1');
  const l = parseInt((limit as string) || '20');
  res.json({
    success: true,
    data: result.jobs,
    pagination: { page: p, limit: l, total: result.total, totalPages: Math.ceil(result.total / l) },
  });
});

// Get single job
router.get('/jobs/:id', (req: Request, res: Response) => {
  const job = jobService.getById(req.params.id as string);
  if (!job) { res.status(404).json({ success: false, error: { message: 'Job not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: job });
});

// Get executions
router.get('/jobs/:id/executions', (req: Request, res: Response) => {
  const executions = jobService.getExecutions(req.params.id as string);
  res.json({ success: true, data: executions });
});

// Get logs
router.get('/jobs/:id/logs', (req: Request, res: Response) => {
  const logs = jobService.getLogs(req.params.id as string);
  res.json({ success: true, data: logs });
});

// Retry a job
router.post('/jobs/:id/retry', (req: Request, res: Response) => {
  const job = jobService.retryJob(req.params.id as string);
  if (!job) { res.status(404).json({ success: false, error: { message: 'Job not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: job });
});

// Cancel a job
router.post('/jobs/:id/cancel', (req: Request, res: Response) => {
  const job = jobService.cancelJob(req.params.id as string);
  if (!job) { res.status(404).json({ success: false, error: { message: 'Job not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: job });
});

// Create batch jobs
router.post('/jobs/batch', validate(batchSchema), (req: Request, res: Response) => {
  try {
    const result = jobService.createBatch(req.body.project_id, req.body.queue_id, req.body.name, req.body.jobs);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message, code: 'BAD_REQUEST' } });
  }
});

// Get dependencies for a job
router.get('/jobs/:id/dependencies', (req: Request, res: Response) => {
  const deps = jobService.getDependencies(req.params.id as string);
  res.json({ success: true, data: deps });
});

// Add dependency to a job
router.post('/jobs/:id/dependencies', validate(z.object({ depends_on_job_id: z.string().uuid() })), (req: Request, res: Response) => {
  try {
    jobService.addDependency(req.params.id as string, req.body.depends_on_job_id as string);
    res.json({ success: true, data: { linked: true } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message, code: 'BAD_REQUEST' } });
  }
});

// Get AI failure summary for a job
router.get('/jobs/:id/ai-summary', async (req: Request, res: Response) => {
  const job = jobService.getById(req.params.id as string);
  if (!job) {
    res.status(404).json({ success: false, error: { message: 'Job not found', code: 'NOT_FOUND' } });
    return;
  }

  try {
    const logs = jobService.getLogs(job.id).map(l => `${l.timestamp} [${l.level.toUpperCase()}] ${l.message}`);
    const summary = await geminiService.getFailureSummary(job.name, job.failed_at ? 'Job failed' : 'Unknown error', logs);
    res.json({ success: true, data: { summary } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message, code: 'INTERNAL_ERROR' } });
  }
});

export default router;
