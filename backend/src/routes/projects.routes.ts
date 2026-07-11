import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { projectService } from '../services/project.service';

const router = Router();

const createSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
});
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

router.post('/', validate(createSchema), (req: Request, res: Response) => {
  const project = projectService.create(req.body.organization_id, req.body.name, req.body.description);
  res.status(201).json({ success: true, data: project });
});

router.get('/', (req: Request, res: Response) => {
  const orgId = req.query.org_id as string;
  if (!orgId) { res.status(400).json({ success: false, error: { message: 'org_id query param required', code: 'BAD_REQUEST' } }); return; }
  const projects = projectService.listByOrg(orgId);
  res.json({ success: true, data: projects });
});

router.get('/:id', (req: Request, res: Response) => {
  const project = projectService.getById(req.params.id as string);
  if (!project) { res.status(404).json({ success: false, error: { message: 'Project not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: project });
});

router.put('/:id', validate(updateSchema), (req: Request, res: Response) => {
  const project = projectService.update(req.params.id as string, req.body);
  if (!project) { res.status(404).json({ success: false, error: { message: 'Project not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: project });
});

router.delete('/:id', (req: Request, res: Response) => {
  const deleted = projectService.delete(req.params.id as string);
  if (!deleted) { res.status(404).json({ success: false, error: { message: 'Project not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: { deleted: true } });
});

export default router;
