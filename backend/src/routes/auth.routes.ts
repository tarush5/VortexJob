import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authService } from '../services/auth.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', validate(registerSchema), (req: Request, res: Response) => {
  try {
    const { email, password, full_name } = req.body;
    const result = authService.register(email, password, full_name);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.status || 500).json({
      success: false,
      error: { message: err.message, code: err.code || 'INTERNAL_ERROR' },
    });
  }
});

router.post('/login', validate(loginSchema), (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.status || 500).json({
      success: false,
      error: { message: err.message, code: err.code || 'INTERNAL_ERROR' },
    });
  }
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } });
    return;
  }
  const user = authService.getMe(req.user.userId);
  if (!user) {
    res.status(404).json({ success: false, error: { message: 'User not found', code: 'NOT_FOUND' } });
    return;
  }
  res.json({ success: true, data: user });
});

export default router;
