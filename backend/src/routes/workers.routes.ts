import { Router, Request, Response } from 'express';
import { workerService } from '../services/worker.service';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const workers = workerService.list();
  res.json({ success: true, data: workers });
});

router.get('/:id', (req: Request, res: Response) => {
  const worker = workerService.getById(req.params.id as string);
  if (!worker) { res.status(404).json({ success: false, error: { message: 'Worker not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: worker });
});

router.get('/:id/heartbeats', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const heartbeats = workerService.getHeartbeats(req.params.id as string, limit);
  res.json({ success: true, data: heartbeats });
});

export default router;
