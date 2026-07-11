import { Router, Request, Response } from 'express';
import { dlqService } from '../services/dlq.service';

const router = Router();

router.get('/queues/:queueId/dlq', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = dlqService.listByQueue(req.params.queueId as string, page, limit);
  res.json({
    success: true,
    data: result.entries,
    pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
  });
});

router.get('/dlq', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = dlqService.listAll(page, limit);
  res.json({
    success: true,
    data: result.entries,
    pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
  });
});

router.post('/dlq/:id/retry', (req: Request, res: Response) => {
  const job = dlqService.retry(req.params.id as string);
  if (!job) { res.status(404).json({ success: false, error: { message: 'DLQ entry not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: job });
});

router.post('/dlq/:id/ignore', (req: Request, res: Response) => {
  dlqService.ignore(req.params.id as string);
  res.json({ success: true, data: { ignored: true } });
});

export default router;
