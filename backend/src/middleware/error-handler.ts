import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const log = createLogger('ErrorHandler');

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  log.error(err.message, { stack: err.stack });
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    success: false,
    error: {
      message: isDev ? err.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
      ...(isDev && { stack: err.stack }),
    },
  });
}
