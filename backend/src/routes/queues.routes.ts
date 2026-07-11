import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { queueService } from '../services/queue.service';

const router = Router();

const createQueueSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  priority: z.number().int().optional(),
  concurrency_limit: z.number().int().min(1).optional(),
  retry_policy_id: z.string().uuid().optional(),
  rate_limit_count: z.number().int().min(1).nullable().optional(),
  rate_limit_window_seconds: z.number().int().min(1).nullable().optional(),
  tags: z.array(z.string()).optional(),
});

const updateQueueSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.number().int().optional(),
  concurrency_limit: z.number().int().min(1).optional(),
  retry_policy_id: z.string().uuid().nullable().optional(),
  rate_limit_count: z.number().int().min(1).nullable().optional(),
  rate_limit_window_seconds: z.number().int().min(1).nullable().optional(),
  tags: z.array(z.string()).optional(),
});

const createRetryPolicySchema = z.object({
  name: z.string().min(1),
  strategy: z.enum(['fixed', 'linear', 'exponential']),
  max_retries: z.number().int().min(0).default(3),
  initial_delay_ms: z.number().int().min(100).default(1000),
  backoff_factor: z.number().min(1).default(2),
});

// Queue CRUD
router.post('/projects/:projectId/queues', validate(createQueueSchema), (req: Request, res: Response) => {
  try {
    const queue = queueService.create(req.params.projectId as string, req.body);
    res.status(201).json({ success: true, data: queue });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message, code: 'BAD_REQUEST' } });
  }
});

router.get('/projects/:projectId/queues', (req: Request, res: Response) => {
  const queues = queueService.listByProject(req.params.projectId as string);
  res.json({ success: true, data: queues });
});

router.get('/queues/:id', (req: Request, res: Response) => {
  const queue = queueService.getById(req.params.id as string);
  if (!queue) { res.status(404).json({ success: false, error: { message: 'Queue not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: queue });
});

router.put('/queues/:id', validate(updateQueueSchema), (req: Request, res: Response) => {
  const queue = queueService.update(req.params.id as string, req.body);
  if (!queue) { res.status(404).json({ success: false, error: { message: 'Queue not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: queue });
});

router.delete('/queues/:id', (req: Request, res: Response) => {
  const deleted = queueService.delete(req.params.id as string);
  if (!deleted) { res.status(404).json({ success: false, error: { message: 'Queue not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: { deleted: true } });
});

router.post('/queues/:id/pause', (req: Request, res: Response) => {
  const queue = queueService.pause(req.params.id as string);
  if (!queue) { res.status(404).json({ success: false, error: { message: 'Queue not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: queue });
});

router.post('/queues/:id/resume', (req: Request, res: Response) => {
  const queue = queueService.resume(req.params.id as string);
  if (!queue) { res.status(404).json({ success: false, error: { message: 'Queue not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: queue });
});

router.get('/queues/:id/stats', (req: Request, res: Response) => {
  try {
    const stats = queueService.getStats(req.params.id as string);
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: { message: err.message, code: err.code || 'INTERNAL_ERROR' } });
  }
});

// Retry Policy CRUD
router.post('/projects/:projectId/retry-policies', validate(createRetryPolicySchema), (req: Request, res: Response) => {
  const policy = queueService.createRetryPolicy(req.params.projectId as string, req.body);
  res.status(201).json({ success: true, data: policy });
});

router.get('/projects/:projectId/retry-policies', (req: Request, res: Response) => {
  const policies = queueService.listRetryPolicies(req.params.projectId as string);
  res.json({ success: true, data: policies });
});

router.put('/retry-policies/:id', (req: Request, res: Response) => {
  const policy = queueService.updateRetryPolicy(req.params.id as string, req.body);
  if (!policy) { res.status(404).json({ success: false, error: { message: 'Retry policy not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: policy });
});

router.delete('/retry-policies/:id', (req: Request, res: Response) => {
  const deleted = queueService.deleteRetryPolicy(req.params.id as string);
  if (!deleted) { res.status(404).json({ success: false, error: { message: 'Retry policy not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: { deleted: true } });
});

export default router;
