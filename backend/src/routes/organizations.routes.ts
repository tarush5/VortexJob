import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { organizationService } from '../services/organization.service';

const router = Router();

const createSchema = z.object({ name: z.string().min(1) });
const addMemberSchema = z.object({ user_id: z.string().uuid(), role: z.enum(['admin', 'member']).default('member') });

router.post('/', validate(createSchema), (req: Request, res: Response) => {
  const org = organizationService.create(req.body.name, req.user!.userId);
  res.status(201).json({ success: true, data: org });
});

router.get('/', (req: Request, res: Response) => {
  const orgs = organizationService.list(req.user!.userId);
  res.json({ success: true, data: orgs });
});

router.get('/:id', (req: Request, res: Response) => {
  const org = organizationService.getById(req.params.id as string);
  if (!org) { res.status(404).json({ success: false, error: { message: 'Organization not found', code: 'NOT_FOUND' } }); return; }
  res.json({ success: true, data: org });
});

router.post('/:id/members', validate(addMemberSchema), (req: Request, res: Response) => {
  try {
    const member = organizationService.addMember(req.params.id as string, req.body.user_id, req.body.role);
    res.status(201).json({ success: true, data: member });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message, code: 'BAD_REQUEST' } });
  }
});

router.get('/:id/members', (req: Request, res: Response) => {
  const members = organizationService.getMembers(req.params.id as string);
  res.json({ success: true, data: members });
});

export default router;
